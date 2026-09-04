# ⚖️ TrueMark

### 🏷️ AI-Powered Legal Metrology Compliance & Inspection Platform

> **From Package Image → Declaration Extraction → Legal Rule Validation → Evidence → Violation Report**

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue?style=for-the-badge\&logo=python)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Backend-Flask-black?style=for-the-badge\&logo=flask)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge\&logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge\&logo=postgresql)](https://www.postgresql.org/)
[![OpenCV](https://img.shields.io/badge/Computer%20Vision-OpenCV-red?style=for-the-badge\&logo=opencv)](https://opencv.org/)
[![PaddleOCR](https://img.shields.io/badge/OCR-PaddleOCR-00A98F?style=for-the-badge)](https://github.com/PaddlePaddle/PaddleOCR)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?style=for-the-badge\&logo=google)](https://ai.google.dev/)
[![SQLAlchemy](https://img.shields.io/badge/ORM-SQLAlchemy-D71F00?style=for-the-badge)](https://www.sqlalchemy.org/)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?style=for-the-badge)](https://jwt.io/)

---

## 🌟 What is TrueMark?

**TrueMark** is an AI-assisted compliance inspection platform designed to analyze packaged commodity labels and identify potential violations under the **Legal Metrology Act, 2009** and the **Legal Metrology (Packaged Commodities) Rules, 2011**.

Instead of requiring an enforcement officer to manually inspect every declaration on a package, the system combines:

🖼️ **Computer Vision**
🔎 **OCR**
🤖 **Generative AI / Vision AI**
🧠 **Declaration Extraction**
⚖️ **Rule-Based Legal Validation**
📐 **Image & Spatial Analysis**
📊 **Compliance Scoring**
📍 **Evidence / Bounding Boxes**
📄 **Automated Reports**
🗄️ **Inspection History & Database**
📈 **Enforcement Dashboard**

to create an end-to-end digital inspection workflow.

---

# 🚨 Real-World Problem

Millions of packaged commodities are sold through:

* 🛒 Retail stores
* 🏪 Supermarkets
* 📦 Wholesale markets
* 🛍️ E-commerce platforms
* 🚚 Distribution networks

Packaged commodities are required to display mandatory declarations such as:

* Manufacturer / packer / importer details
* Product name
* Net quantity
* Maximum Retail Price (MRP)
* Manufacturing / packing / import information
* Consumer care information
* Country of origin
* Batch / lot information
* Address details
* Unit sale price where applicable
* Other declarations prescribed by the applicable rules

### ❌ The problem with manual inspection

Traditional inspection requires an officer to:

1. Physically inspect the package.
2. Read multiple declarations.
3. Compare them with legal requirements.
4. Determine whether the declaration is applicable.
5. Check formatting and readability.
6. Identify missing information.
7. Record violations manually.
8. Capture photographic evidence.
9. Prepare an inspection report.
10. Maintain the inspection history.

This becomes difficult when enforcement teams need to inspect **large numbers of products across different categories and locations**.

### ⚠️ Common compliance issues

Examples include:

* Missing MRP
* Incorrect MRP declaration
* Missing net quantity
* Missing manufacturer/importer information
* Missing consumer-care details
* Missing country of origin
* Missing manufacturing/packing date
* Missing batch/lot information
* Incorrect or incomplete address
* Poor readability
* Incorrect declaration placement
* Potentially misleading claims
* Bilingual declaration inconsistencies

---

# 💡 Our Solution

TrueMark transforms the inspection process into an AI-assisted digital workflow:

```text
              📷 PRODUCT / PACKAGE IMAGE
                         │
                         ▼
                🖼️ IMAGE QUALITY CHECK
                         │
                         ▼
                🔧 IMAGE PREPROCESSING
                         │
                         ▼
              🔍 OCR + VISION ANALYSIS
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        PaddleOCR              Vision AI
              │                     │
              └──────────┬──────────┘
                         ▼
             🧠 DECLARATION EXTRACTION
                         │
                         ▼
              📐 NORMALIZATION / ZONING
                         │
                         ▼
                 ⚖️ RULE ENGINE
                         │
                         ▼
              🔎 COMPLIANCE ANALYSIS
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
        PASS            FAIL          REVIEW
          │              │              │
          └──────────────┼──────────────┘
                         ▼
               📍 EVIDENCE GENERATION
                         │
                         ▼
             📊 COMPLIANCE SCORE
                         │
                         ▼
              📄 DIGITAL REPORT
                         │
                         ▼
              🗄️ DATABASE + HISTORY
                         │
                         ▼
                 📈 INSPECTOR DASHBOARD
```

---

# 🎯 Our USP

## **"Not just OCR — Legal Evidence-Based Compliance."**

A conventional OCR application may tell an inspector:

> **"MRP: ₹100 detected."**

TrueMark aims to go further:

> **MRP detected → declaration interpreted → applicable legal rule evaluated → result generated → evidence retained → inspector receives an explainable decision.**

### 🔥 Key differentiators

| Capability                   | Traditional OCR | LegalMetrology-AI |
| ---------------------------- | --------------: | ----------------: |
| Read package text            |               ✅ |                 ✅ |
| Extract declarations         |              ⚠️ |                 ✅ |
| Legal rule validation        |               ❌ |                 ✅ |
| Rule-specific result         |               ❌ |                 ✅ |
| Evidence-oriented analysis   |               ❌ |                 ✅ |
| Bounding/spatial information |              ⚠️ |                 ✅ |
| Compliance status            |               ❌ |                 ✅ |
| Explainable violation        |               ❌ |                 ✅ |
| Inspection history           |               ❌ |                 ✅ |
| Automated PDF report         |              ⚠️ |                 ✅ |
| Enforcement dashboard        |               ❌ |                 ✅ |
| Versioned compliance rules   |               ❌ |                 ✅ |

---

# 🧠 AI & Computer Vision

TrueMark uses a **multi-stage AI/CV pipeline** instead of relying on a single model.

## 1. 👁️ Computer Vision

**OpenCV** is used as part of the image-processing layer.

Computer vision capabilities include:

* Image loading
* Image preprocessing
* Image quality analysis
* Image resizing/upscaling
* Spatial text analysis
* Bounding-box handling
* Region/crop processing
* Evidence visualization
* Pixel-to-physical measurement support

This enables the system to reason about **where information appears on a package**, not only what the text says.

---

# 🔎 2. OCR — PaddleOCR

**PaddleOCR** provides the primary local OCR capability.

The OCR pipeline detects:

```text
Text
↓
Bounding Box
↓
Confidence
↓
Spatial Position
↓
Declaration Zone
```

The system can use OCR output to identify potential regions such as:

* MRP zone
* Manufacturer zone
* Net quantity zone
* Consumer-care zone
* Other package text
* Bottom/label regions

---

# 🤖 3. Vision AI — Google Gemini

The project integrates **Google Gemini Vision** for structured analysis of package images.

The Vision AI extraction layer is designed to identify structured fields such as:

```json
{
  "product_name": "...",
  "mrp": "...",
  "unit_sale_price": "...",
  "manufacturer": "...",
  "address": "...",
  "net_quantity": "...",
  "manufacturing_date": "...",
  "batch_number": "...",
  "country_of_origin": "...",
  "consumer_care": "...",
  "confidence_score": 0
}
```

The prompt instructs the model to:

* Extract only information visible on the package
* Avoid hallucinating missing declarations
* Preserve declaration wording
* Return structured information
* Identify confidence
* Return `null` when information cannot be reliably identified

---

# 🧠 4. Local Declaration Extraction

To make the system more resilient when Vision AI is unavailable, the project also contains a local extraction layer.

This provides a fallback based on:

* Regular expressions
* Keyword matching
* Pattern detection
* OCR text normalization
* Structured field extraction

This creates a hybrid architecture:

```text
                Package
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
     PaddleOCR            Gemini Vision
        │                     │
        ▼                     ▼
 OCR Structured Data    AI Structured Data
        │                     │
        └──────────┬──────────┘
                   ▼
             Normalization
                   │
                   ▼
            Compliance Engine
```

---

# ⚖️ Legal Metrology Rule Engine

The project contains a dedicated rule-based compliance layer.

Current rule definitions are maintained separately from the application logic.

Example rule categories include:

* MRP declaration
* MRP inclusive-of-taxes declaration
* Net quantity
* Manufacturer/importer details
* Consumer care
* MRP numeral height
* Bilingual declarations
* Country of origin
* Manufacturing date
* Unit sale price
* Batch/lot number
* Address
* Misleading marketing claims
* Bilingual mistranslation review

The current rules are represented through a versioned rule file:

```text
backend/app/rules/
├── rules_2026_amend_3.json
└── rules_community.json
```

### Why a rule file?

Legal requirements evolve.

A maintainable compliance system should allow regulatory rules to be updated without rewriting the complete application.

Conceptually:

```text
Legal Amendment
      ↓
Updated Rule Definition
      ↓
Rule Engine
      ↓
New Compliance Evaluation
```

---

# 📊 Compliance Decision Model

Each compliance check can produce statuses such as:

### 🟢 PASS

Declaration detected and the corresponding check is satisfied.

### 🔴 FAIL

A required declaration is missing or does not satisfy the configured rule.

### 🟡 HUMAN REVIEW REQUIRED

The system cannot make a sufficiently reliable automated decision and requests human verification.

### 🟠 LIKELY VIOLATION

The system identifies a potential issue that requires confirmation.

This approach is important because **AI should assist enforcement officers rather than blindly replace legal judgment**.

---

# 📍 Evidence-Based Inspection

One of the major design goals is to associate compliance results with evidence.

Instead of simply generating:

```text
MRP = FAIL
```

the system is designed around:

```text
Rule
 ↓
Detected Declaration
 ↓
OCR / Vision Evidence
 ↓
Image Region
 ↓
Confidence
 ↓
Compliance Result
 ↓
Inspector Review
```

This makes results more useful for real-world inspection workflows.

---

# 📄 Automated Compliance Reports

LegalMetrology-AI generates digital compliance reports.

A report can contain:

### 📋 Scan Details

* Scan ID
* Product name
* Manufacturer
* Overall status
* Scan date
* Image information

### ⚖️ Compliance Checks

Each rule can be displayed with:

* Rule name
* Status
* Severity
* Explanation/message

### 🔎 OCR Evidence

The OCR text detected from the package is included as inspection evidence.

### 🧾 Inspection Certificate

The report architecture also supports certificate/declaration sections for formal inspection documentation.

---

# 🗄️ Database & Inspection Repository

The application uses:

## PostgreSQL

The database stores inspection-related information including:

* Users
* Scans
* OCR information
* Extracted declarations
* Compliance results
* Product metadata
* GTIN information
* Location metadata
* Image hash
* Scan timestamps
* Inspection history

The `Scan` model contains structured JSON fields for:

```text
extracted_fields
compliance_result
mismatch_result
```

This allows the system to retain the complete result of an inspection without forcing every AI-derived field into a separate database column.

---

# 🔐 Authentication & Access Control

The backend uses:

* JWT authentication
* Protected API endpoints
* User registration/login
* User identity
* Role information

The architecture supports role-based access patterns for different application users, such as:

```text
Inspector
    │
    ├── Upload Scan
    ├── Review Result
    ├── View Evidence
    └── Generate Report

Administrator
    │
    ├── Monitor System
    ├── Review Inspections
    └── Manage Data
```

---

# 📈 Enforcement Dashboard

The platform includes dashboard APIs for monitoring inspection activity.

Dashboard functionality includes areas such as:

* 📊 Scan statistics
* 🚨 Compliance alerts
* 🗺️ Location/map information
* 📋 Scan history
* 🔎 Product search
* 📈 Compliance trends

This transforms individual scans into an **enforcement intelligence platform**.

---

# 🧱 Technology Stack

## 🎨 Frontend

| Technology    | Purpose                   |
| ------------- | ------------------------- |
| React         | Web application UI        |
| JavaScript    | Frontend logic            |
| React Scripts | Build/development tooling |
| HTML/CSS      | UI presentation           |
| REST API      | Backend communication     |

---

## ⚙️ Backend

| Technology         | Purpose                      |
| ------------------ | ---------------------------- |
| Python             | Core backend & AI processing |
| Flask              | REST API framework           |
| Flask-SQLAlchemy   | Database ORM                 |
| Flask-Migrate      | Database migrations          |
| Flask-JWT-Extended | Authentication               |
| Flask-CORS         | Cross-origin API access      |

---

## 👁️ Computer Vision

| Technology             | Purpose                            |
| ---------------------- | ---------------------------------- |
| OpenCV                 | Image processing & computer vision |
| NumPy                  | Image/numerical operations         |
| Bounding Boxes         | Spatial evidence                   |
| Image Quality Analysis | Image inspection                   |
| Preprocessing          | OCR improvement                    |
| Pixel Measurement      | Physical-size analysis             |

---

## 🔍 OCR

| Technology     | Purpose                  |
| -------------- | ------------------------ |
| PaddleOCR      | Local OCR                |
| OCR Confidence | Recognition reliability  |
| Multi-pass OCR | Improved text extraction |
| Spatial OCR    | Text-location analysis   |

---

## 🤖 Artificial Intelligence

| Technology                   | Purpose                                |
| ---------------------------- | -------------------------------------- |
| Google Gemini Vision         | Package image understanding            |
| Gemini structured extraction | Declaration extraction                 |
| AI confidence scoring        | Reliability estimation                 |
| Semantic analysis            | Potential misleading/mismatch analysis |

---

## 🧠 Rule & Compliance Engine

| Component             | Purpose                    |
| --------------------- | -------------------------- |
| JSON Rule Definitions | Regulatory requirements    |
| Regex Validation      | Declaration checks         |
| Height Checks         | Font/numeral analysis      |
| LLM Evaluation        | Semantic compliance checks |
| Applicability Rules   | Conditional requirements   |
| Severity              | Critical/warning/info      |
| Compliance Status     | PASS/FAIL/REVIEW           |

---

## 🗃️ Database

**PostgreSQL**

Used for persistent storage of:

* Users
* Product scans
* Compliance results
* OCR data
* Metadata
* History
* Location information

---

## ☁️ Storage / External Services

The application architecture supports cloud image storage through **Cloudinary**.

---

## 📄 Reporting

**ReportLab** is used for programmatic PDF report generation.

The reporting layer supports:

* Tables
* Compliance results
* OCR evidence
* Inspection metadata
* Certificate sections
* Structured PDF output

---

# 🏗️ System Architecture

```text
                         ┌──────────────────────┐
                         │     React Frontend   │
                         └──────────┬───────────┘
                                    │ REST API
                                    ▼
                         ┌──────────────────────┐
                         │      Flask API       │
                         └──────────┬───────────┘
                                    │
                     ┌──────────────┼──────────────┐
                     │              │              │
                     ▼              ▼              ▼
                Authentication    Scan API     Dashboard API
                     │              │              │
                     │              ▼              │
                     │       Image Processing      │
                     │              │              │
                     │      ┌───────┴───────┐      │
                     │      ▼               ▼      │
                     │   PaddleOCR     Gemini Vision│
                     │      │               │      │
                     │      └───────┬───────┘      │
                     │              ▼              │
                     │      Declaration Engine     │
                     │              │              │
                     │              ▼              │
                     │       Rule Engine           │
                     │              │              │
                     │      ┌───────┴───────┐      │
                     │      ▼               ▼      │
                     │   Compliance       Evidence │
                     │      │               │      │
                     │      └───────┬───────┘      │
                     │              ▼              │
                     │        PDF Reporting        │
                     │              │              │
                     └──────────────┼──────────────┘
                                    ▼
                             ┌──────────────┐
                             │ PostgreSQL   │
                             └──────────────┘
```

---

# 📁 Project Structure

```text
LegalMetrology-AI/
│
├── 📁 backend/
│   │
│   ├── 📄 run.py
│   ├── 📄 config.py
│   │
│   └── 📁 app/
│       │
│       ├── 📄 __init__.py
│       ├── 📄 models.py
│       │
│       ├── 📁 routes/
│       │   ├── auth.py
│       │   ├── scan.py
│       │   ├── dashboard.py
│       │   └── history.py
│       │
│       ├── 📁 services/
│       │   │
│       │   ├── 📄 ocr_service.py
│       │   ├── 📄 validation_service.py
│       │   ├── 📄 report_service.py
│       │   │
│       │   ├── 📁 legalmetai/
│       │   │   ├── confidence.py
│       │   │   ├── declaration_extractor.py
│       │   │   ├── evidence.py
│       │   │   ├── image_quality.py
│       │   │   ├── ocr.py
│       │   │   ├── pipeline.py
│       │   │   ├── preprocessing.py
│       │   │   └── rule_engine.py
│       │   │
│       │   ├── 📁 compliai/
│       │   │   ├── compliance_engine.py
│       │   │   ├── vision_processor.py
│       │   │   ├── cascading_analyzer.py
│       │   │   ├── dataset_manager.py
│       │   │   ├── ml_trainer.py
│       │   │   └── feedback_loop.py
│       │   │
│       │   └── 📁 sahara/
│       │       └── ...
│       │
│       └── 📁 rules/
│           ├── rules_2026_amend_3.json
│           └── rules_community.json
│
├── 📁 frontend/
│   ├── 📄 package.json
│   ├── 📁 public/
│   └── 📁 src/
│
├── 📁 uploads/
│
├── 📄 .env
├── 📄 requirements.txt
└── 📄 README.md
```

---

# 🔄 End-to-End Inspection Pipeline

## Step 1 — 📷 Image Upload

The inspector uploads one or more package images.

```text
POST /api/scan/upload
```

---

## Step 2 — 🖼️ Image Quality

The system evaluates whether the image is sufficiently usable for automated analysis.

Poor-quality images can be sent for manual review instead of generating unreliable results.

---

## Step 3 — 🔧 Preprocessing

Image preprocessing may include:

* Resizing
* Upscaling
* Cropping
* Region detection
* OCR-oriented preprocessing

---

## Step 4 — 🔍 OCR

PaddleOCR identifies text and associated spatial information.

```text
Image
 ↓
Text Detection
 ↓
Text Recognition
 ↓
Confidence
 ↓
Bounding Boxes
```

---

## Step 5 — 🤖 AI Vision Analysis

Gemini Vision can analyze the complete package image and extract structured declarations.

This provides a second analysis layer beyond traditional OCR.

---

## Step 6 — 🧠 Declaration Extraction

The system attempts to identify:

```text
Product Name
Manufacturer
Address
MRP
Net Quantity
Manufacturing Date
Batch Number
Country of Origin
Consumer Care
Unit Sale Price
```

---

## Step 7 — ⚖️ Legal Validation

The extracted information is evaluated against the configured Legal Metrology rules.

Example:

```text
Detected MRP
     ↓
MRP Rule
     ↓
Declaration Pattern
     ↓
Applicable Requirement
     ↓
PASS / FAIL / REVIEW
```

---

## Step 8 — 📊 Compliance Result

The system creates a structured compliance result containing:

* Rule
* Status
* Severity
* Message
* Evidence-related information
* Confidence where available

---

## Step 9 — 📄 Report

A PDF inspection report is generated.

---

## Step 10 — 🗄️ Persistence

The inspection is stored in PostgreSQL for future retrieval.

---

# 🌐 API Architecture

Current application routes include:

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

POST   /api/scan/upload
POST   /api/scan/public-upload

GET    /api/scan/<scan_id>
GET    /api/scan/<scan_id>/report

GET    /api/history
GET    /api/history/<scan_id>
GET    /api/history/<scan_id>/report

GET    /api/dashboard/stats
GET    /api/dashboard/scans
GET    /api/dashboard/alerts
GET    /api/dashboard/leads
GET    /api/dashboard/map

GET    /api/scan/gtin/<gtin>/risk
```

---

# 🔐 Environment Configuration

Example environment configuration:

```env
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/meterolens

GEMINI_API_KEY=<your-gemini-api-key>
GROQ_API_KEY=<your-groq-api-key>

CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

> ⚠️ Never commit real API keys, database passwords, or cloud credentials to GitHub.

---

# 🚀 Installation

## 1️⃣ Clone Repository

```bash
git clone https://github.com/Mohammadsaif1915/legal-metrology-ai.git
cd legal-metrology-ai
```

---

# 🐍 Backend Setup

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure `.env`.

Then start the backend:

```bash
python backend\run.py
```

Backend:

```text
http://localhost:5000
```

---

# ⚛️ Frontend Setup

Move into the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the React application:

```bash
npm start
```

Frontend:

```text
http://localhost:3000
```

---

# 🐘 PostgreSQL Setup

Create a PostgreSQL database:

```text
Database: meterolens
Host: localhost
Port: 5432
User: postgres
```

Configure:

```env
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/meterolens
```

The application uses SQLAlchemy to interact with PostgreSQL.

---

# 🧪 Example Inspection

A package image enters the system:

```text
📷 Package Image
```

The system detects:

```text
Manufacturer:
Parle Agro Pvt. Ltd.

Consumer Care:
1800 266 4448

Address:
Mumbai, Maharashtra

Net Quantity:
Not reliably detected

MRP:
Not reliably detected
```

The compliance engine then evaluates each applicable rule:

```text
Manufacturer              ✅ PASS
Consumer Care             ✅ PASS
MRP                       ❌ FAIL
Net Quantity              ❌ FAIL
Country of Origin         ❌ FAIL
Manufacturing Date        ❌ FAIL
Batch/Lot                  ⚠️ REVIEW
```

The final result can become:

```text
                    ⚠️ MANUAL REVIEW
```

rather than presenting an unreliable automated legal conclusion.

---

# 🛡️ Reliability & Human-in-the-Loop

Legal compliance is a high-impact domain.

Therefore, the system follows a **human-in-the-loop philosophy**.

```text
High Confidence
      │
      ▼
Automated Result
      │
      ▼
Evidence Available
```

But:

```text
Low Confidence
      │
      ▼
Human Review
      │
      ▼
Inspector Decision
```

This reduces the risk of treating uncertain OCR or AI output as a definitive legal finding.

---

# 🎯 Target Users

### 👮 Enforcement Officers

For faster product inspections and evidence collection.

### 🏛️ Legal Metrology Departments

For centralized inspection monitoring.

### 🧑‍💼 Compliance Teams

For preliminary package compliance checks.

### 🏭 Manufacturers

For identifying potentially missing or inconsistent declarations before distribution.

### 🛒 Retail / E-commerce Compliance Teams

For large-scale product listing and package screening.

---

# 📈 Future Scope

The current architecture can be extended toward:

### 🔥 Advanced Computer Vision

* Better declaration localization
* Improved font-size measurement
* Declaration placement analysis
* Perspective correction
* Rotation detection
* Advanced packaging-region segmentation

### 🤖 AI

* Multilingual declaration extraction
* Better semantic claim detection
* Improved bilingual comparison
* AI-assisted legal reasoning
* Product-category-specific rule applicability

### 📱 Mobile

* Android/iOS inspector application
* Camera-based real-time scanning
* Offline OCR
* Field inspection mode

### ☁️ Cloud

* Centralized inspection management
* Multi-department deployment
* Cloud AI inference
* Scalable image processing

### 📊 Analytics

* Violation heatmaps
* Repeat-offender identification
* Product-category risk scoring
* Geographic violation trends
* Manufacturer risk analytics

### 🧾 Digital Evidence

* Image annotations
* Bounding-box evidence
* Evidence snapshots
* Inspector signatures
* Digital inspection certificates

---

# 🧭 Vision

The long-term vision of LegalMetrology-AI is to build a **digital enforcement assistant for packaged commodity compliance**.

Instead of:

```text
Manual Inspection
       ↓
Manual Notes
       ↓
Manual Verification
       ↓
Manual Report
```

we aim for:

```text
                    📷
              Product Image
                    ↓
             🤖 AI + OCR
                    ↓
              🧠 Extraction
                    ↓
              ⚖️ Rule Engine
                    ↓
             📍 Evidence
                    ↓
             📊 Compliance
                    ↓
             📄 Report
                    ↓
             🗄️ Inspection DB
                    ↓
             📈 Dashboard
```

---

# 🏆 Why This Project Matters

LegalMetrology-AI is not intended to be just another:

> **"Upload Image → OCR Text"**

application.

Its core objective is to bridge the gap between:

### 👁️ What the camera sees

and

### ⚖️ What the regulation requires.

The platform therefore combines **Computer Vision + OCR + AI + Legal Rules + Evidence + Reporting + Inspection Management** into one workflow.

---

# 📌 Project Highlights

```text
⚖️ Legal Metrology Compliance
🤖 AI-Assisted Inspection
👁️ Computer Vision
🔍 PaddleOCR
🧠 Gemini Vision
📐 Spatial Analysis
📊 Compliance Scoring
📍 Evidence-Oriented Results
📄 Automated PDF Reports
🗄️ PostgreSQL Repository
🔐 JWT Authentication
📈 Enforcement Dashboard
🔄 Versioned Rule Engine
👨‍⚖️ Human-in-the-Loop Review
```

---

# 👨‍💻 Development Philosophy

The system follows a modular architecture so that individual components can evolve independently.

```text
Frontend
   ↓
API
   ↓
Inspection Pipeline
   ↓
AI / OCR
   ↓
Declaration Extraction
   ↓
Legal Rule Engine
   ↓
Evidence
   ↓
Database
   ↓
Reporting
```

This makes the platform suitable for future expansion into:

* Mobile inspection
* Cloud deployment
* Advanced AI models
* Additional regulatory frameworks
* Large-scale enforcement analytics

---

# ⚠️ Disclaimer

TrueMark is an **AI-assisted compliance inspection system**.

Automated outputs should be treated as decision-support information and should be reviewed by an authorized/legal-metrology professional where required.

The system does not replace the authority of enforcement officers or the applicable legislation, notifications, amendments, or official interpretations.

---

# 📜 Regulatory Context

The project is designed around the compliance requirements relevant to:

**Legal Metrology Act, 2009**

and

**Legal Metrology (Packaged Commodities) Rules, 2011**

The application's machine-readable rule definitions are maintained separately so that applicable regulatory amendments can be incorporated into the software's rule layer.

---

# ⭐ Final USP

> ### **TrueMark turns a package photograph into an explainable, evidence-backed compliance assessment by combining Computer Vision, OCR, AI Vision, and a versioned Legal Metrology Rule Engine.**

### **📷 Image → 🔍 Declaration → ⚖️ Rule → 📍 Evidence → 📊 Compliance → 📄 Report**

---

## 👥 Project

**TrueMark**

Built for **AI-assisted Legal Metrology compliance and digital inspection**.

🔗 Repository:
https://github.com/Mohammadsaif1915/legal-metrology-ai

# © Copyright & Intellectual Property

Copyright © 2026 **[Mohammad Saif Rakhangi]**. All Rights Reserved.

**LegalMetrology-AI** and its original source code, architecture, documentation, UI designs, workflows, rule-engine implementation, and original project materials are protected intellectual property of **[Mohammad Saif Rakhangi]**, except for third-party libraries, frameworks, datasets, models, APIs, and other components that remain subject to their respective licenses and terms.

### Usage & License

Unless explicitly stated otherwise:

* ❌ The source code may not be commercially redistributed or resold without permission.
* ❌ The project may not be rebranded and distributed as another proprietary product without permission.
* ❌ Project documentation and original implementation may not be copied substantially into another commercial system without permission.
* ✅ Third-party dependencies may be used according to their respective open-source licenses.
* ✅ The project may be reviewed, evaluated, or demonstrated for academic, research, innovation, and non-commercial purposes subject to applicable permissions.

For commercial licensing, collaboration, deployment, or redistribution requests, please contact the project owner.

### Third-Party Components

LegalMetrology-AI uses third-party technologies including, but not limited to:

* Python
* Flask
* React
* PostgreSQL
* OpenCV
* PaddleOCR
* Google Gemini
* SQLAlchemy
* ReportLab
* Cloudinary
* NumPy
* Scikit-learn
* XGBoost

These technologies are **not owned by the project** and remain subject to their respective licenses, trademarks, copyrights, and terms of service.

### Regulatory Content

LegalMetrology-AI is designed to assist with compliance analysis related to the **Legal Metrology Act, 2009** and the **Legal Metrology (Packaged Commodities) Rules, 2011**.

References to laws, regulations, amendments, standards, government notifications, or regulatory terminology do not imply ownership of those materials by the project.

The software provides **AI-assisted decision support** and does not replace official legal interpretation or the judgment of an authorized Legal Metrology officer.

---

## © 2026 LegalMetrology-AI

**All Rights Reserved.**

Built for **AI-assisted Legal Metrology compliance, inspection, evidence management, and enforcement support.**

> **Image → AI → Declaration → Rule → Evidence → Compliance → Report**
