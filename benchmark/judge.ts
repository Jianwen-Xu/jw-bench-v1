/**
 * LLM-as-judge for semantic equivalence (M5).
 *
 * Pure CLI mode: each judge call spawns a fresh `opencode run --pure --format json`
 * process. No session reuse — every call starts and stops a new server.
 * DeepSeek models: OpenAI-compat REST API
 *
 * Double-blind: reference and candidate are converted to abstract tree dumps
 * before sending to the judge, so the judge cannot infer the format used.
 */
import { spawn } from 'child_process';
import { MODELS, DEEPSEEK_API_KEY } from './config';

export interface JudgeResult {
  equivalent: boolean;
  missing: string[];
  extra: string[];
  reasoning: string;
  judgeModelKey: string;
  rawResponse: string;
}

const JUDGE_SYSTEM_PROMPT = `You are a UI equivalence judge. Decide if two UI tree dumps are functionally IDENTICAL.

FORMAT — each line:  [ComponentType] [props...]
- First token in brackets is the component type (e.g. [Button], [Input], [Avatar], [Text]).
- Remaining tokens are configuration properties.
- Interactive properties (these always matter):
  • Action handlers: onTap=xxx, onSubmit=xxx, onBack=xxx, onClose=xxx, onChange=xxx
  • State bindings: bind=xxx, value=xxx
  • Constraints: required, disabled
- Visual/descriptive properties (these can differ without breaking equivalence):
  • Size tokens (小/中/大)
  • Variant tokens (主/次/轻, primary/ghost/success/info/warning/danger)
  • Shape tokens (圆/方)
  • Badge variant tokens (信息/成功/警告/危险/错误)
  • Text type tokens (标题/主标题/正文/价格/节标题/说明)
  • Label text on buttons/links when the action handler is identical

RULES — trees are NOT equivalent when:
- Any element from Reference is missing in Candidate (even non-interactive ones like [Avatar], [Text], [Image])
- Any element in Candidate does not exist in Reference (even non-interactive ones)
- Action handler names differ (onTap=submit vs onTap=cancel = different; del vs remove = different — match must be EXACT)
- State binding variable names differ (ANY value after bind= matters: bind=title vs bind=name = different)
- required / disabled constraint differs
- An interactive element (Button, Input, Toggle, etc.) is placed in a different CONTAINER in Candidate vs Reference (e.g., Button is inside [Form] in Reference but outside [Form] in Candidate)
- The overall SECTION structure is reorganized (e.g., content grouped under different headings or sections)
- For [Input] elements: type/modifier tokens (like 密码 for password masking, 数字 for numeric, 邮箱 for email) affect the component's behavior and must match. An Input with 密码 (password mode) is NOT equivalent to the same Input with 文 (plain text mode).

Differences that DO NOT affect equivalence:
- Visual/style tokens listed above
- Label text on interactive elements when the action handler is the same
- Display text / section headings on [Text] elements (purely descriptive content, no action handlers or bindings) — wording differences are allowed
- Row ↔ Column (both are layout containers; swapping them is OK as long as children are the same)
- Adding or removing an extra wrapper layer ([Card], [Column], [Row]) around existing content groups
- Order of sibling elements

Examples:
  ✓ [Avatar] 大 圆  vs  [Avatar] 中 圆        → equivalent (size only)
  ✓ [Button] onTap=submit 提交  vs  [Button] onTap=submit 确认  → equivalent
  ✓ [Badge] 信息 管理员  vs  [Badge] 成功 管理员  → equivalent (variant only)
  ✓ [Row] > [Button]       vs  [Column] > [Button]  → equivalent (Row↔Column same content)
  ✓ [Form] > [Input]       vs  [Form] > [Column] > [Input]  → equivalent (extra wrapper inside Form)
  ✓ [Text] 节标题 个人资料  vs  [Text] 节标题 个人信息   → equivalent (different section heading wording)
  ✗ [Button] onTap=submit  vs  [Button] onTap=cancel  → NOT equivalent
  ✗ [Button] onTap=del     vs  [Button] onTap=remove  → NOT equivalent
  ✗ [Text] bind=title      vs  [Text] bind=name     → NOT equivalent (bind differs)
  ✗ [Avatar] 中            vs  (absent)             → NOT equivalent (Avatar missing)
  ✗ [Form] > [Button]      vs  Button outside Form  → NOT equivalent (Button moved out of Form)
  ✗ [Input] 密码 required   vs  [Input] 文 required   → NOT equivalent (password mode vs text mode)

IMPORTANT: bind=xxx is a STATE BINDING. The value after bind= is a VARIABLE NAME. Different variable names = NOT equivalent, even if the names look like common words (title, name, email).

Strict on missing/extra elements, action handlers, bind values, and constraints.
Lenient ONLY on visual/style tokens, label text with same handler, Row↔Column, and wrapper layers.

Output ONLY valid JSON — no markdown code fences, no explanation, no backticks:
{"equivalent": true, "missing": [], "extra": [], "reasoning": "one sentence"}`;

// Visual/style-only tokens in XU-D — stripped from abstract dump before judging
const VISUAL_TOKENS = new Set([
  // Button variants
  '主', '次', '轻',
  // Sizes
  '小', '中', '大',
  // Shapes
  '圆', '方',
  // Badge / Toast variants
  '信息', '成功', '警告', '危险', '错误',
  // Link variants
  '默认', '淡',
  // Text variants
  '标题', '主标题', '正文', '价格', '节标题', '说明',
]);

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
    const indent = line.match(/^[　]*/)?.[0]?.length ?? 0;
    const parts = trimmed.split(/[\s　]+/).filter(Boolean);
    if (parts.length === 0) continue;
    const rawTag = parts[0];
    const tag = TAG_MAP[rawTag] ?? rawTag;

    const required = parts.some(p => p === '必') ? ' required' : '';
    const disabled = parts.some(p => p === '禁' || p === '禁true') ? ' disabled' : '';

    const tokens: string[] = [];
    for (const p of parts.slice(1)) {
      if (p === '必' || /^禁/.test(p)) continue;   // constraints (handled above)
      if (/^空/.test(p)) continue;                  // placeholder: 空...
      if (/^式/.test(p)) continue;                  // explicit style key: 式主/式次
      if (VISUAL_TOKENS.has(p)) continue;           // known visual tokens
      if (/^值(.+)$/.test(p)) {                     // state binding: 值xxx → bind=xxx
        tokens.push(`bind=${p.slice(1)}`); continue;
      }
      if (/^触(.+)$/.test(p)) {                     // action trigger: 触submit → onTap=submit
        tokens.push(`onTap=${p.slice(1)}`); continue;
      }
      tokens.push(p);  // keep ASCII handlers + Chinese type/label tokens
    }

    const interactiveTags = new Set(['Button', 'Link', 'Btn']);
    if (interactiveTags.has(tag)) {
      const hasOnTap = tokens.some(t => t.startsWith('onTap='));
      if (!hasOnTap) {
        const asciiIdx = tokens.findIndex(t => /^[a-zA-Z]\w*$/.test(t));
        if (asciiIdx >= 0) {
          tokens[asciiIdx] = `onTap=${tokens[asciiIdx]}`;
        }
      }
    }

    lines.push('  '.repeat(indent) + `[${tag}]` +
      (tokens.length ? ` ${tokens.join(' ')}` : '') + required + disabled);
  }
  return lines.join('\n');
}

function toDumpFromJSON(wire: string, chinese: boolean): string {
  let arr: any;
  try { arr = JSON.parse(wire); } catch { return wire; }
  const lines: string[] = [];

  const ACTION_KEYS = new Set(['t', 'trigger', 'onTap', 'onSubmit', 'onBack', 'onClose', '触']);
  const BIND_KEYS   = new Set(['bind', 'value', '值']);
  const TYPE_KEYS   = new Set(['type', '类', '式']);
  const REQ_KEYS    = new Set(['req', 'required', '必']);
  const DIS_KEYS    = new Set(['disabled', '禁']);

  function walk(node: any, depth: number): void {
    if (!Array.isArray(node)) return;
    const rawTag = String(node[0] ?? '');
    // Common short-form aliases in JSON-EN wire format
    const TAG_ALIASES: Record<string, string> = {
      'Col': 'Column', 'Btn': 'Button', 'Inp': 'Input', 'Img': 'Image',
      'Txt': 'Text',   'Nav': 'NavBar', 'Chk': 'Checkbox',
    };
    const tag = chinese
      ? (TAG_MAP[rawTag] ?? rawTag)
      : (ENGLISH_TAGS.has(rawTag) ? rawTag :
          TAG_ALIASES[rawTag] ??
          (Object.entries(TAG_MAP).find(([, en]) => en === rawTag)?.[1] ?? rawTag));

    const hasProps = typeof node[1] === 'object' && !Array.isArray(node[1]);
    const props: Record<string, unknown> = hasProps ? node[1] : {};
    const startIdx = hasProps ? 2 : 1;

    const tokens: string[] = [];
    for (const [k, v] of Object.entries(props)) {
      if (REQ_KEYS.has(k) && v === true) { tokens.push('required'); continue; }
      if (DIS_KEYS.has(k) && v === true) { tokens.push('disabled'); continue; }
      if (typeof v !== 'string' || !v) continue;
      if (ACTION_KEYS.has(k)) { tokens.push(`onTap=${v}`); continue; }
      if (BIND_KEYS.has(k))   { tokens.push(`bind=${v}`); continue; }
      if (TYPE_KEYS.has(k) && !VISUAL_TOKENS.has(v)) { tokens.push(v); continue; }
      // skip visual/label values
    }

    for (let i = startIdx; i < node.length; i++) {
      if (typeof node[i] === 'string' && node[i].trim()) {
        tokens.push(node[i].trim());
      }
    }
    lines.push('  '.repeat(depth) + `[${tag}]` + (tokens.length ? ` ${tokens.join(' ')}` : ''));
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
// Core judge call — opencode CLI (pure mode, fresh session per call)
// ──────────────────────────────────────────────
async function judgeViaCLI(userMessage: string, modelId: string): Promise<string> {
  const fullPrompt = `${JUDGE_SYSTEM_PROMPT}\n\n${userMessage}\n\n只输出 JSON，不要使用任何工具。`;

  const child = spawn('opencode', [
    'run', fullPrompt,
    '-m', modelId,
    '--format', 'json',
    '--pure',
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 300_000,
  });

  const chunks: Buffer[] = [];
  child.stdout.on('data', (d: Buffer) => chunks.push(d));
  let stderr = '';
  child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

  const exitCode = await new Promise<number | null>((resolve) => {
    child.on('close', resolve);
    child.on('error', () => resolve(null));
  });

  if (exitCode !== 0) {
    return `ERROR: opencode call failed (exit ${exitCode})${stderr ? ': ' + stderr.slice(0, 200) : ''}`;
  }

  const stdout = Buffer.concat(chunks).toString();
  const textParts: string[] = [];
  for (const line of stdout.split('\n').filter(Boolean)) {
    try {
      const ev = JSON.parse(line);
      if (ev.type === 'text' && ev.part?.type === 'text') {
        textParts.push(ev.part.text);
      }
    } catch { /* skip */ }
  }
  return textParts.join('').trim();
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
    const json = raw.match(/\{[\s\S]*\}/)?.[0] ?? '';
    if (!json) throw new Error('no JSON object found');
    const parsed = JSON.parse(json);
    return {
      equivalent: Boolean(parsed.equivalent),
      missing:    Array.isArray(parsed.missing)  ? parsed.missing  : [],
      extra:      Array.isArray(parsed.extra)    ? parsed.extra    : [],
      reasoning:  typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
    };
  } catch {
    // Fallback: detect keywords in raw text
    const lower = raw.toLowerCase();
    const equiv = /equivalent|等价|等同|相同/.test(lower) && !/not equivalent|不等|不同/.test(lower);
    return { equivalent: equiv, missing: [], extra: [], reasoning: raw.slice(0, 100) };
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
    const family = MODELS[judgeModelKey]?.apiFamily ?? 'opencode';
    raw = family === 'opencode'
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

export interface CalibrationPair extends CalibrationFilePair {
  id?: string;
  short_description?: string;
}

interface CalibrationFilePair {
  reference: string;
  candidate: string;
  ground_truth: boolean;
}

async function runJudgeCalibrationConcurrent(
  pairs: CalibrationPair[],
  judgeModelKey: string,
  concurrency = 1,
): Promise<CalibrationResult> {
  const modelId = MODELS[judgeModelKey]?.id ?? judgeModelKey;
  const results: Array<{ predicted: boolean; actual: boolean; label: string }> = [];
  const t0 = Date.now();
  const total = pairs.length;

  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < total) {
      const i = nextIndex++;
      const pair = pairs[i];
      const label = pair.id ?? `pair ${i + 1}`;
      let r: { predicted: boolean; actual: boolean; label: string };
      try {
        const result = await judgeEquivalence(
          pair.reference, pair.candidate, modelId, judgeModelKey,
        );
        r = { predicted: result.equivalent, actual: pair.ground_truth, label };
      } catch (e: any) {
        r = { predicted: false, actual: pair.ground_truth, label: `${label} (error: ${e.message})` };
      }
      results.push(r);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      const status = r.predicted && r.actual ? '✓ TP' :
        !r.predicted && !r.actual ? '✓ TN' :
        r.predicted && !r.actual ? '✗ FP' : '✗ FN';
      console.log(`  [${results.length}/${total}] ${r.label} … ${status}  (${elapsed}s)`);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  let tp = 0, tn = 0, fp = 0, fn = 0;
  for (const r of results) {
    if (r.predicted && r.actual) tp++;
    else if (!r.predicted && !r.actual) tn++;
    else if (r.predicted && !r.actual) fp++;
    else fn++;
  }

  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
  const recall    = (tp + fn) > 0 ? tp / (tp + fn) : 0;
  const f1        = (precision + recall) > 0
    ? (2 * precision * recall) / (precision + recall) : 0;
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`  └─ final: TP=${tp} TN=${tn} FP=${fp} FN=${fn} F1=${(f1 * 100).toFixed(1)}%  (${elapsed}s)`);

  return {
    total:     pairs.length,
    correct:   tp + tn,
    tp, tn, fp, fn,
    precision: round(precision),
    recall:    round(recall),
    f1:        round(f1),
    passed:    f1 >= 0.90,
  };
}

export async function runJudgeCalibration(
  pairs: CalibrationPair[],
  judgeModelKey: string,
  concurrency = 1,
): Promise<CalibrationResult> {
  return runJudgeCalibrationConcurrent(pairs, judgeModelKey, concurrency);
}
