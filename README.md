# SENTINEL 🛡️
### Integration Security & Financial Integrity Enforcement Platform

**CRIMEATHON 2026 | Cybersecurity Project**

> Trust the identity. Verify the operation.

SENTINEL is a cybersecurity platform designed to protect organizations from risks associated with third-party integrations, compromised API credentials, excessive data access, unauthorized financial modifications, and payment instruction tampering.

It introduces a security enforcement layer between external integrations and sensitive business operations.

---

## 1. Problem Statement

Organizations increasingly depend on third-party integrations to exchange vendor, customer, support, and financial information.

However, excessive API permissions, exposed credentials, weak identity monitoring, insufficient export controls, and inadequate financial approval mechanisms create opportunities for misuse.

A valid API credential should not automatically authorize every sensitive operation.

SENTINEL addresses this challenge through integration governance, identity threat detection, financial approval controls, and cryptographic payment verification.

---

## 2. Key Features

### 🔐 Credential Governance
- API-key authentication and validation.
- Integration identity management.
- Credential expiry and revocation.
- Scope-based access control.
- IP restriction support.

### 📊 Data Access Governance
- Sensitive credential detection in support tickets.
- Integration-specific export quota configuration.
- Data access activity logging.
- Suspicious search and bulk-export activity monitoring.

### 🏦 Financial Integrity Protection
- Controlled vendor bank-change requests.
- Independent vendor verification through OTP.
- Finance approval using TOTP-based MFA.
- Approved bank-account version management.

### 🚨 Identity Threat Detection and Response (ITDR)
- Detection of repeated invalid API-key attempts.
- Authentication-event correlation.
- Rule-based security alert generation.
- Severity-based alert monitoring.
- Security alert resolution.

### 💳 Payment Integrity Verification
- Ed25519 digital signatures.
- Cryptographic payment instruction verification.
- Detection of payment-data tampering.
- Blocking of payment instructions when signature verification fails.

---

## 3. System Architecture

```text
              External Integrations
                       |
                       v
              SENTINEL API Gateway
                  (FastAPI)
                       |
        +--------------+--------------+
        |              |              |
        v              v              v
   Credential       Data Access    Financial
   Governance       Governance     Integrity
        |              |              |
        +--------------+--------------+
                       |
              +--------+--------+
              |                 |
              v                 v
          ITDR Engine      Payment Integrity
              |             (Ed25519)
              |                 |
              +--------+--------+
                       |
                       v
                PostgreSQL DB
                       |
                       v
                React Dashboard
```

The React dashboard provides administrative visibility into security events, integration activity, financial workflows, and ITDR alerts.

---

## 4. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, Vite, Tailwind CSS |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Authentication | API Keys, PyOTP (TOTP) |
| Cryptography | Ed25519, SHA-256 |
| HTTP Client | Axios |
| Visualization | Recharts |
| Icons | Lucide React |

---

## 5. Project Structure

```text
SENTINEL/
│
├── backend/
│   │
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── security.py
│   ├── audit.py
│   │
│   ├── credential_admin.py
│   ├── seed_integration.py
│   │
│   ├── data_access.py
│   ├── data_admin.py
│   ├── secret_detector.py
│   ├── ticket_service.py
│   │
│   ├── financial_integrity.py
│   ├── verification.py
│   ├── finance_approval.py
│   ├── seed_finance_approver.py
│   ├── reset_finance_mfa.py
│   ├── test_finance_mfa.py
│   │
│   ├── payment_service.py
│   ├── payment_verification.py
│   ├── generate_keys.py
│   │
│   ├── itdr.py
│   │
│   ├── requirements.txt
│   ├── .env
│   │
│   └── keys/
│       ├── sentinel_private.pem
│       └── sentinel_public.pem
│
├── frontend/
│   │
│   ├── public/
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Topbar.jsx
│   │   │   ├── StatCard.jsx
│   │   │   └── ITDRAlerts.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Credentials.jsx
│   │   │   ├── DataGovernance.jsx
│   │   │   ├── FinancialIntegrity.jsx
│   │   │   └── [other module pages]
│   │   │
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── api.js
│   │   └── index.css
│   │
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── .gitignore
└── README.md
```

*Note: Environment files, private keys, installed dependencies, and generated files are excluded from the public repository. The structure above describes the main source files; additional configuration files may exist.*

---

## 6. Prerequisites

Install the following before running SENTINEL:

- Python 3.8 or later.
- Node.js and npm.
- PostgreSQL.
- Git.
- A code editor such as Visual Studio Code.

---

## 7. Installation and Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/Payansa-ai/Sentinel_Crimeathon.git
cd Sentinel_Crimeathon
```

### Step 2: Configure PostgreSQL

Create a PostgreSQL database:

```sql
CREATE DATABASE sentinel_db;
```

Create an application user:

```sql
CREATE USER sentinel_user WITH PASSWORD 'YOUR_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE sentinel_db TO sentinel_user;
```

Connect to the database and grant schema permissions if required:

```sql
\c sentinel_db

GRANT ALL ON SCHEMA public TO sentinel_user;
```

The application's required tables must be initialized before launching the backend.

### Step 3: Configure the Backend

Open a terminal inside the backend directory:

```bash
cd backend
```

Create and activate a virtual environment.

**Windows PowerShell:**

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:

```env
DATABASE_URL=postgresql+psycopg://sentinel_user:YOUR_PASSWORD@localhost:5432/sentinel_db

ADMIN_TOKEN=YOUR_LOCAL_ADMIN_TOKEN
```

Replace the placeholder values with your own local credentials.

### Step 4: Initialize Integration and Security Credentials

Initialize the database schema using the project's database initialization procedure.

Generate the integration credentials:

```bash
python seed_integration.py
```

Generate the finance approver configuration:

```bash
python seed_finance_approver.py
```

Generate the Ed25519 signing keys if they do not already exist:

```bash
python generate_keys.py
```

**Important:** Keep the private signing key secure. Do not commit private keys or production credentials to GitHub. Do not regenerate signing keys when existing signed payment records depend on them.

Seed scripts may create or replace credentials, so run them only when setting up a fresh local environment.

### Step 5: Start the Backend

From the `backend/` directory:

```bash
uvicorn main:app --reload
```

Backend URL:

```text
http://127.0.0.1:8000
```

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

### Step 6: Configure the Frontend

Open a second terminal:

```bash
cd frontend
```

Install frontend dependencies:

```bash
npm install
```

Create `frontend/.env.local`:

```env
SENTINEL_ADMIN_TOKEN=YOUR_LOCAL_ADMIN_TOKEN
```

This is for the local Vite development proxy. Never expose administrative credentials in React source code or a production client bundle.

### Step 7: Start the Frontend

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

Both frontend and backend must be running simultaneously.

---

## 8. Demonstrated Security Scenarios

### Scenario 1: Credential Injection Prevention

A synthetic API-key pattern is submitted through a support ticket.

SENTINEL detects the sensitive credential pattern and rejects the submission with HTTP 422.

### Scenario 2: Unauthorized Authentication Attempts

Three invalid API-key authentication attempts are simulated.

SENTINEL rejects the requests and the ITDR engine correlates the events into a HIGH-severity security alert.

The alert is displayed in the React dashboard.

### Scenario 3: Payment Tampering Detection

A payment instruction is created and digitally signed using Ed25519.

The payment amount is modified in a controlled database-tampering simulation.

During verification, the digital signature no longer matches the payment instruction. SENTINEL rejects the verification and marks the payment as blocked.

**Note:** These are controlled local prototype demonstrations. No real bank transactions are executed.

---

## 9. API Documentation

After starting the backend, visit:

```text
http://127.0.0.1:8000/docs
```

Important API groups include:

| Module | Endpoint examples |
|---|---|
| Health | `/health` |
| Credentials | `/credentials/` |
| Data Governance | `/data/export`, `/data/search` |
| Financial Integrity | `/financial/bank-change` |
| Vendor Verification | `/financial/verification/generate` |
| Finance Approval | `/financial/approval/approve` |
| Payment Security | `/payments/create`, `/payments/sign`, `/payments/verify` |
| ITDR | `/itdr/scan`, `/itdr/alerts` |

Refer to Swagger documentation for request bodies, authentication requirements, and response formats.

---

## 10. Security Considerations

- Never commit `.env` files or real credentials.
- Never upload private signing keys to GitHub.
- Use separate integration and administrative credentials.
- Use least-privilege database accounts.
- Configure HTTPS and secure authentication for production deployments.
- Store production cryptographic keys in a suitable key-management system.
- Configure real OTP delivery rather than returning demo OTP values.
- Treat the current implementation as a prototype, not a production-certified banking security system.

---

## 11. Project Objective

SENTINEL demonstrates how organizations can move beyond basic API-key authentication by introducing identity monitoring, data access governance, independent financial approvals, and cryptographic payment integrity verification.

**SENTINEL — Securing integrations. Protecting financial operations.**

---

## 12. Team

**Project:** SENTINEL  
**Event:** CRIMEATHON 2026  
**Team Members:** Add your six team members' names here.

