/**
 * LLM-as-judge for semantic equivalence (M5).
 *
 * Claude models: spawns `claude -p` CLI subprocess (no npm package needed)
 * DeepSeek models: OpenAI-compat REST API
 *
 * Double-blind: reference and candidate are converted to abstract tree dumps
 * before sending to the judge, so the judge cannot infer the format used.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { MODELS, DEEPSEEK_API_KEY } from './config';

const execFileAsync = promisify(execFile);

export interface JudgeResult {
  equivalent: boolean;
  missing: string[];
  extra: string[];
  reasoning: string;
  judgeModelKey: string;
  rawResponse: string;
}

const JUDGE_SYSTEM_PROMPT = `You are a strict UI equivalence judge. Your task is to decide if two UI trees are FUNCTIONALLY IDENTICAL.

PROCEDURE — follow these steps in order:
1. List every interactive element in REFERENCE (buttons, inputs, links, checkboxes, toggles, selects, textareas).
2. List every interactive element in CANDIDATE.
3. Compare the two lists element-by-element.

RULES — any of these make the trees NOT equivalent:
- Candidate is MISSING one or more interactive elements from Reference
- Candidate has EXTRA interactive elements not present in Reference
- Any action/handler name differs (onSubmit vs onSave = different)
- Any state-binding variable name differs (email vs emailInput = different)
- Any required/disabled constraint differs

These differences do NOT affect equivalence:
- Visual style variants (primary vs ghost, lg vs sm)
- Label wording where the meaning is clearly identical (Save vs Save Changes)
- Pure layout restructuring (row vs column, wrapper divs/views)
- Order of sibling non-interactive elements

Be STRICT: when in doubt whether two elements are the same, mark them as different.

Output ONLY valid JSON — no explanation text before or after:
{"equivalent": true, "missing": [], "extra": [], "reasoning": "one sentence"}

"missing" = interactive elements in Reference but absent in Candidate.
"extra"   = interactive elements in Candidate but absent in Reference.`;

function toAbstractDump(wire: string): string {
  let s = wire.replace(/<\/?([A-Z][a-zA-Z]*)[^>]*>/g, (_m, tag) => `[${tag}]`);
  s = s.replace(/[\[\]"{}]/g, ' ').replace(/,/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

// ──────────────────────────────────────────────
// Core judge call — claude CLI subprocess
// ──────────────────────────────────────────────
async function judgeViaCLI(userMessage: string, modelId: string): Promise<string> {
  const tmpSys = path.join(os.tmpdir(), `jw-bench-judge-${process.pid}-${Date.now()}.txt`);
  fs.writeFileSync(tmpSys, JUDGE_SYSTEM_PROMPT, 'utf-8');
  try {
    const { stdout } = await execFileAsync('claude', [
      '-p', userMessage,
      '--model', modelId,
      '--system-prompt-file', tmpSys,
      '--output-format', 'json',
    ], { maxBuffer: 4 * 1024 * 1024, timeout: 60_000 });
    try {
      const parsed = JSON.parse(stdout) as Record<string, unknown>;
      return (parsed['result'] as string) ?? stdout.trim();
    } catch {
      return stdout.trim();
    }
  } finally {
    try { fs.unlinkSync(tmpSys); } catch { /* ignore */ }
  }
}

// ──────────────────────────────────────────────
// Core judge call — DeepSeek OpenAI-compat
// ──────────────────────────────────────────────
async function judgeViaDeepSeek(userMessage: string, modelId: string): Promise<string> {
  const { default: OpenAI } = await import('openai');
  const ds = new OpenAI({ apiKey: DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' });
  const r = await ds.chat.completions.create({
    model: modelId,
    temperature: 0,
    messages: [
      { role: 'system', content: JUDGE_SYSTEM_PROMPT },
      { role: 'user',   content: userMessage },
    ],
  });
  return r.choices[0]?.message?.content ?? '';
}

function parseJudgeResponse(raw: string): Omit<JudgeResult, 'judgeModelKey' | 'rawResponse'> {
  try {
    const json = raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}';
    const parsed = JSON.parse(json);
    return {
      equivalent: Boolean(parsed.equivalent),
      missing:    Array.isArray(parsed.missing)  ? parsed.missing  : [],
      extra:      Array.isArray(parsed.extra)    ? parsed.extra    : [],
      reasoning:  typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
    };
  } catch {
    return { equivalent: false, missing: [], extra: [], reasoning: 'parse error' };
  }
}

export async function judgeEquivalence(
  reference: string,
  candidate: string,
  judgeModelId: string,
  judgeModelKey: string,
): Promise<JudgeResult> {
  const userMessage =
    `Reference tree:\n${toAbstractDump(reference)}\n\n` +
    `Candidate tree:\n${toAbstractDump(candidate)}`;

  let raw = '';
  try {
    const family = MODELS[judgeModelKey]?.apiFamily ?? 'claude-code';
    raw = family === 'claude-code'
      ? await judgeViaCLI(userMessage, judgeModelId)
      : await judgeViaDeepSeek(userMessage, judgeModelId);
  } catch (e: any) {
    return {
      equivalent: false, missing: [], extra: [],
      reasoning: `judge call error: ${e.message}`,
      judgeModelKey, rawResponse: '',
    };
  }
  return { ...parseJudgeResponse(raw), judgeModelKey, rawResponse: raw };
}

// ──────────────────────────────────────────────
// Judge calibration
// ──────────────────────────────────────────────
export interface CalibrationResult {
  total: number;
  correct: number;
  tp: number; tn: number; fp: number; fn: number;
  precision: number;
  recall: number;
  f1: number;
  passed: boolean;
}

export async function runJudgeCalibration(
  pairs: Array<{ reference: string; candidate: string; ground_truth: boolean }>,
  judgeModelKey: string,
): Promise<CalibrationResult> {
  const modelId = MODELS[judgeModelKey]?.id ?? judgeModelKey;
  let tp = 0, tn = 0, fp = 0, fn = 0;

  for (const pair of pairs) {
    const result = await judgeEquivalence(
      pair.reference, pair.candidate, modelId, judgeModelKey,
    );
    const predicted = result.equivalent;
    const actual    = pair.ground_truth;
    if (predicted && actual)        tp++;
    else if (!predicted && !actual) tn++;
    else if (predicted && !actual)  fp++;
    else                            fn++;
  }

  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
  const recall    = (tp + fn) > 0 ? tp / (tp + fn) : 0;
  const f1        = (precision + recall) > 0
    ? (2 * precision * recall) / (precision + recall) : 0;
  const round = (n: number) => Math.round(n * 1000) / 1000;

  return {
    total: pairs.length,
    correct: tp + tn,
    tp, tn, fp, fn,
    precision: round(precision),
    recall:    round(recall),
    f1:        round(f1),
    passed:    f1 >= 0.90,
  };
}
