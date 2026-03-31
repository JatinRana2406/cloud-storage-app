// ============================================================
// routes/auth.js — Sign Up, Sign In, Sign Out, and Session Check
// ============================================================

const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Path to our JSON "database" for users
const USERS_FILE = path.join(__dirname, "../data/users.json");

// ── Helper: read users from JSON file ───────────────────────
function readUsers() {
  const raw = fs.readFileSync(USERS_FILE, "utf-8");
  return JSON.parse(raw || "[]");
}

// ── Helper: write users to JSON file ────────────────────────
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ── POST /api/auth/signup ────────────────────────────────────
// Creates a new user account after validating email & password
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  // Basic input validation
  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters." });
  }

  const users = readUsers();

  // Check if email already exists
  const existingUser = users.find((u) => u.email === email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({ message: "Email is already registered." });
  }

  // Hash the password before saving (never store plain text!)
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create new user object
  const newUser = {
    id: uuidv4(),
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeUsers(users);

  res.status(201).json({ message: "Account created successfully!" });
});

// ── POST /api/auth/signin ────────────────────────────────────
// Verifies credentials and starts a session
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const users = readUsers();
  const user = users.find((u) => u.email === email.toLowerCase());

  // Check user exists and password matches
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  // Save user info in session (do NOT store password)
  req.session.user = { id: user.id, name: user.name, email: user.email };

  res.json({ message: "Signed in successfully!", user: req.session.user });
});

// ── POST /api/auth/signout ───────────────────────────────────
// Destroys the session and logs the user out
router.post("/signout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Could not sign out." });
    res.json({ message: "Signed out successfully." });
  });
});

// ── GET /api/auth/me ─────────────────────────────────────────
// Returns the currently logged-in user (used on page load)
router.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not authenticated." });
  }
  res.json({ user: req.session.user });
});

module.exports = router;
