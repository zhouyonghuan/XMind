import type { MindMapNode } from '../types';

export const sampleMindMap: MindMapNode = {
  id: 'root',
  text: '中心主题',
  type: 'root',
  children: [
    {
      id: 'branch-1',
      text: '分支主题',
      type: 'branch',
      children: [
        { id: 'sub-1-1', text: '子主题', type: 'sub' },
        { id: 'sub-1-2', text: '子主题', type: 'sub' },
        { id: 'sub-1-3', text: '子主题', type: 'sub' },
        { id: 'sub-1-4', text: '子主题', type: 'sub' },
      ],
      summaryGroup: {
        summaryText: '概要',
        childIds: ['sub-1-1', 'sub-1-2', 'sub-1-3', 'sub-1-4'],
      },
    },
    {
      id: 'branch-2',
      text: '分支主题',
      type: 'branch',
      children: [
        { id: 'sub-2-1', text: '子主题', type: 'sub' },
        { id: 'sub-2-2', text: '子主题', type: 'sub' },
      ],
    },
    {
      id: 'branch-3',
      text: '分支主题',
      type: 'branch',
      children: [
        { id: 'sub-3-1', text: '子主题', type: 'sub' },
        { id: 'sub-3-2', text: '子主题', type: 'sub' },
      ],
    },
    {
      id: 'branch-4',
      text: '分支主题',
      type: 'branch',
      children: [
        { id: 'sub-4-1', text: '子主题', type: 'sub' },
        { id: 'sub-4-2', text: '子主题', type: 'sub' },
      ],
    },
  ],
};
