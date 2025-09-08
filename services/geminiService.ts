import { GoogleGenAI, Content } from "@google/genai";
import { type Message } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

function toGeminiHistory(messages: Message[]): Content[] {
    // Filter out image-related messages from chat history
    return messages
        .filter(msg => !msg.imageUrl)
        .map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));
}

export async function* sendMessageStream(
  history: Message[],
  newMessage: string,
) {
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: toGeminiHistory(history),
  });

  const result = await chat.sendMessageStream({ message: newMessage });

  for await (const chunk of result) {
    yield chunk.text;
  }
}

export async function generateConversationTitle(
  firstMessage: string,
): Promise<string> {
  const prompt = `Generate a short, concise title (4 words max) for the following conversation starter: "${firstMessage}"`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  let title = response.text.trim().replace(/"/g, '');
  if (title.length > 30) {
    title = title.substring(0, 27) + '...';
  }
  return title;
}

export async function generateImage(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
    } else {
        throw new Error("No image was generated. The response may have been blocked.");
    }
  } catch(error) {
    console.error("Image generation failed:", error);
    if (error instanceof Error) {
        throw new Error(`Image generation failed: ${error.message}`);
    }
    throw new Error("An unknown error occurred during image generation.");
  }
}
