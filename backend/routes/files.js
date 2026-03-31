// ============================================================
// routes/files.js — Upload, List, Delete, and Download files
// ============================================================

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// Path to the files metadata JSON "database"
const FILES_DB = path.join(__dirname, "../data/files.json");
// Directory where actual uploads are saved
const UPLOADS_DIR = path.join(__dirname, "../uploads");

// ── Helper: read file records ────────────────────────────────
function readFiles() {
  const raw = fs.readFileSync(FILES_DB, "utf-8");
  return JSON.parse(raw || "[]");
}

// ── Helper: write file records ───────────────────────────────
function writeFiles(files) {
  fs.writeFileSync(FILES_DB, JSON.stringify(files, null, 2));
}

// ── Auth middleware ──────────────────────────────────────────
// Every file route requires a logged-in session
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Please sign in first." });
  }
  next();
}

// ── Multer storage config ────────────────────────────────────
// Files are saved with a unique name to avoid collisions
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// File size limit: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  // Optional: restrict allowed file types (commented out for flexibility)
  // fileFilter: (req, file, cb) => { ... }
});

// ── POST /api/files/upload ───────────────────────────────────
// Accepts one file, saves it, records metadata in JSON DB
router.post("/upload", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file provided." });
  }

  const files = readFiles();

  // Build metadata record for this upload
  const newFile = {
    id: uuidv4(),
    userId: req.session.user.id,          // owner of the file
    originalName: req.file.originalname,  // original filename shown to the user
    storedName: req.file.filename,        // name on disk (uuid-prefixed)
    size: req.file.size,                  // size in bytes
    mimetype: req.file.mimetype,
    uploadedAt: new Date().toISOString(),
  };

  files.push(newFile);
  writeFiles(files);

  res.status(201).json({ message: "File uploaded successfully!", file: newFile });
});

// ── GET /api/files ───────────────────────────────────────────
// Returns only the files that belong to the logged-in user
router.get("/", requireAuth, (req, res) => {
  const files = readFiles();
  const userFiles = files.filter((f) => f.userId === req.session.user.id);
  res.json({ files: userFiles });
});

// ── DELETE /api/files/:id ────────────────────────────────────
// Deletes the file from disk AND removes its metadata record
router.delete("/:id", requireAuth, (req, res) => {
  let files = readFiles();
  const fileIndex = files.findIndex(
    (f) => f.id === req.params.id && f.userId === req.session.user.id
  );

  if (fileIndex === -1) {
    return res.status(404).json({ message: "File not found." });
  }

  const file = files[fileIndex];
  const filePath = path.join(UPLOADS_DIR, file.storedName);

  // Remove from disk
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Remove metadata from JSON DB
  files.splice(fileIndex, 1);
  writeFiles(files);

  res.json({ message: "File deleted successfully." });
});

// ── GET /api/files/download/:id ──────────────────────────────
// Streams the file to the browser as a download
router.get("/download/:id", requireAuth, (req, res) => {
  const files = readFiles();
  const file = files.find(
    (f) => f.id === req.params.id && f.userId === req.session.user.id
  );

  if (!file) {
    return res.status(404).json({ message: "File not found." });
  }

  const filePath = path.join(UPLOADS_DIR, file.storedName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File missing from storage." });
  }

  // Force browser to download with the original filename
  res.download(filePath, file.originalName);
});

module.exports = router;
