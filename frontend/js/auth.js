// ============================================================
// js/auth.js — Handles Sign In and Sign Up form logic
// ============================================================

const API = "/api";

// ── Switch between Sign In / Sign Up tabs ───────────────────
function switchTab(tab) {
  const signinForm = document.getElementById("signin-form");
  const signupForm = document.getElementById("signup-form");
  const tabSignin = document.getElementById("tab-signin");
  const tabSignup = document.getElementById("tab-signup");

  hideToast(); // clear any previous messages

  if (tab === "signin") {
    signinForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
    tabSignin.classList.add("active");
    tabSignup.classList.remove("active");
    tabSignin.setAttribute("aria-selected", "true");
    tabSignup.setAttribute("aria-selected", "false");
  } else {
    signupForm.classList.remove("hidden");
    signinForm.classList.add("hidden");
    tabSignup.classList.add("active");
    tabSignin.classList.remove("active");
    tabSignup.setAttribute("aria-selected", "true");
    tabSignin.setAttribute("aria-selected", "false");
  }
}

// ── Toggle password visibility ───────────────────────────────
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  btn.innerHTML = isHidden
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

// ── Toast helpers ────────────────────────────────────────────
function showToast(message, type = "error") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");
}
function hideToast() {
  document.getElementById("toast").classList.add("hidden");
}

// ── Button loading state helpers ─────────────────────────────
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  const text = btn.querySelector(".btn-text");
  const spinner = btn.querySelector(".btn-spinner");
  btn.disabled = loading;
  text.classList.toggle("hidden", loading);
  spinner.classList.toggle("hidden", !loading);
}

// ── Sign In ──────────────────────────────────────────────────
document.getElementById("signin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideToast();

  const email = document.getElementById("signin-email").value.trim();
  const password = document.getElementById("signin-password").value;

  if (!email || !password) {
    return showToast("Please fill in all fields.");
  }

  setLoading("signin-btn", true);

  try {
    const res = await fetch(`${API}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",   // send cookies for session
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || "Sign in failed.");
    } else {
      // Redirect to dashboard on success
      window.location.href = "/dashboard.html";
    }
  } catch (err) {
    showToast("Server error. Is the backend running?");
  } finally {
    setLoading("signin-btn", false);
  }
});

// ── Sign Up ──────────────────────────────────────────────────
document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideToast();

  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  if (!name || !email || !password) {
    return showToast("Please fill in all fields.");
  }
  if (password.length < 6) {
    return showToast("Password must be at least 6 characters.");
  }

  setLoading("signup-btn", true);

  try {
    const res = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || "Sign up failed.");
    } else {
      showToast("Account created! Please sign in.", "success");
      // Auto-switch to sign in tab after short delay
      setTimeout(() => switchTab("signin"), 1200);
    }
  } catch (err) {
    showToast("Server error. Is the backend running?");
  } finally {
    setLoading("signup-btn", false);
  }
});

// ── Auto-redirect if already logged in ─────────────────────
(async function checkSession() {
  try {
    const res = await fetch(`${API}/auth/me`, { credentials: "include" });
    if (res.ok) {
      window.location.href = "/dashboard.html";
    }
  } catch (_) { /* not logged in, stay on auth page */ }
})();
