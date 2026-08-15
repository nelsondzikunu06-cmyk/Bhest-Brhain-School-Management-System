/**
 * Deterministic academic engine — Continuous Assessment (50%) + Examination (50%).
 * Never delegate these calculations to AI: results must be reproducible.
 */

export const COMPONENTS = [
  { key: "test_1", label: "Test 1", max: 30 },
  { key: "group_work", label: "Group Work", max: 20 },
  { key: "test_2", label: "Test 2", max: 30 },
  { key: "project_work", label: "Project Work", max: 20 },
] as const;

export const EXAM_MAX = 100;

export type ComponentKey = (typeof COMPONENTS)[number]["key"];

export type ScoreInput = Record<ComponentKey, number> & { exam_score: number };

export type GradeBand = {
  min_score: number;
  max_score: number;
  grade: string;
  remark: string;
};

export const DEFAULT_SCALE: GradeBand[] = [
  { min_score: 80, max_score: 100, grade: "A", remark: "Excellent" },
  { min_score: 70, max_score: 79.99, grade: "B", remark: "Very Good" },
  { min_score: 60, max_score: 69.99, grade: "C", remark: "Good" },
  { min_score: 50, max_score: 59.99, grade: "D", remark: "Satisfactory" },
  { min_score: 40, max_score: 49.99, grade: "E", remark: "Needs Improvement" },
  { min_score: 0, max_score: 39.99, grade: "F", remark: "Fail" },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

export type ComputedResult = {
  classScore: number;
  classContribution: number;
  examContribution: number;
  total: number;
};

export function computeResult(input: ScoreInput): ComputedResult {
  const classScore = COMPONENTS.reduce((sum, c) => sum + (Number(input[c.key]) || 0), 0);
  const classContribution = round2(classScore * 0.5);
  const examContribution = round2((Number(input.exam_score) || 0) * 0.5);
  return {
    classScore: round2(classScore),
    classContribution,
    examContribution,
    total: round2(classContribution + examContribution),
  };
}

/** Returns a human-readable error, or null when every value is valid. */
export function validateScores(raw: Partial<Record<keyof ScoreInput, unknown>>): string | null {
  const checks: Array<{ key: keyof ScoreInput; label: string; max: number }> = [
    ...COMPONENTS.map((c) => ({ key: c.key as keyof ScoreInput, label: c.label, max: c.max })),
    { key: "exam_score", label: "Exam", max: EXAM_MAX },
  ];
  for (const c of checks) {
    const value = raw[c.key];
    if (value === "" || value === null || value === undefined) continue;
    const n = typeof value === "number" ? value : Number(String(value).trim());
    if (!Number.isFinite(n)) return `${c.label} must be a number.`;
    if (n < 0) return `${c.label} cannot be negative.`;
    if (n > c.max) return `${c.label} cannot exceed ${c.max}.`;
  }
  return null;
}

export function toScoreInput(raw: Partial<Record<keyof ScoreInput, unknown>>): ScoreInput {
  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
    return Number.isFinite(n) ? n : 0;
  };
  return {
    test_1: num(raw.test_1),
    group_work: num(raw.group_work),
    test_2: num(raw.test_2),
    project_work: num(raw.project_work),
    exam_score: num(raw.exam_score),
  };
}

export function bandFor(total: number, scale: GradeBand[]): GradeBand | null {
  const bands = scale.length ? scale : DEFAULT_SCALE;
  return (
    bands.find((b) => total >= Number(b.min_score) && total <= Number(b.max_score)) ??
    [...bands].sort((a, b) => Number(a.min_score) - Number(b.min_score))[0] ??
    null
  );
}

export function ordinal(position: number): string {
  const rem100 = position % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${position}th`;
  switch (position % 10) {
    case 1: return `${position}st`;
    case 2: return `${position}nd`;
    case 3: return `${position}rd`;
    default: return `${position}th`;
  }
}

/**
 * Standard competition ranking (1, 1, 3) on descending totals.
 * Returns a map of id -> position.
 */
export function rank<T>(rows: T[], idOf: (r: T) => string, valueOf: (r: T) => number): Map<string, number> {
  const sorted = [...rows].sort((a, b) => valueOf(b) - valueOf(a));
  const result = new Map<string, number>();
  let position = 0;
  let seen = 0;
  let previous: number | null = null;
  for (const row of sorted) {
    seen += 1;
    const value = valueOf(row);
    if (previous === null || value !== previous) {
      position = seen;
      previous = value;
    }
    result.set(idOf(row), position);
  }
  return result;
}
