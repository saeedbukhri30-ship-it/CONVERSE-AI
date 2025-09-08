export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  imageUrl?: string;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

export interface PromptTemplate {
  title: string;
  prompt: string;
  category: string;
}
