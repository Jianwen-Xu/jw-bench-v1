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
  useRegistry?: boolean;
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
    id: 'deepseek-chat',
    apiFamily: 'deepseek',
    chineseAffinity: 'deepseek',
    size: 'light',
    inputPricePer1kTokens: 0.00027,
    outputPricePer1kTokens: 0.0011,
    judgeModelKey: 'opencode-deepseek-v4-flash',
    enabled: true,
  },
  'opencode-deepseek-v4-flash-registry': {
    id: 'deepseek-chat',
    apiFamily: 'deepseek',
    chineseAffinity: 'deepseek',
    size: 'light',
    inputPricePer1kTokens: 0.00027,
    outputPricePer1kTokens: 0.0011,
    judgeModelKey: 'opencode-deepseek-v4-flash',
    enabled: false,
    useRegistry: true,
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
  taskIds: [
    'task-001', 'task-002', 'task-003', 'task-004', 'task-005',
    'task-006', 'task-007', 'task-008', 'task-009', 'task-010',
    'task-011', 'task-012', 'task-013', 'task-014', 'task-015',
    'task-016', 'task-017', 'task-018', 'task-019', 'task-020',
    'task-021', 'task-022', 'task-023', 'task-024', 'task-025',
    'task-026', 'task-027', 'task-028', 'task-029', 'task-030',
    'task-031', 'task-032', 'task-033', 'task-034', 'task-035',
    'task-036', 'task-037', 'task-038', 'task-039', 'task-040',
    'task-041', 'task-042', 'task-043', 'task-044', 'task-045',
    'task-046', 'task-047', 'task-048', 'task-049', 'task-050',
    'task-051', 'task-052', 'task-053', 'task-054', 'task-055',
    'task-056', 'task-057', 'task-058', 'task-059', 'task-060',
    'task-061', 'task-062', 'task-063', 'task-064', 'task-065',
    'task-066', 'task-067', 'task-068', 'task-069', 'task-070',
    'task-071', 'task-072', 'task-073', 'task-074', 'task-075',
    'task-076', 'task-077', 'task-078', 'task-079', 'task-080',
  ],
  repetitions: 3,
  temperature: 0,
};

export const FULL_CONFIG = {
  models: Object.keys(MODELS).filter(k => MODELS[k].enabled),
  formats: ['jsx', 'json-en', 'xu-c', 'xu-d'] as Format[],
  scenarios: ['A'] as Scenario[],
  repetitions: 3,
  temperature: 0,
};

// Claude models use local Claude Code auth -- no API key needed
// DeepSeek still requires an explicit API key
export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? '';
