import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, AIAnalysisResult, AISuggestion } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Analyzes the current inventory to provide stock health reports.
 */
export const analyzeInventoryHealth = async (items: InventoryItem[]): Promise<AIAnalysisResult | null> => {
  const ai = getAIClient();
  if (!ai) return null;

  // OPTIMIZATION: sending thousands of items causes the AI to time out or truncate JSON.
  // Strategy: Filter for Critical items first, then fill remaining context with others up to a limit.
  const criticalItems = items.filter(i => i.quantity <= i.minStock);
  const otherItems = items.filter(i => i.quantity > i.minStock).slice(0, 30); // Take top 30 normal items
  
  // Hard limit of 50 items to ensure response fits in token window
  const contextItems = [...criticalItems, ...otherItems].slice(0, 50);

  const dataContext = JSON.stringify(contextItems.map(i => ({
    name: i.name,
    qty: i.quantity,
    min: i.minStock,
    cat: i.category,
    price: i.price
  })));

  const prompt = `
    Analyze this warehouse inventory snapshot (subset of total items): ${dataContext}.
    Provide a JSON response with:
    1. A brief 'summary' of the overall stock health based on this data.
    2. A list of 'warnings' for items with low stock (qty <= min) or potential overstock.
    3. A list of 'recommendations' for restocking or optimization.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            warnings: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            recommendations: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as AIAnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      summary: "AI Analysis unavailable momentarily due to high load or data size limits.",
      warnings: ["Unable to process full inventory list."],
      recommendations: ["Try analyzing again with a smaller filtered list if possible."]
    };
  }
};

/**
 * Suggests details for a new item based on its name.
 */
export const suggestItemDetails = async (itemName: string): Promise<AISuggestion | null> => {
  const ai = getAIClient();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `I am adding a new item to my warehouse: "${itemName}". Suggest a suitable category (CHEMICAL, SPARE PART, PACKAGING, or OTHER), a professional short description, and an estimated price (number only) in IDR (Indonesian Rupiah).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            description: { type: Type.STRING },
            suggestedPrice: { type: Type.NUMBER }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as AISuggestion;
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return null;
  }
};
