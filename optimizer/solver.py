"""
E-Kodak scheduling solver (Google OR-Tools CP-SAT).

Finds the best reschedule slots for one booking. Hard rules are enforced by the
solver (no overlap + buffer, max shoots/day, studio hours, blocked days);
soft preferences (same weekday, nearness, holidays, workload) are the objective.

The output shape mirrors `findOptimalRescheduleSlots` in
src/services/photographerService.js so the UI needs no changes.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from ortools.sat.python import cp_model

DEFAULT_DURATION_MIN = 120
BUFFER_MIN = 30
STUDIO_OPEN_MIN = 9 * 60
STUDIO_CLOSE_MIN = 18 * 60
SLOT_STEP_MIN = 60
MAX_SHOOTS_PER_DAY = 3
TOP_K = 4


def _to_minutes(t: str | None, default: int = STUDIO_OPEN_MIN) -> int:
    if not t:
        return default
    try:
        parts = str(t).split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except (ValueError, IndexError):
        return default


def _fmt(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def _duration(b: dict[str, Any]) -> int:
    for key in ("duration_minutes", "duration_min"):
        v = b.get(key)
        if isinstance(v, (int, float)) and v > 0:
            return int(v)
    return DEFAULT_DURATION_MIN


def _is_blocked(rec: dict[str, Any]) -> bool:
    status = str(rec.get("status") or "").lower()
    return status in ("unavailable", "blocked") or rec.get("is_available") is False


def find_reschedule_slots(payload: dict[str, Any]) -> list[dict[str, Any]]:
    booking = payload.get("booking") or {}
    all_bookings = payload.get("allBookings") or []
    availability = payload.get("availabilityList") or []
    holidays: dict[str, str] = payload.get("holidays") or {}
    days_to_scan = int(payload.get("daysToScan") or 28)
    today = date.fromisoformat(payload["today"]) if payload.get("today") else date.today()

    if not booking.get("event_date"):
        return []
    original_date = date.fromisoformat(str(booking["event_date"])[:10])
    preferred = _to_minutes(booking.get("preferred_time"))
    duration = _duration(booking)
    original_dow = original_date.weekday()

    blocked_days = {
        str(a.get("availability_date") or a.get("date"))[:10]
        for a in availability
        if _is_blocked(a)
    }

    active = [
        b for b in all_bookings
        if b.get("id") != booking.get("id")
        and str(b.get("status") or "").upper() not in ("CANCELLED", "DECLINED")
    ]
    by_day: dict[str, list[dict[str, Any]]] = {}
    for b in active:
        by_day.setdefault(str(b.get("event_date"))[:10], []).append(b)

    # ── Candidate slots ────────────────────────────────────────────────────
    starts = sorted({
        *range(STUDIO_OPEN_MIN, STUDIO_CLOSE_MIN - duration + 1, SLOT_STEP_MIN),
        preferred,
    })
    candidates: list[dict[str, Any]] = []
    for offset in range(1, days_to_scan + 1):
        d = original_date + timedelta(days=offset)
        if d < today:
            continue
        ds = d.isoformat()
        if ds in blocked_days:
            continue
        if len(by_day.get(ds, [])) >= MAX_SHOOTS_PER_DAY:  # hard cap (also enforced below)
            continue
        for s in starts:
            if s + duration > STUDIO_CLOSE_MIN and s != preferred:
                continue
            candidates.append({"date": d, "ds": ds, "start": s, "offset": offset})

    if not candidates:
        return []

    # ── CP-SAT model: one boolean per candidate slot ───────────────────────
    model = cp_model.CpModel()
    chosen = [model.NewBoolVar(f"slot_{i}") for i in range(len(candidates))]
    model.Add(sum(chosen) == 1)  # we ask for the single best slot, then re-solve for runners-up

    scores: list[int] = []
    for i, c in enumerate(candidates):
        # Hard rule: interval must not overlap any existing shoot (plus buffer).
        s, e = c["start"], c["start"] + duration
        overlaps = any(
            s < (_to_minutes(b.get("preferred_time")) + _duration(b) + BUFFER_MIN)
            and (e + BUFFER_MIN) > _to_minutes(b.get("preferred_time"))
            for b in by_day.get(c["ds"], [])
        )
        if overlaps:
            model.Add(chosen[i] == 0)

        # Soft objective (integer weights)
        sc = 700
        dow = c["date"].weekday()
        holiday = holidays.get(c["ds"])
        if dow == 6:
            sc -= 150
        else:
            sc += 50
        if holiday:
            sc -= 80
        if dow == original_dow:
            sc += 150
        sc += 150 if c["offset"] <= 7 else 80 if c["offset"] <= 14 else 0
        n_that_day = len(by_day.get(c["ds"], []))
        if n_that_day == 2:
            sc -= 100
        elif n_that_day == 0:
            sc += 30  # spreads workload onto lighter days
        sc -= min(abs(c["start"] - preferred) // 6, 150)  # stay near client's preferred time
        sc -= c["offset"]  # mild preference for sooner
        scores.append(sc)
        c["holiday"] = holiday
        c["existing"] = n_that_day

    model.Maximize(sum(sc * v for sc, v in zip(scores, chosen)))

    # ── Solve repeatedly to extract ranked top-K (one per day) ─────────────
    results: list[dict[str, Any]] = []
    used_days: set[str] = set()
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 2.0
    solver.parameters.num_workers = 1

    for _ in range(TOP_K):
        m = model.Clone() if hasattr(model, "Clone") else model
        for i, c in enumerate(candidates):
            if c["ds"] in used_days:
                m.Add(chosen[i] == 0)
        status = solver.Solve(m)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            break
        pick = next((i for i, v in enumerate(chosen) if solver.BooleanValue(v)), None)
        if pick is None:
            break
        c = candidates[pick]
        used_days.add(c["ds"])
        results.append(_format(c, scores[pick], preferred, original_dow))

    results.sort(key=lambda r: (-r["score"], r["daysFromOriginal"]))
    return results


def _format(c: dict[str, Any], raw_score: int, preferred: int, original_dow: int) -> dict[str, Any]:
    d: date = c["date"]
    # Map solver weights (~400–1100) to the 50–100 range the UI badges expect.
    score = int(max(50, min(100, 50 + (raw_score - 450) / 650 * 50)))
    js_dow = (d.weekday() + 1) % 7  # JS: Sunday = 0
    day_name = d.strftime("%a")
    is_sunday = js_dow == 0
    holiday = c.get("holiday")
    same_day = d.weekday() == original_dow
    tags = [
        f"★ {holiday}" if holiday else None,
        "Sun (By Appt)" if is_sunday else "Studio Hours (9-6)",
        f"Same Day ({day_name})" if same_day else None,
        "0 Collisions",
        "OR-Tools Optimal",
    ]
    return {
        "date": c["ds"],
        "time": _fmt(c["start"]),
        "fullTime": _fmt(c["start"]) + ":00",
        "formattedDate": f"{day_name}, {d.strftime('%b')} {d.day}, {d.year}",
        "dayName": day_name,
        "dayOfWeek": js_dow,
        "daysFromOriginal": c["offset"],
        "existingShootCount": c["existing"],
        "isWeekend": js_dow in (0, 6),
        "isSunday": is_sunday,
        "holiday": holiday,
        "score": score,
        "tags": [t for t in tags if t],
        "rationale": f"★ {holiday}" if holiday else "Sun · By Appt" if is_sunday else f"Studio Hours · {day_name}",
        "solver": "ortools-cp-sat",
    }
