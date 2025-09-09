import { GoogleGenAI, Content, Part, Type } from "@google/genai";
import { type Message, type UserPreferences } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const buildSystemInstruction = (preferences: UserPreferences): string | undefined => {
    let instruction = "You are a helpful and friendly AI assistant.";

    if (preferences.userName) {
        instruction += ` The user's name is ${preferences.userName}. Address them by their name when appropriate.`;
    }

    if (preferences.customInstruction) {
        instruction += ` Please adhere to this custom instruction: "${preferences.customInstruction}"`;
    }
    
    // Only return the instruction if it contains personalization.
    return instruction.length > "You are a helpful and friendly AI assistant.".length ? instruction : undefined;
}


function toGeminiHistory(messages: Message[]): Content[] {
    // Filter out image/video-related messages from chat history
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
  preferences: UserPreferences,
) {
  const systemInstruction = buildSystemInstruction(preferences);
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: toGeminiHistory(history),
    config: systemInstruction ? { systemInstruction } : undefined,
  });

  const result = await chat.sendMessageStream({ message: newMessage });

  for await (const chunk of result) {
    yield chunk.text;
  }
}

export async function* analyzeCodeStream(
    history: Message[],
    codeQuery: string,
    preferences: UserPreferences,
  ) {
    let systemInstruction = buildSystemInstruction(preferences) || "You are a helpful and friendly AI assistant.";
    systemInstruction += "\n\nYou are now in 'Coding Helper' mode. Act as an expert programmer. Analyze the user's code, find bugs, suggest optimizations, or explain complex parts. Always format code blocks using markdown with language identifiers, like ```python\n# your code here\n```.";
    
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: toGeminiHistory(history),
      config: { systemInstruction },
    });
  
    const result = await chat.sendMessageStream({ message: codeQuery });
  
    for await (const chunk of result) {
      yield chunk.text;
    }
  }

export async function* generateVideoScriptStream(
    history: Message[],
    prompt: string,
    preferences: UserPreferences,
  ) {
    let systemInstruction = buildSystemInstruction(preferences) || "You are a helpful and friendly AI assistant.";
    systemInstruction += "\n\nYou are now in 'Video Script' mode. Act as an expert scriptwriter. Generate a video script based on the user's prompt. Structure the output clearly with scene headings, character dialogue, and camera/action notes. Aim for a format suitable for YouTube or TikTok.";

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: toGeminiHistory(history),
      config: { systemInstruction },
    });

    const result = await chat.sendMessageStream({ message: prompt });

    for await (const chunk of result) {
      yield chunk.text;
    }
}

export async function* generateMindMapStream(
    prompt: string,
    preferences: UserPreferences,
  ) {
    let systemInstruction = buildSystemInstruction(preferences) || "You are a helpful and friendly AI assistant.";
    systemInstruction += "\n\nYou are now in 'Mind Map' mode. Act as an expert idea organizer. Generate a mind map based on the user's topic. Return the output as a structured JSON object with a root 'topic' and a 'children' array of nodes. Each node should have a 'topic' and an optional 'children' array.";

    const nodeSchema = {
        type: Type.OBJECT,
        properties: {
            topic: { type: Type.STRING },
            children: { 
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        topic: { type: Type.STRING },
                        children: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    topic: { type: Type.STRING },
                                },
                            },
                        },
                    },
                },
             },
        },
    };

    const result = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: nodeSchema,
        },
    });

    for await (const chunk of result) {
        yield chunk.text;
    }
}


function parseDataUrl(dataUrl: string): { data: string; mimeType: string } | null {
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) return null;
    return { mimeType: match[1], data: match[2] };
}

function messagesToContent(messages: Message[]): Content[] {
  return messages
    .filter(msg => !msg.isError)
    .map(msg => {
      const parts: Part[] = [];
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      if (msg.imageUrl && msg.imageUrl.startsWith('data:')) {
        const parsed = parseDataUrl(msg.imageUrl);
        if(parsed) {
          parts.push({ inlineData: { data: parsed.data, mimeType: parsed.mimeType } });
        }
      }
      // Per API, text part must come first for user role.
      const textParts = parts.filter(p => 'text' in p);
      const imageParts = parts.filter(p => 'inlineData' in p);

      return {
        role: msg.role === 'model' ? 'model' : 'user',
        parts: msg.role === 'user' ? [...textParts, ...imageParts] : parts,
      };
    })
    .filter(c => c.parts.length > 0);
}


export async function* generateResponseWithImageStream(
    history: Message[],
    preferences: UserPreferences,
) {
    const contents = messagesToContent(history);
    const systemInstruction = buildSystemInstruction(preferences);
    
    const result = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: systemInstruction ? { systemInstruction } : undefined,
    });

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

export async function generateVideo(
    prompt: string,
    onProgress: (status: string) => void
  ): Promise<string> {
    try {
      onProgress('🎬 Initializing video generation...');
      let operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: prompt,
        config: { numberOfVideos: 1 }
      });
  
      onProgress('⏳ Processing your video... This can take a few minutes.');
      let pollCount = 0;
      const pollInterval = 10000; // 10 seconds
  
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        operation = await ai.operations.getVideosOperation({ operation: operation });
        pollCount++;
        if (pollCount === 3) { // after ~30 secs
          onProgress('🤖 The AI is working its magic...');
        }
        if (pollCount === 9) { // after ~90 secs
          onProgress('🎨 Polishing the pixels... Almost there!');
        }
      }
  
      onProgress('✅ Finalizing video...');
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) {
        throw new Error("Video generation completed, but no download link was found. The request might have been blocked.");
      }
  
      onProgress('⬇️ Downloading video file...');
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!response.ok) {
          throw new Error(`Failed to download video file: ${response.statusText}`);
      }
      const blob = await response.blob();
      return URL.createObjectURL(blob);
  
    } catch (error) {
      console.error("Video generation failed:", error);
      if (error instanceof Error) {
          // Check for specific quota error from the API
          if (error.message.includes("RESOURCE_EXHAUSTED") || error.message.includes("Lifetime quota exceeded")) {
            throw new Error("Video generation failed: You have exceeded your usage quota. Please check your API account limits and try again later.");
          }
          throw new Error(`Video generation failed: ${error.message}`);
      }
      throw new Error("An unknown error occurred during video generation.");
    }
  }