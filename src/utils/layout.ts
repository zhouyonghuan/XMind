import type {
  MindMapNode,
  MindMapLayout,
  LayoutNode,
  LayoutEdge,
  SummaryLayout,
} from '../types';
import { BRANCH_COLORS } from '../types';

const ROOT_WIDTH = 120;
const ROOT_HEIGHT = 44;
const BRANCH_WIDTH = 88;
const BRANCH_HEIGHT = 28;
const SUB_WIDTH = 72;
const SUB_HEIGHT = 26;
const SUMMARY_WIDTH = 56;
const SUMMARY_HEIGHT = 32;

const H_GAP = 72;
const V_GAP = 16;
const SUMMARY_GAP = 48;

function measureNode(type: MindMapNode['type']): { width: number; height: number } {
  switch (type) {
    case 'root':
      return { width: ROOT_WIDTH, height: ROOT_HEIGHT };
    case 'branch':
      return { width: BRANCH_WIDTH, height: BRANCH_HEIGHT };
    case 'sub':
      return { width: SUB_WIDTH, height: SUB_HEIGHT };
    case 'summary':
      return { width: SUMMARY_WIDTH, height: SUMMARY_HEIGHT };
    default:
      return { width: SUB_WIDTH, height: SUB_HEIGHT };
  }
}

interface SubtreeLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  summaries: SummaryLayout[];
  /** 子树占用的垂直高度 */
  height: number;
  /** 本节点中心 Y（相对入参坐标系） */
  centerY: number;
}

function estimateSubtreeHeight(node: MindMapNode): number {
  const size = measureNode(node.type);
  if (!node.children?.length) return size.height;

  const childrenHeight = node.children.reduce((sum, child, i) => {
    return sum + estimateSubtreeHeight(child) + (i > 0 ? V_GAP : 0);
  }, 0);

  return Math.max(size.height, childrenHeight);
}

function layoutSubtree(
  node: MindMapNode,
  x: number,
  centerY: number,
  color: string,
  isRoot = false,
): SubtreeLayout {
  const size = measureNode(node.type);
  const layoutNode: LayoutNode = {
    id: node.id,
    text: node.text,
    type: node.type,
    color,
    x,
    y: centerY - size.height / 2,
    width: size.width,
    height: size.height,
  };

  const nodes: LayoutNode[] = [layoutNode];
  const edges: LayoutEdge[] = [];
  const summaries: SummaryLayout[] = [];

  if (!node.children?.length) {
    return { nodes, edges, summaries, height: size.height, centerY };
  }

  const childX = x + size.width + H_GAP;
  const children = node.children;
  const totalChildrenHeight = children.reduce((sum, child, i) => {
    return sum + estimateSubtreeHeight(child) + (i > 0 ? V_GAP : 0);
  }, 0);

  let currentTop = centerY - totalChildrenHeight / 2;

  children.forEach((child, i) => {
    const childColor = isRoot ? BRANCH_COLORS[i % BRANCH_COLORS.length]! : color;
    const childEstimate = estimateSubtreeHeight(child);
    const childCenterY = currentTop + childEstimate / 2;
    const childLayout = layoutSubtree(child, childX, childCenterY, childColor, false);

    edges.push({
      id: `${node.id}-${child.id}`,
      fromId: node.id,
      toId: child.id,
      color: childColor,
    });

    nodes.push(...childLayout.nodes);
    edges.push(...childLayout.edges);
    summaries.push(...childLayout.summaries);

    currentTop += childEstimate + V_GAP;
  });

  // 概要：对本节点的直接子节点做分组标记
  if (node.summaryGroup && node.summaryGroup.childIds.length > 0) {
    const groupedIds = new Set(node.summaryGroup.childIds);
    const groupedNodes = nodes.filter(
      (n) => groupedIds.has(n.id) && n.id !== node.id,
    );

    if (groupedNodes.length > 0) {
      const bracketTop = Math.min(...groupedNodes.map((n) => n.y));
      const bracketBottom = Math.max(...groupedNodes.map((n) => n.y + n.height));
      const maxChildRight = Math.max(...groupedNodes.map((n) => n.x + n.width));

      summaries.push({
        id: `${node.id}-summary`,
        text: node.summaryGroup.summaryText,
        color,
        parentId: node.id,
        childIds: [...node.summaryGroup.childIds],
        x: maxChildRight + SUMMARY_GAP,
        y: (bracketTop + bracketBottom) / 2 - SUMMARY_HEIGHT / 2,
        width: SUMMARY_WIDTH,
        height: SUMMARY_HEIGHT,
        bracketX: maxChildRight + 12,
        bracketTop,
        bracketBottom,
      });
    }
  }

  const contentBottom = Math.max(
    layoutNode.y + layoutNode.height,
    ...nodes.map((n) => n.y + n.height),
    ...summaries.map((s) => s.bracketBottom),
  );
  const contentTop = Math.min(
    layoutNode.y,
    ...nodes.map((n) => n.y),
    ...summaries.map((s) => s.bracketTop),
  );

  return {
    nodes,
    edges,
    summaries,
    height: Math.max(size.height, contentBottom - contentTop),
    centerY,
  };
}

export function computeLayout(tree: MindMapNode, padding = 60): MindMapLayout {
  const startX = padding;
  const startY = 300;

  const result = layoutSubtree(tree, startX, startY, '#8B5CF6', true);

  const allNodes = result.nodes;
  if (allNodes.length === 0) {
    return { nodes: [], edges: [], summaries: [], width: 0, height: 0 };
  }

  const minX = Math.min(...allNodes.map((n) => n.x)) - padding;
  const minY = Math.min(...allNodes.map((n) => n.y)) - padding;
  const summaryMaxX = result.summaries.length
    ? Math.max(...result.summaries.map((s) => s.x + s.width))
    : -Infinity;
  const summaryMaxY = result.summaries.length
    ? Math.max(...result.summaries.map((s) => s.bracketBottom))
    : -Infinity;

  const maxX = Math.max(...allNodes.map((n) => n.x + n.width), summaryMaxX) + padding;
  const maxY = Math.max(...allNodes.map((n) => n.y + n.height), summaryMaxY) + padding;

  const normalizedNodes = allNodes.map((n) => ({
    ...n,
    x: n.x - minX,
    y: n.y - minY,
  }));
  const normalizedSummaries = result.summaries.map((s) => ({
    ...s,
    x: s.x - minX,
    y: s.y - minY,
    bracketX: s.bracketX - minX,
    bracketTop: s.bracketTop - minY,
    bracketBottom: s.bracketBottom - minY,
  }));

  return {
    nodes: normalizedNodes,
    edges: result.edges,
    summaries: normalizedSummaries,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function getNodeById(layout: MindMapLayout, id: string): LayoutNode | undefined {
  return layout.nodes.find((n) => n.id === id);
}

export function getConnectionPoints(
  from: LayoutNode,
  to: LayoutNode,
): { x1: number; y1: number; x2: number; y2: number } {
  return {
    x1: from.x + from.width,
    y1: from.y + from.height / 2,
    x2: to.x,
    y2: to.y + to.height / 2,
  };
}
