// FIX: Defined and exported all necessary types for the application.

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  imageUrl?: string;
  videoUrl?: string;
  isError?: boolean;
  isMindMap?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  isPinned?: boolean;
}

export interface UserPreferences {
  userName: string;
  customInstruction: string;
}

export interface PromptTemplate {
  title: string;
  prompt: string;
  category: string;
}

export interface MindMapNode {
  topic: string;
  children?: MindMapNode[];
}