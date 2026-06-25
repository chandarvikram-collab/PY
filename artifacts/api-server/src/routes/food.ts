import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";

const router = Router();

router.post("/analyze-food", async (req, res) => {
  const { imageBase64, mimeType = "image/jpeg" } = req.body as {
    imageBase64?: string;
    mimeType?: string;
  };

  if (!imageBase64) {
    res.status(400).json({ error: "imageBase64 is required" });
    return;
  }

  const prompt = `You are a nutrition expert. Analyze this food photo and identify all food items visible.
For each food item, estimate the nutritional content for the visible portion.
Return a JSON array with this exact structure (no markdown, just raw JSON):
[
  {
    "name": "food name and portion",
    "calories": 350,
    "protein": 25,
    "carbs": 40,
    "fat": 8,
    "serving": "1 cup (240g)"
  }
]
Be specific about portions. If you cannot identify food, return an empty array [].`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          { text: prompt },
        ],
      },
    ],
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  let foods: unknown[];
  try {
    foods = JSON.parse(cleaned);
  } catch {
    foods = [];
  }

  res.json({ foods });
});

export default router;
