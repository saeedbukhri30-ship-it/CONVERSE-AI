import React from 'react';
import { type MindMapNode } from '../types';

const MindMapNodeComponent: React.FC<{ node: MindMapNode, isRoot?: boolean }> = ({ node, isRoot = false }) => {
    return (
        <li className={`relative ${!isRoot ? 'ml-8' : ''}`}>
            {!isRoot && (
                <span className="absolute -left-4 top-2.5 h-px w-3 bg-slate-400 dark:bg-slate-500"></span>
            )}
            <div className="p-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-md inline-block">
                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">{node.topic}</p>
            </div>
            {node.children && node.children.length > 0 && (
                <ul className="mt-2 pl-4 border-l border-slate-400 dark:border-slate-500">
                    {node.children.map((child, index) => (
                        <MindMapNodeComponent key={index} node={child} />
                    ))}
                </ul>
            )}
        </li>
    );
};


const MindMap: React.FC<{ data: MindMapNode }> = ({ data }) => {
  return (
    <div className="p-4">
      <ul>
        <MindMapNodeComponent node={data} isRoot={true} />
      </ul>
    </div>
  );
};

export default MindMap;