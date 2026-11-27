export interface XYPoint {
  x: number;
  y: number;
}

export function containsXYAabb(
  point: XYPoint,
  min: XYPoint,
  max: XYPoint
): boolean {
  return point.x >= min.x && point.x <= max.x &&
    point.y >= min.y && point.y <= max.y;
}

export function containsXYCircle(
  point: XYPoint,
  center: XYPoint,
  radius: number
): boolean {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return (dx * dx + dy * dy) <= (radius * radius);
}

export function containsXYRect(
  point: XYPoint,
  center: XYPoint,
  length: number,
  width: number
): boolean {
  return Math.abs(point.x - center.x) <= length / 2 &&
    Math.abs(point.y - center.y) <= width / 2;
}
