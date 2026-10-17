"""FastAPI wrapper around the OR-Tools solver. Run: uvicorn main:app --port 8001"""
import os
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from solver import find_reschedule_slots

app = FastAPI(title="E-Kodak Optimizer")

origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class RescheduleRequest(BaseModel):
    booking: dict[str, Any]
    allBookings: list[dict[str, Any]] = []
    availabilityList: list[dict[str, Any]] = []
    holidays: dict[str, str] = {}
    daysToScan: int = 28
    today: str | None = None


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/reschedule-slots")
def reschedule_slots(req: RescheduleRequest):
    return find_reschedule_slots(req.model_dump())
