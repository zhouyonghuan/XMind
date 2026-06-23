import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import type { MindMapNode, LineStyleId } from '../types';
import { computeLayout } from '../utils/layout';
import { drawMindMap } from '../utils/canvasRenderer';
import { LineStylePicker } from './LineStylePicker';
import './MindMap.css';

interface MindMapProps {
  data: MindMapNode;
  lineStyle: LineStyleId;
  onLineStyleChange: (styleId: LineStyleId) => void;
}

export function MindMap({ data, lineStyle, onLineStyleChange }: MindMapProps) {
  const layout = useMemo(() => computeLayout(data), [data]);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

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
    drawMindMap(ctx, layout, { lineStyle });
    ctx.restore();
  }, [layout, offset, scale, lineStyle]);

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

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(Math.max(s * delta, 0.3), 3));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setOffset({
      x: panStart.current.offsetX + (e.clientX - panStart.current.x),
      y: panStart.current.offsetY + (e.clientY - panStart.current.y),
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  return (
    <div className="mindmap-wrapper">
      <LineStylePicker value={lineStyle} onChange={onLineStyleChange} />
      <div
        ref={containerRef}
        className={`mindmap-canvas ${isPanning ? 'panning' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} className="mindmap-canvas-element" />
      </div>
    </div>
  );
}
