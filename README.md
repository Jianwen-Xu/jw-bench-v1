# JW-Bench v1

**Chinese Wire vs JSX Empirical Benchmark** — measures whether LLMs generate usable XU Chinese wire format at a significantly higher UGR (Useful Generation Rate) than JSX.

## Hypotheses

| ID | Description |
|---|---|
| **H1 (Confirmatory)** | UGR(XU-CN-D) > UGR(JSX) at α=0.05, Cohen's h ≥ 0.30 |
| **H2 (Secondary)** | Token count(XU) < 0.4 × Token count(JSX) |
| **H3 (Patch)** | XU patch UGR ≥ JSX full-page rewrite; token saving ≥ 80% |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure keys (.env only needed for DeepSeek)
cp .env.example .env
# Fill in DEEPSEEK_API_KEY if you want to run DeepSeek models

# 3. Validate manifests
npm run validate-manifests

# 4. Run Judge Calibration (must pass F1 >= 0.90 gate)
npm run judge-cal

# 5. Run Pilot (Claude only, ~60 calls)
npm run pilot

# 5b. Run Pilot with DeepSeek models included
npx ts-node benchmark/run.ts --phase pilot --deepseek

# 6. View report
cat runs/pilot-<date>/pilot-report.md
```

## How Claude is Called

Claude models are invoked via the **`claude -p` CLI subprocess** — no Anthropic API key required, no `@anthropic-ai/claude-code` npm package. Authentication uses your locally logged-in `claude` session.

```
claude -p "<prompt>" --model <model-id> --system-prompt-file <tmp> --output-format json
```

DeepSeek models use the OpenAI-compatible REST API and require `DEEPSEEK_API_KEY` in `.env`.

## DeepSeek: Opt-in

DeepSeek models are **disabled by default**. Enable with `--deepseek`:

```bash
npm run pilot -- --deepseek          # or:
npx ts-node benchmark/run.ts --phase pilot --deepseek
npx ts-node benchmark/run.ts --phase full  --deepseek --n 80
```

Requires `DEEPSEEK_API_KEY` to be set; the runner exits immediately if the key is missing.

## Project Structure

```
jw-bench-v1/
  tasks/                        # 5 tasks x 4 format reference specs
    task-001-user-card/
    task-002-confirm-dialog/
    task-003-login-form/
    task-004-product-header/
    task-005-settings-page/
  manifests/                    # 15 components x 4 format manifests
    jsx/                        # TypeScript interfaces
    json-en/                    # English short-key JSON
    xu-c/                       # Chinese-field JSON (block format)
    xu-d/                       # Chinese-field JSON (line format)
  judge-calibration/            # 60 TP/TN spec pairs
    tp/                         # 30 equivalent pairs
    tn/                         # 30 non-equivalent pairs
    manifest.json
  benchmark/
    config.ts                   # Model registry + getActiveModels()
    run.ts                      # Main runner (pilot / full / judge-cal)
    judge.ts                    # LLM-as-judge (M5 semantic equivalence)
    stats.ts                    # Wilson CI, Cohen's h, attrition funnel
    prompts/                    # 4 system prompts (one per format)
    validators/
      jsx.ts                    # JSX parser + manifest validation (M1-M4)
      xu.ts                     # XU lexer + Zod validation (M1-M4)
  runs/                         # Run outputs (gitignored)
  pre-registration.md           # Frozen hypotheses and decision thresholds
  .env.example
```

## Decision Rules (after Pilot)

| Cohen's h (XU-CN-D − JSX) | Action |
|---|---|
| `h < 0.10` | **Kill** — effect is negligible, stop investment |
| `0.10 ≤ h < 0.30` | **Iterate** — improve prompts / examples, re-run Pilot |
| `h ≥ 0.30` | **Go to Full** — look up n from §6.2 table, run full phase |

## Models

| Key | API ID | Call Method | Default |
|---|---|---|---|
| `claude-sonnet-4-6` | `claude-sonnet-4-6` | `claude -p` CLI | ✅ enabled |
| `claude-opus-4-7` | `claude-opus-4-7` | `claude -p` CLI | ✅ enabled |
| `deepseek-v4-pro` | `deepseek-chat` | OpenAI-compat API | ⬜ `--deepseek` |
| `deepseek-v4-flash` | `deepseek-chat` | OpenAI-compat API | ⬜ `--deepseek` |

## UGR Metric

UGR = M1 (parse) × M2 (schema) × M3 (component exists) × M4 (prop valid) × M5 (semantic equiv.)

All five gates must pass for a generation to count as "useful".

## Notes

- **Judge Calibration F1 < 0.90 blocks Pilot** — do not skip
- All calls use `temperature=0` for reproducibility
- Each task gets an independent session (no context reuse)
- Token counts for Claude are *estimated* via `gpt-tokenizer` cl100k_base (CLI does not expose usage); DeepSeek counts are exact from the API response
- Model version pinning: see `pre-registration.md`
