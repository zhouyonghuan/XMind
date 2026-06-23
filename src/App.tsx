import { useState } from 'react';
import { MindMap } from './components/MindMap';
import { sampleMindMap } from './data/sampleData';
import type { LineStyleId } from './types';
import './App.css';

export default function App() {
  const [lineStyle, setLineStyle] = useState<LineStyleId>('curve');

  return (
    <div className="app">
      <MindMap
        data={sampleMindMap}
        lineStyle={lineStyle}
        onLineStyleChange={setLineStyle}
      />
    </div>
  );
}
