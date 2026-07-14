import { useState } from 'react';
import { MindMap } from './components/MindMap';
import { sampleMindMap } from './data/sampleData';
import { useMindMapHistory } from './hooks/useMindMapHistory';
import type { LineStyleId } from './types';
import './App.css';

export default function App() {
  const [lineStyle, setLineStyle] = useState<LineStyleId>('curve');
  const { data, commit, undo, canUndo } = useMindMapHistory(sampleMindMap);

  return (
    <div className="app">
      <MindMap
        data={data}
        lineStyle={lineStyle}
        onLineStyleChange={setLineStyle}
        onCommit={commit}
        onUndo={undo}
        canUndo={canUndo}
      />
    </div>
  );
}
