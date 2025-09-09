import React, { useState, useRef, useEffect } from 'react';
import { type Message, type MindMapNode } from '../types';
import { SendIcon, SparklesIcon, AlertTriangleIcon, ImageSkeletonLoader, XCircleIcon, PaperclipIcon, CodeIcon, FilmIcon, MindMapIcon, ImageIcon, VideoIcon, MicrophoneIcon, SpeakerIcon } from './icons/Icons';
import MindMap from './MindMap';

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

type Mode = 'chat' | 'image' | 'code' | 'script' | 'mindmap' | 'video';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (message: string, image?: { data: string; mimeType: string }) => void;
  onGenerateImage: (prompt: string) => void;
  onCodeQuery: (prompt: string) => void;
  onGenerateScript: (prompt: string) => void;
  onGenerateMindMap: (prompt: string) => void;
  onGenerateVideo: (prompt: string) => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

const MessageContent: React.FC<{ content: string }> = ({ content }) => {
    // Splits the content by markdown code blocks (```...```)
    const parts = content.split(/(```[\w\s-]*\n[\s\S]*?\n```)/g);
  
    return (
      <div className="relative group">
        {parts.map((part, index) => {
          if (part.startsWith('```')) {
            // Extracts the language from the opening fence, e.g., ```python
            const langMatch = part.match(/```([\w\s-]*)\n/);
            const language = langMatch ? langMatch[1] : '';
            // Removes the fences and language identifier to get the pure code
            const codeBlock = part.replace(/```[\w\s-]*\n/, '').replace(/\n```/, '');
            return (
              <div key={index} className="bg-slate-200 dark:bg-slate-900/70 rounded-md my-2 text-sm text-slate-800 dark:text-slate-200">
                <div className="bg-slate-300 dark:bg-slate-950/50 px-3 py-1 text-xs text-slate-600 dark:text-slate-400 rounded-t-md">
                    {language || 'code'}
                </div>
                <pre className="p-3 overflow-x-auto">
                    <code>{codeBlock}</code>
                </pre>
              </div>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

const MindMapRenderer: React.FC<{ content: string }> = ({ content }) => {
    try {
      // A simple check to see if the content is a plausible, complete JSON object.
      const trimmedContent = content.trim();
      if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
        const data: MindMapNode = JSON.parse(trimmedContent);
        return <MindMap data={data} />;
      }
    } catch (e) {
      // This is expected while the JSON is streaming.
    }
    // Display a loading/generating state before the JSON is complete.
    return <div className="p-4 text-slate-500 dark:text-slate-400">Generating mind map...</div>;
  };


const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading, onSend, onGenerateImage, onCodeQuery, onGenerateScript, onGenerateMindMap, onGenerateVideo, addNotification }) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('chat');
  const [attachedImage, setAttachedImage] = useState<{ data: string; mimeType: string; url: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isSpeechPermissionDenied, setIsSpeechPermissionDenied] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Cleanup speech synthesis on component unmount
  useEffect(() => {
    return () => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    };
  }, []);

  const handleToggleSpeech = (message: Message) => {
    if (!window.speechSynthesis) {
      addNotification("Your browser does not support text-to-speech.", "error");
      return;
    }
  
    // If the clicked message is already speaking, toggle pause/resume
    if (speakingMessageId === message.id) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        window.speechSynthesis.pause();
      }
      return;
    }
  
    // If another message is speaking, cancel it
    window.speechSynthesis.cancel();
  
    // Create a new utterance
    // Strip markdown for cleaner speech
    const textToSpeak = message.content.replace(/```[\s\S]*?```/g, 'Code block');
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance;
  
    utterance.onstart = () => {
      setSpeakingMessageId(message.id);
    };
  
    utterance.onend = () => {
      setSpeakingMessageId(null);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      addNotification(`Text-to-speech error: ${event.error}`, 'error');
      setSpeakingMessageId(null);
    };

    window.speechSynthesis.speak(utterance);
  };


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
  }, [addNotification]);

  const handleToggleListening = () => {
    if (isSpeechPermissionDenied) return;
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch(e) {
        // Catch error if recognition is already started
        console.error("Speech recognition start failed:", e);
      }
    }
  };


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset height
        const scrollHeight = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [input]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const base64String = dataUrl.split(',')[1];
        setAttachedImage({ data: base64String, mimeType: file.type, url: dataUrl });
      };
      reader.readAsDataURL(file);
    }
    if(event.target) event.target.value = ''; // Allow re-uploading the same file
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit(e as any);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isListening) {
      recognitionRef.current?.stop();
    }
    if ((input.trim() || attachedImage) && !isLoading) {
      if (mode === 'chat') {
        onSend(input.trim(), attachedImage ?? undefined);
      } else if (mode === 'image') {
        onGenerateImage(input.trim());
      } else if (mode === 'code') {
        onCodeQuery(input.trim());
      } else if (mode === 'script') {
        onGenerateScript(input.trim());
      } else if (mode === 'mindmap') {
        onGenerateMindMap(input.trim());
      } else if (mode === 'video') {
        onGenerateVideo(input.trim());
      }
      setInput('');
      setAttachedImage(null);
    }
  };

  const isImageLoading = isLoading && messages[messages.length - 1]?.role === 'model' && !messages[messages.length - 1]?.isError && !messages[messages.length - 1]?.imageUrl && messages[messages.length - 1]?.content === 'Generating image...';

  const isSubmitDisabled = isLoading || (!input.trim() && (mode !== 'chat' || !attachedImage));

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-800">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`group relative max-w-xl rounded-lg ${
              message.role === 'user'
                ? 'bg-indigo-600 text-white'
                : message.isError
                ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
            } ${message.imageUrl && message.role === 'model' ? 'p-1' : (message.videoUrl && message.role === 'model') ? 'p-0' : message.isMindMap ? '' : 'px-4 py-2'}`}>
              
              {message.role === 'model' && !message.isError && !message.isMindMap && (
                <button 
                  onClick={() => handleToggleSpeech(message)}
                  className={`absolute -top-3 -right-3 p-1 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-400 dark:hover:bg-slate-500
                    ${speakingMessageId === message.id ? 'opacity-100' : ''}
                  `}
                  aria-label={speakingMessageId === message.id ? "Pause speech" : "Read aloud"}
                >
                  <SpeakerIcon className={`w-4 h-4 ${speakingMessageId === message.id ? 'text-indigo-500' : ''}`} />
                </button>
              )}

              {message.isError && (
                 <div className="flex items-center font-semibold mb-1 px-3 pt-1">
                    <AlertTriangleIcon className="w-4 h-4 mr-2" />
                    <span>Error</span>
                 </div>
              )}
              {message.isMindMap ? (
                <MindMapRenderer content={message.content} />
              ) : message.imageUrl && message.role === 'model' ? (
                <img src={message.imageUrl} alt="Generated" className="rounded-lg max-w-sm" />
              ) : message.videoUrl && message.role === 'model' ? (
                <div className="flex flex-col">
                  <div className="px-4 pt-2 pb-1 whitespace-pre-wrap"><MessageContent content={message.content} /></div>
                  <video src={message.videoUrl} controls className="rounded-b-lg max-w-sm" />
                </div>
              ) : (
                <div className={message.imageUrl && message.role === 'user' ? 'p-0' : 'whitespace-pre-wrap'}>
                    {message.imageUrl && message.role === 'user' && (
                         <img src={message.imageUrl} alt="User upload" className="rounded-t-lg max-w-sm mb-2" />
                    )}
                    <div className={message.imageUrl && message.role === 'user' ? 'px-4 pb-2' : ''}>
                        <MessageContent content={message.content} />
                    </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && !isImageLoading && messages[messages.length - 1]?.role !== 'user' && (
          <div className="flex justify-start">
            <div className="max-w-xl px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
        {isImageLoading && (
            <div className="flex justify-start">
              <div className="max-w-xl p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                  <ImageSkeletonLoader className="w-64 h-64 text-slate-400 dark:text-slate-600" />
              </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="relative">
          {attachedImage && (mode === 'chat') && (
            <div className="absolute bottom-full left-0 mb-2 p-1 bg-slate-800/80 dark:bg-slate-900/80 rounded-lg">
              <div className="relative">
                <img src={attachedImage.url} alt="upload preview" className="w-16 h-16 object-cover rounded" />
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="absolute -top-2 -right-2 bg-slate-600 dark:bg-slate-700 text-white rounded-full p-0.5 hover:bg-slate-500 dark:hover:bg-slate-600"
                  aria-label="Remove image"
                >
                  <XCircleIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-start space-x-2">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} accept="image/*" />
            {(mode === 'chat') && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 mt-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors shrink-0">
                  <PaperclipIcon className="w-5 h-5" />
                </button>
            )}
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening ? "Listening..." :
                mode === 'chat' ? 'Type a message or upload an image...' :
                mode === 'image' ? 'Describe the image you want to create...' :
                mode === 'code' ? 'Paste your code here to debug or explain...' :
                mode === 'script' ? 'Describe the video you want a script for...' :
                mode === 'video' ? 'Describe the video you want to generate...' :
                'Enter a topic to create a mind map...'
              }
              className="flex-1 w-full px-4 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none overflow-y-hidden"
              disabled={isLoading}
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
              disabled={isSubmitDisabled}
              className="px-4 py-2.5 mt-1 bg-indigo-600 text-white rounded-lg disabled:bg-indigo-400 disabled:cursor-not-allowed hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors shrink-0"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
         <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            <button
              onClick={() => { setMode('chat'); setAttachedImage(null); }}
              className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 transition-colors ${mode === 'chat' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'}`}
            >
              <SparklesIcon className="w-3 h-3"/> Chat
            </button>
            <button
              onClick={() => { setMode('image'); setAttachedImage(null); }}
              className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 transition-colors ${mode === 'image' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'}`}
            >
               <ImageIcon className="w-3 h-3"/> Image
            </button>
             <button
              onClick={() => { setMode('code'); setAttachedImage(null); }}
              className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 transition-colors ${mode === 'code' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'}`}
            >
               <CodeIcon className="w-3 h-3"/> Code
            </button>
            <button
              onClick={() => { setMode('script'); setAttachedImage(null); }}
              className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 transition-colors ${mode === 'script' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'}`}
            >
               <FilmIcon className="w-3 h-3"/> Script
            </button>
            <button
              onClick={() => { setMode('mindmap'); setAttachedImage(null); }}
              className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 transition-colors ${mode === 'mindmap' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'}`}
            >
               <MindMapIcon className="w-3 h-3"/> Mind Map
            </button>
            <button
              onClick={() => { setMode('video'); setAttachedImage(null); }}
              className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 transition-colors ${mode === 'video' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'}`}
            >
               <VideoIcon className="w-3 h-3"/> Video
            </button>
          </div>
      </div>
    </div>
  );
};

export default ChatWindow;