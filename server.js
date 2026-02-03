import express from "express";
import multer from "multer";
import vision from "@google-cloud/vision";
import { parsePlacementsFromText } from "./parser.js";
import { computeAspects } from "./aspects.js";

const app = express();
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB || 8);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 }
});

function getGoogleCredentials() {
  const raw = process.env.GCP_SA_JSON;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

const creds = getGoogleCredentials();
const visionClient = creds
  ? new vision.ImageAnnotatorClient({ credentials: creds })
  : new vision.ImageAnnotatorClient();

app.get("/health", (_req, res) => {
  res.json({ ok: true, provider: "google_vision", max_file_mb: MAX_FILE_MB });
});

app.post("/ocr/analyze", upload.single("file"), async (req, res) => {
  const t0 = Date.now();
  const diagnostics = { ok: false, step: "RECEIVE_UPLOAD", provider: "google_vision", ms_total: 0, ms_ocr: 0, errors: [] };

  try {
    if (!req.file || !req.file.buffer || req.file.size <= 0) {
      diagnostics.step = "VALIDATE_FILE";
      return res.status(400).json({ status: "ERROR", error_code: "UPLOAD_MISSING", message: "File mancante o vuoto", diagnostics });
    }

    const mime = req.file.mimetype || "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
      diagnostics.step = "VALIDATE_FILE";
      return res.status(415).json({ status: "ERROR", error_code: "UNSUPPORTED_MEDIA_TYPE", message: `Formato non supportato: ${mime}. Usa JPG/PNG/WEBP.`, diagnostics });
    }

    diagnostics.step = "OCR_CALL";
    const t1 = Date.now();
    const [result] = await visionClient.textDetection({ image: { content: req.file.buffer } });
    diagnostics.ms_ocr = Date.now() - t1;

    const rawText = (result.textAnnotations?.[0]?.description) || "";

    diagnostics.step = "PARSE_PLACEMENTS";
    const placements = parsePlacementsFromText(rawText);

    diagnostics.step = "COMPUTE_ASPECTS";
    const aspects = computeAspects(placements);

    diagnostics.ok = true;
    diagnostics.step = "DONE";
    diagnostics.ms_total = Date.now() - t0;

    return res.json({ status: "OK", raw_text: rawText, placements, aspects, diagnostics });
  } catch (err) {
    diagnostics.ok = false;
    diagnostics.ms_total = Date.now() - t0;
    diagnostics.errors.push({ name: err?.name || "Error", message: err?.message || String(err) });

    return res.status(500).json({ status: "ERROR", error_code: "SERVER_EXCEPTION", message: "Eccezione lato server", diagnostics });
  }
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`astro-ocr-service listening on :${port}`));
