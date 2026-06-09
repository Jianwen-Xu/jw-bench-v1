/**
 * XU Parser — Unicode-aware Chinese DSL parser for XU-C and XU-D.
 *
 * Parses both formats into a unified AST, then normalizes it into
 * a judge-friendly dump that strips visual tokens and text content.
 *
 * Core principle: eager token matching against component manifest
 * props_order, with prefix-based disambiguation (値/空/触/选项/式).
 */
import * as fs from 'fs';
import * as path from 'path';

// ── Types ──

interface PropDef {
  type: 'enum' | 'actionId' | 'stateRef' | 'bool' | 'string' | 'number';
  values?: string[];
  enum_map?: Record<string, string>;
  alias_en?: string;
}

interface ComponentManifest {
  name: string;
  alias_en?: string;
  kind: 'container' | 'display' | 'interactive' | 'navigation' | 'decorative' | 'feedback';
  props_order: string[];
  props: Record<string, PropDef>;
}

interface ParsedNode {
  tag: string;          // English name: "Button", "Text"
  tagCN: string;        // Chinese tag: "按", "文"
  props: Record<string, string | boolean>;
  text: string;         // remaining text content
  children: ParsedNode[];
}

// ── Manifest ──

let _manifest: Record<string, ComponentManifest> | null = null;

function loadManifest(): Record<string, ComponentManifest> {
  if (_manifest) return _manifest;
  const p = path.join(__dirname, '..', 'manifests', 'xu-d', 'components.json');
  _manifest = JSON.parse(fs.readFileSync(p, 'utf-8'));
  return _manifest!;
}

// ── Tokenizer ──

interface Token {
  raw: string;
  kind: 'prefix_值' | 'prefix_触' | 'prefix_空' | 'prefix_选项' | 'prefix_式'
      | 'bool_必' | 'bool_禁'
      | 'bare_chinese' | 'bare_ascii' | 'bare_number';
  value?: string;
}

function tokenize(tokens: string[]): Token[] {
  const result: Token[] = [];
  for (const t of tokens) {
    if (/^[値值](.+)$/.test(t)) {
      result.push({ raw: t, kind: 'prefix_值', value: RegExp.$1 });
    } else if (/^触(.+)$/.test(t)) {
      result.push({ raw: t, kind: 'prefix_触', value: RegExp.$1 });
    } else if (/^空(.+)$/.test(t)) {
      result.push({ raw: t, kind: 'prefix_空', value: RegExp.$1 });
    } else if (/^选项(.+)$/.test(t)) {
      result.push({ raw: t, kind: 'prefix_选项', value: RegExp.$1 });
    } else if (/^式(.+)$/.test(t)) {
      result.push({ raw: t, kind: 'prefix_式', value: RegExp.$1 });
    } else if (t === '必') {
      result.push({ raw: t, kind: 'bool_必' });
    } else if (t === '禁' || t === '禁true') {
      result.push({ raw: t, kind: 'bool_禁' });
    } else if (/^[\u4e00-\u9fff]+$/.test(t)) {
      result.push({ raw: t, kind: 'bare_chinese' });
    } else if (/^[a-zA-Z]\w*$/.test(t)) {
      result.push({ raw: t, kind: 'bare_ascii' });
    } else if (/^\d+$/.test(t)) {
      result.push({ raw: t, kind: 'bare_number' });
    } else {
      // Mixed (like "¥99" or "5.0") — treat as text
      result.push({ raw: t, kind: 'bare_ascii' });
    }
  }
  return result;
}

// ── Eager prop matching ──

const PREFIX_TO_PROP: Record<string, string> = {
  'prefix_值': '值',
  'prefix_触': '触',
  'prefix_空': '空',
  'prefix_选项': '选项',
  'prefix_式': '式',
};

const BOOL_TO_PROP: Record<string, string> = {
  'bool_必': '必',
  'bool_禁': '禁',
};

function eagerMatch(tokens: Token[], manifest: ComponentManifest): {
  props: Record<string, string | boolean>;
  remainingText: string;
} {
  const props: Record<string, string | boolean> = {};
  const unconsumedProps = new Set(manifest.props_order);
  let stopConsuming = false;
  const textParts: string[] = [];

  for (const tok of tokens) {
    if (stopConsuming) { textParts.push(tok.raw); continue; }

    // 1. Try prefix match
    if (tok.kind.startsWith('prefix_')) {
      const propName = PREFIX_TO_PROP[tok.kind];
      if (propName && unconsumedProps.has(propName)) {
        if (tok.kind === 'prefix_式') {
          // 式 prefix — the value is the enum variant
          // Verify it's a valid enum value
          const propDef = manifest.props[propName];
          if (propDef?.type === 'enum' && propDef.values?.includes(tok.value!)) {
            props[propName] = tok.value!;
            unconsumedProps.delete(propName);
            continue;
          }
          // Invalid enum value or non-enum prop — treat as text
          textParts.push(tok.raw);
          continue;
        }
        if (tok.value !== undefined) {
          props[propName] = tok.value;
        } else {
          props[propName] = true;
        }
        unconsumedProps.delete(propName);
        continue;
      }
    }

    // 2. Try bool match
    if (tok.kind === 'bool_必' || tok.kind === 'bool_禁') {
      const propName = BOOL_TO_PROP[tok.kind];
      if (propName && unconsumedProps.has(propName)) {
        props[propName] = true;
        unconsumedProps.delete(propName);
        continue;
      }
      // Bool flag but no matching prop — treat as text
      textParts.push(tok.raw);
      continue;
    }

    // 3. Try enum value match
    if (tok.kind === 'bare_chinese') {
      let matched = false;
      for (const propName of Array.from(unconsumedProps)) {
        const propDef = manifest.props[propName];
        if (propDef?.type === 'enum' && propDef.values?.includes(tok.raw)) {
          props[propName] = tok.raw;
          unconsumedProps.delete(propName);
          matched = true;
          break;
        }
      }
      if (matched) continue;
    }

    // 4. Try actionId match (bare ASCII word)
    if (tok.kind === 'bare_ascii') {
      let matched = false;
      for (const propName of Array.from(unconsumedProps)) {
        const propDef = manifest.props[propName];
        if (propDef?.type === 'actionId') {
          props[propName] = tok.raw;
          unconsumedProps.delete(propName);
          matched = true;
          break;
        }
      }
      if (matched) continue;
    }

    // 5. Not matched by any rule — treat remaining as text content
    textParts.push(tok.raw);
    stopConsuming = true;
  }

  return { props, remainingText: textParts.join('') };
}

// ── XU-D Parser ──

function parseXuD(wire: string): ParsedNode | null {
  const manifest = loadManifest();
  const lines = wire.split('\n').filter(l => l.trim());
  if (lines.length === 0) return null;

  // Determine indentation depths
  const entries: Array<{ depth: number; tagCN: string; tagTokens: string[] }> = [];
  for (const line of lines) {
    const match = line.match(/^([　]*)/);
    const depth = match ? match[0].length : 0;
    const trimmed = line.slice(match![0].length).trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/[\s　]+/).filter(Boolean);
    entries.push({ depth, tagCN: parts[0], tagTokens: parts.slice(1) });
  }

  // Build tree from depth-indented entries
  function buildTree(startIdx: number, parentDepth: number): {
    nodes: ParsedNode[];
    nextIdx: number;
  } {
    const nodes: ParsedNode[] = [];
    let i = startIdx;
    while (i < entries.length) {
      const entry = entries[i];
      if (entry.depth <= parentDepth) break;  // back to parent level

      const comp = manifest[entry.tagCN];
      const tag = comp?.name ?? entry.tagCN;
      const tokens = tokenize(entry.tagTokens);

      let props: Record<string, string | boolean> = {};
      let text = '';

      if (comp) {
        const result = eagerMatch(tokens, comp);
        props = result.props;
        text = result.remainingText;
      } else {
        // Unknown tag — keep all tokens as text
        text = entry.tagTokens.join(' ');
      }

      // Parse children at deeper indentation
      const { nodes: children, nextIdx } = buildTree(i + 1, entry.depth);

      nodes.push({
        tag,
        tagCN: entry.tagCN,
        props,
        text,
        children,
      });

      i = nextIdx;
    }
    return { nodes, nextIdx: i };
  }

  const { nodes } = buildTree(0, -1);
  // Wrap in a virtual root if multiple roots
  if (nodes.length === 1) return nodes[0];
  return { tag: '__root__', tagCN: '__root__', props: {}, text: '', children: nodes };
}

// ── XU-C Parser (JSON-based Chinese DSL) ──

function parseXuC(wire: string): ParsedNode | null {
  const manifest = loadManifest();
  let arr: any[];
  try { arr = JSON.parse(wire); } catch { return null; }

  function walk(node: any): ParsedNode | null {
    if (!Array.isArray(node) || node.length === 0) return null;
    const rawTag = String(node[0]);
    const comp = manifest[rawTag];
    const tag = comp?.name ?? rawTag;

    const hasProps = node.length > 1 && typeof node[1] === 'object' && !Array.isArray(node[1]);
    const props: Record<string, string | boolean> = {};
    const textParts: string[] = [];
    const children: ParsedNode[] = [];

    if (hasProps) {
      const obj = node[1];
      for (const [k, v] of Object.entries(obj)) {
        // Normalize 値 (U+5024) → 值 (U+503C) for manifest lookup
        const nk = k === '値' ? '值' : k;
        if (typeof v === 'boolean') {
          props[nk] = v;
        } else if (typeof v === 'string' || typeof v === 'number') {
          props[nk] = String(v);
        }
      }
    }

    const startIdx = hasProps ? 2 : 1;
    for (let i = startIdx; i < node.length; i++) {
      if (Array.isArray(node[i])) {
        const child = walk(node[i]);
        if (child) children.push(child);
      } else if (typeof node[i] === 'string') {
        textParts.push(node[i]);
      }
    }

    return { tag, tagCN: rawTag, props, text: textParts.join(''), children };
  }

  return walk(arr);
}

// ── Format detection ──

export type WireFormat = 'jsx' | 'xu-c' | 'xu-d' | 'json-en';

export function detectFormat(wire: string): WireFormat {
  const hasJSXTags = /<\/?[A-Z][a-zA-Z]*[^>]*>/.test(wire);
  if (hasJSXTags) return 'jsx';

  const hasChineseTags = /["']?[列排卡域文图按入选框切链栏标提头像框表滑进点隔转折轮签评下浮骨]/m.test(wire);
  const hasIndentedLines = /^[　 ]+[一-龥]/m.test(wire);

  if (hasIndentedLines) return 'xu-d';

  if (hasChineseTags) {
    try {
      const parsed = JSON.parse(wire.trim());
      if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
        // Check first tag: Chinese in manifest → xu-c, otherwise json-en
        const firstTag = parsed[0];
        const manifest = loadManifest();
        if (manifest[firstTag]) return 'xu-c';
        return 'json-en';
      }
    } catch {}
    return 'xu-d';  // Chinese-tagged but not JSON → XU-D
  }

  return 'json-en';
}

// ── Unified parse ──

export function parseWire(wire: string): ParsedNode | null {
  const fmt = detectFormat(wire);
  if (fmt === 'jsx') return null;  // JSX handled separately
  if (fmt === 'xu-d') return parseXuD(wire);
  if (fmt === 'xu-c') return parseXuC(wire);
  return null;  // json-en handled separately
}

// ── AST Normalizer: strip visual tokens → judge dump ──

/**
 * Types of props to KEEP in the normalized dump:
 * - stateRef (値) → bind=xxx
 * - stateRef (选项) → options=xxx
 * - actionId (触) → onTap=xxx / onSubmit=xxx / onBack=xxx
 * - bool (必) → required
 * - bool (禁) → disabled
 * - Input type (类) → bare value (email, password, number, 文)
 *
 * Everything else is stripped (variant, size, shape, src, placeholder, title, duration).
 */
function normalizeNode(node: ParsedNode, depth: number): string {
  const manifest = loadManifest();
  const comp = manifest[node.tagCN];

  // Virtual root: just render children at current depth
  if (node.tag === '__root__') {
    return node.children.map(c => normalizeNode(c, depth)).join('\n');
  }

  const tokens: string[] = [];

  for (const propName of comp.props_order) {
    const propDef = comp.props[propName];
    if (propDef.type === 'actionId' && typeof node.props[propName] === 'string') {
      const val = node.props[propName] as string;
      // Determine prefix based on tag kind
      if (comp.kind === 'container' && propName === '触') {
        tokens.push(`onSubmit=${val}`);
      } else if (comp.kind === 'navigation' && propName === '返') {
        tokens.push(`onBack=${val}`);
      } else {
        tokens.push(`onTap=${val}`);
      }
    } else if (propDef.type === 'stateRef' && typeof node.props[propName] === 'string') {
      if (propName === '选项') {
        tokens.push(`options=${node.props[propName]}`);
      } else {
        tokens.push(`bind=${node.props[propName]}`);
      }
    } else if (propDef.type === 'bool' && node.props[propName] === true) {
      tokens.push(propDef.alias_en ?? propName);
    } else if (propDef.type === 'enum' && propName === '类' && typeof node.props[propName] === 'string') {
      // Input type modifier — keep as semantic token
      const raw = node.props[propName] as string;
      // Map to English: 邮箱→email, 密码→password, 数字→number, 文→text
      const mapped = propDef.enum_map?.[raw] ?? raw;
      tokens.push(mapped);
    }
    // enum variants (式, 大, 形) → stripped (visual)
    // string props (空, 源, 题) → stripped (visual)
    // number props (时) → stripped (visual)
  }

  const indent = '  '.repeat(depth);
  const header = `[${node.tag}]` + (tokens.length ? ` ${tokens.join(' ')}` : '');
  const lines = [indent + header];

  for (const child of node.children) {
    lines.push(normalizeNode(child, depth + 1));
  }

  return lines.join('\n');
}

export function toNormalizedDump(wire: string): string {
  const node = parseWire(wire);
  if (!node) {
    // Fallback: return raw wire (JSX / unknown format)
    return wire;
  }
  return normalizeNode(node, 0);
}

// ── For external use: get AST ──

export { loadManifest, tokenize };
export type { ParsedNode, ComponentManifest };
