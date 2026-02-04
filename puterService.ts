
import { GoogleGenAI, Type } from "@google/genai";
import { Message, ConversationSummary } from './types';

// Initialize the Gemini API client using the environment variable API_KEY as required.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Service to handle AI operations via Gemini API
 */
export const puterService = {
  /**
   * Translates text between two languages using Gemini API
   */
  async translate(text: string, from: string, to: string, fromName: string, toName: string): Promise<string> {
    if (!text || from === to) return text;
    
    // Using gemini-3-flash-preview for basic text tasks like translation.
    const prompt = `Act as a professional medical interpreter. Translate the following healthcare-related message from ${fromName} to ${toName}. 
    The source text is in ${fromName}. The result must be in ${toName}.
    Ensure medical terminology (symptoms, body parts, dosage) remains highly accurate. 
    Only return the translated text without any preamble or quotes.
    
    Message: "${text}"`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      // Correctly access the .text property as a getter.
      return response.text?.trim() || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  },

  /**
   * Generates a medical summary of the conversation
   */
  async summarize(messages: Message[]): Promise<ConversationSummary> {
    if (messages.length === 0) {
      throw new Error("No messages to summarize");
    }

    const convoText = messages
      .map(m => `[${m.senderRole.toUpperCase()}]: ${m.originalText}`)
      .join('\n');

    // Using gemini-3-pro-preview for complex clinical summarization tasks.
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Task: Summarize the following doctor-patient consultation.\n\nConsultation History:\n${convoText}`,
        config: {
          systemInstruction: "You are a professional medical scribe. Summarize the consultation into a structured JSON format. Ensure all clinical data (symptoms, diagnoses, medications) is accurately captured.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              symptoms: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of clinical symptoms identified during the consultation.',
              },
              diagnoses: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Potential diagnoses discussed.',
              },
              medications: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Medications and dosages mentioned.',
              },
              followUp: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Specific next steps or follow-up plans.',
              },
              overallSummary: {
                type: Type.STRING,
                description: 'A concise clinical summary of the entire session.',
              }
            },
            propertyOrdering: ["symptoms", "diagnoses", "medications", "followUp", "overallSummary"],
          },
        },
      });

      const jsonStr = response.text?.trim();
      if (!jsonStr) throw new Error("Empty response from AI");
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Summarization error:', error);
      return {
        symptoms: ["Analysis failed"],
        diagnoses: ["Could not process"],
        medications: ["Not extracted"],
        followUp: ["Consult doctor"],
        overallSummary: "AI summarization failed. Please review chat history."
      };
    }
  }
};
