/**
 * Retail FloatToString / PrintFloat width + decimal formatting.
 * Width clamped to [0, 18] (default 18); decimals to [0, 9] (default 9).
 */
export function formatNWScriptFloat(
  value: number,
  width: number = 18,
  decimals: number = 9,
): string {
  const wRaw = width == null || Number.isNaN(Number(width)) ? 18 : (width | 0);
  const dRaw = decimals == null || Number.isNaN(Number(decimals)) ? 9 : (decimals | 0);
  const w = Math.max(0, Math.min(18, wRaw));
  const d = Math.max(0, Math.min(9, dRaw));
  const n = Number(value);
  if(!Number.isFinite(n)){
    return String(value);
  }
  const intPart = Math.trunc(n);
  const intStr = String(Math.abs(intPart));
  const paddedInt = (w <= 0 || intStr.length >= w)
    ? intStr
    : ('0000000000000000000' + intStr).slice(-w);
  const sign = n < 0 ? '-' : '';
  if(d <= 0){
    return sign + paddedInt;
  }
  const frac = Math.abs(n % 1);
  const fracStr = (frac + 1).toFixed(d).slice(2);
  return sign + paddedInt + '.' + fracStr;
}
