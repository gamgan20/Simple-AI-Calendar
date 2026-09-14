import OpenAI from "openai";

export const ai = new OpenAI({
  apiKey: process.env.FEATHERLESS_API_KEY || "dummy-key",
  baseURL: "https://api.featherless.ai/v1", // Featherless API endpoint
});
