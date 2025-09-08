
import React from 'react';
import { PROMPT_TEMPLATES } from '../constants';
import { SparklesIcon } from './icons/Icons';

interface PromptTemplatesProps {
  onSelectTemplate: (prompt: string) => void;
}

const PromptTemplates: React.FC<PromptTemplatesProps> = ({ onSelectTemplate }) => {
  return (
    <div className="text-center flex flex-col items-center justify-center h-full">
      <div className="mb-4 bg-indigo-600 p-3 rounded-full">
        <SparklesIcon className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold mb-2 text-slate-100">How can I help you today?</h2>
      <p className="text-slate-400 mb-8">Choose a template or start a new chat below.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
        {PROMPT_TEMPLATES.map((template) => (
          <button
            key={template.title}
            onClick={() => onSelectTemplate(template.prompt)}
            className="p-4 bg-slate-700/50 rounded-lg text-left hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <h3 className="font-semibold text-slate-200">{template.title}</h3>
            <p className="text-sm text-slate-400 truncate">{template.prompt}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PromptTemplates;
