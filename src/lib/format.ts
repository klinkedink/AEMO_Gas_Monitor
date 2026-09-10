/** Round every displayed TJ value to a whole number. */
export function roundTj(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

export function formatTj(n: number): string {
  return roundTj(n).toLocaleString("en-AU");
}
