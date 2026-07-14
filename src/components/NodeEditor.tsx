import { useEffect, useRef } from 'react';
import './NodeEditor.css';

export type EditTarget =
  | { kind: 'node'; id: string; text: string }
  | { kind: 'summary'; parentId: string; text: string };

interface NodeEditorProps {
  target: EditTarget;
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
  centered?: boolean;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

export function NodeEditor({
  target,
  left,
  top,
  width,
  height,
  fontSize,
  centered = false,
  onCommit,
  onCancel,
}: NodeEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [target]);

  const finish = (commit: boolean) => {
    const value = inputRef.current?.value ?? '';
    if (commit) onCommit(value);
    else onCancel();
  };

  return (
    <input
      ref={inputRef}
      className={`node-editor-input ${centered ? 'centered' : ''}`}
      defaultValue={target.text}
      style={{
        left,
        top,
        width: Math.max(width, 48),
        height: Math.max(height, 24),
        fontSize,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          finish(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        }
      }}
      onBlur={() => finish(true)}
    />
  );
}
