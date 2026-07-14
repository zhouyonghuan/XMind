import type { MindMapLayout, LayoutNode, SummaryLayout } from '../types';

/** 将屏幕坐标转换为布局坐标系 */
export function screenToLayout(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  offset: { x: number; y: number },
  scale: number,
): { x: number; y: number } {
  return {
    x: (clientX - canvasRect.left - offset.x) / scale,
    y: (clientY - canvasRect.top - offset.y) / scale,
  };
}

function hitTestNode(node: LayoutNode, x: number, y: number): boolean {
  const padX = node.type === 'root' ? 4 : 16;
  const padY = node.type === 'root' ? 4 : 10;
  return (
    x >= node.x - padX &&
    x <= node.x + node.width + padX &&
    y >= node.y - padY &&
    y <= node.y + node.height + padY
  );
}

function hitTestSummary(summary: SummaryLayout, x: number, y: number): boolean {
  // 命中概要框或花括号区域
  const inBox =
    x >= summary.x &&
    x <= summary.x + summary.width &&
    y >= summary.y &&
    y <= summary.y + summary.height;

  const inBracket =
    x >= summary.bracketX - 4 &&
    x <= summary.bracketX + 20 &&
    y >= summary.bracketTop &&
    y <= summary.bracketBottom;

  return inBox || inBracket;
}

export type HitResult =
  | { kind: 'node'; node: LayoutNode }
  | { kind: 'summary'; summary: SummaryLayout };

/** 从上到下命中节点或概要 */
export function hitTestLayout(
  layout: MindMapLayout,
  x: number,
  y: number,
): HitResult | null {
  for (let i = layout.summaries.length - 1; i >= 0; i--) {
    const summary = layout.summaries[i]!;
    if (hitTestSummary(summary, x, y)) {
      return { kind: 'summary', summary };
    }
  }

  for (let i = layout.nodes.length - 1; i >= 0; i--) {
    const node = layout.nodes[i]!;
    if (hitTestNode(node, x, y)) {
      return { kind: 'node', node };
    }
  }

  return null;
}
