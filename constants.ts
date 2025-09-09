
import { type PromptTemplate } from './types';

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    title: 'Draft an email',
    prompt: 'Draft a professional email to a client about the project update. The project is on track and key milestones have been achieved.',
    category: 'Productivity',
  },
  {
    title: 'Explain a concept',
    prompt: 'Explain the concept of quantum computing in simple terms, as if you were talking to a high school student.',
    category: 'Education',
  },
  {
    title: 'Write a poem',
    prompt: 'Write a short, evocative poem about a city at night.',
    category: 'Creative',
  },
  {
    title: 'Fix this code',
    prompt: 'Find the bug in this Python code and explain how to fix it:\n\ndef factorial(n):\n  if n == 0:\n    return 1\n  else:\n    return n * factorial(n+1)',
    category: 'Coding',
  },
  {
    title: 'Start a conversation',
    prompt: 'Tell me an interesting fact to start our conversation.',
    category: 'Conversation',
  },
];
