import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db, weightHistory, progressPhotos } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { setObjectAclPolicy } from "../lib/objectAcl";
import { getPublicOrigin } from "../lib/requestOrigin";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_PHOTO_SIZE = 20 * 1024 * 1024; // 20 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

const createEntryBodySchema = z.object({
  date: z.string().min(1),
  weightKg: z.coerce.number().positive(),
  notes: z.string().optional(),
});

// ─── POST /api/progress/entries ──────────────────────────────────────────────
// Accepts multipart/form-data: date, weightKg, notes, file? (optional photo)

router.post(
  "/progress/entries",
  requireAuth,
  (req: Request, res: Response, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({ error: `Photo exceeds ${MAX_PHOTO_SIZE / 1024 / 1024} MB limit` });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      }
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : "Upload error" });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    const userId = req.localUserId!;

    const parsed = createEntryBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "date and weightKg are required" });
      return;
    }

    const { date, weightKg, notes } = parsed.data;

    try {
      let imageUrl: string | null = null;

      // Upload photo if provided
      if (req.file) {
        const { objectPath } = await objectStorageService.uploadBuffer(
          req.file.buffer,
          req.file.mimetype,
        );
        const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
        await setObjectAclPolicy(objectFile, { owner: userId, visibility: "public" });
        imageUrl = `${getPublicOrigin(req)}/api/storage${objectPath}`;
      }

      // Always write to weight_history
      const [whRow] = await db
        .insert(weightHistory)
        .values({ userId, date, weightKg })
        .returning();

      // Write to progress_photos (even without a photo — imageUrl nullable)
      const [ppRow] = await db
        .insert(progressPhotos)
        .values({ userId, date, weightKg, notes: notes ?? "", imageUrl })
        .returning();

      req.log.info({ userId, date, weightKg, hasPhoto: !!imageUrl }, "progress entry created");
      res.status(201).json({ weightHistory: whRow, progressPhoto: ppRow });
    } catch (err) {
      req.log.error({ err }, "Error creating progress entry");
      res.status(500).json({ error: "Failed to save entry" });
    }
  },
);

// ─── GET /api/progress/entries ───────────────────────────────────────────────
// Returns the authenticated user's progress entries (newest first).

router.get("/progress/entries", requireAuth, async (req: Request, res: Response) => {
  const userId = req.localUserId!;

  try {
    const photos = await db
      .select()
      .from(progressPhotos)
      .where(eq(progressPhotos.userId, userId))
      .orderBy(desc(progressPhotos.createdAt));

    const weights = await db
      .select()
      .from(weightHistory)
      .where(eq(weightHistory.userId, userId))
      .orderBy(desc(weightHistory.createdAt));

    res.json({ progressPhotos: photos, weightHistory: weights });
  } catch (err) {
    req.log.error({ err }, "Error fetching progress entries");
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

export default router;
