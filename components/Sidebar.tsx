import React, { useState, useMemo, useRef, useEffect } from 'react';
import { type Conversation } from '../types';
import { PlusIcon, MessageSquareIcon, SettingsIcon, SearchIcon, SunIcon, MoonIcon, GoogleDriveIcon, UploadCloudIcon, ShareIcon, TrashIcon, PinIcon, ExportIcon } from './icons/Icons';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onOpenSettings: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isGoogleSignedIn: boolean;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onUploadConversation: (id: string) => void;
  onUploadAllConversations: () => void;
  onCreateDoc: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onTogglePin: (id: string) => void;
  onExportConversation: (id: string, format: 'txt' | 'pdf') => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onOpenSettings,
  theme,
  onToggleTheme,
  isGoogleSignedIn,
  onGoogleSignIn,
  onGoogleSignOut,
  onUploadConversation,
  onUploadAllConversations,
  onCreateDoc,
  onDeleteConversation,
  onTogglePin,
  onExportConversation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [exportMenuOpenFor, setExportMenuOpenFor] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
            setExportMenuOpenFor(null);
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const sortedAndFilteredConversations = useMemo(() => {
    return conversations
      .filter(conv => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const titleMatch = conv.title.toLowerCase().includes(query);
        const messageMatch = conv.messages.some(msg =>
          msg.content && msg.content.toLowerCase().includes(query)
        );
        return titleMatch || messageMatch;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // Assuming the original array is sorted by creation date (newest first)
        return 0;
      });
  }, [conversations, searchQuery]);


  return (
    <aside className="w-64 bg-white dark:bg-slate-900 flex flex-col p-2 border-r border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between p-2 mb-2">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">ConverseAI</h1>
      </div>
      <button
        onClick={onNewConversation}
        className="flex items-center justify-center w-full px-4 py-2 mb-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-indigo-500 transition-colors"
      >
        <PlusIcon className="w-5 h-5 mr-2" />
        New Chat
      </button>
      <div className="relative mb-2">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Search conversations"
        />
      </div>
      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {sortedAndFilteredConversations.map((conv) => (
            <li key={conv.id} className="group relative">
              <button
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left flex items-center p-2 text-sm rounded-md transition-colors ${
                  conv.id === activeConversationId
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MessageSquareIcon className="w-4 h-4 mr-3 text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="truncate flex-1">{conv.title}</span>
                {conv.isPinned && <PinIcon className="w-4 h-4 ml-2 text-indigo-400 dark:text-indigo-500 shrink-0" fill="currentColor"/>}
              </button>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(conv.id);
                    }}
                    className="p-1 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
                    aria-label={conv.isPinned ? "Unpin conversation" : "Pin conversation"}
                  >
                    <PinIcon className="w-4 h-4" fill={conv.isPinned ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    className="p-1 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-red-500 dark:hover:bg-red-600 text-slate-600 dark:text-slate-300 hover:text-white dark:hover:text-white"
                    aria-label="Delete conversation"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                          e.stopPropagation();
                          setExportMenuOpenFor(exportMenuOpenFor === conv.id ? null : conv.id);
                      }}
                      className="p-1 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
                      aria-label="Export conversation"
                    >
                      <ExportIcon className="w-4 h-4" />
                    </button>
                    {exportMenuOpenFor === conv.id && (
                        <div
                            ref={exportMenuRef}
                            className="absolute right-0 bottom-full mb-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-10 py-1"
                        >
                            <button
                                onClick={() => {
                                    onExportConversation(conv.id, 'txt');
                                    setExportMenuOpenFor(null);
                                }}
                                className="w-full text-left px-3 py-1 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                Export as TXT
                            </button>
                            <button
                                onClick={() => {
                                    onExportConversation(conv.id, 'pdf');
                                    setExportMenuOpenFor(null);
                                }}
                                className="w-full text-left px-3 py-1 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                Export as PDF
                            </button>
                        </div>
                    )}
                  </div>
                  {isGoogleSignedIn && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateDoc(conv.id);
                        }}
                        className="p-1 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
                        aria-label="Create Google Doc"
                      >
                        <ShareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUploadConversation(conv.id);
                        }}
                        className="p-1 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
                        aria-label="Upload to Google Drive"
                      >
                        <UploadCloudIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
         {!isGoogleSignedIn ? (
             <button
                onClick={onGoogleSignIn}
                className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-blue-500 transition-colors"
            >
                <GoogleDriveIcon className="w-5 h-5 mr-2"/>
                Sign in with Google
            </button>
         ) : (
            <div className="space-y-2">
                <button
                    onClick={onUploadAllConversations}
                    className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-indigo-500 transition-colors"
                >
                    <UploadCloudIcon className="w-5 h-5 mr-2" />
                    Upload All to Drive
                </button>
                <button
                    onClick={onGoogleSignOut}
                    className="w-full text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                    Sign Out
                </button>
            </div>
         )}
         <div className="flex items-center gap-2">
            <button
                onClick={onOpenSettings}
                className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-indigo-500 transition-colors"
            >
                <SettingsIcon className="w-5 h-5 mr-2" />
                Settings
            </button>
            <button
                onClick={onToggleTheme}
                className="p-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-indigo-500 transition-colors"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
                {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
         </div>
         <p className="text-xs text-slate-500 text-center">Powered by Gemini</p>
      </div>
    </aside>
  );
};

export default Sidebar;