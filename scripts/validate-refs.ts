import { validateJSX } from '../benchmark/validators/jsx';
import { validateXU } from '../benchmark/validators/xu';
import * as fs from 'fs';
import * as path from 'path';

const tasksDir = path.join(__dirname, '..', 'tasks');
const dirs = fs.readdirSync(tasksDir).filter(d => d.startsWith('task-')).sort();

let total = 0, passed = 0, failed = 0;

for (const dir of dirs) {
  const fullPath = path.join(tasksDir, dir);
  if (!fs.statSync(fullPath).isDirectory()) continue;
  for (const fmt of ['jsx', 'json-en', 'xu-c', 'xu-d'] as const) {
    const refName = `ref.${fmt}`;
    const refPath = path.join(fullPath, refName);
    if (!fs.existsSync(refPath)) {
      console.error(`MISSING ${dir}/${refName}`);
      failed++; total++;
      continue;
    }
    const code = fs.readFileSync(refPath, 'utf-8');
    total++;
    let result: any;
    if (fmt === 'jsx') result = validateJSX(code);
    else if (fmt === 'xu-c') result = validateXU(code, 'xu-c');
    else if (fmt === 'xu-d') result = validateXU(code, 'xu-d');
    else {
      try { JSON.parse(code); result = { M1:1, M2:1, M3:1, M4:1, errors:[] }; }
      catch(e: any) { result = { M1:0, M2:0, M3:0, M4:0, errors:[e.message] }; }
    }
    const ok = result.M1 && result.M2 && result.M3 && result.M4;
    if (ok) {
      passed++;
    } else {
      failed++;
      console.error(`FAIL ${dir}/${refName}:`);
      const errs = result.errors || [];
      errs.slice(0,5).forEach((e: string) => console.error(`  - ${e}`));
    }
  }
}

console.log(`\nResults: ${passed}/${total} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
