import type { MindMapNode, NodeType } from '../types';

export function cloneTree(node: MindMapNode): MindMapNode {
  return {
    ...node,
    children: node.children?.map(cloneTree),
    summaryGroup: node.summaryGroup
      ? {
          ...node.summaryGroup,
          childIds: [...node.summaryGroup.childIds],
        }
      : undefined,
  };
}

export function findNode(tree: MindMapNode, id: string): MindMapNode | null {
  if (tree.id === id) return tree;
  for (const child of tree.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

/** 查找节点的直接父节点 */
export function findParent(
  tree: MindMapNode,
  nodeId: string,
): MindMapNode | null {
  for (const child of tree.children ?? []) {
    if (child.id === nodeId) return tree;
    const found = findParent(child, nodeId);
    if (found) return found;
  }
  return null;
}

function createId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function childTypeFor(parentType: NodeType): NodeType {
  if (parentType === 'root') return 'branch';
  return 'sub';
}

function defaultTextFor(type: NodeType): string {
  switch (type) {
    case 'branch':
      return '分支主题';
    case 'sub':
      return '子主题';
    default:
      return '新主题';
  }
}

/** 在指定节点下新增子节点，返回新树与新节点 id */
export function addChildNode(
  tree: MindMapNode,
  parentId: string,
): { tree: MindMapNode; newNodeId: string } | null {
  const next = cloneTree(tree);
  const parent = findNode(next, parentId);
  if (!parent) return null;

  const type = childTypeFor(parent.type);
  const newNode: MindMapNode = {
    id: createId(),
    text: defaultTextFor(type),
    type,
  };

  parent.children = [...(parent.children ?? []), newNode];

  return { tree: next, newNodeId: newNode.id };
}

/** 修改节点文字 */
export function renameNode(
  tree: MindMapNode,
  nodeId: string,
  text: string,
): MindMapNode | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const next = cloneTree(tree);
  const node = findNode(next, nodeId);
  if (!node) return null;
  if (node.text === trimmed) return null;
  node.text = trimmed;
  return next;
}

/** 修改概要文字 */
export function renameSummary(
  tree: MindMapNode,
  parentId: string,
  text: string,
): MindMapNode | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const next = cloneTree(tree);
  const parent = findNode(next, parentId);
  if (!parent?.summaryGroup) return null;
  if (parent.summaryGroup.summaryText === trimmed) return null;
  parent.summaryGroup = {
    ...parent.summaryGroup,
    summaryText: trimmed,
  };
  return next;
}

/** 删除节点及其子树（不可删根节点） */
export function removeNode(
  tree: MindMapNode,
  nodeId: string,
): MindMapNode | null {
  if (tree.id === nodeId) return null;

  const next = cloneTree(tree);

  function removeFrom(parent: MindMapNode): boolean {
    if (!parent.children) return false;

    const index = parent.children.findIndex((c) => c.id === nodeId);
    if (index >= 0) {
      parent.children = parent.children.filter((c) => c.id !== nodeId);
      if (parent.summaryGroup) {
        parent.summaryGroup = {
          ...parent.summaryGroup,
          childIds: parent.summaryGroup.childIds.filter((id) => id !== nodeId),
        };
        if (parent.summaryGroup.childIds.length === 0) {
          parent.summaryGroup = undefined;
        }
      }
      if (parent.children.length === 0) {
        parent.children = undefined;
      }
      return true;
    }

    for (const child of parent.children) {
      if (removeFrom(child)) return true;
    }
    return false;
  }

  return removeFrom(next) ? next : null;
}

/**
 * 解析当前选中状态对应的概要目标。
 * - 只选中一个父节点（中心主题 / 分支主题等）：为其全部直接子节点创建概要（至少 2 个子）
 * - 多选同级节点：对选中的兄弟节点创建概要
 */
export function resolveSummaryTarget(
  tree: MindMapNode,
  nodeIds: string[],
): { parent: MindMapNode; childIds: string[] } | null {
  const uniqueIds = [...new Set(nodeIds)];
  if (uniqueIds.length === 0) return null;

  // 选中单个父节点 → 为该节点的全部直接子节点添加概要
  if (uniqueIds.length === 1) {
    const parent = findNode(tree, uniqueIds[0]!);
    if (!parent) return null;
    const children = parent.children ?? [];
    if (children.length < 2) return null;
    return {
      parent,
      childIds: children.map((c) => c.id),
    };
  }

  const parent = findParent(tree, uniqueIds[0]!);
  if (!parent?.children) return null;

  const childIdSet = new Set(parent.children.map((c) => c.id));
  for (const id of uniqueIds) {
    if (id === tree.id) return null;
    if (!childIdSet.has(id)) return null;
    if (findParent(tree, id)?.id !== parent.id) return null;
  }

  const orderedIds = parent.children
    .map((c) => c.id)
    .filter((id) => uniqueIds.includes(id));

  return { parent, childIds: orderedIds };
}

export function getCommonParentForSummary(
  tree: MindMapNode,
  nodeIds: string[],
): MindMapNode | null {
  return resolveSummaryTarget(tree, nodeIds)?.parent ?? null;
}

/** 为同级节点创建/更新概要分组 */
export function addSummaryGroup(
  tree: MindMapNode,
  nodeIds: string[],
  summaryText = '概要',
): MindMapNode | null {
  const next = cloneTree(tree);
  const target = resolveSummaryTarget(next, nodeIds);
  if (!target) return null;

  target.parent.summaryGroup = {
    summaryText,
    childIds: target.childIds,
  };

  return next;
}

/** 移除父节点上的概要分组 */
export function removeSummaryGroup(
  tree: MindMapNode,
  parentId: string,
): MindMapNode | null {
  const next = cloneTree(tree);
  const parent = findNode(next, parentId);
  if (!parent?.summaryGroup) return null;
  parent.summaryGroup = undefined;
  return next;
}

/** 选中的节点对应某个带概要的父节点时，返回该父节点 id */
export function findSummaryParentOfSelection(
  tree: MindMapNode,
  nodeIds: string[],
): string | null {
  if (nodeIds.length === 0) return null;

  // 选中的正是带概要的父节点本身
  if (nodeIds.length === 1) {
    const node = findNode(tree, nodeIds[0]!);
    if (node?.summaryGroup) return node.id;
  }

  const parent = findParent(tree, nodeIds[0]!);
  if (!parent?.summaryGroup) return null;

  const grouped = new Set(parent.summaryGroup.childIds);
  const allInGroup = nodeIds.every(
    (id) => findParent(tree, id)?.id === parent.id && grouped.has(id),
  );
  return allInGroup ? parent.id : null;
}
