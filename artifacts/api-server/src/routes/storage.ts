import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { z } from "zod";
import multer from "multer";
import { requireAuth } from "../middlewares/requireAuth";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { canAccessObject, ObjectPermission, setObjectAclPolicy } from "../lib/objectAcl";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// ─── Multipart upload ────────────────────────────────────────────────────────

router.post(
  "/posts/upload",
  requireAuth,
  (req: Request, res: Response, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({ error: `File exceeds ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit` });
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
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    try {
      const { objectPath } = await objectStorageService.uploadBuffer(
        req.file.buffer,
        req.file.mimetype,
      );
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      await setObjectAclPolicy(objectFile, { owner: userId, visibility: "public" });

      const servingUrl = `${req.protocol}://${req.get("host")}/api/storage${objectPath}`;
      req.log.info({ objectPath, userId }, "media uploaded");
      res.status(201).json({ url: servingUrl, objectPath });
    } catch (error) {
      req.log.error({ err: error }, "Error uploading media");
      res.status(500).json({ error: "Upload failed" });
    }
  },
);

// ─── Presigned URL (kept for compatibility) ──────────────────────────────────

const requestUploadUrlSchema = z.object({
  name: z.string().min(1),
  size: z.number().positive(),
  contentType: z.string().min(1),
});

router.post("/posts/upload-url", requireAuth, async (req: Request, res: Response) => {
  const parsed = requestUploadUrlSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

// ─── Serve objects ───────────────────────────────────────────────────────────

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    const canAccess = await canAccessObject({
      userId: req.localUserId ?? undefined,
      objectFile,
      requestedPermission: ObjectPermission.READ,
    });
    if (!canAccess) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
