/**
 * Statistical utilities for JW-Bench:
 * - Wilson score confidence interval (binary proportions)
 * - Cohen's h (effect size for two proportions)
 * - Attrition funnel reporter
 * - Mann-Whitney U (token ratio H2)
 */

export interface WilsonCI {
  p: number;       // point estimate
  lower: number;
  upper: number;
  n: number;
}

/**
 * Wilson score interval for a proportion.
 * More accurate than normal approximation for small n.
 */
export function wilsonCI(successes: number, n: number, alpha = 0.05): WilsonCI {
  if (n === 0) return { p: 0, lower: 0, upper: 0, n: 0 };
  const z = 1.96; // z_{α/2} for α=0.05
  const p = successes / n;
  const denom = 1 + z * z / n;
  const center = (p + z * z / (2 * n)) / denom;
  const margin = (z / denom) * Math.sqrt((p * (1 - p)) / n + z * z / (4 * n * n));
  return {
    p: Math.round(p * 10000) / 10000,
    lower: Math.max(0, Math.round((center - margin) * 10000) / 10000),
    upper: Math.min(1, Math.round((center + margin) * 10000) / 10000),
    n,
  };
}

/**
 * Cohen's h: effect size for two proportions.
 * h = 2 * arcsin(sqrt(p1)) - 2 * arcsin(sqrt(p2))
 * Interpretation: small=0.2, medium=0.5, large=0.8
 */
export function cohensH(p1: number, p2: number): number {
  const phi = (p: number) => 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, p))));
  return Math.round((phi(p1) - phi(p2)) * 10000) / 10000;
}

export interface FunnelRow {
  stage: string;
  passCount: number;
  total: number;
  stageRate: number;
  cumulativeUGR: number;
  ci: WilsonCI;
}

/**
 * Build attrition funnel from a list of M1-M5 results.
 */
export function attritionFunnel(results: Array<{
  M1: 0|1; M2: 0|1; M3: 0|1; M4: 0|1; M5: 0|1;
}>): FunnelRow[] {
  const n = results.length;
  const stages: Array<{ label: string; key: keyof typeof results[0] }> = [
    { label: 'M1 Parse',           key: 'M1' },
    { label: 'M2 Schema',          key: 'M2' },
    { label: 'M3 Component Exists', key: 'M3' },
    { label: 'M4 Prop Valid',      key: 'M4' },
    { label: 'M5 Semantic Equiv',  key: 'M5' },
  ];

  let surviving = results;
  const rows: FunnelRow[] = [];

  for (const { label, key } of stages) {
    const passed = surviving.filter(r => r[key] === 1).length;
    const stageRate = surviving.length > 0 ? passed / surviving.length : 0;
    const cumulativeUGR = n > 0 ? passed / n : 0;  // relative to total N
    rows.push({
      stage: label,
      passCount: passed,
      total: surviving.length,
      stageRate: Math.round(stageRate * 10000) / 10000,
      cumulativeUGR: Math.round(cumulativeUGR * 10000) / 10000,
      ci: wilsonCI(passed, surviving.length),
    });
    // Only survivors of this stage continue
    surviving = surviving.filter(r => r[key] === 1);
  }

  return rows;
}

export function formatFunnel(label: string, rows: FunnelRow[]): string {
  const header = `Cell: ${label}\n${'─'.repeat(72)}\n`;
  const colHeader = `${'Stage'.padEnd(25)} ${'Pass%'.padStart(7)} ${'95% CI'.padStart(18)} ${'Cumul.UGR'.padStart(11)}\n`;
  const body = rows.map(r =>
    `${r.stage.padEnd(25)} ${(r.stageRate * 100).toFixed(1).padStart(6)}%` +
    `  [${(r.ci.lower * 100).toFixed(1)}, ${(r.ci.upper * 100).toFixed(1)}]`.padStart(18) +
    `  ${(r.cumulativeUGR * 100).toFixed(1).padStart(9)}%`
  ).join('\n');
  return header + colHeader + body;
}

/**
 * Simple Mann-Whitney U statistic for two samples.
 * Returns U and a two-sided p-value approximation (normal approx for n>20).
 */
export function mannWhitneyU(x: number[], y: number[]): { U: number; z: number; pApprox: number } {
  const n1 = x.length, n2 = y.length;
  let U = 0;
  for (const xi of x) for (const yj of y) {
    if (xi > yj) U++;
    else if (xi === yj) U += 0.5;
  }
  const mu = n1 * n2 / 2;
  const sigma = Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12);
  const z = sigma > 0 ? (U - mu) / sigma : 0;
  // Two-sided p using standard normal CDF approximation
  const pApprox = 2 * (1 - normalCDF(Math.abs(z)));
  return { U, z: Math.round(z * 1000) / 1000, pApprox: Math.round(pApprox * 10000) / 10000 };
}

function normalCDF(z: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5*t + a4)*t + a3)*t + a2)*t + a1)*t * Math.exp(-x*x);
  return 0.5 * (1 + sign * y);
}

/** Required n per cell for 80% power, α=0.05, two-sided (lookup table) */
export function lookupRequiredN(absH: number): { n: number; action: string } {
  if (absH < 0.10) return { n: Infinity, action: 'Kill' };
  if (absH < 0.20) return { n: 800,      action: 'Iterate' };
  if (absH < 0.30) return { n: 200,      action: 'Go (n=200)' };
  if (absH < 0.50) return { n: 80,       action: 'Go (n=80)' };
  return                  { n: 50,       action: 'Go (n=50)' };
}
