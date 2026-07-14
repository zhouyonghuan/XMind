import './Toolbar.css';

interface ToolbarProps {
  canAdd: boolean;
  canDelete: boolean;
  canUndo: boolean;
  canAddSummary: boolean;
  canRemoveSummary: boolean;
  canEdit: boolean;
  exporting?: boolean;
  onAdd: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onAddSummary: () => void;
  onRemoveSummary: () => void;
  onEdit: () => void;
  onExport: () => void;
}

export function Toolbar({
  canAdd,
  canDelete,
  canUndo,
  canAddSummary,
  canRemoveSummary,
  canEdit,
  exporting = false,
  onAdd,
  onDelete,
  onUndo,
  onAddSummary,
  onRemoveSummary,
  onEdit,
  onExport,
}: ToolbarProps) {
  return (
    <div className="mindmap-toolbar">
      <button
        type="button"
        className="toolbar-btn"
        disabled={!canAdd}
        onClick={onAdd}
        title="新增子节点 (Tab)"
      >
        新增
      </button>
      <button
        type="button"
        className="toolbar-btn"
        disabled={!canEdit}
        onClick={onEdit}
        title="编辑文字 (F2 / 双击)"
      >
        编辑
      </button>
      <button
        type="button"
        className="toolbar-btn danger"
        disabled={!canDelete}
        onClick={onDelete}
        title="删除节点 (Delete)"
      >
        删除
      </button>
      <button
        type="button"
        className="toolbar-btn"
        disabled={!canAddSummary}
        onClick={onAddSummary}
        title="添加概要 (Ctrl+G)&#10;选中分支/中心主题：为其全部子节点添加概要&#10;或 Ctrl+多选至少 2 个同级节点"
      >
        概要
      </button>
      <button
        type="button"
        className="toolbar-btn"
        disabled={!canRemoveSummary}
        onClick={onRemoveSummary}
        title="取消概要"
      >
        取消概要
      </button>
      <button
        type="button"
        className="toolbar-btn"
        disabled={!canUndo}
        onClick={onUndo}
        title="撤回 (Ctrl+Z)"
      >
        撤回
      </button>
      <button
        type="button"
        className="toolbar-btn"
        disabled={exporting}
        onClick={onExport}
        title="导出为 XMind 文件"
      >
        {exporting ? '导出中…' : '导出 XMind'}
      </button>
      <span className="toolbar-hint">双击节点可编辑文字</span>
    </div>
  );
}
