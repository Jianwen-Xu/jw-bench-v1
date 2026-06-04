import * as dotenv from 'dotenv';
dotenv.config();

export type Format = 'jsx' | 'json-en' | 'xu-c' | 'xu-d';
export type Scenario = 'A' | 'B';
export type Phase = 'pilot' | 'full' | 'judge-calibration';

export interface ModelConfig {
  id: string;
  apiFamily: 'opencode' | 'deepseek';
  chineseAffinity: 'claude' | 'deepseek';
  size: 'heavy' | 'light';
  inputPricePer1kTokens: number;
  outputPricePer1kTokens: number;
  judgeModelKey: string;
  enabled: boolean;
}

export const MODELS: Record<string, ModelConfig> = {
  'opencode-big-pickle': {
    id: 'opencode/big-pickle',
    apiFamily: 'opencode',
    chineseAffinity: 'claude',
    size: 'heavy',
    inputPricePer1kTokens: 0,
    outputPricePer1kTokens: 0,
    judgeModelKey: 'opencode-big-pickle',
    enabled: false,
  },
  'deepseek-v4-pro': {
    id: 'deepseek-chat',
    apiFamily: 'deepseek',
    chineseAffinity: 'deepseek',
    size: 'heavy',
    inputPricePer1kTokens: 0.002,
    outputPricePer1kTokens: 0.008,
    judgeModelKey: 'opencode-big-pickle',
    enabled: false,
  },
  'deepseek-v4-flash': {
    id: 'deepseek-chat',
    apiFamily: 'deepseek',
    chineseAffinity: 'deepseek',
    size: 'light',
    inputPricePer1kTokens: 0.00027,
    outputPricePer1kTokens: 0.0011,
    judgeModelKey: 'opencode-big-pickle',
    enabled: false,
  },
  'opencode-deepseek-v4-flash': {
    id: 'opencode/deepseek-v4-flash-free',
    apiFamily: 'opencode',
    chineseAffinity: 'deepseek',
    size: 'light',
    inputPricePer1kTokens: 0,
    outputPricePer1kTokens: 0,
    judgeModelKey: 'opencode-deepseek-v4-flash',
    enabled: true,
  },
};

export function getActiveModels(includeDeepSeek = false): string[] {
  return Object.entries(MODELS)
    .filter(([, cfg]) => cfg.enabled || (includeDeepSeek && cfg.apiFamily === 'deepseek'))
    .map(([key]) => key);
}

export const PILOT_CONFIG = {
  models: ['opencode-big-pickle'],
  formats: ['jsx', 'json-en', 'xu-c', 'xu-d'] as Format[],
  scenarios: ['A'] as Scenario[],
  taskIds: ['task-001', 'task-002', 'task-003', 'task-004', 'task-005'],
  repetitions: 3,
  temperature: 0,
};

export const FULL_CONFIG = {
  models: Object.keys(MODELS).filter(k => MODELS[k].enabled),
  formats: ['jsx', 'json-en', 'xu-c', 'xu-d'] as Format[],
  scenarios: ['A', 'B'] as Scenario[],
  repetitions: 3,
  temperature: 0,
};

// Claude models use local Claude Code auth -- no API key needed
// DeepSeek still requires an explicit API key
export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? '';
