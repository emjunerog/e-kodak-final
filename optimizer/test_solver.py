from solver import find_reschedule_slots


def test_no_overlap_and_blocked_days():
    payload = {
        "today": "2026-10-01",
        "daysToScan": 10,
        "booking": {"id": "x", "event_date": "2026-10-05", "preferred_time": "10:00:00"},
        "allBookings": [
            {"id": "a", "event_date": "2026-10-06", "preferred_time": "09:00:00", "status": "CONFIRMED"},
            {"id": "b", "event_date": "2026-10-07", "preferred_time": "10:00:00", "status": "CONFIRMED"},
        ],
        "availabilityList": [{"date": "2026-10-08", "status": "unavailable"}],
        "holidays": {},
    }
    slots = find_reschedule_slots(payload)
    assert 1 <= len(slots) <= 4
    assert all(s["date"] != "2026-10-08" for s in slots)  # blocked
    for s in slots:
        if s["date"] == "2026-10-07":
            assert s["time"] != "10:00"  # collides with booking b
        assert 50 <= s["score"] <= 100


def test_empty_when_everything_blocked():
    payload = {
        "today": "2026-10-01",
        "daysToScan": 2,
        "booking": {"id": "x", "event_date": "2026-10-05"},
        "availabilityList": [
            {"date": "2026-10-06", "status": "blocked"},
            {"date": "2026-10-07", "status": "blocked"},
        ],
    }
    assert find_reschedule_slots(payload) == []
