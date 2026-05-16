# DairyChain Demo Accounts

## 🔐 Login Credentials

### Admin Account
| Email | Password | Role | Notes |
|-------|----------|------|-------|
| `admin@smartshetakari.com` | `admin123` | Admin | Full system access, dashboard analytics |

---

## 👨‍🌾 Farmer Accounts

All farmer passwords: `farmer123`

### 1. Yash Patil - Patil Dairy Farm (Nashik)
| Field | Value |
|-------|-------|
| **Email** | `yash.patil@smartshetakari.com` |
| **Password** | `farmer123` |
| **Phone** | `9000000002` |
| **Location** | Nashik |
| **Farm Name** | Patil Dairy Farm |
| **Token Balance** | 120 tokens |
| **Demo Data** | 8 batches, 5 payments, 7 expenses |

**Dashboard Features:**
- Mixed quality batches (Pure & issues)
- Active payments in various statuses
- Multiple expense categories
- Quality improvement alerts

---

### 2. Ravi Patil - Green Valley Dairy (Kolhapur)
| Field | Value |
|-------|-------|
| **Email** | `ravi.patil@smartshetakari.com` |
| **Password** | `farmer123` |
| **Phone** | `9000000003` |
| **Location** | Kolhapur |
| **Farm Name** | Green Valley Dairy |
| **Token Balance** | 95 tokens |
| **Demo Data** | 7 batches, 4 payments, 5 expenses |

**Dashboard Features:**
- Temperature monitoring alerts
- Suspicious quality detection
- Transport tracking
- Quality trend improvements

---

### 3. Sneha Jadhav - Jadhav Milk Unit (Satara)
| Field | Value |
|-------|-------|
| **Email** | `sneha.jadhav@smartshetakari.com` |
| **Password** | `farmer123` |
| **Phone** | `9000000004` |
| **Location** | Satara |
| **Farm Name** | Jadhav Milk Unit |
| **Token Balance** | 75 tokens |
| **Demo Data** | 10 batches, 4 payments, 6 expenses |

**Dashboard Features:**
- Consistently high-quality batches (97-99% confidence)
- Highest token earnings
- Premium feed expenses
- Equipment maintenance alerts

---

## 📊 Sample User Data Already in Database

Additional test accounts (manually created):
- `s@gmail.com` / `1212121` (Farmer)
- `s1@gmail.com` / `111111` (Farmer)
- `test@example.com` / `Password123` (Farmer)
- `y@gmail.com` / `121212` (Admin)
- `yy@gmail.com` / `111111` (Farmer)
- `y1@gmail.com` / `111111` (Admin)

---

## 🗄️ Database Collections Status

| Collection | Records | Purpose |
|-----------|---------|---------|
| **users** | 10 | All user accounts |
| **batches** | 25 | Milk collection records (past 5 days) |
| **payments** | 13 | Payment transactions |
| **expenses** | 18 | Farm expense tracking |
| **tokens** | 16 | Loyalty rewards |
| **alerts** | 5 | System notifications |
| **sensors** | 8 | Temperature/humidity data |
| **transport** | 3 | Milk transport tracking |
| **feedback** | 6 | Quality feedback records |
| **qr_codes** | 25 | QR code scan tracking |

---

## 🔑 Voice Assistant Demo

**Feature:** DairyMitra Voice Assistant (Hindi/English)

### Test Voice Commands:
- *"₹500 feed खरेदी"* (Feed expense)
- *"दही चे भाव काय आहे?"* (What's milk price?)
- *"mastitis फार समस्या आहे"* (Mastitis problem)
- *"Namskar DairyMitra"* (Wake word)

### Requirements:
- NVIDIA API Key configured in `.env` (for Whisper STT + LLM)
- Backend running on `http://localhost:8000`
- Audio file format: `.m4a` at 16kHz mono

---

## 🚀 Quick Start

### 1. Start Backend
```bash
cd d:\project\dairychain\backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Check API Health
```bash
# In PowerShell:
Invoke-RestMethod -Uri "http://localhost:8000/api/voice/health" -Method Get
```

### 3. Login as Farmer
- **Email:** `yash.patil@smartshetakari.com`
- **Password:** `farmer123`

### 4. Explore Dashboard
- View milk batches and quality metrics
- Check payments and expenses
- View loyalty tokens
- See alerts and notifications

---

## 📱 Frontend Configuration

Backend API endpoint: `http://localhost:8000`

Configured in `frontend/app.json`:
```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "http://localhost:8000"
    }
  }
}
```

---

## 🛠️ Reseed Demo Data

To reset and reseed all demo data:
```bash
cd d:\project\dairychain\backend
python scripts/seed_dummy_data.py --reset
```

---

## 📞 Support Features

### Available APIs for Testing:
- `/api/auth/login` - User authentication
- `/api/auth/profile/{userId}` - User profile
- `/api/dashboard/farmer/{farmerId}` - Farmer dashboard
- `/api/payments` - Payment tracking
- `/api/expenses` - Expense management
- `/api/voice/query` - Voice assistant queries
- `/api/voice/health` - Voice service health

---

**Last Updated:** May 16, 2026  
**Database:** MongoDB (localhost:27017)  
**Status:** ✅ All demo data seeded and ready for testing
