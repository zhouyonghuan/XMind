export interface BezierControlPoints {
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
}

export function getCubicBezierControlPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): BezierControlPoints {
  const dx = x2 - x1;
  const cpOffset = Math.max(Math.abs(dx) * 0.5, 40);

  return {
    cp1x: x1 + cpOffset,
    cp1y: y1,
    cp2x: x2 - cpOffset,
    cp2y: y2,
  };
}

/** 在 Canvas 上绘制三次贝塞尔曲线 */
export function drawCubicBezier(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const { cp1x, cp1y, cp2x, cp2y } = getCubicBezierControlPoints(x1, y1, x2, y2);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
  ctx.stroke();
}

/** 在 Canvas 上绘制竖向花括号（概要分组） */
export function drawCurlyBracket(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  bottom: number,
): void {
  const h = bottom - top;
  const mid = (top + bottom) / 2;
  const w = 14;
  const tip = 6;

  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.bezierCurveTo(x + w, top, x + w, top + h * 0.15, x + w, top + h * 0.25);
  ctx.bezierCurveTo(x + w, top + h * 0.35, x + tip, mid - h * 0.08, x + tip, mid);
  ctx.bezierCurveTo(
    x + tip,
    mid + h * 0.08,
    x + w,
    bottom - h * 0.35,
    x + w,
    bottom - h * 0.25,
  );
  ctx.bezierCurveTo(x + w, bottom - h * 0.15, x + w, bottom, x, bottom);
  ctx.stroke();
}
