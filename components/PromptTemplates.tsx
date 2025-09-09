import React, { useState, useRef, useEffect } from 'react';
import { PROMPT_TEMPLATES } from '../constants';
import { SparklesIcon, SendIcon, MicrophoneIcon } from './icons/Icons';

// FIX: Define a minimal interface for SpeechRecognition to satisfy TypeScript, as it's a non-standard browser API.
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: any) => void;
  onend: () => void;
  onerror: (event: any) => void;
  start: () => void;
  stop: () => void;
}

interface PromptTemplatesProps {
  onSendMessage: (prompt: string) => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

const PromptTemplates: React.FC<PromptTemplatesProps> = ({ onSendMessage, addNotification }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isSpeechPermissionDenied, setIsSpeechPermissionDenied] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // FIX: Access SpeechRecognition APIs via `(window as any)` to avoid TypeScript errors for non-standard properties.
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const recognition: SpeechRecognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          addNotification('Microphone access was denied. Please allow microphone permission in your browser settings to use voice input.', 'error');
          setIsSpeechPermissionDenied(true);
        } else {
          addNotification(`An error occurred during speech recognition: ${event.error}`, 'error');
        }
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleToggleListening = () => {
    if (isSpeechPermissionDenied) return;
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset height
        const scrollHeight = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isListening) {
      recognitionRef.current?.stop();
    }
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit(e as any);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
        <div className="text-center max-w-2xl w-full">
            <div className="inline-block mb-4 bg-indigo-600 p-3 rounded-full">
                <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-100">How can I help you today?</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">Choose a template or start a new chat below.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROMPT_TEMPLATES.map((template) => (
                <button
                    key={template.title}
                    onClick={() => onSendMessage(template.prompt)}
                    className="p-4 bg-white dark:bg-slate-700/50 rounded-lg text-left hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">{template.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{template.prompt}</p>
                </button>
                ))}
            </div>
        </div>
      </div>
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-start space-x-2">
                <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Send a message..."}
                className="flex-1 w-full px-4 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none overflow-y-hidden"
                style={{maxHeight: '200px'}}
                />
                {isSpeechSupported && (
                    <button 
                        type="button"
                        onClick={handleToggleListening}
                        className={`p-2.5 mt-1 rounded-lg transition-colors shrink-0 ${
                            isListening 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:bg-slate-300 disabled:dark:bg-slate-800 disabled:cursor-not-allowed'
                        }`}
                        aria-label={isListening ? 'Stop listening' : 'Start listening'}
                        disabled={isSpeechPermissionDenied}
                        title={isSpeechPermissionDenied ? "Microphone permission denied" : (isListening ? 'Stop listening' : 'Start listening')}
                    >
                        <MicrophoneIcon className={`w-5 h-5 ${isSpeechPermissionDenied ? 'text-slate-400 dark:text-slate-500' : ''}`}/>
                    </button>
                )}
                <button
                type="submit"
                disabled={!input.trim()}
                className="px-4 py-2.5 mt-1 bg-indigo-600 text-white rounded-lg disabled:bg-indigo-400 disabled:cursor-not-allowed hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors shrink-0"
                >
                <SendIcon className="w-5 h-5" />
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default PromptTemplates;