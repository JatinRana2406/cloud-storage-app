// ============================================================
// server.js — Main entry point for the Cloud Storage backend
// ============================================================

const express = require("express");
const session = require("express-session");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const fileRoutes = require("./routes/files");

const app = express();
const PORT = 3000;

// ── Middleware ──────────────────────────────────────────────
// Parse JSON bodies
app.use(express.json());

// Allow cross-origin requests from the frontend (served separately)
app.use(cors({ origin: true, credentials: true }));

// Session-based authentication (stored in memory for simplicity)
app.use(
  session({
    secret: "cloudstore_secret_key_2024", // change in production!
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }, // 1-hour session
  })
);

// Serve uploaded files as static assets
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve the frontend folder as static files
app.use(express.static(path.join(__dirname, "../frontend")));

// ── Routes ──────────────────────────────────────────────────
app.use("/api/auth", authRoutes);   // Sign-up / Sign-in / Sign-out
app.use("/api/files", fileRoutes);  // Upload / List / Delete / Download

// ── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Cloud Storage server running at http://localhost:${PORT}`);
});
