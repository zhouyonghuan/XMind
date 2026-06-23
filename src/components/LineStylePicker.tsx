import { useEffect, useRef } from 'react';
import type { LineStyleId } from '../types';
import { LINE_STYLE_PRESETS, drawLineStylePreview } from '../utils/lineStyles';
import './LineStylePicker.css';

interface LineStylePickerProps {
  value: LineStyleId;
  onChange: (styleId: LineStyleId) => void;
}

function StylePreview({ styleId }: { styleId: LineStyleId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 56;
    const h = 28;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLineStylePreview(ctx, styleId);
  }, [styleId]);

  return <canvas ref={canvasRef} className="line-style-preview" />;
}

export function LineStylePicker({ value, onChange }: LineStylePickerProps) {
  return (
    <div className="line-style-picker">
      <div className="line-style-picker-title">连接线样式</div>
      <div className="line-style-picker-list">
        {LINE_STYLE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`line-style-option ${value === preset.id ? 'active' : ''}`}
            onClick={() => onChange(preset.id)}
            title={preset.description}
          >
            <StylePreview styleId={preset.id} />
            <span className="line-style-name">{preset.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
