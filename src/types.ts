export type NodeType = 'root' | 'branch' | 'sub' | 'summary';

export interface MindMapNode {
  id: string;
  text: string;
  type: NodeType;
  color?: string;
  children?: MindMapNode[];
  /** 子节点是否归入概要分组 */
  summaryGroup?: {
    summaryText: string;
    /** 参与分组的子节点 id 列表 */
    childIds: string[];
  };
}

export interface LayoutNode {
  id: string;
  text: string;
  type: NodeType;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutEdge {
  id: string;
  fromId: string;
  toId: string;
  color: string;
}

export interface SummaryLayout {
  id: string;
  text: string;
  color: string;
  /** 被分组的子节点 id */
  childIds: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  bracketX: number;
  bracketTop: number;
  bracketBottom: number;
}

export interface MindMapLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  summaries: SummaryLayout[];
  width: number;
  height: number;
}

export const BRANCH_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'] as const;

/** 分支连接线预设样式 id */
export type LineStyleId = 'curve' | 'straight' | 'elbow' | 'roundedElbow' | 'dashedCurve';
