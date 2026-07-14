import { useCallback, useRef, useState } from 'react';
import type { MindMapNode } from '../types';
import { cloneTree } from '../utils/treeOps';

const MAX_HISTORY = 50;

export function useMindMapHistory(initial: MindMapNode) {
  const [data, setData] = useState(() => cloneTree(initial));
  const historyRef = useRef<MindMapNode[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const pushHistory = useCallback((snapshot: MindMapNode) => {
    const stack = historyRef.current;
    stack.push(cloneTree(snapshot));
    if (stack.length > MAX_HISTORY) {
      stack.shift();
    }
    setCanUndo(stack.length > 0);
  }, []);

  const commit = useCallback(
    (next: MindMapNode) => {
      pushHistory(data);
      setData(next);
    },
    [data, pushHistory],
  );

  const undo = useCallback(() => {
    const stack = historyRef.current;
    const prev = stack.pop();
    if (!prev) return;
    setData(prev);
    setCanUndo(stack.length > 0);
  }, []);

  return { data, commit, undo, canUndo };
}
