import type { MindMapLayout, LayoutNode, SummaryLayout, LineStyleId } from '../types';
import { getNodeById, getConnectionPoints } from './layout';
import { drawCurlyBracket } from './bezier';
import { drawConnectionLine } from './lineStyles';

const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";

const TEXT_COLOR = '#1f2937';

export interface DrawOptions {
  lineStyle?: LineStyleId;
  selectedIds?: string[];
  selectedSummaryParentId?: string | null;
  /** 正在编辑时隐藏画布上的对应文字，避免与输入框重叠 */
  editingNodeId?: string | null;
  editingSummaryParentId?: string | null;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function drawEdges(
  ctx: CanvasRenderingContext2D,
  layout: MindMapLayout,
  lineStyle: LineStyleId,
): void {
  for (const edge of layout.edges) {
    const from = getNodeById(layout, edge.fromId);
    const to = getNodeById(layout, edge.toId);
    if (!from || !to) continue;

    const { x1, y1, x2, y2 } = getConnectionPoints(from, to);
    ctx.strokeStyle = edge.color;
    drawConnectionLine(ctx, x1, y1, x2, y2, lineStyle);
  }
}

function drawSummaryBox(
  ctx: CanvasRenderingContext2D,
  summary: SummaryLayout,
): void {
  const { x, y, width, height, color, text } = summary;

  drawRoundRect(ctx, x, y, width, height, 8);
  ctx.fillStyle = '#faf5ff';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `500 12px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + height / 2);
}

function drawSelectionHighlight(
  ctx: CanvasRenderingContext2D,
  node: LayoutNode,
): void {
  const pad = node.type === 'root' ? 4 : 6;
  drawRoundRect(
    ctx,
    node.x - pad,
    node.y - pad,
    node.width + pad * 2,
    node.height + pad * 2,
    node.type === 'root' ? node.height / 2 + 2 : 6,
  );
  ctx.fillStyle = 'rgba(139, 92, 246, 0.12)';
  ctx.fill();
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawRootNode(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
  const { x, y, width, height, color, text } = node;
  const radius = height / 2;

  drawRoundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `600 15px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + height / 2);
}

function drawTextNode(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
  const { type, text, x, y, height } = node;

  ctx.fillStyle = TEXT_COLOR;
  if (type === 'branch') {
    ctx.font = `500 14px ${FONT_FAMILY}`;
  } else {
    ctx.font = `400 13px ${FONT_FAMILY}`;
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + height / 2);
}

function drawNodes(
  ctx: CanvasRenderingContext2D,
  layout: MindMapLayout,
  selectedIds: string[] = [],
  editingNodeId?: string | null,
): void {
  const selected = new Set(selectedIds);

  for (const node of layout.nodes) {
    if (selected.has(node.id)) {
      drawSelectionHighlight(ctx, node);
    }

    const hideText = editingNodeId === node.id;

    if (node.type === 'root') {
      if (hideText) {
        drawRootNodeShell(ctx, node);
      } else {
        drawRootNode(ctx, node);
      }
    } else if (node.type === 'summary') {
      drawSummaryBox(ctx, {
        id: node.id,
        text: node.text,
        color: node.color,
        parentId: '',
        childIds: [],
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        bracketX: 0,
        bracketTop: 0,
        bracketBottom: 0,
      });
    } else if (!hideText) {
      drawTextNode(ctx, node);
    }
  }
}

function drawRootNodeShell(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
  const { x, y, width, height, color } = node;
  const radius = height / 2;
  drawRoundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawSummaries(
  ctx: CanvasRenderingContext2D,
  layout: MindMapLayout,
  lineStyle: LineStyleId,
  selectedSummaryParentId?: string | null,
  editingSummaryParentId?: string | null,
): void {
  ctx.lineCap = 'round';
  ctx.lineWidth = 2;

  for (const summary of layout.summaries) {
    const isSelected = selectedSummaryParentId === summary.parentId;
    ctx.strokeStyle = summary.color;
    ctx.lineWidth = isSelected ? 3 : 2;
    drawCurlyBracket(ctx, summary.bracketX, summary.bracketTop, summary.bracketBottom);

    const summaryCenterY = summary.y + summary.height / 2;
    const lineStartX = summary.bracketX + 14;
    const lineEndX = summary.x;
    drawConnectionLine(ctx, lineStartX, summaryCenterY, lineEndX, summaryCenterY, lineStyle);

    if (isSelected) {
      drawRoundRect(
        ctx,
        summary.x - 3,
        summary.y - 3,
        summary.width + 6,
        summary.height + 6,
        10,
      );
      ctx.fillStyle = 'rgba(139, 92, 246, 0.12)';
      ctx.fill();
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    if (editingSummaryParentId === summary.parentId) {
      drawRoundRect(ctx, summary.x, summary.y, summary.width, summary.height, 8);
      ctx.fillStyle = '#faf5ff';
      ctx.fill();
      ctx.strokeStyle = summary.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      drawSummaryBox(ctx, summary);
    }
  }
}

/** 在 Canvas 上绘制完整思维导图 */
export function drawMindMap(
  ctx: CanvasRenderingContext2D,
  layout: MindMapLayout,
  options: DrawOptions = {},
): void {
  const lineStyle = options.lineStyle ?? 'curve';
  drawEdges(ctx, layout, lineStyle);
  drawSummaries(
    ctx,
    layout,
    lineStyle,
    options.selectedSummaryParentId,
    options.editingSummaryParentId,
  );
  drawNodes(ctx, layout, options.selectedIds, options.editingNodeId);
}
