import React, { useState, useRef, useEffect } from 'react';
import { type Message } from '../types';
import { SendIcon, SparklesIcon, ImageIcon, AlertTriangleIcon, ImageSkeletonLoader } from './icons/Icons';

type Mode = 'chat' | 'image';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onGenerateImage: (prompt: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading, onSendMessage, onGenerateImage }) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      if (mode === 'chat') {
        onSendMessage(input.trim());
      } else {
        onGenerateImage(input.trim());
      }
      setInput('');
    }
  };

  const isImageLoading = isLoading && messages[messages.length - 1]?.role === 'model' && !messages[messages.length - 1]?.isError && !messages[messages.length - 1]?.imageUrl && messages[messages.length - 1]?.content === 'Generating image...';

  return (
    <div className="flex flex-col h-full bg-slate-800">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xl px-4 py-2 rounded-lg ${
              message.role === 'user'
                ? 'bg-indigo-600 text-white'
                : message.isError
                ? 'bg-red-500/20 text-red-300'
                : 'bg-slate-700 text-slate-200'
            }`}>
              {message.isError && (
                 <div className="flex items-center font-semibold mb-1">
                    <AlertTriangleIcon className="w-4 h-4 mr-2" />
                    <span>Error</span>
                 </div>
              )}
              {message.imageUrl ? (
                <img src={message.imageUrl} alt="Generated image" className="rounded-lg max-w-sm" />
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && !isImageLoading && messages[messages.length - 1]?.role !== 'user' && (
          <div className="flex justify-start">
            <div className="max-w-xl px-4 py-2 rounded-lg bg-slate-700 text-slate-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
        {isImageLoading && (
            <div className="flex justify-start">
              <div className="max-w-xl p-2 rounded-lg bg-slate-700 text-slate-200">
                  <ImageSkeletonLoader className="w-64 h-64 text-slate-600" />
              </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-slate-700">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'chat' ? 'Type your message...' : 'Describe the image you want to create...'}
            className="flex-1 w-full px-4 py-2 bg-slate-700 text-slate-200 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-indigo-400 disabled:cursor-not-allowed hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
         <div className="flex items-center justify-center gap-2 mt-2">
            <button
              onClick={() => setMode('chat')}
              className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 transition-colors ${mode === 'chat' ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
            >
              <SparklesIcon className="w-3 h-3"/> Chat
            </button>
            <button
              onClick={() => setMode('image')}
              className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 transition-colors ${mode === 'image' ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
            >
               <ImageIcon className="w-3 h-3"/> Image
            </button>
          </div>
      </div>
    </div>
  );
};

export default ChatWindow;
