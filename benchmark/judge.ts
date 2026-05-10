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

// Chinese → English tag mapping for format normalization
const TAG_MAP: Record<string, string> = {
  '列': 'Column', '排': 'Row', '卡': 'Card', '域': 'Form',
  '文': 'Text', '图': 'Image', '按': 'Button', '入': 'Input',
  '选': 'Select', '选框': 'Checkbox', '切': 'Toggle', '链': 'Link',
  '栏': 'NavBar', '标': 'Badge', '提': 'Toast', '头像': 'Avatar',
};
const ENGLISH_TAGS = new Set(Object.values(TAG_MAP));

function toAbstractDump(wire: string): string {
  // Step 1: detect format by inspecting the wire content
  const hasJSXTags = /<\/?[A-Z][a-zA-Z]*[^>]*>/.test(wire);
  const hasChineseTags = /["']?[列排卡域文图按入选链栏标提]/m.test(wire);
  const hasIndentedLines = /^[　 ]+[一-龥]/m.test(wire);

  if (hasJSXTags) return toDumpFromJSX(wire);
  if (hasIndentedLines) return toDumpFromXuD(wire);
  if (hasChineseTags) return toDumpFromJSON(wire, true);
  return toDumpFromJSON(wire, false);
}

function toDumpFromJSX(wire: string): string {
  // Extract tag names and interactive props via regex
  const lines: string[] = [];
  const tagRe = /<(\/?)([A-Z][a-zA-Z]*)([^>]*)(\/?)>/g;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(wire)) !== null) {
    const isClosing = match[1] === '/';
    const tag = match[2];
    const attrs = match[3];
    const selfClose = match[4] === '/';
    if (isClosing) { depth = Math.max(0, depth - 1); continue; }
    const props = extractInteractiveProps(attrs);
    lines.push('  '.repeat(depth) + `[${tag}]` + (props ? ` ${props}` : ''));
    if (!selfClose) depth++;
  }
  return lines.join('\n');
}

function toDumpFromXuD(wire: string): string {
  const lines: string[] = [];
  for (const line of wire.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const indent = line.search(/\S/);
    const parts = trimmed.split(/[\s　]+/).filter(Boolean);
    if (parts.length === 0) continue;
    const rawTag = parts[0];
    const tag = TAG_MAP[rawTag] ?? rawTag;
    const rest = parts.slice(1).filter(p => !/^[值触空]/.test(p) && p !== '必' && p !== '禁').join(' ');
    lines.push('  '.repeat(Math.floor(indent / 2)) + `[${tag}]` + (rest ? ` ${rest}` : ''));
  }
  return lines.join('\n');
}

function toDumpFromJSON(wire: string, chinese: boolean): string {
  let arr: any;
  try { arr = JSON.parse(wire); } catch { return wire; }
  const lines: string[] = [];
  function walk(node: any, depth: number) {
    if (!Array.isArray(node)) return;
    const rawTag = String(node[0] ?? '');
    const tag = chinese ? (TAG_MAP[rawTag] ?? rawTag) : (ENGLISH_TAGS.has(rawTag) ? rawTag : (Object.keys(TAG_MAP).find(k => TAG_MAP[k] === rawTag) ?? rawTag));
    const props = typeof node[1] === 'object' && !Array.isArray(node[1]) ? node[1] : {};
    const propStrs: string[] = [];
    for (const [k, v] of Object.entries(props)) {
      if (typeof v === 'string' && v.length > 0 && v !== 'true' && v !== 'false') {
        propStrs.push(`${k}=${v}`);
      }
    }
    const children: string[] = [];
    const startIdx = typeof node[1] === 'object' && !Array.isArray(node[1]) ? 2 : 1;
    for (let i = startIdx; i < node.length; i++) {
      if (typeof node[i] === 'string') continue;
      const childLines: string[] = [];
      walk(node[i], 0);
    }
    lines.push('  '.repeat(depth) + `[${tag}]` + (propStrs.length > 0 ? ` ${propStrs.join(' ')}` : ''));
    for (let i = startIdx; i < node.length; i++) {
      if (Array.isArray(node[i])) walk(node[i], depth + 1);
    }
  }
  walk(arr, 0);
  return lines.join('\n');
}

function extractInteractiveProps(attrs: string): string {
  const parts: string[] = [];
  // action bindings
  const onTap = attrs.match(/onTap\s*=\s*["']([^"']+)["']/);
  if (onTap) parts.push(`onTap=${onTap[1]}`);
  // state bindings
  const bind = attrs.match(/bind\s*=\s*["']([^"']+)["']/);
  if (bind) parts.push(`bind=${bind[1]}`);
  // required / disabled (no value)
  if (/required/.test(attrs)) parts.push('required');
  if (/disabled/.test(attrs)) parts.push('disabled');
  // onSubmit
  const submit = attrs.match(/onSubmit\s*=\s*["']([^"']+)["']/);
  if (submit) parts.push(`onSubmit=${submit[1]}`);
  // onBack
  const back = attrs.match(/onBack\s*=\s*["']([^"']+)["']/);
  if (back) parts.push(`onBack=${back[1]}`);
  return parts.join(' ');
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
