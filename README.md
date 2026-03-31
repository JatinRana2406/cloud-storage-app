# ☁️ CloudStore — Cloud Storage Mini Project

A beginner-friendly **local cloud storage system** built with **Node.js + Express** (backend) and **HTML/CSS/JavaScript** (frontend). Designed as a college mini project — clean code, well-commented, and easy to explain.

---

## 📁 Folder Structure

```
cloud-storage-app/
├── backend/
│   ├── data/
│   │   ├── users.json          # User accounts (JSON "database")
│   │   └── files.json          # File metadata records
│   ├── routes/
│   │   ├── auth.js             # Sign Up / Sign In / Sign Out routes
│   │   └── files.js            # Upload / List / Delete / Download routes
│   ├── uploads/                # Actual uploaded files stored here
│   ├── server.js               # Main Express server entry point
│   └── package.json
├── frontend/
│   ├── css/
│   │   └── style.css           # Full dark-mode glassmorphism design
│   ├── js/
│   │   ├── auth.js             # Sign In / Sign Up logic
│   │   └── dashboard.js        # File management logic
│   ├── index.html              # Login & Register page
│   └── dashboard.html          # Main dashboard (protected route)
└── README.md
```

---

## ⚙️ Tech Stack

| Layer    | Technology                         |
|----------|------------------------------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript    |
| Backend  | Node.js, Express.js                |
| Storage  | JSON files (users.json, files.json)|
| Auth     | express-session + bcryptjs         |
| Uploads  | multer (disk storage)              |

---

## 🚀 How to Run

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or above)
- npm (comes with Node.js)

### Steps

**1. Open a terminal and navigate to the backend folder:**
```bash
cd cloud-storage-app/backend
```

**2. Install dependencies:**
```bash
npm install
```

**3. Start the server:**
```bash
npm start
```
> For auto-restart on file changes during development:
> ```bash
> npm run dev
> ```

**4. Open your browser and visit:**
```
http://localhost:3000
```

That's it! The backend serves the frontend automatically.

---

## ✨ Features

### 🔐 User Authentication
- **Sign Up** — create an account with name, email, and password
- **Sign In** — login with email and password
- **Session-based auth** — stays logged in for 1 hour
- **Password hashing** — stored securely using bcryptjs (never plain text)
- **Auto-redirect** — logged-in users skip the login page

### 📂 File Management
- **Upload files** — drag & drop or click to browse (supports any file type)
- **10 MB limit** — enforced on both client and server
- **File list** — view all your uploaded files in a clean table
- **Search** — filter files by name in real time
- **Download** — download any file with one click
- **Delete** — delete a file (with confirmation modal)
- **Per-user isolation** — each user only sees their own files

### 📊 Dashboard Stats
- Total files count
- Total storage used (auto-formatted: B / KB / MB)
- Max file size limit displayed

### 🗑️ Delete Confirmation Modal
- Prevents accidental deletion
- Confirmation required before permanent removal

---

## 🔌 API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint           | Description             |
|--------|--------------------|-------------------------|
| POST   | `/api/auth/signup` | Create a new account    |
| POST   | `/api/auth/signin` | Sign in, start session  |
| POST   | `/api/auth/signout`| End session / log out   |
| GET    | `/api/auth/me`     | Get current logged-in user |

### Files (`/api/files`)
| Method | Endpoint                    | Description                  |
|--------|-----------------------------|------------------------------|
| POST   | `/api/files/upload`         | Upload a file (multipart)    |
| GET    | `/api/files`                | List all files for the user  |
| DELETE | `/api/files/:id`            | Delete a file by ID          |
| GET    | `/api/files/download/:id`   | Download a file by ID        |

> All file routes require an active session (login required).

---

## 📝 Notes for Viva / Interview

1. **Why JSON files instead of a real database?**
   — This is a mini project for demonstration. JSON files are simple, require no setup, and are beginner-friendly. In production, you would use MongoDB or PostgreSQL.

2. **How is authentication handled?**
   — `express-session` stores the logged-in user's info in a server-side session. The client gets a session cookie automatically. Passwords are hashed with `bcryptjs`.

3. **How does file upload work?**
   — `multer` middleware handles `multipart/form-data` requests and saves files to the `uploads/` directory. Metadata (name, size, date) is stored in `files.json`.

4. **Is there any security?**
   — Basic security: hashed passwords, session-based auth, per-user file isolation, server-side file size validation. No advanced security (HTTPS, CSRF tokens, etc.) since this is a local demo.

5. **What is the file size limit?**
   — 10 MB per file, enforced on both the client (before upload) and server (multer limit).

---

## 🎨 Design Highlights
- Dark glassmorphism UI with animated gradient blobs
- Responsive layout for mobile and desktop
- Drag-and-drop file upload zone
- File type color-coding (PDF, IMG, DOC, etc.)
- Smooth animations and hover effects
- Search / filter in real time
- Loading skeletons while fetching files

---

*Built with ❤️ as a college mini project.*
