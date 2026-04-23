# AI-Based Developmental Risk Monitoring & Referral System for ICDS

> **B.Tech Project 2024–25 | Vignan's Institute of Information Technology**
> Department of Computer Science and Engineering

A full-stack AI-powered system for India's Integrated Child Development Services (ICDS) program that enables real-time developmental risk screening across 5 domains, automated referral workflows, and geo-analytic dashboards for Andhra Pradesh's 13 districts.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│              React Dashboard  (Port 5173)                │
│   Login │ Screening │ Risk │ Referrals │ Geo │ Workforce │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP (Vite proxy)
┌─────────────────────▼───────────────────────────────────┐
│           Node.js Express Backend  (Port 3000)           │
│    JWT Auth │ 28 APIs │ Risk Engine │ Dashboard APIs     │
└──────┬──────────────────────────────────────┬───────────┘
       │                                      │ HTTP
┌──────▼──────┐  ┌───────────────┐  ┌────────▼────────────┐
│  MongoDB    │  │  PostgreSQL   │  │  Python FastAPI     │
│  (Local)    │  │  (Port 5432)  │  │  ML API (Port 8000) │
│  children   │  │  users        │  │  XGBoost Model      │
│  screenings │  │  awc_centres  │  │  81.5% Accuracy     │
│  referrals  │  │               │  │                     │
└─────────────┘  └───────────────┘  └─────────────────────┘
```

---

## 👥 Team Members

| Name | Roll Number | Contribution |
|------|-------------|--------------|
| Preetham Saxon | 24L31A05C8 | Backend, ML Pipeline, React Dashboard |
| Srijanya | 24L31A0598 | Frontend Development |
| Mani Vivek | 24L31A0576 | Frontend Development |
| Sudeepthi | 24L31A0584 | Documentation |
| Tejaswani | 24L31A05A7 | Documentation |

**Project Mentor:** Dr. A. Sampath Dakshina Murthy

---

## 📁 Repository Structure

```
ICDS-Risk-Monitoring/
│
├── 📂 backend/                    ← Node.js Express Backend
│   ├── server.js                  ← Entry point (Port 3000)
│   ├── .env.example               ← Environment variables template
│   ├── package.json
│   ├── config/
│   │   └── db.js                  ← MongoDB + PostgreSQL connections
│   ├── models/
│   │   ├── User.js                ← PostgreSQL: 7 role types
│   │   ├── AnganwadiCentre.js     ← PostgreSQL: GPS coords, risk scores
│   │   ├── Child.js               ← MongoDB: child profiles
│   │   ├── ScreeningRecord.js     ← MongoDB: 5-domain assessments
│   │   └── Referral.js            ← MongoDB: SLA lifecycle tracking
│   ├── routes/
│   │   ├── authRoutes.js          ← Login, register, profile
│   │   ├── childRoutes.js         ← Screening endpoints
│   │   ├── referralRoutes.js      ← Referral lifecycle
│   │   └── dashboardRoutes.js     ← All chart/KPI data endpoints
│   ├── middleware/
│   │   ├── auth.js                ← JWT verify + role authorization
│   │   └── errorHandler.js        ← Global error handling
│   ├── utils/
│   │   ├── riskCalculator.js      ← ASQ-3 5-domain risk engine (750 lines)
│   │   └── dbscan.js              ← Spatial clustering algorithm
│   ├── services/
│   │   └── notifications.js       ← SMS via MSG91
│   └── seeds/
│       └── seedAll.js             ← Populate demo data
│
├── 📂 ml-pipeline/                ← Python FastAPI ML Service
│   ├── api/
│   │   └── predict_server.py      ← FastAPI app (Port 8000)
│   ├── scripts/
│   │   ├── extract_training_data.py
│   │   ├── generate_synthetic_data.py
│   │   └── train_model.py
│   ├── models/                    ← Trained model files (generated)
│   │   ├── best_model.joblib
│   │   ├── scaler.joblib
│   │   ├── feature_columns.json
│   │   └── training_report.json
│   ├── data/
│   │   └── training_data.csv
│   └── requirements.txt
│
└── 📂 frontend/                   ← React Vite Dashboard
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx                ← Routes + protected routes
        ├── main.jsx
        ├── index.css              ← Design system + CSS variables
        ├── context/
        │   └── AuthContext.jsx    ← JWT token management
        ├── services/
        │   └── api.js             ← Axios instance
        ├── hooks/
        │   └── useFetch.js        ← Data fetching hook
        ├── components/
        │   ├── layout/            ← Sidebar, Layout
        │   ├── ui/                ← KpiCard, PageHeader
        │   └── charts/            ← ChartTooltip
        └── pages/
            ├── LoginPage.jsx
            ├── ScreeningDashboard.jsx
            ├── RiskDashboard.jsx
            ├── ReferralDashboard.jsx
            ├── GeoAnalyticsDashboard.jsx
            ├── WorkforceDashboard.jsx
            └── NotFound.jsx
```

---

## ⚙️ Prerequisites — Install These First

Before running anything, install these on your machine:

### 1. Node.js (v18 or higher)
Download from: https://nodejs.org/en/download
```bash
# Verify installation
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
```

### 2. Python (v3.10 or higher)
Download from: https://www.python.org/downloads
```bash
# Verify installation
python --version  # Should show 3.10.x or higher
pip --version
```

### 3. MongoDB (v7 or higher)
Download from: https://www.mongodb.com/try/download/community

**Windows:** After installing, verify MongoDB service is running:
- Press `Win + R` → type `services.msc` → find **MongoDB** → Status should be **Running**
- If not running: right-click → Start

### 4. PostgreSQL (v16 or higher)
Download from: https://www.postgresql.org/download/windows
- During installation, set a password for the `postgres` user — **remember this password**
- pgAdmin 4 will also be installed automatically

**Add PostgreSQL to PATH (Windows):**
- Search "Environment Variables" in Start Menu
- Edit System Variables → Path → Add: `C:\Program Files\PostgreSQL\16\bin`
- Restart your terminal after this

```bash
# Verify installation
psql --version    # Should show psql (PostgreSQL) 16.x
```

### 5. Git
Download from: https://git-scm.com/download/win
```bash
git --version     # Verify installation
```

---

## 🚀 Setup Instructions

### Step 1 — Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/ICDS-Risk-Monitoring.git
cd ICDS-Risk-Monitoring
```

### Step 2 — Create PostgreSQL Database

```bash
psql -U postgres
```
Enter your PostgreSQL password, then:
```sql
CREATE DATABASE icds;
\q
```

**Alternative using pgAdmin:**
- Open pgAdmin 4
- Right-click Databases → Create → Database
- Name it `icds` → Save

### Step 3 — Setup Backend

```bash
cd backend
npm install
```

Create your `.env` file by copying the example:
```bash
copy .env.example .env
```

Open `.env` and update these values:
```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/icds
PG_HOST=127.0.0.1
PG_PORT=5432
PG_DATABASE=icds
PG_USER=postgres
PG_PASSWORD=YOUR_POSTGRESQL_PASSWORD_HERE
JWT_SECRET=icds_secret_key_change_in_production
JWT_EXPIRES_IN=7d
```

### Step 4 — Seed the Database

```bash
# Make sure MongoDB and PostgreSQL are both running first
npm run seed
```

Expected output:
```
✅ MongoDB connected: 127.0.0.1/icds
✅ PostgreSQL connected: 127.0.0.1/icds
✅ PostgreSQL tables synced
🔹 Seeding Users...        ✅ Created 249 users
🔹 Seeding Centres...      ✅ Created 165 Anganwadi Centres
🔹 Seeding Children...     ✅ Created 3362 children
═══════════════════════════════════
  SEEDING COMPLETE
  Users:              249
  Anganwadi Centres:  165
  Children:           3362
  Screening Records:  2510
  Referrals:          388
```

### Step 5 — Fix Password Hashing (Required after seeding)

```bash
node -e "
require('dotenv').config();
const { connectPostgres } = require('./config/db');
const User = require('./models/User');

async function fix() {
  await connectPostgres();
  const emails = [
    { email: 'admin@icds-ap.gov.in', password: 'admin123' },
    { email: 'cdpo.visakhapatnam@icds-ap.gov.in', password: 'cdpo123' },
    { email: 'sup.anakapalle@icds-ap.gov.in', password: 'sup123' },
    { email: 'aww.vis.1@icds-ap.gov.in', password: 'aww123' }
  ];
  for (const acc of emails) {
    const user = await User.findOne({ where: { email: acc.email } });
    if (user) { user.password = acc.password; user.changed('password', true); await user.save(); console.log('Fixed: ' + acc.email); }
  }
  process.exit(0);
}
fix();
"
```

### Step 6 — Setup ML Pipeline

```bash
cd ../ml-pipeline
pip install -r requirements.txt
```

The trained model is already included. Skip to Step 7.

**Optional — Retrain the model:**
```bash
python scripts/generate_synthetic_data.py
python scripts/train_model.py
```

### Step 7 — Setup Frontend

```bash
cd ../frontend
npm install
```

---

## ▶️ Running the Project

You need **3 terminals open simultaneously:**

### Terminal 1 — Backend (Node.js)
```bash
cd backend
npm run dev
```
✅ Success: `🚀 ICDS Server running on port 3000`

### Terminal 2 — ML API (Python)
```bash
cd ml-pipeline
uvicorn api.predict_server:app --host 0.0.0.0 --port 8000 --reload
```
✅ Success: `✅ Model loaded: XGBoost` + `Uvicorn running on http://0.0.0.0:8000`

### Terminal 3 — Frontend (React)
```bash
cd frontend
npm run dev
```
✅ Success: `VITE v5.4.2 ready` + `Local: http://localhost:5173/`

---

## 🌐 Access URLs

| Service | URL | Description |
|---------|-----|-------------|
| Dashboard | http://localhost:5173 | React frontend |
| Backend API | http://localhost:3000/api/health | Node.js health check |
| ML API Docs | http://localhost:8000/docs | FastAPI Swagger UI |
| ML Health | http://localhost:8000/health | ML service health |

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Admin | admin@icds-ap.gov.in | admin123 | All screens |
| CDPO | cdpo.visakhapatnam@icds-ap.gov.in | cdpo123 | All except Admin |
| Supervisor | sup.anakapalle@icds-ap.gov.in | sup123 | Screening, Risk, Referrals, Geo |
| AWW | aww.vis.1@icds-ap.gov.in | aww123 | Referrals only |

---

## 📊 Dashboard Screens

| Screen | URL | PPT Slide |
|--------|-----|-----------|
| Login | /login | Slide 11 |
| Screening & Coverage | /screening | Slide 5 |
| Risk Stratification | /risk | Slide 6 |
| Referral & Action | /referrals | Slide 7 |
| Geo-Analytic Map | /geo | Slide 9 |
| Workforce Performance | /workforce | Slide 8 |

---

## 🔧 Troubleshooting

### "psql is not recognized"
Add PostgreSQL bin to PATH:
`C:\Program Files\PostgreSQL\16\bin`
Restart terminal after adding.

### "Password authentication failed for user postgres"
Update `PG_PASSWORD` in `.env` with the password you set during PostgreSQL installation.

### Login returns "Invalid email or password"
Run the password fix script in Step 5 above.

### "ECONNREFUSED" in React terminal
Your Node.js backend is not running. Start it in Terminal 1.

### ML API shows "Model not loaded"
Run `python scripts/generate_synthetic_data.py` then `python scripts/train_model.py` to generate model files.

### npm install fails with EPERM error (Windows)
Run terminal as Administrator:
Right-click Command Prompt → Run as administrator

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Recharts, Leaflet.js, Lucide Icons |
| Backend | Node.js, Express.js, JWT, bcrypt, Helmet |
| ML Service | Python, FastAPI, XGBoost, scikit-learn, pandas |
| Document DB | MongoDB (Mongoose ODM) |
| Relational DB | PostgreSQL (Sequelize ORM) |
| Risk Engine | ASQ-3 + DASII aligned, 5-domain, age-normalized |

---

## 📈 ML Model Performance

| Metric | Score |
|--------|-------|
| Best Model | XGBoost |
| Accuracy | 81.5% |
| F1 Score (Weighted) | 0.8028 |
| CV F1 Mean | 0.8208 (5-fold) |
| Training Records | 2,008 |
| Features | 48 |

---

## 📄 License

B.Tech Academic Project — Vignan's Institute of Information Technology, Visakhapatnam
