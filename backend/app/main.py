from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import batch, dashboard, sensor, qr
from app.api.routes import (
    auth, farmers, milk, payments,
    iot, alerts, ai, analytics,
    expenses, admin, location, reviews, community, upload,
    hackathon, voice,
)
from app.core.config import settings
import os

app = FastAPI(title="DairyChain v2.0 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Existing Tejas routes
app.include_router(batch.router,     prefix="/api/batch")
app.include_router(dashboard.router, prefix="/api/dashboard")
app.include_router(sensor.router,    prefix="/api/sensor")
app.include_router(qr.router,        prefix="/api/qr")

# New routes
app.include_router(auth.router,      prefix="/api/auth")
app.include_router(farmers.router,   prefix="/api/farmers")
app.include_router(milk.router,      prefix="/api/milk")
app.include_router(payments.router,  prefix="/api/payments")
app.include_router(iot.router,       prefix="/api/iot")
app.include_router(alerts.router,    prefix="/api/alerts")
app.include_router(ai.router,        prefix="/api/ai")
app.include_router(analytics.router, prefix="/api/analytics")
app.include_router(expenses.router,  prefix="/api/expenses")
app.include_router(admin.router,     prefix="/api/admin")
app.include_router(location.router,  prefix="/api/location")
app.include_router(reviews.router,   prefix="/api/reviews")
app.include_router(community.router,  prefix="/api/community")
app.include_router(upload.router,     prefix="/api/upload")
app.include_router(hackathon.router,  prefix="/api/hackathon")
app.include_router(voice.router,      prefix="/api/voice")

@app.get("/")
def root():
    return {"message": "DairyChain v2.0 API Running ✅"}
