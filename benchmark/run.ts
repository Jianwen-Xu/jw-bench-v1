#!/usr/bin/env ts-node
/**
 * JW-Bench v1 — Main benchmark runner.
 *
 * Claude models: spawns `claude -p` CLI subprocess (local auth, no API key, no npm CVEs)
 * DeepSeek models: OpenAI-compat REST API (requires DEEPSEEK_API_KEY)
 *
 * Usage:
 *   npx ts-node benchmark/run.ts --phase pilot
 *   npx ts-node benchmark/run.ts --phase judge-calibration
 *   npx ts-node benchmark/run.ts --phase full --n 80
 *   npx ts-node benchmark/run.ts --phase pilot --deepseek
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { program } from 'commander';
import {
  MODELS, PILOT_CONFIG, FULL_CONFIG, getActiveModels, Format, Scenario,
  DEEPSEEK_API_KEY,
} from './config';
import { validateXU } from './validators/xu';
import { validateJSX } from './validators/jsx';
import { judgeEquivalence, runJudgeCalibration, type CalibrationResult } from './judge';
import {
  wilsonCI, cohensH, attritionFunnel, formatFunnel, lookupRequiredN,
} from './stats';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface RunRecord {
  runId: string;
  phase: string;
  model: string;
  format: Format;
  scenario: Scenario;
  taskId: string;
  rep: number;
  M1: 0|1; M2: 0|1; M3: 0|1; M4: 0|1; M5: 0|1;
  UGR: 0|1;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costUsd: number;
  errors: string[];
  rawOutput: string;
}

interface CallResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

const ROOT = path.join(__dirname, '..');

const execFileAsync = promisify(execFile);

// ──────────────────────────────────────────────
// Token estimation (cl100k_base via gpt-tokenizer)
// CLI does not expose token counts; always estimated.
// ──────────────────────────────────────────────
let _encode: ((text: string) => number[]) | undefined;
function estimateTokens(text: string): number {
  if (!_encode) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { encode } = require('gpt-tokenizer');
      _encode = encode;
    } catch {
      // Rough fallback: Latin ~4 chars/token, CJK ~1 char/token
      const cjk = (text.match(/[一-鿿]/g) ?? []).length;
      const rest = text.length - cjk;
      return cjk + Math.ceil(rest / 4);
    }
  }
  return _encode!(text).length;
}

// ──────────────────────────────────────────────
// callModel — claude CLI subprocess path
// ──────────────────────────────────────────────
async function callClaudeCLI(
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<CallResult> {
  const t0 = Date.now();

  // Write system prompt to a temp file — avoids shell-escaping issues with long/multi-line prompts
  const tmpSys = path.join(os.tmpdir(), `jw-bench-sys-${process.pid}-${Date.now()}.txt`);
  fs.writeFileSync(tmpSys, systemPrompt, 'utf-8');

  let stdout = '';
  try {
    const result = await execFileAsync('claude', [
      '-p', userPrompt,
      '--model', modelId,
      '--system-prompt-file', tmpSys,
      '--output-format', 'json',  // structured output: {result, cost_usd, ...}
    ], {
      maxBuffer: 10 * 1024 * 1024,  // 10 MB
      timeout:   120_000,            // 2 min per call
    });
    stdout = result.stdout;
  } finally {
    try { fs.unlinkSync(tmpSys); } catch { /* ignore */ }
  }

  // Parse JSON output — falls back to raw text if claude returns plain text
  let outputText = '';
  let inputTokens = 0;
  let outputTokens = 0;
  try {
    const parsed = JSON.parse(stdout) as Record<string, unknown>;
    outputText   = (parsed['result'] as string) ?? stdout.trim();
    // claude --output-format json may include usage in future; check both shapes
    const usage  = (parsed['usage'] ?? parsed['inputUsage']) as Record<string, number> | undefined;
    inputTokens  = usage?.['input_tokens']  ?? 0;
    outputTokens = usage?.['output_tokens'] ?? 0;
  } catch {
    outputText = stdout.trim();
  }

  // CLI does not currently expose token counts — always fall back to estimator
  if (inputTokens === 0)  inputTokens  = estimateTokens(systemPrompt + '\n' + userPrompt);
  if (outputTokens === 0) outputTokens = estimateTokens(outputText);

  return { text: outputText, inputTokens, outputTokens, latencyMs: Date.now() - t0 };
}

// ──────────────────────────────────────────────
// callModel — DeepSeek OpenAI-compat path
// ──────────────────────────────────────────────
async function callDeepSeek(
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<CallResult> {
  const t0 = Date.now();
  const { default: OpenAI } = await import('openai');
  const ds = new OpenAI({
    apiKey: DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com',
  });
  const r = await ds.chat.completions.create({
    model: modelId,
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt   },
    ],
  });
  return {
    text:         r.choices[0]?.message?.content ?? '',
    inputTokens:  r.usage?.prompt_tokens     ?? 0,
    outputTokens: r.usage?.completion_tokens ?? 0,
    latencyMs:    Date.now() - t0,
  };
}

// ──────────────────────────────────────────────
// Unified dispatcher
// ──────────────────────────────────────────────
async function callModel(
  modelKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<CallResult> {
  const cfg = MODELS[modelKey];
  if (cfg.apiFamily === 'claude-code') {
    return callClaudeCLI(cfg.id, systemPrompt, userPrompt);
  }
  return callDeepSeek(cfg.id, systemPrompt, userPrompt);
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function loadSystemPrompt(format: Format): string {
  return fs.readFileSync(
    path.join(__dirname, 'prompts', `system-${format}.txt`),
    'utf-8',
  );
}

function loadTask(taskId: string): {
  prompt: string;
  refs: Record<Format, string>;
  checks: string[];
} {
  const matches = fs.readdirSync(path.join(ROOT, 'tasks'))
    .filter(d => d.startsWith(taskId));
  if (matches.length === 0) throw new Error(`Task not found: ${taskId}`);
  const dir = path.join(ROOT, 'tasks', matches[0]);
  return {
    prompt: fs.readFileSync(path.join(dir, 'prompt.md'), 'utf-8'),
    refs: {
      jsx:       fs.readFileSync(path.join(dir, 'ref.jsx'),      'utf-8'),
      'json-en': fs.readFileSync(path.join(dir, 'ref.json-en'), 'utf-8'),
      'xu-c':    fs.readFileSync(path.join(dir, 'ref.xu-c'),    'utf-8'),
      'xu-d':    fs.readFileSync(path.join(dir, 'ref.xu-d'),    'utf-8'),
    },
    checks: JSON.parse(fs.readFileSync(path.join(dir, 'checks.json'), 'utf-8')),
  };
}

function validate(
  output: string,
  format: Format,
): { M1: 0|1; M2: 0|1; M3: 0|1; M4: 0|1; errors: string[] } {
  if (format === 'jsx')    return validateJSX(output);
  if (format === 'xu-c')   return validateXU(output, 'xu-c');
  if (format === 'xu-d')   return validateXU(output, 'xu-d');
  try { JSON.parse(output); return { M1: 1, M2: 1, M3: 1, M4: 1, errors: [] }; }
  catch (e: any) { return { M1: 0, M2: 0, M3: 0, M4: 0, errors: [`json: ${e.message}`] }; }
}

function makeRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function saveRecord(record: RunRecord, runsDir: string) {
  const dir = path.join(runsDir, record.model, record.format);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${record.taskId}_rep${record.rep}_${record.runId}.json`),
    JSON.stringify(record, null, 2),
  );
}

// ──────────────────────────────────────────────
// Judge calibration phase
// ──────────────────────────────────────────────
async function runJudgeCalibrationPhase() {
  console.log('🔬  Running judge calibration (60 pairs) via Claude Code…\n');
  const calDir = path.join(ROOT, 'judge-calibration');
  const manifest = JSON.parse(
    fs.readFileSync(path.join(calDir, 'manifest.json'), 'utf-8'),
  );
  const pairs: Array<{ reference: string; candidate: string; ground_truth: boolean }> = [];
  for (const id of [...manifest.tp, ...manifest.tn]) {
    const folder = id.startsWith('tp') ? 'tp' : 'tn';
    const p = JSON.parse(
      fs.readFileSync(path.join(calDir, folder, `${id}.json`), 'utf-8'),
    );
    pairs.push({ reference: p.reference, candidate: p.candidate, ground_truth: p.ground_truth });
  }

  const result: CalibrationResult = await runJudgeCalibration(pairs, 'claude-sonnet-4-6');

  console.log('Results:');
  console.log(`  Total: ${result.total}   Correct: ${result.correct}`);
  console.log(`  TP: ${result.tp}  TN: ${result.tn}  FP: ${result.fp}  FN: ${result.fn}`);
  console.log(`  Precision: ${(result.precision * 100).toFixed(1)}%`);
  console.log(`  Recall:    ${(result.recall    * 100).toFixed(1)}%`);
  console.log(`  F1:        ${(result.f1        * 100).toFixed(1)}%\n`);

  if (result.passed) {
    console.log('✅  Judge calibration PASSED (F1 ≥ 0.90). Proceed to Pilot.');
  } else {
    console.error('❌  Judge calibration FAILED (F1 < 0.90).');
    console.error('    Revise JUDGE_SYSTEM_PROMPT in judge.ts, then re-run.\n');
    process.exit(1);
  }
  const outPath = path.join(ROOT, 'runs', 'judge-calibration-result.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
}

// ──────────────────────────────────────────────
// Pilot phase
// ──────────────────────────────────────────────
async function runPilot(models: string[]) {
  const dateTag = new Date().toISOString().slice(0, 10);
  const runsDir  = path.join(ROOT, 'runs', `pilot-${dateTag}`);
  fs.mkdirSync(runsDir, { recursive: true });

  const cfg = { ...PILOT_CONFIG, models };
  const total =
    cfg.models.length * cfg.formats.length *
    cfg.scenarios.length * cfg.taskIds.length * cfg.repetitions;
  console.log(`🚀  Pilot: ${total} calls — models: ${cfg.models.join(', ')}\n`);

  const records: RunRecord[] = [];
  let done = 0;

  for (const modelKey of cfg.models) {
    const modelCfg = MODELS[modelKey];
    for (const format of cfg.formats) {
      const sysPrompt = loadSystemPrompt(format);
      for (const scenario of cfg.scenarios as Scenario[]) {
        for (const taskId of cfg.taskIds) {
          const task = loadTask(taskId);
          for (let rep = 1; rep <= cfg.repetitions; rep++) {
            process.stdout.write(
              `[${++done}/${total}] ${modelKey} × ${format} × ${taskId} rep${rep} … `,
            );

            let cr: CallResult = { text: '', inputTokens: 0, outputTokens: 0, latencyMs: 0 };
            let callErr = '';
            try {
              cr = await callModel(modelKey, sysPrompt, task.prompt);
            } catch (e: any) {
              callErr = e.message ?? String(e);
              console.log(`ERROR: ${callErr}`);
            }

            const val = cr.text
              ? validate(cr.text, format)
              : { M1: 0 as const, M2: 0 as const, M3: 0 as const, M4: 0 as const,
                  errors: [callErr || 'empty output'] };

            let M5: 0|1 = 0;
            const judgeErrs: string[] = [];
            const objPass = val.M1 && val.M2 && val.M3 && val.M4;

            if (objPass && cr.text) {
              try {
                const jr = await judgeEquivalence(
                  task.refs[format],
                  cr.text,
                  MODELS[modelCfg.judgeModelKey].id,
                  modelCfg.judgeModelKey,
                );
                M5 = jr.equivalent ? 1 : 0;
                if (!jr.equivalent) judgeErrs.push(...jr.missing.map(m => `missing: ${m}`));
              } catch (e: any) {
                judgeErrs.push(`judge: ${e.message}`);
              }
            }

            const UGR = (objPass && M5) ? 1 : 0;
            const costUsd =
              (cr.inputTokens  * modelCfg.inputPricePer1kTokens +
               cr.outputTokens * modelCfg.outputPricePer1kTokens) / 1000;

            const record: RunRecord = {
              runId: makeRunId(), phase: 'pilot', model: modelKey,
              format, scenario, taskId, rep,
              M1: val.M1, M2: val.M2, M3: val.M3, M4: val.M4, M5, UGR,
              inputTokens: cr.inputTokens, outputTokens: cr.outputTokens,
              latencyMs: cr.latencyMs, costUsd,
              errors: [...val.errors, ...judgeErrs],
              rawOutput: cr.text,
            };

            records.push(record);
            saveRecord(record, runsDir);
            console.log(
              `UGR=${UGR} M1=${val.M1} M2=${val.M2} M3=${val.M3} M4=${val.M4} M5=${M5}`,
            );

            await new Promise(r => setTimeout(r, 300));
          }
        }
      }
    }
  }

  generatePilotReport(records, runsDir);
}

// ──────────────────────────────────────────────
// Pilot report
// ──────────────────────────────────────────────
function generatePilotReport(records: RunRecord[], runsDir: string) {
  const formats: Format[] = ['jsx', 'json-en', 'xu-c', 'xu-d'];
  let report =
    `# JW-Bench v1 — Pilot Report\n\nGenerated: ${new Date().toISOString()}\n\n` +
    `> ⚠️  Token counts for **Claude models** are *estimated* via cl100k_base (gpt-tokenizer).\n` +
    `> DeepSeek token counts are exact (API usage field).\n\n`;

  report += `## UGR Summary\n\n| Format | UGR | 95% CI (Wilson) | n |\n|---|---|---|---|\n`;
  const ugrMap: Record<string, number[]> = {};
  for (const fmt of formats) {
    ugrMap[fmt] = records.filter(r => r.format === fmt).map(r => r.UGR);
    const s = ugrMap[fmt].filter(Boolean).length;
    const ci = wilsonCI(s, ugrMap[fmt].length);
    report += `| ${fmt} | ${(ci.p*100).toFixed(1)}% | [${(ci.lower*100).toFixed(1)}, ${(ci.upper*100).toFixed(1)}] | ${ci.n} |\n`;
  }

  const xuD = ugrMap['xu-d'] ?? [];
  const jsx  = ugrMap['jsx']  ?? [];
  const pXuD = xuD.length ? xuD.filter(Boolean).length / xuD.length : 0;
  const pJSX = jsx.length ? jsx.filter(Boolean).length / jsx.length : 0;
  const h = cohensH(pXuD, pJSX);
  const { action } = lookupRequiredN(Math.abs(h));

  report += `\n## H1: XU-CN-D vs JSX\n\n` +
    `- UGR(XU-CN-D) = ${(pXuD*100).toFixed(1)}%\n` +
    `- UGR(JSX)     = ${(pJSX*100).toFixed(1)}%\n` +
    `- Cohen's h    = ${h}\n` +
    `- **Decision**: ${action}\n`;

  report += `\n## Attrition Funnels\n\n`;
  for (const fmt of formats) {
    report += '```\n' + formatFunnel(fmt, attritionFunnel(records.filter(r => r.format === fmt))) + '\n```\n\n';
  }

  report += `## Token Economics (median input+output)\n\n| Format | Median Tokens |\n|---|---|\n`;
  for (const fmt of formats) {
    const totals = records.filter(r => r.format === fmt)
      .map(r => r.inputTokens + r.outputTokens).sort((a, b) => a - b);
    report += `| ${fmt} | ${totals[Math.floor(totals.length / 2)] ?? 0} |\n`;
  }

  const reportPath = path.join(runsDir, 'pilot-report.md');
  fs.writeFileSync(reportPath, report);
  console.log(`\n📊  Pilot report: ${reportPath}`);
  console.log(`\n── Cohen's h (XU-CN-D vs JSX) = ${h} → ${action} ──\n`);
}

// ──────────────────────────────────────────────
// Full phase runner
// ──────────────────────────────────────────────
async function runFull(models: string[], n: number) {
  const dateTag = new Date().toISOString().slice(0, 10);
  const runsDir  = path.join(ROOT, 'runs', `full-${dateTag}`);
  fs.mkdirSync(runsDir, { recursive: true });

  const cfg = { ...FULL_CONFIG, models };
  // For full phase we enumerate all task IDs found in tasks/
  const taskIds = fs.readdirSync(path.join(ROOT, 'tasks'))
    .filter(d => d.startsWith('task-'))
    .sort()
    .slice(0, n);

  const total =
    cfg.models.length * cfg.formats.length *
    cfg.scenarios.length * taskIds.length * cfg.repetitions;
  console.log(`Running full phase: ${total} calls — models: ${cfg.models.join(', ')}, n=${taskIds.length}\n`);

  const records: RunRecord[] = [];
  let done = 0;

  for (const modelKey of cfg.models) {
    const modelCfg = MODELS[modelKey];
    for (const format of cfg.formats) {
      const sysPrompt = loadSystemPrompt(format);
      for (const scenario of cfg.scenarios as Scenario[]) {
        for (const taskId of taskIds) {
          const task = loadTask(taskId);
          for (let rep = 1; rep <= cfg.repetitions; rep++) {
            process.stdout.write(
              `[${++done}/${total}] ${modelKey} x ${format} x ${taskId} rep${rep} ... `,
            );

            let cr: CallResult = { text: '', inputTokens: 0, outputTokens: 0, latencyMs: 0 };
            let callErr = '';
            try {
              cr = await callModel(modelKey, sysPrompt, task.prompt);
            } catch (e: any) {
              callErr = e.message ?? String(e);
              console.log(`ERROR: ${callErr}`);
            }

            const val = cr.text
              ? validate(cr.text, format)
              : { M1: 0 as const, M2: 0 as const, M3: 0 as const, M4: 0 as const,
                  errors: [callErr || 'empty output'] };

            let M5: 0|1 = 0;
            const judgeErrs: string[] = [];
            const objPass = val.M1 && val.M2 && val.M3 && val.M4;

            if (objPass && cr.text) {
              try {
                const jr = await judgeEquivalence(
                  task.refs[format],
                  cr.text,
                  MODELS[modelCfg.judgeModelKey].id,
                  modelCfg.judgeModelKey,
                );
                M5 = jr.equivalent ? 1 : 0;
                if (!jr.equivalent) judgeErrs.push(...jr.missing.map(m => `missing: ${m}`));
              } catch (e: any) {
                judgeErrs.push(`judge: ${e.message}`);
              }
            }

            const UGR = (objPass && M5) ? 1 : 0;
            const costUsd =
              (cr.inputTokens  * modelCfg.inputPricePer1kTokens +
               cr.outputTokens * modelCfg.outputPricePer1kTokens) / 1000;

            const record: RunRecord = {
              runId: makeRunId(), phase: 'full', model: modelKey,
              format, scenario, taskId, rep,
              M1: val.M1, M2: val.M2, M3: val.M3, M4: val.M4, M5, UGR,
              inputTokens: cr.inputTokens, outputTokens: cr.outputTokens,
              latencyMs: cr.latencyMs, costUsd,
              errors: [...val.errors, ...judgeErrs],
              rawOutput: cr.text,
            };

            records.push(record);
            saveRecord(record, runsDir);
            console.log(
              `UGR=${UGR} M1=${val.M1} M2=${val.M2} M3=${val.M3} M4=${val.M4} M5=${M5}`,
            );

            await new Promise(r => setTimeout(r, 300));
          }
        }
      }
    }
  }

  console.log(`\nFull run complete. ${records.length} records saved to ${runsDir}`);
}

// ──────────────────────────────────────────────
// CLI
// ──────────────────────────────────────────────
program
  .option('--phase <phase>', 'pilot | full | judge-calibration', 'pilot')
  .option('--n <n>', 'tasks per cell for full phase', '80')
  .option('--deepseek', 'include DeepSeek models (requires DEEPSEEK_API_KEY in .env)', false)
  .parse();

const opts = program.opts();
const includeDeepSeek: boolean = !!opts.deepseek;

if (includeDeepSeek && !DEEPSEEK_API_KEY) {
  console.error('Error: --deepseek flag requires DEEPSEEK_API_KEY to be set in .env');
  process.exit(1);
}

const activeModels = getActiveModels(includeDeepSeek);

(async () => {
  if (opts.phase === 'judge-calibration') {
    await runJudgeCalibrationPhase();
  } else if (opts.phase === 'pilot') {
    await runPilot(activeModels);
  } else if (opts.phase === 'full') {
    await runFull(activeModels, parseInt(opts.n, 10));
  } else {
    console.log('Unknown phase. Use: pilot | full | judge-calibration');
  }
})().catch((e: Error) => { console.error(e); process.exit(1); });
