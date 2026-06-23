import type { LineStyleId } from '../types';
import { drawCubicBezier } from './bezier';

export interface LineStylePreset {
  id: LineStyleId;
  name: string;
  description: string;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineDash?: number[];
}

export const LINE_STYLE_PRESETS: LineStylePreset[] = [
  {
    id: 'curve',
    name: '曲线',
    description: '平滑贝塞尔曲线',
    lineWidth: 2.5,
    lineCap: 'round',
  },
  {
    id: 'straight',
    name: '直线',
    description: '两点直连',
    lineWidth: 2.5,
    lineCap: 'round',
  },
  {
    id: 'elbow',
    name: '折线',
    description: '直角转折',
    lineWidth: 2.5,
    lineCap: 'round',
  },
  {
    id: 'roundedElbow',
    name: '圆角折线',
    description: '圆角转折',
    lineWidth: 2.5,
    lineCap: 'round',
  },
  {
    id: 'dashedCurve',
    name: '虚线曲线',
    description: '虚线贝塞尔',
    lineWidth: 2.5,
    lineCap: 'round',
    lineDash: [8, 5],
  },
];

export function getLineStylePreset(id: LineStyleId): LineStylePreset {
  return LINE_STYLE_PRESETS.find((p) => p.id === id) ?? LINE_STYLE_PRESETS[0]!;
}

function drawStraightLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawElbowLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const midX = (x1 + x2) / 2;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(midX, y1);
  ctx.lineTo(midX, y2);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawRoundedElbowLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const midX = (x1 + x2) / 2;
  const radius = Math.min(12, Math.abs(y2 - y1) / 2, Math.abs(x2 - x1) / 4);

  if (radius <= 0 || Math.abs(y2 - y1) < 1) {
    drawElbowLine(ctx, x1, y1, x2, y2);
    return;
  }

  const dirY = y2 > y1 ? 1 : -1;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(midX - radius, y1);
  ctx.arcTo(midX, y1, midX, y1 + radius * dirY, radius);
  ctx.lineTo(midX, y2 - radius * dirY);
  ctx.arcTo(midX, y2, midX + radius, y2, radius);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** 按预设样式绘制分支连接线 */
export function drawConnectionLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  styleId: LineStyleId,
): void {
  const preset = getLineStylePreset(styleId);

  ctx.lineWidth = preset.lineWidth;
  ctx.lineCap = preset.lineCap;
  ctx.setLineDash(preset.lineDash ?? []);

  switch (styleId) {
    case 'straight':
      drawStraightLine(ctx, x1, y1, x2, y2);
      break;
    case 'elbow':
      drawElbowLine(ctx, x1, y1, x2, y2);
      break;
    case 'roundedElbow':
      drawRoundedElbowLine(ctx, x1, y1, x2, y2);
      break;
    case 'dashedCurve':
    case 'curve':
    default:
      drawCubicBezier(ctx, x1, y1, x2, y2);
      break;
  }

  ctx.setLineDash([]);
}

/** 在缩略画布上绘制样式预览 */
export function drawLineStylePreview(
  ctx: CanvasRenderingContext2D,
  styleId: LineStyleId,
  color = '#8B5CF6',
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const padding = 8;

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = color;
  drawConnectionLine(ctx, padding, h / 2, w - padding, h / 2, styleId);
}
