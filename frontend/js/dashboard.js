// ============================================================
// js/dashboard.js — Handles file upload, listing, and deletion
// ============================================================

const API = "https://cloud-storage-app-1-oq19.onrender.com/";

// In-memory copy of the files list (used for search filtering)
let allFiles = [];

// ID of the file pending deletion (set when delete modal opens)
let pendingDeleteId = null;

// ── On page load: verify session, load user info + files ─────
(async function init() {
  try {
    const res = await fetch(`${API}/auth/me`, { credentials: "include" });
    const data = await res.json();

    if (!res.ok) {
      // Not logged in → redirect to login page
      window.location.href = "/index.html";
      return;
    }

    // Display user name and avatar initial in the navbar
    const { name } = data.user;
    document.getElementById("user-name").textContent = name;
    document.getElementById("user-avatar").textContent = name.charAt(0).toUpperCase();

    // Load file list
    await loadFiles();
  } catch (err) {
    window.location.href = "/index.html";
  }
})();

// ── Load files from the API ───────────────────────────────────
async function loadFiles() {
  showFilesLoading(true);
  try {
    const res = await fetch(`${API}/files`, { credentials: "include" });
    const data = await res.json();
    allFiles = data.files || [];
    renderFiles(allFiles);
    updateStats(allFiles);
  } catch (err) {
    console.error("Failed to load files:", err);
  } finally {
    showFilesLoading(false);
  }
}

// ── Render file rows into the table ───────────────────────────
function renderFiles(files) {
  const tbody = document.getElementById("files-tbody");
  const empty = document.getElementById("files-empty");
  const wrapper = document.getElementById("files-table-wrapper");

  tbody.innerHTML = "";

  if (files.length === 0) {
    empty.classList.remove("hidden");
    wrapper.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");
  wrapper.classList.remove("hidden");

  files.forEach((file) => {
    const tr = document.createElement("tr");
    tr.id = `row-${file.id}`;

    // Determine file type icon color + label
    const { color, bg, label } = getFileTypeStyle(file.originalName, file.mimetype);

    tr.innerHTML = `
      <td>
        <div class="file-cell">
          <div class="file-type-icon" style="background:${bg}; color:${color};">${label}</div>
          <div>
            <div class="file-name">${escapeHtml(file.originalName)}</div>
          </div>
        </div>
      </td>
      <td>
        <span class="badge" style="background:${bg}; color:${color};">${label}</span>
      </td>
      <td class="date-cell">${formatSize(file.size)}</td>
      <td class="date-cell">${formatDate(file.uploadedAt)}</td>
      <td>
        <div class="file-actions">
          <!-- Download button -->
          <a
            href="${API}/files/download/${file.id}"
            class="btn btn-icon"
            title="Download ${escapeHtml(file.originalName)}"
            aria-label="Download ${escapeHtml(file.originalName)}"
            onclick="return handleDownload(event, '${file.id}')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </a>
          <!-- Delete button -->
          <button
            class="btn btn-icon danger"
            title="Delete ${escapeHtml(file.originalName)}"
            aria-label="Delete ${escapeHtml(file.originalName)}"
            onclick="openDeleteModal('${file.id}')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Update stat cards ──────────────────────────────────────────
function updateStats(files) {
  document.getElementById("stat-total-files").textContent = files.length;
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  document.getElementById("stat-storage-used").textContent = formatSize(totalBytes);
}

// ── Search / filter files by name ─────────────────────────────
function filterFiles() {
  const query = document.getElementById("search-input").value.toLowerCase();
  const filtered = allFiles.filter((f) =>
    f.originalName.toLowerCase().includes(query)
  );
  renderFiles(filtered);
}

// ── Upload handling via drag-and-drop or file input ───────────
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");

// Click on drop zone triggers file input
dropZone.addEventListener("click", () => fileInput.click());

// Keyboard accessibility for drop zone
dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") fileInput.click();
});

// Drag-and-drop visual feedback
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  uploadFiles(e.dataTransfer.files);
});

// File input change (browse dialog)
fileInput.addEventListener("change", () => {
  uploadFiles(fileInput.files);
  fileInput.value = ""; // reset so same file can be re-uploaded
});

// ── Upload a FileList to the server ───────────────────────────
async function uploadFiles(fileList) {
  if (!fileList || fileList.length === 0) return;

  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  const toast = document.getElementById("upload-toast");
  const progress = document.getElementById("upload-progress");
  const bar = document.getElementById("progress-bar-fill");
  const label = document.getElementById("progress-label");

  hideUploadToast();

  let uploaded = 0;
  let errors = [];

  progress.classList.remove("hidden");

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];

    // Client-side file size check
    if (file.size > MAX_SIZE) {
      errors.push(`"${file.name}" exceeds the 10 MB limit.`);
      continue;
    }

    label.textContent = `Uploading ${i + 1} of ${fileList.length}: ${file.name}`;
    bar.style.width = `${Math.round(((i) / fileList.length) * 100)}%`;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API}/files/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) errors.push(`"${file.name}": ${data.message}`);
      else uploaded++;
    } catch {
      errors.push(`"${file.name}": Upload failed (server error).`);
    }
  }

  bar.style.width = "100%";
  setTimeout(() => progress.classList.add("hidden"), 500);

  // Show result message
  if (errors.length > 0) {
    showUploadToast(errors.join(" | "), "error");
  }
  if (uploaded > 0) {
    showUploadToast(
      `${uploaded} file${uploaded > 1 ? "s" : ""} uploaded successfully!`,
      "success"
    );
    await loadFiles(); // refresh file list
  }
}

// ── Download handler (fetch with credentials for session auth) ─
function handleDownload(e, fileId) {
  // Let the browser handle the download via the href link
  // We just need credentials=include, which isn't possible via <a href>
  // So we use fetch to get the file as a Blob, then create a temporary link.
  e.preventDefault();

  fetch(`${API}/files/download/${fileId}`, { credentials: "include" })
    .then((res) => {
      if (!res.ok) throw new Error("Download failed");
      // Extract filename from Content-Disposition header if available
      const cd = res.headers.get("Content-Disposition");
      let filename = "download";
      if (cd) {
        const match = cd.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      return res.blob().then((blob) => ({ blob, filename }));
    })
    .then(({ blob, filename }) => {
      // Create a temporary anchor to trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    })
    .catch(() => showUploadToast("Could not download file.", "error"));

  return false;
}

// ── Delete modal ───────────────────────────────────────────────
function openDeleteModal(fileId) {
  pendingDeleteId = fileId;
  document.getElementById("delete-modal").classList.remove("hidden");
}
function closeDeleteModal() {
  pendingDeleteId = null;
  document.getElementById("delete-modal").classList.add("hidden");
}

async function confirmDelete() {
  if (!pendingDeleteId) return;

  const btn = document.getElementById("confirm-delete-btn");
  btn.disabled = true;
  btn.textContent = "Deleting…";

  try {
    const res = await fetch(`${API}/files/${pendingDeleteId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();

    if (res.ok) {
      // Animate row removal
      const row = document.getElementById(`row-${pendingDeleteId}`);
      if (row) {
        row.style.transition = "opacity 0.3s, transform 0.3s";
        row.style.opacity = "0";
        row.style.transform = "translateX(20px)";
        setTimeout(() => row.remove(), 300);
      }
      allFiles = allFiles.filter((f) => f.id !== pendingDeleteId);
      updateStats(allFiles);
      // Show empty state if needed
      if (allFiles.length === 0) renderFiles([]);
      showUploadToast("File deleted successfully.", "success");
    } else {
      showUploadToast(data.message || "Delete failed.", "error");
    }
  } catch {
    showUploadToast("Server error while deleting.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Delete";
    closeDeleteModal();
  }
}

// Close modal when clicking the overlay background
document.getElementById("delete-modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeDeleteModal();
});

// ── Sign Out ───────────────────────────────────────────────────
async function signOut() {
  try {
    await fetch(`${API}/auth/signout`, {
      method: "POST",
      credentials: "include",
    });
  } finally {
    window.location.href = "/index.html";
  }
}

// ── Helper: show/hide loading skeleton ────────────────────────
function showFilesLoading(show) {
  document.getElementById("files-loading").classList.toggle("hidden", !show);
}

// ── Helper: upload toast ─────────────────────────────────────
function showUploadToast(message, type = "error") {
  const toast = document.getElementById("upload-toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");
  // Auto-hide after 5 seconds
  setTimeout(hideUploadToast, 5000);
}
function hideUploadToast() {
  document.getElementById("upload-toast").classList.add("hidden");
}

// ── Helper: format file size into human-readable string ───────
function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 ** 3)).toFixed(1)} GB`;
}

// ── Helper: format ISO date string to readable format ────────
function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Helper: prevent XSS when rendering filenames ─────────────
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ── Helper: file type icon color & label by extension ────────
function getFileTypeStyle(filename, mimetype) {
  const ext = filename.split(".").pop().toLowerCase();
  const map = {
    pdf: { color: "#fb923c", bg: "rgba(251,146,60,0.15)", label: "PDF" },
    doc: { color: "#60a5fa", bg: "rgba(96,165,250,0.15)", label: "DOC" },
    docx: { color: "#60a5fa", bg: "rgba(96,165,250,0.15)", label: "DOC" },
    xls: { color: "#4ade80", bg: "rgba(74,222,128,0.15)", label: "XLS" },
    xlsx: { color: "#4ade80", bg: "rgba(74,222,128,0.15)", label: "XLS" },
    ppt: { color: "#f472b6", bg: "rgba(244,114,182,0.15)", label: "PPT" },
    pptx: { color: "#f472b6", bg: "rgba(244,114,182,0.15)", label: "PPT" },
    jpg: { color: "#a78bfa", bg: "rgba(167,139,250,0.15)", label: "IMG" },
    jpeg: { color: "#a78bfa", bg: "rgba(167,139,250,0.15)", label: "IMG" },
    png: { color: "#a78bfa", bg: "rgba(167,139,250,0.15)", label: "IMG" },
    gif: { color: "#a78bfa", bg: "rgba(167,139,250,0.15)", label: "IMG" },
    svg: { color: "#a78bfa", bg: "rgba(167,139,250,0.15)", label: "SVG" },
    mp4: { color: "#34d399", bg: "rgba(52,211,153,0.15)", label: "VID" },
    mp3: { color: "#f9a8d4", bg: "rgba(249,168,212,0.15)", label: "AUD" },
    zip: { color: "#fbbf24", bg: "rgba(251,191,36,0.15)", label: "ZIP" },
    rar: { color: "#fbbf24", bg: "rgba(251,191,36,0.15)", label: "ZIP" },
    txt: { color: "#94a3b8", bg: "rgba(148,163,184,0.15)", label: "TXT" },
    js: { color: "#facc15", bg: "rgba(250,204,21,0.15)", label: "JS" },
    ts: { color: "#38bdf8", bg: "rgba(56,189,248,0.15)", label: "TS" },
    json: { color: "#fb923c", bg: "rgba(251,146,60,0.15)", label: "JSON" },
    html: { color: "#f87171", bg: "rgba(248,113,113,0.15)", label: "HTML" },
    css: { color: "#60a5fa", bg: "rgba(96,165,250,0.15)", label: "CSS" },
  };
  return map[ext] || { color: "#94a3b8", bg: "rgba(148,163,184,0.12)", label: ext.toUpperCase().slice(0, 4) || "FILE" };
}
