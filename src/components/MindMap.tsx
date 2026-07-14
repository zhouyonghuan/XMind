import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import type { MindMapNode, LineStyleId } from '../types';
import { computeLayout } from '../utils/layout';
import { drawMindMap } from '../utils/canvasRenderer';
import { hitTestLayout, screenToLayout } from '../utils/hitTest';
import {
  addChildNode,
  removeNode,
  findNode,
  resolveSummaryTarget,
  addSummaryGroup,
  removeSummaryGroup,
  findSummaryParentOfSelection,
  renameNode,
  renameSummary,
} from '../utils/treeOps';
import { LineStylePicker } from './LineStylePicker';
import { Toolbar } from './Toolbar';
import { NodeEditor, type EditTarget } from './NodeEditor';
import { exportToXmind } from '../utils/exportXmind';
import './MindMap.css';

interface MindMapProps {
  data: MindMapNode;
  lineStyle: LineStyleId;
  onLineStyleChange: (styleId: LineStyleId) => void;
  onCommit: (next: MindMapNode) => void;
  onUndo: () => void;
  canUndo: boolean;
}

export function MindMap({
  data,
  lineStyle,
  onLineStyleChange,
  onCommit,
  onUndo,
  canUndo,
}: MindMapProps) {
  const layout = useMemo(() => computeLayout(data), [data]);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([data.id]);
  const [selectedSummaryParentId, setSelectedSummaryParentId] = useState<
    string | null
  >(null);
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [exporting, setExporting] = useState(false);
  const panStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const modeRef = useRef<'none' | 'pan' | 'select'>('none');

  const primarySelectedId = selectedIds.length === 1 ? selectedIds[0]! : null;
  const isEditing = editing !== null;

  const getLayoutPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return screenToLayout(clientX, clientY, rect, offset, scale);
    },
    [offset, scale],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setSelectedSummaryParentId(null);
  }, []);

  const startEditNode = useCallback(
    (nodeId: string) => {
      const node = findNode(data, nodeId);
      if (!node) return;
      setSelectedIds([nodeId]);
      setSelectedSummaryParentId(null);
      setEditing({ kind: 'node', id: nodeId, text: node.text });
    },
    [data],
  );

  const startEditSummary = useCallback(
    (parentId: string) => {
      const parent = findNode(data, parentId);
      if (!parent?.summaryGroup) return;
      setSelectedIds([]);
      setSelectedSummaryParentId(parentId);
      setEditing({
        kind: 'summary',
        parentId,
        text: parent.summaryGroup.summaryText,
      });
    },
    [data],
  );

  const startEditSelection = useCallback(() => {
    if (selectedSummaryParentId) {
      startEditSummary(selectedSummaryParentId);
      return;
    }
    if (primarySelectedId) {
      startEditNode(primarySelectedId);
    }
  }, [selectedSummaryParentId, primarySelectedId, startEditNode, startEditSummary]);

  const cancelEdit = useCallback(() => {
    setEditing(null);
  }, []);

  const commitEdit = useCallback(
    (text: string) => {
      if (!editing) return;
      if (editing.kind === 'node') {
        const next = renameNode(data, editing.id, text);
        if (next) onCommit(next);
      } else {
        const next = renameSummary(data, editing.parentId, text);
        if (next) onCommit(next);
      }
      setEditing(null);
    },
    [editing, data, onCommit],
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = container.getBoundingClientRect();

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    drawMindMap(ctx, layout, {
      lineStyle,
      selectedIds,
      selectedSummaryParentId,
      editingNodeId: editing?.kind === 'node' ? editing.id : null,
      editingSummaryParentId:
        editing?.kind === 'summary' ? editing.parentId : null,
    });
    ctx.restore();
  }, [
    layout,
    offset,
    scale,
    lineStyle,
    selectedIds,
    selectedSummaryParentId,
    editing,
  ]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => render());
    observer.observe(container);
    return () => observer.disconnect();
  }, [render]);

  useEffect(() => {
    const validIds = selectedIds.filter((id) =>
      layout.nodes.some((n) => n.id === id),
    );
    if (validIds.length !== selectedIds.length) {
      setSelectedIds(validIds.length > 0 ? validIds : [data.id]);
    }
  }, [layout, selectedIds, data.id]);

  useEffect(() => {
    if (
      selectedSummaryParentId &&
      !layout.summaries.some((s) => s.parentId === selectedSummaryParentId)
    ) {
      setSelectedSummaryParentId(null);
    }
  }, [layout, selectedSummaryParentId]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (isEditing) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((s) => Math.min(Math.max(s * delta, 0.3), 3));
    },
    [isEditing],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleAdd = useCallback(() => {
    if (!primarySelectedId) return;
    const result = addChildNode(data, primarySelectedId);
    if (!result) return;
    onCommit(result.tree);
    setSelectedIds([result.newNodeId]);
    setSelectedSummaryParentId(null);
    // 新增后立刻进入编辑
    const created = findNode(result.tree, result.newNodeId);
    if (created) {
      setEditing({ kind: 'node', id: result.newNodeId, text: created.text });
    }
  }, [data, primarySelectedId, onCommit]);

  const handleDelete = useCallback(() => {
    if (isEditing) return;

    if (selectedSummaryParentId) {
      const next = removeSummaryGroup(data, selectedSummaryParentId);
      if (!next) return;
      onCommit(next);
      setSelectedSummaryParentId(null);
      return;
    }

    const ids = selectedIds.filter((id) => {
      const node = findNode(data, id);
      return node && node.type !== 'root';
    });
    if (ids.length === 0) return;

    let next = data;
    for (const id of ids) {
      const updated = removeNode(next, id);
      if (updated) next = updated;
    }
    if (next === data) return;
    onCommit(next);
    setSelectedIds([data.id]);
  }, [data, selectedIds, selectedSummaryParentId, onCommit, isEditing]);

  const handleAddSummary = useCallback(() => {
    const target = resolveSummaryTarget(data, selectedIds);
    const next = addSummaryGroup(data, selectedIds);
    if (!next || !target) return;
    onCommit(next);
    setSelectedSummaryParentId(target.parent.id);
  }, [data, selectedIds, onCommit]);

  const handleRemoveSummary = useCallback(() => {
    const parentId =
      selectedSummaryParentId ??
      findSummaryParentOfSelection(data, selectedIds);
    if (!parentId) return;
    const next = removeSummaryGroup(data, parentId);
    if (!next) return;
    onCommit(next);
    setSelectedSummaryParentId(null);
  }, [data, selectedIds, selectedSummaryParentId, onCommit]);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const name = `${data.text || '思维导图'}.xmind`;
      await exportToXmind(data, name);
    } catch (err) {
      console.error(err);
      window.alert('导出 XMind 失败，请重试');
    } finally {
      setExporting(false);
    }
  }, [data, exporting]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        onUndo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        handleAddSummary();
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        startEditSelection();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        handleAdd();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isEditing,
    handleAdd,
    handleDelete,
    handleAddSummary,
    onUndo,
    startEditSelection,
  ]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isEditing) return;

    const point = getLayoutPoint(e.clientX, e.clientY);
    if (!point) return;

    const hit = hitTestLayout(layout, point.x, point.y);
    if (hit) {
      modeRef.current = 'select';
      setIsPanning(false);

      if (hit.kind === 'summary') {
        setSelectedIds([]);
        setSelectedSummaryParentId(hit.summary.parentId);
        return;
      }

      setSelectedSummaryParentId(null);
      const id = hit.node.id;
      if (e.ctrlKey || e.metaKey) {
        setSelectedIds((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
      } else {
        setSelectedIds([id]);
      }
      return;
    }

    modeRef.current = 'pan';
    clearSelection();
    setIsPanning(true);
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isEditing) return;
    const point = getLayoutPoint(e.clientX, e.clientY);
    if (!point) return;

    const hit = hitTestLayout(layout, point.x, point.y);
    if (!hit) return;

    e.preventDefault();
    if (hit.kind === 'summary') {
      startEditSummary(hit.summary.parentId);
    } else {
      startEditNode(hit.node.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (modeRef.current !== 'pan' || isEditing) return;
    setOffset({
      x: panStart.current.offsetX + (e.clientX - panStart.current.x),
      y: panStart.current.offsetY + (e.clientY - panStart.current.y),
    });
  };

  const handleMouseUp = () => {
    modeRef.current = 'none';
    setIsPanning(false);
  };

  const canAdd = primarySelectedId !== null && !isEditing;
  const canDelete =
    !isEditing &&
    (selectedSummaryParentId !== null ||
      selectedIds.some((id) => {
        const node = findNode(data, id);
        return node !== null && node.type !== 'root';
      }));
  const canAddSummary =
    !isEditing && resolveSummaryTarget(data, selectedIds) !== null;
  const canRemoveSummary =
    !isEditing &&
    (selectedSummaryParentId !== null ||
      findSummaryParentOfSelection(data, selectedIds) !== null);
  const canEdit =
    !isEditing &&
    (selectedSummaryParentId !== null || primarySelectedId !== null);

  const editorRect = useMemo(() => {
    if (!editing) return null;

    if (editing.kind === 'node') {
      const node = layout.nodes.find((n) => n.id === editing.id);
      if (!node) return null;
      return {
        left: offset.x + node.x * scale,
        top: offset.y + node.y * scale,
        width: Math.max(node.width, 64) * scale,
        height: node.height * scale,
        fontSize: (node.type === 'root' ? 15 : node.type === 'branch' ? 14 : 13) * scale,
        centered: node.type === 'root',
      };
    }

    const summary = layout.summaries.find((s) => s.parentId === editing.parentId);
    if (!summary) return null;
    return {
      left: offset.x + summary.x * scale,
      top: offset.y + summary.y * scale,
      width: Math.max(summary.width, 56) * scale,
      height: summary.height * scale,
      fontSize: 12 * scale,
      centered: true,
    };
  }, [editing, layout, offset, scale]);

  return (
    <div className="mindmap-wrapper">
      <Toolbar
        canAdd={canAdd}
        canDelete={canDelete}
        canUndo={canUndo && !isEditing}
        canAddSummary={canAddSummary}
        canRemoveSummary={canRemoveSummary}
        canEdit={canEdit}
        exporting={exporting}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onUndo={onUndo}
        onAddSummary={handleAddSummary}
        onRemoveSummary={handleRemoveSummary}
        onEdit={startEditSelection}
        onExport={handleExport}
      />
      <LineStylePicker value={lineStyle} onChange={onLineStyleChange} />
      <div
        ref={containerRef}
        className={`mindmap-canvas ${isPanning ? 'panning' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <canvas ref={canvasRef} className="mindmap-canvas-element" />
        {editing && editorRect && (
          <NodeEditor
            target={editing}
            left={editorRect.left}
            top={editorRect.top}
            width={editorRect.width}
            height={editorRect.height}
            fontSize={editorRect.fontSize}
            centered={editorRect.centered}
            onCommit={commitEdit}
            onCancel={cancelEdit}
          />
        )}
      </div>
    </div>
  );
}
