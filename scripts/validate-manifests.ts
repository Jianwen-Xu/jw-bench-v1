/**
 * Validates that JSX / JSON-EN / XU-C manifests have equivalent enum mappings.
 * Run: npx ts-node scripts/validate-manifests.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');

function loadJSON(p: string) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

const JSX_VARIANT_MAP: Record<string, string[]> = {
  Button: ['primary', 'secondary', 'ghost'],
  Text:   ['title', 'heading', 'body', 'price', 'sec-title', 'caption'],
  Badge:  ['info', 'success', 'warning', 'danger'],
  Toast:  ['info', 'success', 'warning', 'error'],
  Image:  ['s', 'm', 'l'],
  Avatar: ['s', 'm', 'l'],
  Link:   ['default', 'subtle'],
};

const XU_VARIANT_MAP: Record<string, string[]> = {
  '按': ['主', '次', '轻'],
  '文': ['标题', '主标题', '正文', '价格', '节标题', '说明'],
  '标': ['信息', '成功', '警告', '危险'],
  '提': ['信息', '成功', '警告', '错误'],
  '图': ['小', '中', '大'],
  '头像': ['小', '中', '大'],
  '链': ['默认', '淡'],
};

const EXPECTED_MAPPINGS: Array<[string, string]> = [
  ['主', 'primary'], ['次', 'secondary'], ['轻', 'ghost'],
  ['成功', 'success'], ['警告', 'warning'], ['危险', 'danger'],
  ['信息', 'info'], ['错误', 'error'],
  ['小', 's'], ['中', 'm'], ['大', 'l'],
  ['默认', 'default'], ['淡', 'subtle'],
  ['标题', 'title'], ['主标题', 'heading'],
];

let errors = 0;

const xuManifest = loadJSON(path.join(ROOT, 'manifests/xu-c/components.json'));

for (const [char, comp] of Object.entries(xuManifest) as any[]) {
  for (const [propKey, propDef] of Object.entries(comp.props) as any[]) {
    // Check for duplicate enum values
    if (propDef.type === 'enum' && propDef.values) {
      const vals = propDef.values as string[];
      const seen = new Set<string>();
      for (const v of vals) {
        if (seen.has(v)) {
          console.error(`❌  ${char}.${propKey}: duplicate enum value '${v}'`);
          errors++;
        }
        seen.add(v);
      }
    }
    if (propDef.type === 'enum' && propDef.enum_map) {
      for (const [cn, en] of Object.entries(propDef.enum_map) as any[]) {
        const expected = EXPECTED_MAPPINGS.find(([c]) => c === cn);
        if (expected && expected[1] !== en) {
          console.error(`❌  ${char}.${propKey}: '${cn}' maps to '${en}' but expected '${expected[1]}'`);
          errors++;
        }
      }
    }
  }
}

if (errors === 0) {
  console.log('✅  All manifest enum mappings are consistent.');
} else {
  console.error(`\n${errors} error(s) found.`);
  process.exit(1);
}
