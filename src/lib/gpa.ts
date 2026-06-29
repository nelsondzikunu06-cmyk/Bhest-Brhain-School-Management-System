// Convert percentage score (0-100) to 4.0-scale GPA points.
export function scoreToGpa(score: number): number {
  if (score >= 90) return 4.0;
  if (score >= 80) return 3.7;
  if (score >= 75) return 3.3;
  if (score >= 70) return 3.0;
  if (score >= 65) return 2.7;
  if (score >= 60) return 2.3;
  if (score >= 55) return 2.0;
  if (score >= 50) return 1.7;
  if (score >= 45) return 1.3;
  if (score >= 40) return 1.0;
  return 0;
}

export function averageGpa(scores: number[]): number {
  if (!scores.length) return 0;
  const pts = scores.map(scoreToGpa);
  return pts.reduce((s, n) => s + n, 0) / pts.length;
}

export function gradeLetter(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 55) return "D+";
  if (score >= 50) return "D";
  return "F";
}
