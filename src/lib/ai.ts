import OpenAI from "openai";

export const ai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy-key",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", // Google Gemini OpenAI-compatible endpoint
});
