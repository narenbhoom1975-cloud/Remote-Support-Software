import { GoogleGenAI, Type } from "@google/genai";

// Initialize the API client
// Note: In a real production app, you might proxy this through a backend to keep the key secure,
// but for this frontend-only demo, we use the env variable directly as per instructions.
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please set REACT_APP_GEMINI_API_KEY or process.env.API_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeScreenSnapshot = async (base64Image: string): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // Remove header if present (e.g., "data:image/png;base64,")
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Efficient for vision tasks
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64
            }
          },
          {
            text: `You are an expert Tier 3 Technical Support Engineer. 
            Analyze this screenshot of a user's computer screen.
            
            1. Identify any visible error messages, dialog boxes, or abnormal system states.
            2. If code or logs are visible, analyze them for the root cause.
            3. Provide a concise, professional diagnosis.
            4. List 3 concrete, step-by-step actions the technician should take to resolve the issue.
            
            Format the output in Markdown.`
          }
        ]
      },
      config: {
        temperature: 0.4, // Lower temperature for more analytical/factual responses
        systemInstruction: "You are Nova, an AI assistant built into a remote desktop application. Your goal is to help technicians fix computer problems quickly."
      }
    });

    return response.text || "No analysis could be generated.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze screen. Please check your API key and try again.");
  }
};

export const getChatSuggestion = async (chatHistory: string, currentContext: string) => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        Context: Remote desktop support session.
        Chat History: ${chatHistory}
        Technician's Note: ${currentContext}
        
        Draft a polite, professional response for the technician to send to the client. Keep it short.
      `
    });
    return response.text;
  } catch (error) {
    return "Could not generate suggestion.";
  }
};