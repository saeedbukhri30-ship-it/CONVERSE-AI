import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import PromptTemplates from './components/PromptTemplates';
import { type Conversation, type Message } from './types';
import { sendMessageStream, generateConversationTitle, generateImage } from './services/geminiService';

const generateId = () => crypto.randomUUID();

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const savedConversations = localStorage.getItem('conversations');
      if (savedConversations) {
        setConversations(JSON.parse(savedConversations));
      }
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

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleNewConversation = () => {
    setActiveConversationId(null);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
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

  const handleSendMessage = async (messageContent: string) => {
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
    };

    let convId = activeConversationId;
    let history: Message[] = [];
    let isNewConversation = false;

    if (activeConversation) {
      history = activeConversation.messages;
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
      };
      convId = newId;
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversationId(newId);
    }
    
    setIsLoading(true);

    if (isNewConversation) {
      generateConversationTitle(messageContent).then(title => {
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
      // Filter out error messages from history
      const cleanHistory = history.filter(m => !m.isError);
      const stream = sendMessageStream(cleanHistory, messageContent);
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

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />
      <main className="flex-1 flex flex-col bg-slate-800">
        {activeConversation ? (
          <ChatWindow
            key={activeConversation.id} // Re-mount component when conversation changes
            messages={activeConversation.messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onGenerateImage={handleGenerateImage}
          />
        ) : (
          <PromptTemplates onSelectTemplate={handleSendMessage} />
        )}
      </main>
    </div>
  );
}

export default App;
