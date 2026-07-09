import { Router } from "express";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { z } from "zod";
import { ai } from "@workspace/integrations-gemini-ai";
import { db, foodAnalyses } from "@workspace/db";

const router = Router();

/* ── Barcode lookup (unchanged) ─────────────────────────────────────────── */

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

    const per100gCalories =
      getNutrient("energy-kcal_100g") || getNutrient("energy-kcal") || calories;
    const per100gProtein =
      getNutrient("proteins_100g") || getNutrient("proteins") || protein;
    const per100gCarbs =
      getNutrient("carbohydrates_100g") || getNutrient("carbohydrates") || carbs;
    const per100gFat =
      getNutrient("fat_100g") || getNutrient("fat") || fat;

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

/* ── Async food photo analysis ──────────────────────────────────────────── */

const AI_PROMPT = `You are a nutrition expert. Analyze this food photo and identify all food items visible.
For each food item, estimate the nutritional content for the visible portion.
Return strict JSON only — no markdown, no explanation, no free text. Use this exact structure:
{
  "items": [
    {
      "name": "food name and portion",
      "quantity": 1,
      "unit": "serving",
      "calories": 350,
      "proteinG": 25,
      "carbsG": 40,
      "fatG": 8
    }
  ]
}
Be specific about portions. If you cannot identify food, return {"items":[]}.`;

async function runAiAnalysis(imageBase64: string, mimeType: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: AI_PROMPT },
        ],
      },
    ],
    config: { responseMimeType: "application/json" },
  });

  const text = response.text ?? '{"items":[]}';
  try {
    const parsed = JSON.parse(text) as { items?: unknown[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

router.post("/analyze-food", async (req, res) => {
  const { imageBase64, mimeType = "image/jpeg" } = req.body as {
    imageBase64?: string;
    mimeType?: string;
  };

  if (!imageBase64) {
    res.status(400).json({ error: "imageBase64 is required" });
    return;
  }

  // SHA-256 hash of the compressed image bytes for cache lookups
  const imageHash = createHash("sha256").update(imageBase64).digest("hex");

  // Check cache first
  const cached = await db
    .select()
    .from(foodAnalyses)
    .where(eq(foodAnalyses.imageHash, imageHash))
    .limit(1);

  if (cached.length > 0 && cached[0].status === "done" && cached[0].result) {
    req.log.info({ analysisId: cached[0].id, cached: true }, "food analysis cache hit");
    res.json({
      analysisId: cached[0].id,
      status: "done",
      foods: cached[0].result.items ?? [],
    });
    return;
  }

  // Create a new processing row
  const [row] = await db
    .insert(foodAnalyses)
    .values({ imageHash, status: "processing", result: null })
    .returning();

  req.log.info({ analysisId: row.id }, "food analysis started");

  // Return immediately so the UI stays interactive
  res.status(202).json({ analysisId: row.id, status: "processing" });

  // Run AI in the background
  try {
    const items = (await runAiAnalysis(imageBase64, mimeType)) as any[];
    await db
      .update(foodAnalyses)
      .set({ status: "done", result: { items }, completedAt: new Date() })
      .where(eq(foodAnalyses.id, row.id));
    req.log.info({ analysisId: row.id, itemCount: items.length }, "food analysis completed");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(foodAnalyses)
      .set({ status: "error", result: { items: [] }, completedAt: new Date() })
      .where(eq(foodAnalyses.id, row.id));
    req.log.error({ analysisId: row.id, err: msg }, "food analysis failed");
  }
});

/* ── Meal suggestion based on remaining daily macros ────────────────────── */

const suggestMealSchema = z.object({
  caloriesRemaining: z.number(),
  proteinRemaining: z.number(),
  carbsRemaining: z.number(),
  fatRemaining: z.number(),
});

const SUGGEST_MEAL_PROMPT_TEMPLATE = (remaining: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}) => `You are a nutrition coach. A user has the following macros remaining for
the rest of their day:
- Calories: ${Math.round(remaining.calories)} kcal
- Protein: ${Math.round(remaining.protein)} g
- Carbs: ${Math.round(remaining.carbs)} g
- Fat: ${Math.round(remaining.fat)} g

Suggest ONE simple, realistic meal or recipe idea (things a regular person could
cook or buy) that would help them hit these remaining targets without going far
over on calories. Keep it practical — no exotic ingredients.
Return strict JSON only — no markdown, no explanation, no free text. Use this exact structure:
{
  "name": "short meal name",
  "description": "one or two sentence description of the meal and why it fits",
  "calories": 450,
  "proteinG": 35,
  "carbsG": 40,
  "fatG": 12
}`;

router.post("/suggest-meal", async (req, res) => {
  const parsed = suggestMealSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "caloriesRemaining, proteinRemaining, carbsRemaining, and fatRemaining are required numbers." });
    return;
  }
  const { caloriesRemaining, proteinRemaining, carbsRemaining, fatRemaining } = parsed.data;

  if (caloriesRemaining <= 0) {
    res.json({ suggestion: null, reason: "goal_met" });
    return;
  }

  try {
    const prompt = SUGGEST_MEAL_PROMPT_TEMPLATE({
      calories: caloriesRemaining,
      protein: proteinRemaining,
      carbs: carbsRemaining,
      fat: fatRemaining,
    });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" },
    });

    const text = response.text ?? "";
    let parsedResult: { name?: string; description?: string; calories?: number; proteinG?: number; carbsG?: number; fatG?: number };
    try {
      parsedResult = JSON.parse(text);
    } catch {
      req.log.warn({ text }, "suggest-meal: AI returned non-JSON response");
      res.status(502).json({ error: "Could not generate a meal suggestion right now." });
      return;
    }

    if (!parsedResult.name || !parsedResult.description) {
      res.status(502).json({ error: "Could not generate a meal suggestion right now." });
      return;
    }

    req.log.info({ name: parsedResult.name }, "meal suggestion generated");
    res.json({
      suggestion: {
        name: parsedResult.name,
        description: parsedResult.description,
        calories: Math.round(parsedResult.calories ?? 0),
        proteinG: Math.round(parsedResult.proteinG ?? 0),
        carbsG: Math.round(parsedResult.carbsG ?? 0),
        fatG: Math.round(parsedResult.fatG ?? 0),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.error({ err: msg }, "suggest-meal failed");
    res.status(502).json({ error: "Could not generate a meal suggestion right now." });
  }
});

router.get("/food-analyses/:id", async (req, res) => {
  const id = req.params.id as string;
  const [row] = await db
    .select()
    .from(foodAnalyses)
    .where(eq(foodAnalyses.id, id))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  res.json({
    analysisId: row.id,
    status: row.status,
    foods: row.result?.items ?? [],
    error: row.status === "error" ? "Analysis failed" : undefined,
  });
});

export default router;
