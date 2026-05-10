import * as dotenv from 'dotenv';
dotenv.config();

export type Format = 'jsx' | 'json-en' | 'xu-c' | 'xu-d';
export type Scenario = 'A' | 'B';
export type Phase = 'pilot' | 'full' | 'judge-calibration';

export interface ModelConfig {
  /** API model string passed to --model flag / DeepSeek API */
  id: string;
  /**
   * claude-code = local logged-in claude CLI (@anthropic-ai/claude-code SDK query())
   * deepseek    = OpenAI-compat REST API (requires DEEPSEEK_API_KEY)
   */
  apiFamily: 'claude-code' | 'deepseek';
  chineseAffinity: 'claude' | 'deepseek';
  size: 'heavy' | 'light';
  inputPricePer1kTokens: number;   // USD, for cost estimation
  outputPricePer1kTokens: number;
  /** Key in MODELS that acts as judge for this model */
  judgeModelKey: string;
  /**
   * Whether this model is enabled by default.
   * DeepSeek models default to false — enable with --deepseek flag.
   * Claude models default to true.
   */
  enabled: boolean;
}

export const MODELS: Record<string, ModelConfig> = {
  'claude-sonnet-4-6': {
    id: 'claude-sonnet-4-6',
    apiFamily: 'claude-code',
    chineseAffinity: 'claude',
    size: 'light',
    inputPricePer1kTokens: 0.003,
    outputPricePer1kTokens: 0.015,
    judgeModelKey: 'claude-opus-4-7',
    enabled: true,
  },
  'claude-opus-4-7': {
    id: 'claude-opus-4-7',
    apiFamily: 'claude-code',
    chineseAffinity: 'claude',
    size: 'heavy',
    inputPricePer1kTokens: 0.015,
    outputPricePer1kTokens: 0.075,
    judgeModelKey: 'claude-sonnet-4-6',
    enabled: true,
  },
  // TODO: verify DeepSeek V4 Pro / V4 Flash API model IDs before running Full phase.
  // Current DeepSeek API uses 'deepseek-chat' for V4; Flash naming may differ.
  'deepseek-v4-pro': {
    id: 'deepseek-chat',
    apiFamily: 'deepseek',
    chineseAffinity: 'deepseek',
    size: 'heavy',
    inputPricePer1kTokens: 0.002,
    outputPricePer1kTokens: 0.008,
    judgeModelKey: 'claude-sonnet-4-6',
    enabled: false,
  },
  'deepseek-v4-flash': {
    id: 'deepseek-chat',
    apiFamily: 'deepseek',
    chineseAffinity: 'deepseek',
    size: 'light',
    inputPricePer1kTokens: 0.00027,
    outputPricePer1kTokens: 0.0011,
    judgeModelKey: 'claude-sonnet-4-6',
    enabled: false,
  },
};

/** Returns model keys to run. DeepSeek included only when includeDeepSeek=true. */
export function getActiveModels(includeDeepSeek = false): string[] {
  return Object.entries(MODELS)
    .filter(([, cfg]) => cfg.enabled || (includeDeepSeek && cfg.apiFamily === 'deepseek'))
    .map(([key]) => key);
}

export const PILOT_CONFIG = {
  // default model list; runner overrides with getActiveModels() after parsing flags
  models: ['claude-sonnet-4-6'],
  formats: ['jsx', 'json-en', 'xu-c', 'xu-d'] as Format[],
  scenarios: ['A'] as Scenario[],
  taskIds: ['task-001', 'task-002', 'task-003', 'task-004', 'task-005'],
  repetitions: 3,
  temperature: 0,
};

export const FULL_CONFIG = {
  // default to enabled-only models; runner overrides with getActiveModels() after parsing flags
  models: Object.keys(MODELS).filter(k => MODELS[k].enabled),
  formats: ['jsx', 'json-en', 'xu-c', 'xu-d'] as Format[],
  scenarios: ['A', 'B'] as Scenario[],
  repetitions: 3,
  temperature: 0,
  // n (tasks per cell) determined after Pilot by Cohen's h
};

// Claude models use local Claude Code auth — no API key needed
// DeepSeek still requires an explicit API key
export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? '';
