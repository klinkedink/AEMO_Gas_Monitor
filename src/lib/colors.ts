const STATE_COLORS: Record<string, string> = {
  QLD: "#d4a017",
  NSW: "#e07a5f",
  VIC: "#6ea8d9",
  SA: "#c45c4a",
  NT: "#c9842a",
  WA: "#3aa6a1",
  TAS: "#7fb069",
  ACT: "#9aa7b5",
};

const OPERATOR_COLORS: Record<string, string> = {
  QGC: "#e0b33a",
  "Santos CSG": "#d35f4c",
  "Origin / APLNG": "#5aa2d6",
};

export function stateColor(state: string, index: number): string {
  return STATE_COLORS[state] ?? seriesColor(index);
}

export function operatorColor(name: string, index: number): string {
  return OPERATOR_COLORS[name] ?? seriesColor(index);
}

const LNG_COLORS: Record<string, string> = {
  "QCLNG LNG Plant": "#e0b33a",
  "Australia Pacific LNG": "#5aa2d6",
  "GLNG (Curtis Island)": "#d35f4c",
};

export function lngColor(name: string, index: number): string {
  return LNG_COLORS[name] ?? seriesColor(index + 12);
}
export function seriesColor(index: number): string {
  const hue = (index * 137.508) % 360;
  const sat = 52 + (index % 4) * 7;
  const light = 48 + (index % 3) * 7;
  return `hsl(${hue.toFixed(1)} ${sat}% ${light}%)`;
}
