import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";

const router = Router();

router.get("/barcode/:code", async (req, res) => {
  const { code } = req.params;
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`;
    const response = await fetch(url, {
      headers: { "User-Agent": "IronPace - Fitness App - Version 1.0" },
    });

    if (!response.ok) {
      res.status(response.status).json({ error: `Open Food Facts returned status ${response.status}` });
      return;
    }

    const data = (await response.json()) as any;
    if (data.status === 0 || !data.product) {
      res.status(404).json({ error: "Product not found in Open Food Facts database." });
      return;
    }

    const prod = data.product;
    const nutriments: Record<string, unknown> = prod.nutriments ?? {};

    const getNutrient = (key: string): number => {
      const val = nutriments[key];
      if (typeof val === "number") return Math.round(val);
      if (typeof val === "string") {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : Math.round(parsed);
      }
      return 0;
    };

    const servingSize: string = prod.serving_size ?? "100g";
    const hasServingData = nutriments["energy-kcal_serving"] !== undefined;
    const prefix = hasServingData ? "_serving" : "_100g";

    // Per-serving (or per-100g fallback) — shown on the label
    const calories =
      getNutrient(`energy-kcal${prefix}`) ||
      getNutrient("energy-kcal_100g") ||
      getNutrient("energy-kcal");
    const protein =
      getNutrient(`proteins${prefix}`) ||
      getNutrient("proteins_100g") ||
      getNutrient("proteins");
    const carbs =
      getNutrient(`carbohydrates${prefix}`) ||
      getNutrient("carbohydrates_100g") ||
      getNutrient("carbohydrates");
    const fat =
      getNutrient(`fat${prefix}`) ||
      getNutrient("fat_100g") ||
      getNutrient("fat");

    // Always include per-100g so the client can scale by grams
    const per100gCalories =
      getNutrient("energy-kcal_100g") || getNutrient("energy-kcal") || calories;
    const per100gProtein =
      getNutrient("proteins_100g") || getNutrient("proteins") || protein;
    const per100gCarbs =
      getNutrient("carbohydrates_100g") || getNutrient("carbohydrates") || carbs;
    const per100gFat =
      getNutrient("fat_100g") || getNutrient("fat") || fat;

    // Parse grams from serving_size string (e.g. "355 ml" → 355, "30g" → 30)
    const servingGramsMatch = servingSize.match(/(\d+(?:\.\d+)?)\s*(g|ml)/i);
    const servingGrams = servingGramsMatch ? Math.round(parseFloat(servingGramsMatch[1])) : 100;

    res.json({
      barcode: code,
      name: (prod.product_name as string | undefined) ?? "Unknown Product",
      brand: (prod.brands as string | undefined) ?? undefined,
      calories,
      protein,
      carbs,
      fat,
      servingSize,
      servingGrams,
      per100gCalories,
      per100gProtein,
      per100gCarbs,
      per100gFat,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to search barcode database.";
    res.status(500).json({ error: message });
  }
});

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
