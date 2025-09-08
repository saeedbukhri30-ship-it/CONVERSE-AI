import React from 'react';
import { type Conversation } from '../types';
import { PlusIcon, MessageSquareIcon } from './icons/Icons';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
}) => {
  return (
    <aside className="w-64 bg-slate-900 flex flex-col p-2 border-r border-slate-700">
      <div className="flex items-center justify-between p-2 mb-2">
        <h1 className="text-xl font-bold text-white">ConverseAI</h1>
      </div>
      <button
        onClick={onNewConversation}
        className="flex items-center justify-center w-full px-4 py-2 mb-4 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 transition-colors"
      >
        <PlusIcon className="w-5 h-5 mr-2" />
        New Chat
      </button>
      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left flex items-center p-2 text-sm rounded-md transition-colors ${
                  conv.id === activeConversationId
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <MessageSquareIcon className="w-4 h-4 mr-3 text-slate-400" />
                <span className="truncate flex-1">{conv.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto p-2 border-t border-slate-700">
         <p className="text-xs text-slate-500 text-center">Powered by Gemini</p>
      </div>
    </aside>
  );
};

export default Sidebar;
