import type { MindMapNode, MindMapLayout, LayoutNode, LayoutEdge, SummaryLayout } from '../types';
import { BRANCH_COLORS } from '../types';

const ROOT_WIDTH = 120;
const ROOT_HEIGHT = 44;
const BRANCH_WIDTH = 80;
const BRANCH_HEIGHT = 28;
const SUB_WIDTH = 64;
const SUB_HEIGHT = 24;
const SUMMARY_WIDTH = 56;
const SUMMARY_HEIGHT = 32;

const H_GAP_ROOT_BRANCH = 80;
const H_GAP_BRANCH_SUB = 70;
const H_GAP_SUB_SUMMARY = 50;
const V_GAP_SUB = 12;
const V_GAP_BRANCH = 40;

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

interface SubtreeResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  summaries: SummaryLayout[];
  height: number;
  rootY: number;
}

function layoutSubtree(
  node: MindMapNode,
  x: number,
  y: number,
  color: string,
  isRoot = false,
): { result: SubtreeResult; centerY: number } {
  const size = measureNode(node.type);
  const layoutNode: LayoutNode = {
    id: node.id,
    text: node.text,
    type: node.type,
    color,
    x,
    y: y - size.height / 2,
    width: size.width,
    height: size.height,
  };

  const nodes: LayoutNode[] = [layoutNode];
  const edges: LayoutEdge[] = [];
  const summaries: SummaryLayout[] = [];

  if (!node.children?.length) {
    return {
      result: { nodes, edges, summaries, height: size.height, rootY: y },
      centerY: y,
    };
  }

  const children = node.children;
  const childX = x + size.width + (isRoot ? H_GAP_ROOT_BRANCH : H_GAP_BRANCH_SUB);

  // 先计算每个子树的高度
  const childLayouts: SubtreeResult[] = [];
  let totalHeight = 0;

  children.forEach((child, i) => {
    const childColor = isRoot ? BRANCH_COLORS[i % BRANCH_COLORS.length] : color;
    const childSize = measureNode(child.type);
    const estimatedHeight = child.children?.length
      ? child.children.length * (SUB_HEIGHT + V_GAP_SUB) + BRANCH_HEIGHT
      : childSize.height;
    totalHeight += estimatedHeight + (i > 0 ? V_GAP_BRANCH : 0);
    childLayouts.push({
      nodes: [],
      edges: [],
      summaries: [],
      height: estimatedHeight,
      rootY: 0,
    });
    void childColor;
  });

  // 实际布局子节点
  let currentY = y - totalHeight / 2;
  const actualLayouts: SubtreeResult[] = [];

  children.forEach((child, i) => {
    const childColor = isRoot ? BRANCH_COLORS[i % BRANCH_COLORS.length]! : color;
    const childSize = measureNode(child.type);

    if (child.type === 'branch' && child.children?.length) {
      const branchY = currentY + childSize.height / 2;
      const branchNode: LayoutNode = {
        id: child.id,
        text: child.text,
        type: 'branch',
        color: childColor,
        x: childX,
        y: branchY - childSize.height / 2,
        width: childSize.width,
        height: childSize.height,
      };

      edges.push({
        id: `${node.id}-${child.id}`,
        fromId: node.id,
        toId: child.id,
        color: childColor,
      });

      const subNodes: LayoutNode[] = [branchNode];
      const subEdges: LayoutEdge[] = [];
      const subX = childX + childSize.width + H_GAP_BRANCH_SUB;

      const subs = child.children;
      const summaryInfo = child.summaryGroup;
      const groupedIds = new Set(summaryInfo?.childIds ?? []);
      const regularSubs = subs.filter((s) => !groupedIds.has(s.id) || !summaryInfo);
      const groupedSubs = summaryInfo
        ? subs.filter((s) => groupedIds.has(s.id))
        : [];

      const allSubs = [...regularSubs, ...groupedSubs];
      const subTotalHeight =
        allSubs.length * SUB_HEIGHT + (allSubs.length - 1) * V_GAP_SUB;
      let subY = branchY - subTotalHeight / 2;

      allSubs.forEach((sub) => {
        const subNode: LayoutNode = {
          id: sub.id,
          text: sub.text,
          type: 'sub',
          color: childColor,
          x: subX,
          y: subY,
          width: SUB_WIDTH,
          height: SUB_HEIGHT,
        };
        subNodes.push(subNode);
        subEdges.push({
          id: `${child.id}-${sub.id}`,
          fromId: child.id,
          toId: sub.id,
          color: childColor,
        });
        subY += SUB_HEIGHT + V_GAP_SUB;
      });

      // 概要分组
      const branchSummaries: SummaryLayout[] = [];
      if (summaryInfo && groupedSubs.length > 0) {
        const firstGrouped = subNodes.find((n) => groupedIds.has(n.id))!;
        const lastGrouped = [...subNodes].reverse().find((n) => groupedIds.has(n.id))!;
        const bracketTop = firstGrouped.y;
        const groupBottom = lastGrouped.y + lastGrouped.height;
        const summaryX = subX + SUB_WIDTH + H_GAP_SUB_SUMMARY;

        branchSummaries.push({
          id: `${child.id}-summary`,
          text: summaryInfo.summaryText,
          color: childColor,
          childIds: summaryInfo.childIds,
          x: summaryX,
          y: (bracketTop + groupBottom) / 2 - SUMMARY_HEIGHT / 2,
          width: SUMMARY_WIDTH,
          height: SUMMARY_HEIGHT,
          bracketX: subX + SUB_WIDTH + 12,
          bracketTop,
          bracketBottom: groupBottom,
        });
      }

      const subtreeHeight = Math.max(
        childSize.height,
        subTotalHeight,
        calcBottom(subNodes, branchSummaries) - topY(subNodes),
      );

      actualLayouts.push({
        nodes: subNodes,
        edges: subEdges,
        summaries: branchSummaries,
        height: subtreeHeight,
        rootY: branchY,
      });

      currentY += subtreeHeight + V_GAP_BRANCH;
    } else {
      const childY = currentY + childSize.height / 2;
      const childResult = layoutSubtree(child, childX, childY, childColor);
      edges.push({
        id: `${node.id}-${child.id}`,
        fromId: node.id,
        toId: child.id,
        color: childColor,
      });
      actualLayouts.push(childResult.result);
      currentY += childResult.result.height + V_GAP_BRANCH;
    }
  });

  actualLayouts.forEach((layout) => {
    nodes.push(...layout.nodes.filter((n) => n.id !== node.id));
    edges.push(...layout.edges);
    summaries.push(...layout.summaries);
  });

  const allHeight = actualLayouts.reduce(
    (sum, l, i) => sum + l.height + (i > 0 ? V_GAP_BRANCH : 0),
    0,
  );

  return {
    result: { nodes, edges, summaries, height: Math.max(size.height, allHeight), rootY: y },
    centerY: y,
  };
}

function topY(nodes: LayoutNode[]): number {
  return Math.min(...nodes.map((n) => n.y));
}

function calcBottom(nodes: LayoutNode[], summaries: SummaryLayout[]): number {
  const nodeBottom = nodes.length ? Math.max(...nodes.map((n) => n.y + n.height)) : 0;
  const summaryBottom = summaries.length
    ? Math.max(...summaries.map((s) => s.bracketBottom))
    : 0;
  return Math.max(nodeBottom, summaryBottom);
}

export function computeLayout(tree: MindMapNode, padding = 60): MindMapLayout {
  const startX = padding;
  const startY = 300;

  const { result } = layoutSubtree(tree, startX, startY, '#8B5CF6', true);

  const allNodes = result.nodes;
  const minX = Math.min(...allNodes.map((n) => n.x)) - padding;
  const minY = Math.min(...allNodes.map((n) => n.y)) - padding;
  const maxX = Math.max(
    ...allNodes.map((n) => n.x + n.width),
    ...result.summaries.map((s) => s.x + s.width),
  ) + padding;
  const maxY = Math.max(
    ...allNodes.map((n) => n.y + n.height),
    ...result.summaries.map((s) => s.bracketBottom),
  ) + padding;

  // 归一化坐标
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
