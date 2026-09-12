export type ContrastRow = {
  gene: string;
  nA: number;
  nB: number;
  meanA: number;
  meanB: number;
  lfc: number;
  p: number | null;
};

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const s = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return s * y;
}

function twoSidedNormal(z: number): number {
  return Math.max(1e-12, 2 * (1 - 0.5 * (1 + erf(Math.abs(z) / Math.SQRT2))));
}

function mannWhitneyP(a: number[], b: number[]): number | null {
  const n1 = a.length;
  const n2 = b.length;
  if (n1 < 2 || n2 < 2) return null;
  const combined = [
    ...a.map((v) => ({ v, g: 0 })),
    ...b.map((v) => ({ v, g: 1 })),
  ].sort((x, y) => x.v - y.v);
  const ranks = new Array(combined.length);
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j + 1 < combined.length && combined[j + 1].v === combined[i].v) j += 1;
    const avg = (i + j + 2) / 2;
    for (let k = i; k <= j; k += 1) ranks[k] = avg;
    i = j + 1;
  }
  let r1 = 0;
  combined.forEach((row, idx) => {
    if (row.g === 0) r1 += ranks[idx];
  });
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const mu = (n1 * n2) / 2;
  const ties: Record<number, number> = {};
  for (const row of combined) ties[row.v] = (ties[row.v] ?? 0) + 1;
  let tCorr = 0;
  for (const c of Object.values(ties)) tCorr += c * c * c - c;
  const n = n1 + n2;
  const sigma = Math.sqrt(((n1 * n2) / 12) * (n + 1 - tCorr / (n * (n - 1))));
  if (!sigma) return 1;
  return twoSidedNormal((u1 - mu) / sigma);
}

export function contrastFromMaps(
  groupA: string[],
  groupB: string[],
  matrix: Record<string, Record<string, number | null>>,
  genes: string[],
  transform: (v: number) => number,
): ContrastRow[] {
  const out: ContrastRow[] = [];
  for (const gene of genes) {
    const a = groupA
      .map((id) => matrix[id]?.[gene])
      .filter((v): v is number => v != null && Number.isFinite(v))
      .map(transform);
    const b = groupB
      .map((id) => matrix[id]?.[gene])
      .filter((v): v is number => v != null && Number.isFinite(v))
      .map(transform);
    if (!a.length && !b.length) continue;
    const meanA = a.length ? median(a) : NaN;
    const meanB = b.length ? median(b) : NaN;
    out.push({
      gene,
      nA: a.length,
      nB: b.length,
      meanA,
      meanB,
      lfc: Number.isFinite(meanA) && Number.isFinite(meanB) ? meanA - meanB : NaN,
      p: a.length && b.length ? mannWhitneyP(a, b) : null,
    });
  }
  return out.sort((x, y) => {
    const px = x.p ?? 1;
    const py = y.p ?? 1;
    if (px !== py) return px - py;
    return Math.abs(y.lfc) - Math.abs(x.lfc);
  });
}

export function log2p1(v: number): number {
  return Math.log2(Math.max(0, v) + 1);
}

export function identity(v: number): number {
  return v;
}
