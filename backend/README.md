# ⚙️ Backend — DairyChain v2.0

This backend is built using **FastAPI (Python)** and acts as the **core system controller** for DairyChain.

---

## 🧠 Architecture Overview

```text
Frontend → FastAPI → AI → Database → Blockchain → Response
```

---

## 👥 Team Responsibility Split

### 🟢 Tejas (API + Business Logic)

Handles:

* `app/api/`
* `app/schemas/`
* `app/services/ai_service.py`
* `app/utils/qr_generator.py`
* `app/main.py`

---

### 🔵 Onkar (Database + Blockchain)

Handles:

* `app/models/`
* `app/services/db_service.py`
* `app/services/blockchain_service.py`
* `app/core/database.py`

---

## 🚫 Strict Rules

* ❌ Tejas will NOT modify database/models
* ❌ Onkar will NOT modify API/routes
* ✅ Communication only via service functions

---

## 📁 Folder Guide

### 🔹 API Layer (Tejas)

```bash
app/api/routes/
```

* Define endpoints
* Handle requests & responses

---

### 🔹 Schemas (Tejas)

```bash
app/schemas/
```

* Request/response validation using Pydantic

---

### 🔹 AI Service (Tejas)

```bash
app/services/ai_service.py
```

* Predict milk quality (Pure / Adulterated)

---

### 🔹 Database Layer (Onkar)

```bash
app/models/
app/services/db_service.py
app/core/database.py
```

* MongoDB connection
* CRUD operations

---

### 🔹 Blockchain Layer (Onkar)

```bash
app/services/blockchain_service.py
```

* Store batch data on blockchain
* Fetch blockchain data

---

## 🔗 Integration Flow

1. API receives request (Tejas)
2. AI predicts quality (Tejas)
3. Data saved in DB (Onkar)
4. Data stored on blockchain (Onkar)
5. Response returned

---

## 📌 APIs to Implement (Tejas)

### Batch APIs

* `POST /api/batch/create`
* `GET /api/batch/{id}`

### Dashboard APIs

* `GET /api/dashboard`

### Sensor APIs

* `POST /api/sensor-data`

### QR APIs

* `GET /api/qr/{batchId}`

---

## 📌 Functions to Implement (Onkar)

### DB Service

```python
insert_batch(data)
get_batch(batch_id)
insert_sensor_data(data)
get_dashboard_data()
```

---

### Blockchain Service

```python
store_batch_on_chain(data)
get_batch_from_chain(batch_id)
```

---

## 🧪 Run Backend

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 🤖 AI Setup

The AI routes now use an OpenAI-compatible chat completions endpoint by default.

Add these environment variables to `.env`:

```bash
AI_API_KEY=your_api_key_here
OPENAI_API_KEY=your_api_key_here
NVIDIA_API_KEY=your_api_key_here
CLAUDE_API_KEY=your_api_key_here
AI_API_URL=https://integrate.api.nvidia.com/v1/chat/completions
AI_MODEL=meta/llama3-70b-instruct
AI_MAX_TOKENS=2048
AI_TEMPERATURE=0.2
AI_TOP_P=1.0
AI_FREQUENCY_PENALTY=0.0
AI_PRESENCE_PENALTY=0.0
AI_TIMEOUT_SECONDS=60.0
```

New endpoint:

```bash
POST /api/ai/generate-json
```

Use `/api/ai/chat` for normal assistant replies and `/api/ai/generate-json` when you need structured JSON back from the model.

If the provider is unavailable, `/api/ai/chat` now returns a safe fallback reply instead of failing the whole chatbot request.

---

## 🎯 Goal

* Build working APIs
* Integrate AI + DB + Blockchain
* Enable full traceability system

---

## 🚀 Final Note

> Tejas = System Brain (APIs + Logic)
> Onkar = System Backbone (Data + Blockchain)

👉 Integration must start early (Day 3–4)

---
