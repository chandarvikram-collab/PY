import { GoogleGenAI } from "@google/genai";

const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const integrationKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
const directKey = process.env.GEMINI_API_KEY;

if (!baseUrl && !directKey) {
  throw new Error(
    "GEMINI_API_KEY must be set. Add it to your Replit Secrets.",
  );
}

export const ai = baseUrl
  ? new GoogleGenAI({
      apiKey: integrationKey ?? "placeholder",
      httpOptions: {
        apiVersion: "",
        baseUrl,
      },
    })
  : new GoogleGenAI({ apiKey: directKey! });
