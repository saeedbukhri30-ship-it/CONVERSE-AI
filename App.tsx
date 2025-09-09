import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import PromptTemplates from './components/PromptTemplates';
import SettingsModal from './components/SettingsModal';
import { type Conversation, type Message, type UserPreferences } from './types';
import { sendMessageStream, generateConversationTitle, generateImage, generateResponseWithImageStream, analyzeCodeStream, generateVideoScriptStream, generateMindMapStream, generateVideo } from './services/geminiService';
import { initGoogleClient, signInToGoogle, signOutFromGoogle, uploadToDrive, createDocInDrive } from './services/googleDriveService';
import { exportConversationAsTxt, exportConversationAsPdf } from './services/exportService';
import { XCircleIcon } from './components/icons/Icons';


const generateId = () => crypto.randomUUID();
const PREFERENCES_KEY = 'userPreferences';
const THEME_KEY = 'app-theme';

type Notification = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
};

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    userName: '',
    customInstruction: '',
  });
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  useEffect(() => {
    try {
      initGoogleClient((isSignedIn) => {
        setIsGoogleSignedIn(isSignedIn);
      });
    } catch (error) {
      console.error("Error initializing Google Client", error);
      addNotification('Could not connect to Google Drive.', 'error');
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await signInToGoogle();
      setIsGoogleSignedIn(true);
      addNotification('Successfully signed in with Google.', 'success');
    } catch (error) {
      console.error("Google Sign-In failed", error);
      addNotification('Google Sign-In failed.', 'error');
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutFromGoogle();
    setIsGoogleSignedIn(false);
    addNotification('Successfully signed out.', 'info');
  };

  const handleUploadConversation = async (conversationId: string) => {
    if (!isGoogleSignedIn) {
      addNotification('Please sign in with Google first.', 'error');
      return;
    }
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    addNotification(`Uploading "${conversation.title}"...`, 'info');
    try {
      const fileName = `ConverseAI - ${conversation.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
      const fileContent = JSON.stringify(conversation, null, 2);
      await uploadToDrive(fileName, fileContent);
      addNotification(`"${conversation.title}" uploaded successfully.`, 'success');
    } catch (error) {
      console.error('Failed to upload conversation:', error);
      addNotification('Failed to upload conversation.', 'error');
    }
  };

  const handleUploadAllConversations = async () => {
    if (!isGoogleSignedIn) {
        addNotification('Please sign in with Google first.', 'error');
        return;
    }
    if (conversations.length === 0) {
        addNotification('No conversations to upload.', 'info');
        return;
    }

    addNotification('Uploading all conversations...', 'info');
    try {
        const date = new Date().toISOString().slice(0, 10);
        const fileName = `ConverseAI - All Chats (${date}).json`;
        const fileContent = JSON.stringify(conversations, null, 2);
        await uploadToDrive(fileName, fileContent);
        addNotification('All conversations uploaded successfully.', 'success');
    } catch (error) {
        console.error('Failed to upload all conversations:', error);
        addNotification('Failed to upload all conversations.', 'error');
    }
  };

  const handleCreateDoc = async (conversationId: string) => {
    if (!isGoogleSignedIn) {
      addNotification('Please sign in with Google first.', 'error');
      return;
    }
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    addNotification(`Creating Google Doc for "${conversation.title}"...`, 'info');

    try {
      const title = `ConverseAI - ${conversation.title}`;

      // Convert conversation to HTML
      const htmlContent = `
        <html>
          <head><title>${title}</title></head>
          <body>
            <h1>${conversation.title}</h1>
            <hr/>
            ${conversation.messages.map(msg => `
              <div>
                <p><b>${msg.role === 'user' ? (preferences.userName || 'User') : 'AI'}:</b></p>
                ${msg.imageUrl ? `<p><img src="${msg.imageUrl}" style="max-width: 500px;"/></p>` : ''}
                <p>${msg.content.replace(/\n/g, '<br/>')}</p>
              </div>
              <hr/>
            `).join('')}
          </body>
        </html>
      `;
      
      const docLink = await createDocInDrive(title, htmlContent);
      addNotification(`Successfully created document. Opening...`, 'success');
      window.open(docLink, '_blank');

    } catch (error) {
      console.error('Failed to create Google Doc:', error);
      addNotification('Failed to create Google Doc.', 'error');
    }
  };

  const handleExportConversation = async (conversationId: string, format: 'txt' | 'pdf') => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) {
      addNotification('Could not find conversation to export.', 'error');
      return;
    }

    addNotification(`Exporting "${conversation.title}" as ${format.toUpperCase()}...`, 'info');
    try {
      if (format === 'txt') {
        exportConversationAsTxt(conversation, preferences);
      } else if (format === 'pdf') {
        exportConversationAsPdf(conversation, preferences);
      }
    } catch (error) {
      console.error(`Failed to export conversation as ${format}:`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      addNotification(`Failed to export: ${errorMessage}`, 'error');
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    try {
      const savedConversations = localStorage.getItem('conversations');
      if (savedConversations) {
        setConversations(JSON.parse(savedConversations));
      }
    // FIX: Added missing opening brace for the catch block.
    } catch (error) {
      console.error("Failed to parse conversations from localStorage", error);
      localStorage.removeItem('conversations');
    }
  }, []);

  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('conversations', JSON.stringify(conversations));
    } else {
      localStorage.removeItem('conversations');
    }
  }, [conversations]);
  
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem(PREFERENCES_KEY);
      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences));
      }
    } catch (error) {
      console.error("Failed to parse preferences from localStorage", error);
      localStorage.removeItem(PREFERENCES_KEY);
    }
  }, []);

  const handleSavePreferences = (newPreferences: UserPreferences) => {
    setPreferences(newPreferences);
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPreferences));
  };


  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleNewConversation = () => {
    setActiveConversationId(null);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleDeleteConversation = (id: string) => {
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    }
  };

  const handleTogglePin = (id: string) => {
    setConversations(prev =>
      prev.map(c =>
        c.id === id ? { ...c, isPinned: !c.isPinned } : c
      )
    );
  };

  const updateLastMessage = (convId: string, messageId: string, update: Partial<Message>) => {
    setConversations(prev =>
      prev.map(c => {
        if (c.id === convId) {
          return {
            ...c,
            messages: c.messages.map(m =>
              m.id === messageId ? { ...m, ...update } : m
            ),
          };
        }
        return c;
      })
    );
  };

  const handleSend = async (messageContent: string, image?: { data: string; mimeType: string }) => {
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
      imageUrl: image ? `data:${image.mimeType};base64,${image.data}` : undefined,
    };

    let convId = activeConversationId;
    let currentHistory: Message[] = [];
    let isNewConversation = false;

    if (activeConversation) {
      currentHistory = activeConversation.messages;
      convId = activeConversation.id;
      setConversations(prev =>
        prev.map(c =>
          c.id === convId ? { ...c, messages: [...c.messages, userMessage] } : c
        )
      );
    } else {
      isNewConversation = true;
      const newId = generateId();
      const newConversation: Conversation = {
        id: newId,
        title: 'New Chat',
        messages: [userMessage],
        isPinned: false,
      };
      convId = newId;
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversationId(newId);
    }
    
    setIsLoading(true);

    if (isNewConversation) {
      generateConversationTitle(messageContent || "Image Analysis").then(title => {
        setConversations(prev =>
          prev.map(c => (c.id === convId ? { ...c, title } : c))
        );
      });
    }

    const modelMessage: Message = {
      id: generateId(),
      role: 'model',
      content: '',
      timestamp: Date.now(),
    };

    setConversations(prev =>
      prev.map(c =>
        c.id === convId
          ? { ...c, messages: [...c.messages, modelMessage] }
          : c
      )
    );

    try {
      const historyForAPI = [...currentHistory, userMessage].filter(m => !m.isError);
      
      const stream = image
        ? generateResponseWithImageStream(historyForAPI, preferences)
        : sendMessageStream(historyForAPI.filter(m => m !== userMessage), messageContent, preferences);

      for await (const chunk of stream) {
        setConversations(prev =>
          prev.map(c => {
            if (c.id === convId) {
              const lastMsg = c.messages[c.messages.length - 1];
              if (lastMsg.id === modelMessage.id) {
                lastMsg.content += chunk;
              }
              return { ...c };
            }
            return c;
          })
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : "Sorry, an error occurred. Please try again.";
      updateLastMessage(convId, modelMessage.id, { content: errorMessage, isError: true });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateImage = async (prompt: string) => {
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    let convId = activeConversationId;
    let isNewConversation = false;

    if (activeConversation) {
        convId = activeConversation.id;
        setConversations(prev =>
          prev.map(c =>
            c.id === convId ? { ...c, messages: [...c.messages, userMessage] } : c
          )
        );
    } else {
        isNewConversation = true;
        const newId = generateId();
        const newConversation: Conversation = {
            id: newId,
            title: `Image: ${prompt.substring(0, 20)}...`,
            messages: [userMessage],
        };
        convId = newId;
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newId);
    }

    setIsLoading(true);
    
    const modelMessage: Message = {
        id: generateId(),
        role: 'model',
        content: 'Generating image...',
        timestamp: Date.now(),
    };

    setConversations(prev =>
      prev.map(c =>
        c.id === convId
          ? { ...c, messages: [...c.messages, modelMessage] }
          : c
      )
    );

    try {
        const imageUrl = await generateImage(prompt);
        updateLastMessage(convId, modelMessage.id, { content: '', imageUrl });
    } catch (error) {
        console.error('Error generating image:', error);
        const errorMessage = error instanceof Error ? error.message : "Sorry, could not generate image. Please try again.";
        updateLastMessage(convId, modelMessage.id, { content: errorMessage, isError: true });
    } finally {
        setIsLoading(false);
    }
  };

  const handleGenerateVideo = async (prompt: string) => {
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    let convId = activeConversationId;
    let isNewConversation = false;

    if (activeConversation) {
        convId = activeConversation.id;
        setConversations(prev =>
          prev.map(c =>
            c.id === convId ? { ...c, messages: [...c.messages, userMessage] } : c
          )
        );
    } else {
        isNewConversation = true;
        const newId = generateId();
        const newConversation: Conversation = {
            id: newId,
            title: `Video: ${prompt.substring(0, 20)}...`,
            messages: [userMessage],
        };
        convId = newId;
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newId);
    }

    setIsLoading(true);
    
    const modelMessage: Message = {
        id: generateId(),
        role: 'model',
        content: 'Preparing to generate video...',
        timestamp: Date.now(),
    };

    setConversations(prev =>
      prev.map(c =>
        c.id === convId
          ? { ...c, messages: [...c.messages, modelMessage] }
          : c
      )
    );

    try {
        const videoUrl = await generateVideo(prompt, (status) => {
            updateLastMessage(convId, modelMessage.id, { content: status });
        });
        updateLastMessage(convId, modelMessage.id, { content: 'Your video is ready!', videoUrl });
    } catch (error) {
        console.error('Error generating video:', error);
        const errorMessage = error instanceof Error ? error.message : "Sorry, could not generate video. Please try again.";
        updateLastMessage(convId, modelMessage.id, { content: errorMessage, isError: true });
    } finally {
        setIsLoading(false);
    }
  };

  const handleCodeQuery = async (codeQuery: string) => {
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: codeQuery,
      timestamp: Date.now(),
    };

    let convId = activeConversationId;
    let currentHistory: Message[] = [];
    let isNewConversation = false;

    if (activeConversation) {
      currentHistory = activeConversation.messages;
      convId = activeConversation.id;
      setConversations(prev =>
        prev.map(c =>
          c.id === convId ? { ...c, messages: [...c.messages, userMessage] } : c
        )
      );
    } else {
      isNewConversation = true;
      const newId = generateId();
      const newConversation: Conversation = {
        id: newId,
        title: 'Code Assistant',
        messages: [userMessage],
      };
      convId = newId;
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversationId(newId);
    }
    
    setIsLoading(true);

    if (isNewConversation) {
      generateConversationTitle(codeQuery).then(title => {
        setConversations(prev =>
          prev.map(c => (c.id === convId ? { ...c, title: `Code: ${title}` } : c))
        );
      });
    }

    const modelMessage: Message = {
      id: generateId(),
      role: 'model',
      content: '',
      timestamp: Date.now(),
    };

    setConversations(prev =>
      prev.map(c =>
        c.id === convId
          ? { ...c, messages: [...c.messages, modelMessage] }
          : c
      )
    );

    try {
      const historyForAPI = [...currentHistory].filter(m => !m.isError);
      const stream = analyzeCodeStream(historyForAPI, codeQuery, preferences);

      for await (const chunk of stream) {
        setConversations(prev =>
          prev.map(c => {
            if (c.id === convId) {
              const lastMsg = c.messages[c.messages.length - 1];
              if (lastMsg.id === modelMessage.id) {
                lastMsg.content += chunk;
              }
              return { ...c };
            }
            return c;
          })
        );
      }
    } catch (error) {
      console.error('Error with code query:', error);
      const errorMessage = error instanceof Error ? error.message : "Sorry, an error occurred. Please try again.";
      updateLastMessage(convId, modelMessage.id, { content: errorMessage, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateScript = async (prompt: string) => {
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    let convId = activeConversationId;
    let currentHistory: Message[] = [];
    let isNewConversation = false;

    if (activeConversation) {
      currentHistory = activeConversation.messages;
      convId = activeConversation.id;
      setConversations(prev =>
        prev.map(c =>
          c.id === convId ? { ...c, messages: [...c.messages, userMessage] } : c
        )
      );
    } else {
      isNewConversation = true;
      const newId = generateId();
      const newConversation: Conversation = {
        id: newId,
        title: 'Video Script',
        messages: [userMessage],
      };
      convId = newId;
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversationId(newId);
    }
    
    setIsLoading(true);

    if (isNewConversation) {
      generateConversationTitle(prompt).then(title => {
        setConversations(prev =>
          prev.map(c => (c.id === convId ? { ...c, title: `Script: ${title}` } : c))
        );
      });
    }

    const modelMessage: Message = {
      id: generateId(),
      role: 'model',
      content: '',
      timestamp: Date.now(),
    };

    setConversations(prev =>
      prev.map(c =>
        c.id === convId
          ? { ...c, messages: [...c.messages, modelMessage] }
          : c
      )
    );

    try {
      const historyForAPI = [...currentHistory].filter(m => !m.isError);
      const stream = generateVideoScriptStream(historyForAPI, prompt, preferences);

      for await (const chunk of stream) {
        setConversations(prev =>
          prev.map(c => {
            if (c.id === convId) {
              const lastMsg = c.messages[c.messages.length - 1];
              if (lastMsg.id === modelMessage.id) {
                lastMsg.content += chunk;
              }
              return { ...c };
            }
            return c;
          })
        );
      }
    } catch (error) {
      console.error('Error with script generation:', error);
      const errorMessage = error instanceof Error ? error.message : "Sorry, an error occurred. Please try again.";
      updateLastMessage(convId, modelMessage.id, { content: errorMessage, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMindMap = async (prompt: string) => {
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    let convId = activeConversationId;
    let isNewConversation = false;

    if (activeConversation) {
      convId = activeConversation.id;
      setConversations(prev =>
        prev.map(c =>
          c.id === convId ? { ...c, messages: [...c.messages, userMessage] } : c
        )
      );
    } else {
      isNewConversation = true;
      const newId = generateId();
      const newConversation: Conversation = {
        id: newId,
        title: 'Mind Map',
        messages: [userMessage],
      };
      convId = newId;
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversationId(newId);
    }
    
    setIsLoading(true);

    if (isNewConversation) {
      generateConversationTitle(prompt).then(title => {
        setConversations(prev =>
          prev.map(c => (c.id === convId ? { ...c, title: `Map: ${title}` } : c))
        );
      });
    }

    const modelMessage: Message = {
      id: generateId(),
      role: 'model',
      content: '',
      timestamp: Date.now(),
      isMindMap: true,
    };

    setConversations(prev =>
      prev.map(c =>
        c.id === convId
          ? { ...c, messages: [...c.messages, modelMessage] }
          : c
      )
    );

    try {
      const stream = generateMindMapStream(prompt, preferences);

      for await (const chunk of stream) {
        setConversations(prev =>
          prev.map(c => {
            if (c.id === convId) {
              const lastMsg = c.messages[c.messages.length - 1];
              if (lastMsg.id === modelMessage.id) {
                lastMsg.content += chunk;
              }
              return { ...c };
            }
            return c;
          })
        );
      }
    } catch (error) {
      console.error('Error with mind map generation:', error);
      const errorMessage = error instanceof Error ? error.message : "Sorry, an error occurred. Please try again.";
      updateLastMessage(convId, modelMessage.id, { content: errorMessage, isError: true, isMindMap: false });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(n => (
          <div key={n.id} className={`flex items-center p-3 rounded-lg shadow-lg text-sm font-medium
            ${n.type === 'success' && 'bg-green-500 text-white'}
            ${n.type === 'error' && 'bg-red-500 text-white'}
            ${n.type === 'info' && 'bg-blue-500 text-white'}
          `}>
            {n.message}
          </div>
        ))}
      </div>

      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isGoogleSignedIn={isGoogleSignedIn}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        onUploadConversation={handleUploadConversation}
        onUploadAllConversations={handleUploadAllConversations}
        onCreateDoc={handleCreateDoc}
        onDeleteConversation={handleDeleteConversation}
        onTogglePin={handleTogglePin}
        onExportConversation={handleExportConversation}
      />
      <main className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-800">
        {activeConversation ? (
          <ChatWindow
            key={activeConversation.id} // Re-mount component when conversation changes
            messages={activeConversation.messages}
            isLoading={isLoading}
            onSend={handleSend}
            onGenerateImage={handleGenerateImage}
            onCodeQuery={handleCodeQuery}
            onGenerateScript={handleGenerateScript}
            onGenerateMindMap={handleGenerateMindMap}
            onGenerateVideo={handleGenerateVideo}
            addNotification={addNotification}
          />
        ) : (
          <PromptTemplates onSendMessage={handleSend} addNotification={addNotification} />
        )}
      </main>
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSavePreferences}
        currentPreferences={preferences}
      />
    </div>
  );
}

export default App;