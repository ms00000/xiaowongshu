import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DictionaryResult, WordHistoryItem } from "../types";

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Fetches the dictionary definition using Gemini 2.5 Flash.
 */
export const fetchDictionaryDefinition = async (query: string): Promise<DictionaryResult> => {
  const ai = getClient();
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Analyze the following word or phrase: "${query}".
    It could be Japanese or Chinese.
    Provide the Japanese word (Kanji/Kana), the reading (Kana), Romaji,
    a detailed Chinese definition, a Japanese definition.
    
    CRITICAL: Create a FUNNY, INTERESTING, or slightly DRAMATIC example sentence pair (one in JP, one translated to CN).
    Do not use boring textbook examples. Make it memorable.

    Output purely structured JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING, description: "The target word in Japanese Kanji or Kana" },
          reading: { type: Type.STRING, description: "The reading in Hiragana or Katakana" },
          romaji: { type: Type.STRING, description: "The Romanized reading" },
          definition_cn: { type: Type.STRING, description: "Definition in Chinese" },
          definition_jp: { type: Type.STRING, description: "Definition in Japanese" },
          example_jp: { type: Type.STRING, description: "A funny or interesting example sentence in Japanese" },
          example_cn: { type: Type.STRING, description: "Example sentence translation in Chinese" },
        },
        required: ["word", "reading", "romaji", "definition_cn", "definition_jp", "example_jp", "example_cn"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No text returned from AI");
  return JSON.parse(text) as DictionaryResult;
};

/**
 * OCR: Extracts text from an image using Gemini 2.5 Flash.
 */
export const extractTextFromImage = async (base64Image: string): Promise<string> => {
  const ai = getClient();
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image
          }
        },
        {
          text: "Identify the most prominent Japanese or Chinese word or short phrase in this image. Return ONLY the text of that word/phrase. Do not include punctuation or explanation."
        }
      ]
    }
  });
  
  return response.text?.trim() || "";
};

/**
 * Generates a story or dialogue from a list of words.
 */
export const generateDailyStory = async (words: WordHistoryItem[]): Promise<string> => {
  const ai = getClient();
  const wordList = words.map(w => `${w.word} (${w.definition})`).join(", ");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Create a short, funny, and coherent story or dialogue (in Japanese with Chinese translation) that incorporates ALL of the following words: ${wordList}.
    Format it nicely with line breaks. The Japanese part should come first, followed by the Chinese translation.
    Make it entertaining to help with memorization.`,
  });

  return response.text || "Could not generate story.";
};

/**
 * Generates an image representing the word using Imagen 4.0.
 */
export const generateWordImage = async (word: string, definition: string): Promise<string> => {
  const ai = getClient();
  
  // Randomize style slightly to ensure "Refresh" feels different
  const styles = ["minimalist watercolor", "vibrant anime style", "soft pastel illustration", "ukiyo-e style", "ghibli studio style"];
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];

  const prompt = `A high-quality, artistic illustration representing the concept of "${word}" (${definition}). Style: ${randomStyle}. Aesthetic, clean composition.`;

  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: '4:3',
      outputMimeType: 'image/jpeg',
    },
  });

  const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!base64ImageBytes) throw new Error("Failed to generate image");
  
  return `data:image/jpeg;base64,${base64ImageBytes}`;
};

/**
 * Generates speech audio for the given text.
 */
export const generateSpeech = async (text: string): Promise<string> => {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio data returned");
  
  return base64Audio;
};