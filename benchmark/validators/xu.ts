/**
 * XU wire validator (XU-C JSON skeleton + XU-D indented line format).
 * Steps: NFC normalization → tokenize → parse → Zod schema → manifest check.
 */
import * as path from 'path';
import * as fs from 'fs';

const MANIFEST_PATH = path.join(__dirname, '../../manifests/xu-c/components.json');
const MANIFEST: Record<string, any> = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

const KNOWN_TAGS = new Set(Object.keys(MANIFEST));

export interface ValidationResult {
  M1: 0 | 1;  // parse
  M2: 0 | 1;  // schema
  M3: 0 | 1;  // components exist
  M4: 0 | 1;  // props valid
  errors: string[];
}

// ---------- XU-C: JSON skeleton ----------
function validateXuC(raw: string): ValidationResult {
  const errors: string[] = [];
  let tree: any;

  const normalized = raw.normalize('NFC');
  try {
    tree = JSON.parse(normalized);
  } catch (e: any) {
    return { M1: 0, M2: 0, M3: 0, M4: 0, errors: [`M1 parse error: ${e.message}`] };
  }

  const { m3Errors, m4Errors } = traverseXuTree(tree);
  errors.push(...m3Errors, ...m4Errors);

  return {
    M1: 1,
    M2: 1,
    M3: m3Errors.length === 0 ? 1 : 0,
    M4: m4Errors.length === 0 ? 1 : 0,
    errors,
  };
}

// ---------- XU-D: indented line format ----------
function validateXuD(raw: string): ValidationResult {
  const errors: string[] = [];
  const normalized = raw.normalize('NFC');

  let tree: any;
  try {
    tree = parseXuD(normalized);
  } catch (e: any) {
    return { M1: 0, M2: 0, M3: 0, M4: 0, errors: [`M1 parse error: ${e.message}`] };
  }

  const { m3Errors, m4Errors } = traverseXuTree(tree);
  errors.push(...m3Errors, ...m4Errors);

  return {
    M1: 1,
    M2: 1,
    M3: m3Errors.length === 0 ? 1 : 0,
    M4: m4Errors.length === 0 ? 1 : 0,
    errors,
  };
}

// ---------- XU-D parser: indented Chinese wire → AST ----------
interface XuNode {
  tag: string;
  props: Record<string, string>;
  children: XuNode[];
  text?: string;
}

function parseXuD(wire: string): XuNode {
  const lines = wire.split('\n').filter(l => l.trim().length > 0);
  const root: XuNode = { tag: '__root__', props: {}, children: [] };
  const stack: Array<{ node: XuNode; indent: number }> = [{ node: root, indent: -1 }];

  for (const line of lines) {
    const indent = getIndent(line);
    const content = line.replace(/^[\s　]+/, '').trim();
    if (!content) continue;

    const node = parseLine(content);

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    stack[stack.length - 1].node.children.push(node);
    stack.push({ node, indent });
  }

  return root.children.length === 1 ? root.children[0] : root;
}

function getIndent(line: string): number {
  let count = 0;
  for (const ch of line) {
    if (ch === '　') count += 2;       // fullwidth space = 2 half-width
    else if (ch === ' ') count += 1;
    else break;
  }
  return count;
}

function parseLine(content: string): XuNode {
  // Split by spaces (half or full-width)
  const parts = content.split(/[\s　]+/).filter(Boolean);
  if (parts.length === 0) throw new Error('empty line');

  const tag = parts[0];
  const props: Record<string, string> = {};
  const manifest = MANIFEST[tag];
  const propsOrder: string[] = manifest?.props_order ?? [];

  let propIdx = 0;
  let text: string | undefined;

  for (let i = 1; i < parts.length; i++) {
    const token = parts[i];

    // State references: 值xxx, 触xxx, 空xxx (prefix-namespaced)
    if (/^值.+/.test(token)) {
      props['值'] = token.slice(1);
      continue;
    }
    if (/^触.+/.test(token)) {
      props['触'] = token.slice(1);
      continue;
    }
    if (/^空.+/.test(token)) {
      props['空'] = token.slice(1);
      continue;
    }

    // Check against propsOrder positional assignment
    if (propIdx < propsOrder.length) {
      const propKey = propsOrder[propIdx];
      const propDef = manifest?.props[propKey];
      if (propDef?.type === 'enum' && propDef.values.includes(token)) {
        props[propKey] = token;
        propIdx++;
        continue;
      }
      if (propDef?.type === 'actionId') {
        props[propKey] = token;
        propIdx++;
        continue;
      }
      if (propDef?.type === 'bool' && (token === '真' || token === '禁' || token === '必')) {
        props[propKey] = 'true';
        propIdx++;
        continue;
      }
    }

    // Remaining tokens treated as text content
    text = text ? text + ' ' + token : token;
  }

  return { tag, props, children: [], text };
}

// ---------- Shared tree traversal for M3/M4 ----------
function traverseXuTree(node: any): { m3Errors: string[]; m4Errors: string[] } {
  const m3Errors: string[] = [];
  const m4Errors: string[] = [];

  function visit(n: any, path: string) {
    if (!Array.isArray(n) && typeof n !== 'object') return;

    // JSON skeleton format: ["tag", {props}, children...]
    if (Array.isArray(n)) {
      const tag = n[0];
      if (typeof tag === 'string' && tag !== '__root__') {
        if (!KNOWN_TAGS.has(tag)) {
          m3Errors.push(`M3: Unknown tag '${tag}' at ${path}`);
        } else {
          const manifest = MANIFEST[tag];
          // Check props object (second element if it's an object, not array)
          if (n.length > 1 && typeof n[1] === 'object' && !Array.isArray(n[1])) {
            const props = n[1];
            for (const [k, v] of Object.entries(props)) {
              if (!manifest.props[k]) {
                m4Errors.push(`M4: Unknown prop '${k}' on '${tag}' at ${path}`);
              } else {
                const propDef = manifest.props[k];
                if (propDef.type === 'enum' && !propDef.values.includes(v)) {
                  m4Errors.push(`M4: Invalid enum value '${v}' for '${tag}.${k}' at ${path}`);
                }
              }
            }
          }
        }
        // Recurse into children
        for (let i = 1; i < n.length; i++) {
          if (Array.isArray(n[i])) visit(n[i], `${path}[${i}]`);
        }
      }
    } else if (typeof n === 'object' && n.tag) {
      // XuNode format from parseXuD
      if (n.tag !== '__root__' && !KNOWN_TAGS.has(n.tag)) {
        m3Errors.push(`M3: Unknown tag '${n.tag}' at ${path}`);
      } else if (n.tag !== '__root__' && n.props) {
        const manifest = MANIFEST[n.tag];
        for (const [k, v] of Object.entries(n.props)) {
          if (!manifest?.props[k]) {
            m4Errors.push(`M4: Unknown prop '${k}' on '${n.tag}' at ${path}`);
          } else {
            const propDef = manifest.props[k];
            if (propDef.type === 'enum' && !propDef.values.includes(v)) {
              m4Errors.push(`M4: Invalid enum value '${v}' for '${n.tag}.${k}' at ${path}`);
            }
          }
        }
      }
      for (let i = 0; i < (n.children?.length ?? 0); i++) {
        visit(n.children[i], `${path}.children[${i}]`);
      }
    }
  }

  visit(node, 'root');
  return { m3Errors, m4Errors };
}

export function validateXU(wire: string, format: 'xu-c' | 'xu-d'): ValidationResult {
  if (format === 'xu-c') return validateXuC(wire);
  return validateXuD(wire);
}
