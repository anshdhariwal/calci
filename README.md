<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Inter&weight=700&size=36&duration=3000&pause=1000&color=3B82F6&center=true&vCenter=true&width=600&lines=CALCI;The+Intelligent+Grade+Calculator" alt="CALCI" />

<br/>

<p align="center">
  <em>Stop doing grade math by hand. Upload your result card, or type it in. CALCI handles the rest.</em>
</p>

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Tesseract.js-OCR-FF6B35?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square" />
  <img src="https://img.shields.io/badge/PRs-Welcome-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/Fullstack-JWT%20Auth-purple?style=flat-square" />
</p>

</div>

---

## What is CALCI?

CALCI is an intelligent, fullstack SGPA calculator. Type in your subjects and grades manually, or upload a screenshot of your result card and let server-side OCR extract the data automatically.

Sign up for a free account to save your SGPA history across semesters, track your CGPA over time, and view a rich analytics dashboard.

---

## Features

| | What it does |
|---|---|
| 📝 **Manual Entry** | Type in subjects, credits, and grades row by row |
| 🔍 **Smart Upload** | Send your result screenshot to the backend for OCR processing |
| ✅ **Verify Mode** | Side-by-side image and editable table so you can catch OCR mistakes |
| 🏆 **Result Tiers** | Elite · Strong · Good · Average · Low — each with a motivational message |
| 🎊 **Confetti** | Fires for SGPA ≥ 8.0 |
| 💾 **Save to History** | Save each semester result to the database after calculating |
| 📊 **Analytics Dashboard** | Average CGPA, highest SGPA, trend chart, grade distribution |
| 🗂️ **SGPA History** | View, rename, and delete past semester records |
| 🔐 **JWT Auth** | Signup / Login with secure bcrypt passwords and 7-day tokens |
| 🌙 **Light / Dark** | Theme toggle, persists on reload |
| ❄️ **Snow Mode** | Snowfall button, dark theme only |

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **MongoDB** running locally (default: `mongodb://localhost:27017`) or a MongoDB Atlas URI

---

### 1 — Clone & install frontend

```bash
git clone https://github.com/anshdhariwal/CALCI.git
cd CALCI
npm install
```

### 2 — Set up the backend

```bash
cd backend
npm install
```

Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

```env
MONGO_URI=mongodb://localhost:27017/calci
JWT_SECRET=your_super_secret_key_here
PORT=5000
```

### 3 — Run both servers

**Terminal 1 — Backend**
```bash
cd backend
node server.js
```

**Terminal 2 — Frontend**
```bash
# from the CALCI root
npm run dev
```

Then open `http://localhost:5173`.

---

## Project Structure

```
CALCI/
├── backend/                    # Node.js / Express API
│   ├── server.js               # Entry point
│   ├── .env                    # Environment variables (not committed)
│   ├── .env.example            # Template
│   ├── db/
│   │   └── mongoose.js         # MongoDB connection
│   ├── models/
│   │   ├── User.js             # User schema (bcrypt hashed password)
│   │   └── SgpaRecord.js       # SGPA record schema
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT protect middleware
│   └── routes/
│       ├── auth.js             # POST /register · POST /login · GET /me
│       ├── sgpa.js             # CRUD + /analytics
│       └── ocr.js              # POST /ocr (server-side Tesseract)
│
└── src/                        # React frontend (Vite)
    ├── context/
    │   └── AuthContext.jsx     # Global auth state + JWT storage
    ├── utils/
    │   ├── api.js              # Centralized fetch client (auto JWT attach)
    │   ├── gradeUtils.js       # SGPA formula
    │   └── ocrService.js       # Client-side Tesseract fallback (guests)
    ├── pages/
    │   ├── Home.jsx            # Landing page
    │   ├── Login.jsx           # Sign in
    │   ├── Register.jsx        # Create account
    │   ├── ManualEntry.jsx     # Grade calculator + Save to History
    │   ├── UploadFlow.jsx      # OCR upload flow
    │   ├── History.jsx         # View / edit / delete SGPA records
    │   └── Dashboard.jsx       # Analytics: CGPA, trend chart, grade dist.
    ├── components/
    │   ├── common/             # Navbar (auth-aware), Layout, ThemeToggle
    │   └── upload/             # UploadBox, Processing, VerificationView
    ├── hooks/
    │   └── useSnowEffect.js
    ├── App.jsx                 # Routes + ProtectedRoute + AuthProvider
    └── index.css               # CSS variables & global styles
```

---

## API Reference

All routes are prefixed with `/api`.

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | ❌ | Create account → returns JWT |
| `POST` | `/auth/login` | ❌ | Login → returns JWT |
| `GET`  | `/auth/me` | ✅ | Verify token, return user info |

### SGPA Records

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST`   | `/sgpa` | ✅ | Save a semester result |
| `GET`    | `/sgpa` | ✅ | Get all records for current user |
| `GET`    | `/sgpa/analytics` | ✅ | Aggregate: average, highest, trend data |
| `PUT`    | `/sgpa/:id` | ✅ | Rename semester / update record |
| `DELETE` | `/sgpa/:id` | ✅ | Delete a record |

### OCR

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/ocr` | ❌ | Upload image → returns parsed subjects array |

> Guests (no account) still get OCR via client-side Tesseract.js as a fallback.

---

## Tech Stack

### Frontend
<p>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" />
  <img src="https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
</p>

`framer-motion` · `tesseract.js` · `react-zoom-pan-pinch` · `canvas-confetti` · `react-icons` · `lucide-react`

### Backend
<p>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Mongoose-880000?style=for-the-badge&logo=mongoose&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
</p>

`bcryptjs` · `multer` · `tesseract.js` · `dotenv` · `cors`

---

## How SGPA Works

```
SGPA = Σ(Credits × Grade Points) / Σ Credits
```

| Grade | Points | Grade | Points |
|-------|--------|-------|--------|
| A+    | 10.0   | C+    | 6.0    |
| A     | 9.0    | C     | 5.0    |
| B+    | 8.0    | D     | 4.0    |
| B     | 7.0    | E / F | 0.0    |

---

## Contributing

1. Fork the repo
2. Create a branch — `git checkout -b feature/thing`
3. Commit — `git commit -m 'feat: add thing'`
4. Push — `git push origin feature/thing`
5. Open a pull request

---

## License

MIT. Do whatever you want with it.

---

<div align="center">
  <sub>Built by <a href="https://github.com/anshdhariwal">@anshdhariwal</a> & <a href="https://github.com/Darklord-41">@Darklord-41</a></sub>
</div>
