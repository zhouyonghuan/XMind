import JSZip from 'jszip';
import type { MindMapNode } from '../types';

interface XmindTopic {
  id: string;
  title: string;
  class?: string;
  structureClass?: string;
  children?: {
    attached?: XmindTopic[];
    summary?: XmindTopic[];
  };
  summaries?: Array<{
    id: string;
    range: string;
    topicId: string;
  }>;
}

function createId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 将内部节点树转为 XMind Zen topic */
function toXmindTopic(node: MindMapNode, isRoot = false): XmindTopic {
  const children = node.children ?? [];
  const attached = children.map((child) => toXmindTopic(child));

  const topic: XmindTopic = {
    id: node.id || createId('topic'),
    title: node.text,
    children: {
      attached,
    },
  };

  if (isRoot) {
    topic.class = 'topic';
    topic.structureClass = 'org.xmind.ui.logic.right';
  }

  if (node.summaryGroup && node.summaryGroup.childIds.length > 0) {
    const indices = node.summaryGroup.childIds
      .map((id) => children.findIndex((c) => c.id === id))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b);

    if (indices.length > 0) {
      const start = indices[0]!;
      const end = indices[indices.length - 1]!;
      const summaryTopicId = createId('summary');
      const summaryTitle = node.summaryGroup.summaryText || '概要';

      topic.children!.summary = [
        {
          id: summaryTopicId,
          title: summaryTitle,
        },
      ];
      topic.summaries = [
        {
          id: createId('range'),
          range: `(${start},${end})`,
          topicId: summaryTopicId,
        },
      ];
    }
  }

  return topic;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 导出为 XMind Zen（content.json）格式，可用 XMind 2020+ 打开。
 */
export async function exportToXmind(
  tree: MindMapNode,
  filename = '思维导图.xmind',
): Promise<void> {
  const sheetId = createId('sheet');
  const rootTopic = toXmindTopic(tree, true);

  const content = [
    {
      id: sheetId,
      class: 'sheet',
      title: tree.text || '画布 1',
      rootTopic,
      topicPositioning: 'fixed',
      topicOverlapping: 'overlap',
      coreVersion: '2.100.0',
      extensions: [],
    },
  ];

  const zip = new JSZip();
  zip.file('content.json', JSON.stringify(content));
  zip.file(
    'metadata.json',
    JSON.stringify({
      modifier: '',
      dataStructureVersion: '2',
      creator: { name: 'mindmap-whiteboard' },
      layoutEngineVersion: '3',
      activeSheetId: sheetId,
    }),
  );
  zip.file(
    'manifest.json',
    JSON.stringify({
      'file-entries': {
        'content.json': {},
        'metadata.json': {},
      },
    }),
  );

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.xmind.workbook',
  });

  const safeName = filename.toLowerCase().endsWith('.xmind')
    ? filename
    : `${filename}.xmind`;
  downloadBlob(blob, safeName);
}
