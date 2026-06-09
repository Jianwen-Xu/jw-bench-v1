/**
 * Fake component registry for benchmark.
 *
 * Simulates XU's MCP discovery API (find / list / describe) without
 * actual embedding search. Uses keyword + tag matching.
 *
 * Exposed to the LLM via function calling in benchmark/run.ts.
 */
import * as fs from 'fs';
import * as path from 'path';

// ── Types ──

interface CompManifest {
  name: string;
  alias_en?: string;
  kind: string;
  props_order: string[];
  props: Record<string, {
    type: string;
    values?: string[];
    alias_en?: string;
  }>;
}

interface CompEntry extends CompManifest {
  tag: string;
  tags: string[];
  summary: string;
  examples: string[];
}

// ── Load & index ──

let _registry: CompEntry[] | null = null;

function loadRegistry(): CompEntry[] {
  if (_registry) return _registry;

  const raw: Record<string, any> = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'manifests', 'xu-d', 'components.json'), 'utf-8'),
  );

  // Tag each component by keywords for search
  const tagMap: Record<string, string[]> = {
    '列': ['容器', '纵向', '纵向容器', '垂直', 'layout', 'container', 'column', 'vertical'],
    '排': ['容器', '横向', '横向容器', '水平', 'layout', 'container', 'row', 'horizontal'],
    '卡': ['容器', '卡片', 'card', '布局', 'layout', 'container'],
    '域': ['容器', '表单域', '表单', 'form', 'container', 'form container'],
    '文': ['文本', '文字', '标题', '段落', 'text', 'label', 'heading', 'display', '内容'],
    '图': ['图片', '图像', 'image', 'img', 'display', 'media', '展示'],
    '按': ['按钮', 'button', 'btn', 'interactive', '操作', 'action', '交互', '点击', '提交', '取消', '确认'],
    '入': ['输入框', '输入', 'input', '文本框', '交互', 'form', '表单', 'text input', 'interactive', '字段'],
    '选': ['下拉', '选择器', 'select', 'dropdown', 'picker', 'interactive', 'interactive', '交互', '选项'],
    '选框': ['复选框', 'checkbox', '勾选', '选择', 'interactive', 'interactive', '勾选框'],
    '切': ['开关', 'toggle', '切换', 'switch', 'interactive', '交互'],
    '链': ['链接', 'link', '超链接', '跳转', 'interactive', '交互', '导航'],
    '栏': ['导航栏', 'nav', 'navbar', '导航', 'navigation', '标题栏', 'tab bar'],
    '标': ['徽章', '标记', 'badge', '标签', 'tag', 'decorative', '装饰', '状态', '角标'],
    '提': ['提示', 'toast', '通知', '消息', 'snackbar', 'feedback', '反馈', '提醒'],
    '头像': ['头像', 'avatar', '头像框', 'display', '展示', '个人'],
  };

  const summaryMap: Record<string, string> = {
    '列': '纵向容器，子元素从上到下排列',
    '排': '横向容器，子元素从左到右排列',
    '卡': '卡片容器，带背景和圆角的通用容器',
    '域': '表单容器，包裹表单元素并处理提交',
    '文': '文本显示元素，支持标题/正文/价格等多种样式',
    '图': '图片展示元素，支持尺寸和圆角控制',
    '按': '可点击按钮，触发 action，支持主/次/轻三种样式',
    '入': '文本输入框，支持邮箱/密码/数字等类型，可设置必填和 placeholder',
    '选': '下拉选择器，绑定选项列表，支持必填',
    '选框': '复选框，勾选状态绑定到变量',
    '切': '开关切换，开/关状态绑定到变量',
    '链': '文字链接，点击触发 action，支持默认/淡两种样式',
    '栏': '导航栏，包含标题和返回操作',
    '标': '徽章标签，支持信息/成功/警告/危险四种颜色',
    '提': 'Toast 提示，显示成功/错误/警告/信息通知',
    '头像': '头像展示，支持大小和圆角控制',
  };

  const exampleMap: Record<string, string[]> = {
    '按': ['按 主 submit 登录', '按 次 cancel 取消'],
    '入': ['入 邮箱 必 空请输入邮箱 値email'],
    '文': ['文 标题 确认操作', '文 正文 详细说明'],
    '列': ['列\n　文 项目一\n　文 项目二'],
    '域': ['域\n　入 文 必 空输入用户名 値username\n　按 主 submit 提交'],
    '链': ['链 forgot 忘记密码？', '链 淡 goBack 返回'],
    '标': ['标 成功 5.0'],
    '切': ['切 値email_notif'],
    '选框': ['选框 値记住 记住我'],
    '栏': ['栏 题我的应用 返goBack'],
    '图': ['图 大 product'],
    '头像': ['头像 中 圆 user_avatar'],
    '卡': ['卡\n　文 标题 卡片标题\n　按 主 confirm 确认'],
    '选': ['选 値country 选项countries'],
    '提': ['提 成功 値success_toast'],
    '排': ['排\n　文 左侧\n　文 右侧'],
  };

  _registry = [];
  for (const [tag, comp] of Object.entries(raw as Record<string, CompManifest>)) {
    _registry.push({
      tag,
      name: comp.name,
      alias_en: comp.alias_en,
      kind: comp.kind,
      props_order: comp.props_order,
      props: comp.props,
      tags: tagMap[tag] ?? [],
      summary: summaryMap[tag] ?? `${comp.name} 组件`,
      examples: exampleMap[tag] ?? [],
    });
  }
  return _registry;
}

// ── Search ──

function keywordScore(entry: CompEntry, query: string): number {
  const lower = query.toLowerCase();
  let score = 0;

  // Exact tag match
  if (entry.tag === query || entry.name.toLowerCase() === lower) return 100;

  // Tag keyword match
  for (const t of entry.tags) {
    if (t.toLowerCase() === lower) { score += 30; continue; }
    if (t.toLowerCase().includes(lower) || lower.includes(t.toLowerCase())) score += 20;
  }

  // Summary match
  if (entry.summary.toLowerCase().includes(lower)) score += 10;

  // Name alias match
  if (entry.alias_en?.toLowerCase() === lower) score += 25;

  return score;
}

export function findComponents(query: string): CompEntry[] {
  const registry = loadRegistry();
  const scored = registry
    .map(e => ({ entry: e, score: keywordScore(e, query) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map(s => s.entry);
}

export function listAllComponents(): CompEntry[] {
  return loadRegistry();
}

export function describeComponent(tag: string): CompEntry | null {
  return loadRegistry().find(c => c.tag === tag || c.name === tag) ?? null;
}

// ── Format for LLM context ──

function formatProps(entry: CompEntry): string[] {
  const lines: string[] = [];
  for (const pn of entry.props_order) {
    const pd = entry.props[pn];
    if (!pd) continue;
    if (pd.type === 'enum') {
      lines.push(`  ${pn}(${pd.alias_en ?? ''}): ${pd.values?.join('/') ?? ''}`);
    } else if (pd.type === 'bool') {
      lines.push(`  ${pn}(${pd.alias_en ?? ''}): 布尔（可选）`);
    } else if (pd.type === 'actionId') {
      lines.push(`  ${pn}(${pd.alias_en ?? ''}): action 标识名`);
    } else if (pd.type === 'stateRef') {
      lines.push(`  ${pn}(${pd.alias_en ?? ''}): 状态变量名`);
    } else if (pd.type === 'string') {
      lines.push(`  ${pn}(${pd.alias_en ?? ''}): 字符串`);
    }
  }
  return lines;
}

export function formatComponentForLLM(entry: CompEntry): string {
  const lines: string[] = [];
  lines.push(`[${entry.name}] (${entry.tag}) — ${entry.summary}`);
  if (entry.props_order.length > 0) {
    lines.push(`Props 顺序: ${entry.props_order.join(', ')}`);
    lines.push(...formatProps(entry));
  } else {
    lines.push('无属性');
  }
  if (entry.examples.length > 0) {
    lines.push(`示例: ${entry.examples[0]}`);
  }
  return lines.join('\n');
}

export function formatSearchResults(query: string, results: CompEntry[]): string {
  if (results.length === 0) return `未找到匹配 "${query}" 的组件。`;

  const lines = [`查询 "${query}" 匹配 ${results.length} 个组件:\n`];
  for (const r of results.slice(0, 10)) {
    lines.push(formatComponentForLLM(r));
    lines.push('');
  }
  if (results.length > 10) {
    lines.push(`...还有 ${results.length - 10} 个结果。请缩小查询范围。`);
  }
  return lines.join('\n');
}

// ── Function definitions for OpenAI tools ──

export const REGISTRY_TOOLS = [{
  type: 'function' as const,
  function: {
    name: 'find_components',
    description: '搜索可用的 UI 组件。输入自然语言描述（如"一个表单输入框"、"带点击动作的按钮"），返回匹配的组件及其属性定义。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '对所需组件的自然语言描述，例如："邮箱输入框"、"提交按钮"、"卡片容器"、"提示消息"',
        },
      },
      required: ['query'],
    },
  },
}];

// ── Tool dispatch ──

export function dispatchTool(toolName: string, args: Record<string, unknown>): string {
  if (toolName === 'find_components') {
    const query = String(args.query ?? '');
    const results = findComponents(query);
    return formatSearchResults(query, results);
  }
  return `未知工具: ${toolName}`;
}
