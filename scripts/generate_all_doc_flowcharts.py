import os
import shutil
import subprocess
import tempfile
import xml.sax.saxutils as saxutils
from concurrent.futures import ThreadPoolExecutor, as_completed

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUT_DIR = r"d:\E-kodak Final\docs\figures\flowcharts"


# ─────────────────────────────────────────────────────────────────────────────
# STRICT 7-SYMBOL FLOWCHART PRIMITIVES (All Control Flow Arrows are SOLID)
# ─────────────────────────────────────────────────────────────────────────────
def draw_text_multiline(cx, cy, text, font_size="8.5", font_weight="normal", fill="#000000"):
    text = text.replace("\\n", "\n")
    lines = text.split("\n")
    fs = float(font_size)
    if len(lines) == 1:
        return (
            f'<text x="{cx}" y="{cy + (fs * 0.36)}" font-size="{font_size}" '
            f'font-weight="{font_weight}" text-anchor="middle" fill="{fill}">'
            f'{saxutils.escape(lines[0])}</text>'
        )
    line_height = fs * 1.22
    start_y = cy - ((len(lines) - 1) * line_height / 2) + (fs * 0.36)
    spans = []
    for i, line in enumerate(lines):
        cur_y = start_y + (i * line_height)
        spans.append(f'<tspan x="{cx}" y="{cur_y}">{saxutils.escape(line)}</tspan>')
    return (
        f'<text font-size="{font_size}" font-weight="{font_weight}" '
        f'text-anchor="middle" fill="{fill}">{"".join(spans)}</text>'
    )


def draw_oval(cx, cy, rx, ry, text, font_weight="bold", font_size="8.8"):
    return (
        f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#ffffff" '
        f'stroke="#000000" stroke-width="1.5"/>\n'
        f'{draw_text_multiline(cx, cy, text, font_size, font_weight)}'
    )


def draw_rect(cx, y, w, h, text, font_weight="normal", font_size="8.0"):
    x = cx - (w / 2)
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#ffffff" '
        f'stroke="#000000" stroke-width="1.4"/>\n'
        f'{draw_text_multiline(cx, y + (h / 2), text, font_size, font_weight)}'
    )


def draw_diamond(cx, cy, w, h, text, font_size="7.8"):
    x = cx - (w / 2)
    y = cy - (h / 2)
    pts = f"{cx},{y} {x+w},{cy} {cx},{y+h} {x},{cy}"
    return (
        f'<polygon points="{pts}" fill="#ffffff" stroke="#000000" stroke-width="1.4"/>\n'
        f'{draw_text_multiline(cx, cy, text, font_size, "normal")}'
    )


def draw_parallelogram(cx, y, w, h, text, font_weight="normal", font_size="8.0"):
    x = cx - (w / 2)
    offset = 10
    pts = f"{x+offset},{y} {x+w},{y} {x+w-offset},{y+h} {x},{y+h}"
    return (
        f'<polygon points="{pts}" fill="#ffffff" stroke="#000000" stroke-width="1.4"/>\n'
        f'{draw_text_multiline(cx, y + (h / 2), text, font_size, font_weight)}'
    )


def draw_cylinder(cx, y, w, h, text, font_size="7.7", font_style="italic"):
    rx = w / 2
    ry = 6.0
    x_left = cx - rx
    x_right = cx + rx
    top_cy = y + ry
    bot_cy = y + h - ry
    body_path = (
        f"M {x_left},{top_cy} "
        f"L {x_left},{bot_cy} "
        f"A {rx},{ry} 0 0,0 {x_right},{bot_cy} "
        f"L {x_right},{top_cy} Z"
    )
    label_cy = top_cy + ((h - ry) / 2) + 1
    return (
        f'<path d="{body_path}" fill="#ffffff" stroke="#000000" stroke-width="1.4"/>\n'
        f'<ellipse cx="{cx}" cy="{top_cy}" rx="{rx}" ry="{ry}" fill="#ffffff" '
        f'stroke="#000000" stroke-width="1.4"/>\n'
        f'{draw_text_multiline(cx, label_cy, text, font_size, font_style, "#111111")}'
    )


def draw_down_pentagon(cx, y, w, h, text, font_size="9.5"):
    p_offset = round(h * 0.36, 2)
    x = cx - (w / 2)
    pts = f"{x},{y} {x+w},{y} {x+w},{y+h-p_offset} {cx},{y+h} {x},{y+h-p_offset}"
    fs = float(font_size)
    text_y = y + ((h - p_offset * 0.45) / 2) + (fs * 0.35)
    return (
        f'<polygon points="{pts}" fill="#ffffff" stroke="#000000" stroke-width="1.4"/>\n'
        f'<text x="{cx}" y="{text_y}" font-size="{font_size}" '
        f'font-weight="bold" text-anchor="middle" fill="#000000">{saxutils.escape(str(text))}</text>'
    )


def draw_database_target_widget(cx_cyl, y_cyl):
    """Draws the single standalone 'Database' cylinder with pentagon '1' on its right and arrow pointing left into the cylinder."""
    cyl_w = 68
    cyl_h = 44
    pent_w = 28
    pent_h = 25
    cx_pent = cx_cyl + 66
    y_pent = y_cyl + 11
    arrow_y = y_cyl + 22
    return (
        f'{draw_cylinder(cx_cyl, y_cyl, cyl_w, cyl_h, "Database", "8.4", "normal")}\n'
        f'{draw_down_pentagon(cx_pent, y_pent, pent_w, pent_h, "1", "9.0")}\n'
        f'{draw_arrow(cx_pent - (pent_w / 2), arrow_y, cx_cyl + (cyl_w / 2), arrow_y)}'
    )


def draw_polyline(points):
    lines = []
    for i in range(len(points) - 1):
        x1, y1 = points[i]
        x2, y2 = points[i + 1]
        lines.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#000000" stroke-width="1.35"/>')
    return "\n".join(lines)


def draw_circle_conn(cx, cy, r, text):
    assert str(text).strip() != "", "On-page connector circle must never be empty!"
    return (
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#ffffff" stroke="#000000" stroke-width="1.4"/>\n'
        f'<text x="{cx}" y="{cy + 3.3}" font-size="9" font-weight="bold" '
        f'text-anchor="middle" fill="#000000">{saxutils.escape(str(text))}</text>'
    )


def draw_arrow(x1, y1, x2, y2):
    if y2 > y1 and abs(x2 - x1) < 1:
        head = f'<polygon points="{x2},{y2} {x2-3.6},{y2-6.8} {x2+3.6},{y2-6.8}" fill="#000000"/>'
    elif x2 > x1 and abs(y2 - y1) < 1:
        head = f'<polygon points="{x2},{y2} {x2-6.8},{y2-3.6} {x2-6.8},{y2+3.6}" fill="#000000"/>'
    elif x1 > x2 and abs(y2 - y1) < 1:
        head = f'<polygon points="{x2},{y2} {x2+6.8},{y2-3.6} {x2+6.8},{y2+3.6}" fill="#000000"/>'
    else:
        head = f'<polygon points="{x2},{y2} {x2-3.6},{y2+6.8} {x2+3.6},{y2+6.8}" fill="#000000"/>'
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#000000" stroke-width="1.35"/>\n{head}'


def draw_polyline_arrow(points):
    lines = []
    for i in range(len(points) - 2):
        x1, y1 = points[i]
        x2, y2 = points[i + 1]
        lines.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#000000" stroke-width="1.35"/>')
    x1, y1 = points[-2]
    x2, y2 = points[-1]
    lines.append(draw_arrow(x1, y1, x2, y2))
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# MASTER RULEBOOK DATA (Letter-Header Dashboards: Customer=A, Photographer=J, Admin=O)
# Database Connector = 1
# ─────────────────────────────────────────────────────────────────────────────
ROLES_CONFIG = [
    {
        "key": "customer",
        "dash_letter": "A",
        "actor_title": "Client / Customer",
        "dash_box": "Display Customer Dashboard",
        "cx": 655,
        "use_cases": [
            ("Browse Service Packages & Pricing", "B"),
            ("Inquire with Gemini AI Assistant", "C"),
            ("Book Photo Session & Select Schedule", "D"),
            ("Submit Downpayment & Payment Proof", "E"),
            ("Generate & Access Digital QR Pass [Mobile App]", "F"),
            ("Track Real-Time Milestone Status [Mobile App]", "G"),
            ("View & Download Released Soft Copies", "H"),
            ("Preview 3D Digital Yearbook Flipbook", "I"),
        ],
    },
    {
        "key": "photographer",
        "dash_letter": "J",
        "actor_title": "Photographer",
        "dash_box": "Display Photographer Dashboard",
        "cx": 975,
        "use_cases": [
            ("Configure Shift Availability & Blackouts", "K"),
            ("View Assigned Shoot Roster & Briefs", "L"),
            ("Update Live Production Milestone Status", "M"),
            ("Upload Retouched Photo Deliverables", "N"),
        ],
    },
    {
        "key": "admin",
        "dash_letter": "O",
        "actor_title": "Admin",
        "dash_box": "Display Admin Dashboard",
        "cx": 1295,
        "use_cases": [
            ("Manage Master Booking Queue & Assignments", "P"),
            ("Verify Payments & Record Treasury Ledger", "Q"),
            ("Manage Service Packages, Tiers & Add-Ons", "R"),
            ("Manage Customer & Photographer Directory", "S"),
            ("Upload & OCR Parse School Masterlists", "T"),
            ("Manage Yearbook Projects & Print PDF Export", "U"),
            ("Configure Studio Settings & CMS Bulletin", "V"),
        ],
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# 1. MAIN SYSTEM FLOWCHART (flowchart-master.png)
# Matches Professor's Reference Master Diagram:
# - Top-right Database cylinder <-- Pentagon "1"
# - Left column: Customer Register Account flow -> Redirect to Login Page
# - Center/Right column: Unified Login + Forgot Password flow (with inline Circle "1" after DB steps)
# - Bottom: 3 Role Dashboards ending in Pentagons A, J, and O
# ─────────────────────────────────────────────────────────────────────────────
def build_master_flowchart_svg():
    width = 1540
    cx = 975
    reg_cx = 260
    svg = []

    # Top-right Database cylinder + Pentagon "1" widget
    svg.append(draw_database_target_widget(cx + 185, 22))

    svg.append(draw_oval(cx, 28, 48, 14, "START", "bold", "9.5"))
    svg.append(draw_arrow(cx, 42, cx, 58))
    svg.append(draw_parallelogram(cx, 58, 185, 26, "Display Landing Page", "bold", "8.5"))

    # Main vertical line from Display Landing Page to Display Login Page
    login_return_y = 96
    login_box_y = 110
    svg.append(draw_arrow(cx, 84, cx, login_box_y))

    svg.append(draw_parallelogram(cx, login_box_y, 200, 28, "Display Login Page", "bold", "8.8"))
    y = login_box_y + 28

    # Select Create New Account? -> Yes (Left column: full Customer Registration flow, matching Reference)
    svg.append(draw_arrow(cx, y, cx, y + 18))
    dia_reg_cy = y + 40
    svg.append(draw_diamond(cx, dia_reg_cy, 176, 44, "Select Create\nNew Account?", "7.8"))
    svg.append(draw_arrow(cx - 88, dia_reg_cy, reg_cx + 114, dia_reg_cy))
    svg.append(f'<text x="{cx - 115}" y="{dia_reg_cy - 5}" font-size="7.8" font-weight="bold">Yes</text>')

    # ── Left Column: Customer Registration Flow (matching Professor's Reference) ──
    reg_err_cx = 96
    reg_retry_x = 24
    outer_left_return_x = 10
    svg.append(draw_rect(reg_cx, dia_reg_cy - 14, 228, 28, "Display Register Account Page", "bold", "7.8"))
    ry = dia_reg_cy + 14
    svg.append(draw_arrow(reg_cx, ry, reg_cx, ry + 18))
    reg_in_arrow_y = ry + 9
    ry += 18
    svg.append(draw_parallelogram(reg_cx, ry, 236, 28, "Enter Name, Email, Mobile & Password", "normal", "7.4"))
    ry += 28
    svg.append(draw_arrow(reg_cx, ry, reg_cx, ry + 16))
    ry += 16
    svg.append(draw_rect(reg_cx, ry, 232, 26, "Validate Password Rules (8+ Chars, Letter & No.)", "normal", "7.2"))
    ry += 26
    svg.append(draw_arrow(reg_cx, ry, reg_cx, ry + 16))
    ry += 16
    dia_pw_cy = ry + 21
    svg.append(draw_diamond(reg_cx, dia_pw_cy, 168, 42, "Meets Password\nRules?", "7.4"))
    svg.append(draw_arrow(reg_cx - 84, dia_pw_cy, reg_err_cx + 62, dia_pw_cy))
    svg.append(f'<text x="{reg_cx - 98}" y="{dia_pw_cy - 5}" font-size="7.2" font-weight="bold">No</text>')
    svg.append(draw_parallelogram(reg_err_cx, dia_pw_cy - 13, 132, 26, "Display Weak Password\nError Message", "normal", "6.8"))
    svg.append(f'<line x1="{reg_err_cx - 62}" y1="{dia_pw_cy}" x2="{reg_retry_x}" y2="{dia_pw_cy}" stroke="#000000" stroke-width="1.35"/>')

    ry = dia_pw_cy + 21
    svg.append(f'<text x="{reg_cx - 10}" y="{ry + 11}" font-size="7.4" font-weight="bold" text-anchor="end">Yes</text>')
    svg.append(draw_arrow(reg_cx, ry, reg_cx, ry + 16))
    ry += 16
    svg.append(draw_rect(reg_cx, ry, 232, 26, "Read DB: auth.users (Check Email Uniqueness)", "normal", "7.2"))
    ry += 26
    svg.append(draw_arrow(reg_cx, ry, reg_cx, ry + 12))
    ry += 12
    svg.append(draw_circle_conn(reg_cx, ry + 10, 10, "1"))
    ry += 20
    svg.append(draw_arrow(reg_cx, ry, reg_cx, ry + 16))
    ry += 16
    dia_em_cy = ry + 21
    svg.append(draw_diamond(reg_cx, dia_em_cy, 168, 42, "Is Email Address\nUnique?", "7.4"))
    svg.append(draw_arrow(reg_cx - 84, dia_em_cy, reg_err_cx + 62, dia_em_cy))
    svg.append(f'<text x="{reg_cx - 98}" y="{dia_em_cy - 5}" font-size="7.2" font-weight="bold">No</text>')
    svg.append(draw_parallelogram(reg_err_cx, dia_em_cy - 13, 132, 26, "Display Email Already\nRegistered Error", "normal", "6.8"))
    svg.append(draw_polyline_arrow([
        (reg_err_cx - 62, dia_em_cy),
        (reg_retry_x, dia_em_cy),
        (reg_retry_x, reg_in_arrow_y),
        (reg_cx, reg_in_arrow_y),
    ]))

    ry = dia_em_cy + 21
    svg.append(f'<text x="{reg_cx - 10}" y="{ry + 11}" font-size="7.4" font-weight="bold" text-anchor="end">Yes</text>')
    svg.append(draw_arrow(reg_cx, ry, reg_cx, ry + 16))
    reg_send_otp_y = ry + 8
    ry += 16
    svg.append(draw_rect(reg_cx, ry, 232, 26, "Send Verification OTP (5m Expiry)", "normal", "7.4"))
    ry += 26
    svg.append(draw_arrow(reg_cx, ry, reg_cx, ry + 16))
    reg_otp_in_y = ry + 8
    ry += 16
    reg_otp_box_cy = ry + 14
    svg.append(draw_parallelogram(reg_cx, ry, 236, 28, "Enter Verification OTP (or Resend OTP)", "normal", "7.4"))
    svg.append(draw_polyline_arrow([
        (reg_cx + 113, reg_otp_box_cy),
        (393, reg_otp_box_cy),
        (393, reg_send_otp_y),
        (reg_cx, reg_send_otp_y),
    ]))
    svg.append(
        f'<text x="398" y="{(reg_otp_box_cy + reg_send_otp_y)/2 + 3}" font-size="6.6" '
        f'font-weight="bold" text-anchor="start" fill="#111111">Resend</text>'
    )
    ry += 28
    svg.append(draw_arrow(reg_cx, ry, reg_cx, ry + 16))
    ry += 16
    dia_rotp_cy = ry + 21
    svg.append(draw_diamond(reg_cx, dia_rotp_cy, 168, 42, "Is Verification OTP\nValid & Unexpired?", "7.3"))
    svg.append(draw_arrow(reg_cx - 84, dia_rotp_cy, reg_err_cx + 62, dia_rotp_cy))
    svg.append(f'<text x="{reg_cx - 98}" y="{dia_rotp_cy - 5}" font-size="7.2" font-weight="bold">No</text>')
    svg.append(draw_parallelogram(reg_err_cx, dia_rotp_cy - 13, 132, 26, "Display Invalid / Expired\nOTP Error Message", "normal", "6.8"))
    svg.append(draw_polyline_arrow([
        (reg_err_cx - 62, dia_rotp_cy),
        (reg_retry_x, dia_rotp_cy),
        (reg_retry_x, reg_otp_in_y),
        (reg_cx, reg_otp_in_y),
    ]))

    ry = dia_rotp_cy + 21
    svg.append(f'<text x="{reg_cx - 10}" y="{ry + 11}" font-size="7.4" font-weight="bold" text-anchor="end">Yes</text>')
    svg.append(draw_arrow(reg_cx, ry, reg_cx, ry + 16))
    ry += 16
    svg.append(draw_rect(reg_cx, ry, 232, 26, "Write DB: auth.users, profiles (Customer)", "normal", "7.3"))
    ry += 26
    svg.append(draw_arrow(reg_cx, ry, reg_cx, ry + 12))
    ry += 12
    svg.append(draw_circle_conn(reg_cx, ry + 10, 10, "1"))
    ry += 20
    svg.append(draw_arrow(reg_cx, ry, reg_cx, ry + 16))
    ry += 16
    svg.append(draw_parallelogram(reg_cx, ry, 236, 26, "Display Account Registered Successfully", "normal", "7.3"))
    ry += 26
    svg.append(draw_arrow(reg_cx, ry, reg_cx, ry + 16))
    ry += 16
    svg.append(draw_rect(reg_cx, ry, 196, 26, "Redirect to Login Page", "bold", "7.6"))
    ry += 26
    reg_bottom_bus_y = ry + 16
    svg.append(draw_polyline_arrow([
        (reg_cx, ry),
        (reg_cx, reg_bottom_bus_y),
        (outer_left_return_x, reg_bottom_bus_y),
        (outer_left_return_x, login_return_y),
        (cx, login_return_y),
    ]))

    # ── Center/Right Column: Login + Forgot Password Flow ──
    y = dia_reg_cy + 22
    svg.append(f'<text x="{cx - 10}" y="{y + 11}" font-size="7.8" font-weight="bold" text-anchor="end">No</text>')

    svg.append(draw_arrow(cx, y, cx, y + 18))
    dia_fp_cy = y + 40
    svg.append(draw_diamond(cx, dia_fp_cy, 176, 44, "Select Forgot\nPassword?", "7.8"))

    fp_cx = cx + 235
    svg.append(draw_arrow(cx + 88, dia_fp_cy, fp_cx - 92, dia_fp_cy))
    svg.append(f'<text x="{cx + 106}" y="{dia_fp_cy - 5}" font-size="7.8" font-weight="bold">Yes</text>')
    svg.append(draw_parallelogram(fp_cx, dia_fp_cy - 14, 184, 28, "Enter Email / Mobile for Reset", "normal", "7.5"))
    svg.append(draw_arrow(fp_cx, dia_fp_cy + 14, fp_cx, dia_fp_cy + 30))
    svg.append(draw_rect(fp_cx, dia_fp_cy + 30, 184, 26, "Send Password Reset OTP", "normal", "7.5"))
    svg.append(draw_arrow(fp_cx, dia_fp_cy + 56, fp_cx, dia_fp_cy + 72))
    fp_otp_arrow_y = dia_fp_cy + 65
    svg.append(draw_parallelogram(fp_cx, dia_fp_cy + 72, 190, 28, "Enter Reset OTP & New Password", "normal", "7.5"))
    svg.append(draw_arrow(fp_cx, dia_fp_cy + 100, fp_cx, dia_fp_cy + 116))
    dia_fpotp_cy = dia_fp_cy + 138
    svg.append(draw_diamond(fp_cx, dia_fpotp_cy, 166, 44, "Is Reset OTP\nValid?", "7.6"))

    fp_err_cx = fp_cx + 190
    svg.append(draw_arrow(fp_cx + 83, dia_fpotp_cy, fp_err_cx - 65, dia_fpotp_cy))
    svg.append(f'<text x="{fp_cx + 102}" y="{dia_fpotp_cy - 5}" font-size="7.5" font-weight="bold">No</text>')
    svg.append(draw_parallelogram(fp_err_cx, dia_fpotp_cy - 14, 132, 28, "Display Invalid\nReset OTP Error", "normal", "7.2"))
    svg.append(draw_polyline_arrow([
        (fp_err_cx, dia_fpotp_cy - 14),
        (fp_err_cx, fp_otp_arrow_y),
        (fp_cx, fp_otp_arrow_y),
    ]))

    svg.append(draw_arrow(fp_cx, dia_fpotp_cy + 22, fp_cx, dia_fpotp_cy + 36))
    svg.append(f'<text x="{fp_cx - 10}" y="{dia_fpotp_cy + 32}" font-size="7.5" font-weight="bold" text-anchor="end">Yes</text>')
    svg.append(draw_rect(fp_cx, dia_fpotp_cy + 36, 184, 26, "Write DB: auth.users (New Password)", "normal", "7.3"))
    svg.append(draw_arrow(fp_cx, dia_fpotp_cy + 62, fp_cx, dia_fpotp_cy + 74))
    svg.append(draw_circle_conn(fp_cx, dia_fpotp_cy + 84, 10, "1"))
    svg.append(draw_arrow(fp_cx, dia_fpotp_cy + 94, fp_cx, dia_fpotp_cy + 106))
    svg.append(draw_parallelogram(fp_cx, dia_fpotp_cy + 106, 184, 26, "Display Password Reset Success", "normal", "7.4"))
    outer_right_return_x = fp_err_cx + 88
    svg.append(draw_polyline_arrow([
        (fp_cx + 87, dia_fpotp_cy + 119),
        (outer_right_return_x, dia_fpotp_cy + 119),
        (outer_right_return_x, login_return_y),
        (cx, login_return_y),
    ]))

    # Main Login Spine: Forgot Password == No -> Enter Email & Password Only
    y = dia_fp_cy + 22
    svg.append(f'<text x="{cx + 8}" y="{y + 10}" font-size="7.8" font-weight="bold" text-anchor="start">No</text>')
    svg.append(draw_arrow(cx, y, cx, y + 20))
    cred_arrow_y = y + 12
    y += 20
    svg.append(draw_parallelogram(cx, y, 220, 28, "Enter Email & Password", "normal", "8.2"))
    y += 28
    svg.append(draw_arrow(cx, y, cx, y + 16))
    y += 16
    svg.append(draw_rect(cx, y, 215, 28, "Read DB: auth.users, profiles", "normal", "7.8"))
    y += 28
    svg.append(draw_arrow(cx, y, cx, y + 14))
    y += 14
    svg.append(draw_circle_conn(cx, y + 10, 10, "1"))
    y += 20

    # Check lock status BEFORE validating credentials
    svg.append(draw_arrow(cx, y, cx, y + 18))
    y += 18
    dia_lock_cy = y + 21
    svg.append(draw_diamond(cx, dia_lock_cy, 182, 42, "Is Account Currently\nUn-Locked?", "7.6"))
    l_err_cx = cx - 230
    cred_retry_bus_x = l_err_cx - 108
    lockout_bus_x = cx - 520
    svg.append(draw_arrow(cx - 91, dia_lock_cy, l_err_cx + 80, dia_lock_cy))
    svg.append(f'<text x="{cx - 108}" y="{dia_lock_cy - 5}" font-size="7.5" font-weight="bold">No</text>')
    svg.append(draw_parallelogram(l_err_cx, dia_lock_cy - 13, 165, 26, "Display Account Locked\n(Try Again After 15m)", "normal", "7.1"))
    svg.append(f'<line x1="{l_err_cx - 78}" y1="{dia_lock_cy}" x2="{cred_retry_bus_x}" y2="{dia_lock_cy}" stroke="#000000" stroke-width="1.35"/>')
    y = dia_lock_cy + 21
    svg.append(f'<text x="{cx - 10}" y="{y + 12}" font-size="7.6" font-weight="bold" text-anchor="end">Yes</text>')

    # Are Credentials Valid? -> No -> Password Attempts < Max (5)?
    svg.append(draw_arrow(cx, y, cx, y + 54))
    y += 54
    dia_cred_cy = y + 21
    svg.append(draw_diamond(cx, dia_cred_cy, 180, 42, "Are Credentials\nValid?", "7.8"))

    pw_att_cx = cx - 230
    svg.append(draw_arrow(cx - 90, dia_cred_cy, pw_att_cx + 80, dia_cred_cy))
    svg.append(f'<text x="{cx - 108}" y="{dia_cred_cy - 5}" font-size="7.6" font-weight="bold">No</text>')
    svg.append(draw_diamond(pw_att_cx, dia_cred_cy, 160, 40, "Password Attempts\n< Max (5)?", "7.4"))

    svg.append(draw_arrow(pw_att_cx, dia_cred_cy - 20, pw_att_cx, dia_cred_cy - 32))
    svg.append(f'<text x="{pw_att_cx + 12}" y="{dia_cred_cy - 22}" font-size="7.1" font-weight="bold">Yes</text>')
    svg.append(draw_parallelogram(pw_att_cx, dia_cred_cy - 56, 166, 24, "Display Invalid Email or\nPassword Error", "normal", "7.0"))
    svg.append(draw_polyline_arrow([
        (pw_att_cx - 78, dia_cred_cy - 44),
        (cred_retry_bus_x, dia_cred_cy - 44),
        (cred_retry_bus_x, cred_arrow_y),
        (cx, cred_arrow_y),
    ]))

    pw_lock_cx = pw_att_cx - 185
    svg.append(draw_arrow(pw_att_cx - 80, dia_cred_cy, pw_lock_cx + 76, dia_cred_cy))
    svg.append(f'<text x="{pw_att_cx - 96}" y="{dia_cred_cy - 5}" font-size="7.2" font-weight="bold">No</text>')
    svg.append(draw_rect(pw_lock_cx, dia_cred_cy - 14, 152, 28, "Write DB: auth.users\n(Temp Lockout 15m)", "normal", "7.0"))
    svg.append(draw_arrow(pw_lock_cx, dia_cred_cy + 14, pw_lock_cx, dia_cred_cy + 26))
    svg.append(draw_circle_conn(pw_lock_cx, dia_cred_cy + 36, 10, "1"))
    svg.append(draw_polyline([
        (pw_lock_cx, dia_cred_cy + 46),
        (pw_lock_cx, dia_cred_cy + 56),
        (lockout_bus_x, dia_cred_cy + 56),
    ]))

    # Credentials Valid == Yes -> Select OTP Channel -> Send One-Time OTP
    y = dia_cred_cy + 21
    svg.append(f'<text x="{cx - 10}" y="{y + 11}" font-size="7.8" font-weight="bold" text-anchor="end">Yes</text>')
    svg.append(draw_arrow(cx, y, cx, y + 20))
    y += 20
    svg.append(draw_parallelogram(cx, y, 225, 26, "Select OTP Channel (SMS or Email)", "normal", "8.0"))
    y += 26
    svg.append(draw_arrow(cx, y, cx, y + 16))
    send_otp_arrow_y = y + 8
    y += 16
    svg.append(draw_rect(cx, y, 240, 26, "Send One-Time OTP (5-Minute Expiry)", "normal", "8.0"))
    y += 26
    svg.append(draw_arrow(cx, y, cx, y + 16))
    otp_arrow_y = y + 8
    y += 16
    otp_box_cy = y + 14
    svg.append(draw_parallelogram(cx, y, 240, 28, "Enter OTP Code (or Select Resend OTP)", "normal", "8.0"))

    svg.append(draw_polyline_arrow([
        (cx + 115, otp_box_cy),
        (cx + 210, otp_box_cy),
        (cx + 210, send_otp_arrow_y),
        (cx, send_otp_arrow_y),
    ]))
    svg.append(
        f'<text x="{cx + 216}" y="{(otp_box_cy + send_otp_arrow_y)/2 + 3}" font-size="7.1" '
        f'font-weight="bold" text-anchor="start" fill="#111111">Resend OTP (Max 3, 60s Cooldown)</text>'
    )

    y += 28
    svg.append(draw_arrow(cx, y, cx, y + 40))
    y += 40
    dia_otp_cy = y + 21
    svg.append(draw_diamond(cx, dia_otp_cy, 184, 42, "Is OTP Code Valid\n& Unexpired?", "7.8"))

    att_cx = cx - 230
    svg.append(draw_arrow(cx - 92, dia_otp_cy, att_cx + 80, dia_otp_cy))
    svg.append(f'<text x="{cx - 110}" y="{dia_otp_cy - 5}" font-size="7.6" font-weight="bold">No</text>')
    svg.append(draw_diamond(att_cx, dia_otp_cy, 160, 40, "OTP Attempts <\nMax Limit (3)?", "7.4"))

    svg.append(draw_arrow(att_cx, dia_otp_cy - 20, att_cx, dia_otp_cy - 32))
    svg.append(f'<text x="{att_cx + 12}" y="{dia_otp_cy - 22}" font-size="7.1" font-weight="bold">Yes</text>')
    svg.append(draw_parallelogram(att_cx, dia_otp_cy - 56, 170, 24, "Display Invalid/Expired OTP\nError & Retry", "normal", "7.0"))
    svg.append(draw_polyline_arrow([
        (att_cx + 81, dia_otp_cy - 44),
        (cx - 128, dia_otp_cy - 44),
        (cx - 128, otp_arrow_y),
        (cx, otp_arrow_y),
    ]))

    lock_cx = att_cx - 185
    svg.append(draw_arrow(att_cx - 80, dia_otp_cy, lock_cx + 76, dia_otp_cy))
    svg.append(f'<text x="{att_cx - 96}" y="{dia_otp_cy - 5}" font-size="7.2" font-weight="bold">No</text>')
    svg.append(draw_rect(lock_cx, dia_otp_cy - 14, 152, 28, "Write DB: auth.users\n(Temp Lockout 15m)", "normal", "7.0"))
    svg.append(draw_arrow(lock_cx, dia_otp_cy + 14, lock_cx, dia_otp_cy + 26))
    svg.append(draw_circle_conn(lock_cx, dia_otp_cy + 36, 10, "1"))
    svg.append(draw_polyline([
        (lock_cx, dia_otp_cy + 46),
        (lock_cx, dia_otp_cy + 56),
        (lockout_bus_x, dia_otp_cy + 56),
    ]))
    svg.append(draw_polyline([
        (lockout_bus_x, dia_otp_cy + 56),
        (lockout_bus_x, cred_arrow_y),
        (cred_retry_bus_x, cred_arrow_y),
    ]))

    # OTP Valid == Yes -> Display Login Verified -> Authenticate Session & Route by Role
    y = dia_otp_cy + 21
    svg.append(f'<text x="{cx - 10}" y="{y + 11}" font-size="7.8" font-weight="bold" text-anchor="end">Yes</text>')
    svg.append(draw_arrow(cx, y, cx, y + 18))
    y += 18
    svg.append(draw_parallelogram(cx, y, 235, 26, "Display Login Verified Success Screen", "normal", "8.0"))
    y += 26
    svg.append(draw_arrow(cx, y, cx, y + 16))
    y += 16
    svg.append(draw_rect(cx, y, 235, 28, "Authenticate Session & Route by Role", "bold", "8.2"))
    bottom_auth_y = y + 28

    # ── Bottom: 3 Role Dashboards Ending in Pentagons A, J, and O (matching Professor's Reference) ──
    disp_bar_y = bottom_auth_y + 20
    svg.append(draw_arrow(cx, bottom_auth_y, cx, disp_bar_y))

    c1 = ROLES_CONFIG[0]["cx"]
    c3 = ROLES_CONFIG[2]["cx"]
    svg.append(f'<line x1="{c1}" y1="{disp_bar_y}" x2="{c3}" y2="{disp_bar_y}" stroke="#000000" stroke-width="1.4"/>')

    for role in ROLES_CONFIG:
        rcx = role["cx"]
        dletter = role["dash_letter"]
        svg.append(draw_arrow(rcx, disp_bar_y, rcx, disp_bar_y + 18))
        dash_y = disp_bar_y + 18
        svg.append(draw_parallelogram(rcx, dash_y, 224, 30, role["dash_box"], "bold", "8.6"))
        svg.append(draw_arrow(rcx, dash_y + 30, rcx, dash_y + 46))
        svg.append(draw_down_pentagon(rcx, dash_y + 46, 34, 28, dletter, "9.5"))

    height = disp_bar_y + 115
    header_svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="{width}" height="{height}" style="background-color: #ffffff; font-family: Arial, sans-serif;">'
    ]
    svg = header_svg + svg + ["</svg>"]
    return "\n".join(svg), width, height


# ─────────────────────────────────────────────────────────────────────────────
# 2. ROLE DASHBOARD FLOWCHARTS (Customer [A], Photographer [J], Admin [O])
# Continuation charts matching Figure 14 Reference:
# - Top Entry Pentagon (A, J, or O) -> Display [Role] Dashboard
# - All use cases for that role (B–I, K–N, P–V)
# - Logout sequence where "No" points to Pentagon (A, J, or O) and "Yes" ends at END
# ─────────────────────────────────────────────────────────────────────────────
def build_role_flowchart_svg(role):
    role_use_cases = list(role["use_cases"])
    n_uc = len(role_use_cases)
    dletter = role["dash_letter"]
    width = 760
    cx = 390

    pent_top_y = 20
    dash_y = 70
    y_start = dash_y + 54
    row_h = 44
    y_logout_bus = y_start + (n_uc * row_h) + 18
    height = y_logout_bus + 235

    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="{width}" height="{height}" style="background-color: #ffffff; font-family: Arial, sans-serif;">',
    ]

    # Top Entry / Destination Pentagon (A, J, or O) directly into Role Dashboard (matching Figure 14)
    svg.append(draw_down_pentagon(cx, pent_top_y, 38, 30, dletter, "10.5"))
    svg.append(draw_arrow(cx, pent_top_y + 30, cx, dash_y))
    svg.append(draw_parallelogram(cx, dash_y, 235, 30, role["dash_box"], "bold", "8.8"))

    spine_x = cx - 135
    svg.append(f'<line x1="{cx}" y1="{dash_y + 30}" x2="{cx}" y2="{dash_y + 42}" stroke="#000000" stroke-width="1.4"/>')
    svg.append(f'<line x1="{cx}" y1="{dash_y + 42}" x2="{spine_x}" y2="{dash_y + 42}" stroke="#000000" stroke-width="1.4"/>')
    svg.append(f'<line x1="{spine_x}" y1="{dash_y + 42}" x2="{spine_x}" y2="{y_logout_bus}" stroke="#000000" stroke-width="1.4"/>')

    box_w = 250
    box_cx = cx + 8

    for idx, (uc_name, letter) in enumerate(role_use_cases):
        cur_y = y_start + (idx * row_h)
        mid_y = cur_y + 14
        box_left = box_cx - (box_w / 2)
        box_right = box_cx + (box_w / 2)
        svg.append(draw_arrow(spine_x, mid_y, box_left, mid_y))
        svg.append(draw_rect(box_cx, cur_y, box_w, 28, uc_name, "normal", "8.0"))
        pent_cx = box_right + 28
        pent_uc_top_y = cur_y + 15
        svg.append(draw_polyline_arrow([
            (box_right, cur_y + 4),
            (pent_cx, cur_y + 4),
            (pent_cx, pent_uc_top_y),
        ]))
        svg.append(draw_down_pentagon(pent_cx, pent_uc_top_y, 26, 23, letter, "8.8"))

    # Bottom Logout & END (matching Figure 14: No -> Display Session Active Notice -> Pentagon A/J/O)
    svg.append(f'<line x1="{spine_x}" y1="{y_logout_bus}" x2="{cx}" y2="{y_logout_bus}" stroke="#000000" stroke-width="1.4"/>')
    svg.append(draw_arrow(cx, y_logout_bus, cx, y_logout_bus + 18))
    svg.append(draw_parallelogram(cx, y_logout_bus + 18, 175, 28, "Select Logout Option", "bold", "8.5"))
    svg.append(draw_arrow(cx, y_logout_bus + 46, cx, y_logout_bus + 64))
    dia_log_cy = y_logout_bus + 86
    svg.append(draw_diamond(cx, dia_log_cy, 172, 44, "Confirm Session\nLogout?", "8.0"))

    svg.append(draw_arrow(cx - 86, dia_log_cy, cx - 130, dia_log_cy))
    svg.append(f'<text x="{cx - 108}" y="{dia_log_cy - 6}" font-size="8.0" font-weight="bold">No</text>')
    svg.append(draw_parallelogram(cx - 220, dia_log_cy - 14, 180, 28, "Display Session Active Notice", "normal", "7.8"))
    svg.append(draw_arrow(cx - 220, dia_log_cy + 14, cx - 220, dia_log_cy + 30))
    svg.append(draw_down_pentagon(cx - 220, dia_log_cy + 30, 32, 26, dletter, "9.0"))

    svg.append(draw_arrow(cx, dia_log_cy + 22, cx, dia_log_cy + 40))
    svg.append(f'<text x="{cx - 10}" y="{dia_log_cy + 34}" font-size="8.0" font-weight="bold" text-anchor="end">Yes</text>')
    svg.append(draw_rect(cx, dia_log_cy + 40, 235, 26, "Clear Auth Token & Terminate Session", "normal", "8.0"))
    svg.append(draw_arrow(cx, dia_log_cy + 66, cx, dia_log_cy + 82))
    svg.append(draw_parallelogram(cx, dia_log_cy + 82, 245, 26, "Display Logged Out Successfully Screen", "normal", "8.0"))
    svg.append(draw_arrow(cx, dia_log_cy + 108, cx, dia_log_cy + 124))
    svg.append(draw_oval(cx, dia_log_cy + 136, 46, 13, "END", "bold", "9.5"))

    svg.append("</svg>")
    return "\n".join(svg), width, height


# ─────────────────────────────────────────────────────────────────────────────
# 3. SUB-PROCESS CONTINUATION SPECS
# Customer (Dashboard A): B through I
# Photographer (Dashboard J): K through N
# Admin (Dashboard O): P through V
# ─────────────────────────────────────────────────────────────────────────────
SUBPROCESS_SPECS = [
    # ── B: BROWSE SERVICE PACKAGES & PRICING (Customer Dashboard A) ──
    {
        "letter": "B",
        "title": "Browse Service Packages & Pricing",
        "role": "Client / Customer",
        "dash_letter": "A",
        "steps": [
            ("db", "Read DB: service_categories, services, add_ons (Active)", None),
            ("para", "Display Categories, Tiers (Set A–D) & Add-Ons Screen", None),
            ("para", "Select Category, Tier & Add-Ons: View Details / Book / Cancel", "in_browse"),
            ("diamond", "Did User Select\nCancel / Back?", "para", "Display Returning to\nCustomer Dashboard (A)", "RETURN_DASH", "No", "Yes"),
            ("diamond", "Choice: Book Selected\nPackage & Add-Ons Now?", "para", "Display Tier Inclusions,\nAdd-On Rates & Samples", "in_browse", "Yes", "No"),
            ("handoff", "D", "Proceed to Book Photo Session\n& Select Schedule (With Selection)"),
        ],
    },

    # ── C: INQUIRE WITH GEMINI AI ASSISTANT (Customer Dashboard A) ──
    {
        "letter": "C",
        "title": "Inquire with Gemini AI Assistant",
        "role": "Client / Customer",
        "dash_letter": "A",
        "steps": [
            ("para", "Display AI Studio Assistant Chat Screen", None),
            ("para", "Enter Inquiry Prompt or Select Exit Chat", "in_chat"),
            ("diamond", "Did User Select\nExit Chat?", "para", "Close AI Chat Drawer &\nReturn to Dashboard (A)", "RETURN_DASH", "No", "Yes"),
            ("diamond", "Is Prompt Non-Empty &\nWithin Max Length?", "para", "Display Empty or Exceeds\nMax Length Warning", "in_chat", "Yes", "No"),
            ("diamond", "Is Request Within\nUser Rate Limit?", "para", "Display Rate Limit Reached —\nPlease Wait Warning", "in_chat", "Yes", "No"),
            ("db", "Read DB: studio_settings, services, faqs (Active)", None),
            ("rect", "Process Prompt & Studio Context via Gemini AI", None),
            ("diamond", "Did AI Respond Without\nTimeout or Failure?", "para", "Display AI Unavailable —\nShow FAQs & Studio Contact", "in_chat", "Yes", "No"),
            ("diamond", "Is Inquiry Within\nPhoto Studio Scope?", "para", "Display Out-of-Scope Notice\n& Suggested Studio Topics", "in_chat", "Yes", "No"),
            ("para", "Display AI Answer & Recommended Package Cards", None),
            ("diamond", "Book Recommended\nPackage Now?", "para", "Display Chat Ready for\nFollow-Up Questions", "in_chat", "Yes", "No"),
            ("handoff", "D", "Proceed to Book Photo Session\n& Select Schedule"),
        ],
    },

    # ── D: BOOK PHOTO SESSION & SELECT SCHEDULE (Customer Dashboard A) ──
    {
        "letter": "D",
        "title": "Book Photo Session & Select Schedule",
        "role": "Client / Customer",
        "dash_letter": "A",
        "cancel_cleanup": "Release 15-Min Slot Hold (If Active)",
        "steps": [
            ("diamond", "Was Package Already\nChosen in B or C?", "para", "Select Package Tier &\nAdd-Ons (Arrived from A)", "SKIP_TO:chk_cat", "Yes", "No"),
            ("diamond", "Is Selected Category\nCollege or SHS?", "para", "Skip Academic Fields\n(Studio / Event Package)", "SKIP_TO:in_contact", "Yes", "No", "chk_cat"),
            ("para", "Enter Academic Details (School, Program, Toga Size)", "in_acad"),
            ("para", "Enter Client Contact Details & Session Notes", "in_contact"),
            ("diamond", "Are All Required Fields\nComplete & Valid?", "para", "Display Missing Required\nFields Error", "in_contact", "Yes", "No"),
            ("para", "Select Date & Slot (Studio Hours from studio_settings [V])", "in_slot"),
            ("diamond", "Is Selected Date Today\nor Future (Not Past)?", "para", "Display Past Date Not\nAllowed Error", "in_slot", "Yes", "No"),
            ("db", "Read DB: bookings, photographer_availability, studio_settings", None),
            ("diamond", "Is Selected Date &\nTime Slot Available?", "para", "Display Slot Conflict or\nBlackout Date Error", "in_slot", "Yes", "No"),
            ("rect", "Place 15-Min Slot Hold & Compute Total / Downpayment", None),
            ("db", "Write DB (Transactional): bookings (Status: Pending Payment)", None),
            ("diamond", "Did Transactional Slot\nWrite Succeed?", "para", "Display Slot Just Taken —\nSelect Another Time Slot", "in_slot", "Yes", "No"),
            ("rect", "Start Payment Timer (Auto-Cancel & Release Slot on Expiry)", None),
            ("para", "Display Booking Saved (Pending Payment) Summary", None),
            ("handoff", "E", "Proceed to Submit Downpayment\n& Payment Proof"),
        ],
    },

    # ── E: SUBMIT DOWNPAYMENT & PAYMENT PROOF (Customer Dashboard A) ──
    {
        "letter": "E",
        "title": "Submit Downpayment & Payment Proof",
        "role": "Client / Customer",
        "dash_letter": "A",
        "steps": [
            ("db", "Read DB: bookings, payments (Load Balance & Plan)", None),
            ("para", "Select Payment Type (Downpayment / Balance) & Channel", "in_ptype"),
            ("diamond", "Is Selected Payment\nChannel Cash?", "rect_para", "Write DB: Status = Cash – Awaiting\nReceipt at Studio (No Proof Upload)", "RETURN_DASH", "No", "Yes"),
            ("para", "Enter Amount, Reference No. & Upload Proof", "in_pay"),
            ("diamond", "Meets Rule (Min Downpayment\nor Exact Balance)?", "para", "Display Invalid Downpayment\nor Balance Amount Error", "in_pay", "Yes", "No"),
            ("db", "Read DB: payments (Check Reference Uniqueness)", None),
            ("diamond", "Is Reference Number\nUnique (Not Duplicate)?", "para", "Display Duplicate Reference\nNumber Error", "in_pay", "Yes", "No"),
            ("diamond", "Does Amount Require\nHigh-Value OTP?", "para", "Skip High-Value OTP\n(Standard Amount)", "SKIP_TO:write_pay", "Yes", "No"),
            ("rect", "Send High-Value Payment OTP Code", "send_hv_otp"),
            ("para", "Enter High-Value Payment OTP Code", "in_hv_otp"),
            ("diamond_otp", "Is High-Value OTP\nValid & Unexpired?", "in_hv_otp", "RETURN_DASH"),
            ("db", "Write DB: payments, bookings (Payment Submitted – Pending Verification)", "write_pay"),
            ("para", "Display Payment Submitted – Pending Verification Screen", None),
            ("handoff", "F", "Proceed to Generate & Access\nDigital QR Pass", "handoff_f"),
        ],
    },

    # ── F: GENERATE & ACCESS DIGITAL QR PASS (Customer Dashboard A) ──
    {
        "letter": "F",
        "title": "Generate & Access Digital QR Pass",
        "role": "Client / Customer [Mobile App Interface]",
        "dash_letter": "A",
        "steps": [
            ("para", "Select Booking in Portal or Mobile App", "in_qr"),
            ("db", "Read DB: bookings, payments", None),
            ("diamond", "Was Booking Found\nWithin Retry Limit (3)?", "para", "Display Lookup Failed —\nContact Studio Support", "RETURN_DASH", "Yes", "No"),
            ("diamond", "Is Booking Status >=\nPayment Verified?", "para", "Display Awaiting Payment\nVerification Notice", "RETURN_DASH", "Yes", "No"),
            ("rect", "Encode Signed, Expiring Booking Token Only into QR", None),
            ("para", "Display Digital QR Pass & Downloadable Voucher", None),
            ("para", "Scan QR Pass in Mobile App Interface", "in_scan"),
            ("db", "Read DB: bookings (Fetch Details Server-Side by Token)", None),
            ("rect", "Encrypt & Cache Minimal Booking Data for Offline Access", None),
            ("handoff", "G", "Proceed to Track Real-Time\nMilestone Status"),
        ],
    },

    # ── G: TRACK REAL-TIME MILESTONE STATUS (Customer Dashboard A) ──
    {
        "letter": "G",
        "title": "Track Real-Time Milestone Status",
        "role": "Client / Customer [Mobile App Interface]",
        "dash_letter": "A",
        "steps": [
            ("para", "Scan QR in Mobile App Interface or Select Booking", "in_trk"),
            ("db", "Read DB: bookings, booking_status_history", None),
            ("diamond", "Is Booking Record\nFound in Database?", "para", "Display Booking Not\nFound Error", "in_trk", "Yes", "No"),
            ("diamond", "Is Booking Status >=\nPayment Verified?", "para", "Display Payment Not Yet\nVerified Notice", "RETURN_DASH", "Yes", "No"),
            ("rect", "Enable Automatic Status Refresh (Push / Polling)", None),
            ("para", "Display Timeline: Payment Verified -> Assigned -> Accepted ->\nCaptured -> Editing -> Printing -> Uploaded -> Ready -> Completed", None),
            ("db", "Read DB: bookings (Read Ready Status)", None),
            ("diamond", "Is Booking Status >=\nReady?", "para", "Display Active Stage &\nAuto-Refreshing Tracker", "RETURN_DASH", "Yes", "No"),
            ("para", "Display Order Ready Status & Pickup / Delivery Details", None),
            ("handoff", "H", "Proceed to View & Download\nReleased Soft Copies"),
        ],
    },

    # ── H: VIEW & DOWNLOAD RELEASED SOFT COPIES (Customer Dashboard A) ──
    {
        "letter": "H",
        "title": "View & Download Released Soft Copies",
        "role": "Client / Customer",
        "dash_letter": "A",
        "steps": [
            ("para", "Select Booking to View Soft Copies", "in_sc"),
            ("db", "Read DB: photo_outputs, bookings (Proofs Generated in N)", None),
            ("diamond", "Are Watermarked Proofs\n& Uploads Available?", "para", "Display Photos Still in\nPost-Production Notice", "RETURN_DASH", "Yes", "No"),
            ("para", "Display Watermarked Proof Gallery (Generated in N)", None),
            ("diamond", "Is Remaining Balance\nVerified & Paid?", "handoff_E", "Display Unpaid Balance Hold\n-> Route to E (Type = Balance)", "E", "Yes", "No"),
            ("rect", "Generate Time-Limited Signed Download Links", "gen_link"),
            ("para", "Select Download High-Resolution Soft Copies", "in_dl"),
            ("diamond", "Is Signed Download Link\nActive (Not Expired)?", "para", "Display Link Expired —\nRequesting New Signed Link", "ONPAGE_TO:gen_link", "Yes", "No"),
            ("diamond", "Did File Download\nComplete Without Error?", "para", "Display Download Failed —\nSelect Retry Download", "in_dl", "Yes", "No"),
            ("para", "Display High-Resolution Soft Copies Downloaded Screen", None),
            ("end_return", "A"),
        ],
    },

    # ── I: PREVIEW 3D DIGITAL YEARBOOK FLIPBOOK (Customer Dashboard A) ──
    {
        "letter": "I",
        "title": "Preview 3D Digital Yearbook Flipbook",
        "role": "Client / Customer",
        "dash_letter": "A",
        "steps": [
            ("para", "Select School Yearbook & Batch", "in_yb"),
            ("db", "Read DB: profiles, yearbook_projects, student_records", None),
            ("diamond", "Does Customer Belong to\nSelected School & Batch?", "para", "Display Access Denied\n(School / Batch Mismatch)", "RETURN_DASH", "Yes", "No"),
            ("diamond", "Is Approved Yearbook\nPublished for Batch?", "para", "Display Yearbook Compilation\nIn Progress Notice", "RETURN_DASH", "Yes", "No"),
            ("diamond", "Is Student Portrait Data-\nPrivacy Consent Granted?", "para", "Display Data-Privacy Consent\nRequired Notice", "RETURN_DASH", "Yes", "No"),
            ("diamond", "Is 3D WebGL Viewer\nSupported on Device?", "para", "Display Non-3D Fallback\nSpread Viewer Screen", "SKIP_TO:in_search", "Yes", "No"),
            ("rect", "Initialize Interactive 3D Page-Flip Viewer", None),
            ("para", "Enter Student Search Name or Select Section Filter", "in_search"),
            ("diamond", "Matching Student Record\nFound in Batch?", "para", "Display No Student Found\nin Selected Batch Notice", "in_search", "Yes", "No"),
            ("para", "Display Yearbook Spreads, Graduate Portrait & Motto", None),
            ("end_return", "A"),
        ],
    },

    # ── K: CONFIGURE SHIFT AVAILABILITY & BLACKOUTS (Photographer Dashboard J) ──
    {
        "letter": "K",
        "title": "Configure Shift Availability & Blackouts",
        "role": "Photographer",
        "dash_letter": "J",
        "steps": [
            ("db", "Read DB: photographer_availability, bookings", None),
            ("para", "Select Dates & Enter Shift Start / End Hours", "in_shift"),
            ("diamond", "Are Selected Dates Today\nor Future (Not Past)?", "para", "Display Past Date Selection\nNot Allowed Error", "in_shift", "Yes", "No"),
            ("diamond", "Are Shift Hours Valid\n(Start < End)?", "para", "Display Invalid Shift\nHours Error", "in_shift", "Yes", "No"),
            ("diamond", "No Overlapping or\nDuplicate Shifts?", "para", "Display Overlapping or\nDuplicate Shift Error", "in_shift", "Yes", "No"),
            ("diamond", "Free of Pending &\nConfirmed Shoots?", "rect_para", "Request Reassignment & Notify\nAdmin (Write DB: notifications)", "RETURN_DASH", "Yes", "No"),
            ("db", "Write DB: photographer_availability", None),
            ("para", "Display Shift Availability Saved Screen", None),
            ("end_return", "J"),
        ],
    },

    # ── L: VIEW ASSIGNED SHOOT ROSTER & BRIEFS (Photographer Dashboard J) ──
    {
        "letter": "L",
        "title": "View Assigned Shoot Roster & Briefs",
        "role": "Photographer",
        "dash_letter": "J",
        "steps": [
            ("db", "Read DB: bookings (Status: Assigned), profiles", None),
            ("para", "Display Assigned Shoot Roster, Package Sets & Brief", None),
            ("diamond", "Responded Within\nAcceptance Timeout?", "rect_para", "Auto-Escalate to Admin (P)\n(Write DB: notifications)", "RETURN_DASH", "Yes", "No"),
            ("para", "Select Accept or Decline Shoot Assignment", "in_ros"),
            ("diamond", "Did Photographer Accept\nAssigned Shoot?", "rect_para", "Write DB: bookings (Declined)\n& Notify Admin to Reassign (P)", "RETURN_DASH", "Yes", "No"),
            ("db", "Write DB: bookings (Status: Accepted), booking_status_history", None),
            ("para", "Display Shoot Assignment Accepted Screen", None),
            ("handoff", "M", "Proceed to Update Live Production\nMilestone Status"),
        ],
    },

    # ── M: UPDATE LIVE PRODUCTION MILESTONE STATUS (Photographer Dashboard J) ──
    {
        "letter": "M",
        "title": "Update Live Production Milestone Status",
        "role": "Photographer",
        "dash_letter": "J",
        "steps": [
            ("para", "Select Active Booking from Roster", "in_ms"),
            ("db", "Read DB: bookings, booking_status_history", None),
            ("diamond", "Is Booking Assigned to\nThis Photographer?", "para", "Display Unassigned Booking\nAccess Denied Error", "in_ms", "Yes", "No"),
            ("diamond", "Is Booking Status >=\nAccepted?", "para", "Display Must Accept Shoot\nin Roster (L) First Error", "in_ms", "Yes", "No"),
            ("para", "Select Next Stage: Captured -> Editing -> Printing Only", "in_stage"),
            ("diamond", "Is Sequential Transition\nValid (Captured/Editing/Printing)?", "para", "Display Invalid Stage\nTransition Error", "in_stage", "Yes", "No"),
            ("db", "Write DB: bookings (Captured/Editing/Printing), status_history", None),
            ("para", "Display Production Stage Updated Screen", None),
            ("diamond", "Has Booking Reached\nPrinting Stage?", "para", "Display Milestone Saved —\nContinue Production", "RETURN_DASH", "Yes", "No"),
            ("handoff", "N", "Proceed to Upload Retouched\nPhoto Deliverables"),
        ],
    },

    # ── N: UPLOAD RETOUCHED PHOTO DELIVERABLES (Photographer Dashboard J) ──
    {
        "letter": "N",
        "title": "Upload Retouched Photo Deliverables",
        "role": "Photographer",
        "dash_letter": "J",
        "cancel_cleanup": "Keep Uploaded Files & Mark Set Incomplete",
        "steps": [
            ("db", "Read DB: bookings, photo_outputs (Load Required Sets A–D)", None),
            ("para", "Select Set Slot (Set A–D) & Upload File", "in_up"),
            ("rect", "Run Virus / Malware Scan & Check Resolution / Format", None),
            ("diamond", "Did File Pass Virus &\nMalware Security Scan?", "para", "Display Malware / Virus\nScan Failed Error", "in_up", "Yes", "No"),
            ("diamond", "Meets High-Res Format &\nMinimum Resolution?", "para", "Display Low Resolution or\nInvalid Format Error", "in_up", "Yes", "No"),
            ("rect", "Resumable Upload + Generate Watermarked Proof & High-Res", "do_up"),
            ("diamond", "Did Resumable File\nUpload Succeed?", "para", "Display Per-File Upload\nInterrupted — Retrying", "do_up", "Yes", "No"),
            ("db", "Write DB: photo_outputs (Proof + High-Res & Per-File Status)", None),
            ("para", "Display Per-File Upload Status & Set Progress", None),
            ("diamond", "Are All Required Package\nSets Uploaded?", "para", "Display Remaining Required\nPackage Sets Prompt", "in_up", "Yes", "No"),
            ("db", "Write DB: bookings (Status: Uploaded -> Ready), status_history", None),
            ("rect", "Send Automated Order Ready SMS to Customer", "send_sms"),
            ("diamond", "Did Order Ready SMS\nSend Succeed?", "rect_para", "Retry SMS (Up to 3x) or\nWrite DB: sms_logs (Failed)", "RETURN_DASH", "Yes", "No"),
            ("db", "Write DB: sms_logs (Status: Sent), booking_deliveries", None),
            ("para", "Display Deliverables Released & Order Ready SMS Sent", None),
            ("end_return", "J"),
        ],
    },

    # ── P: MANAGE MASTER BOOKING QUEUE & ASSIGNMENTS (Admin Dashboard O) ──
    {
        "letter": "P",
        "title": "Manage Master Booking Queue & Assignments",
        "role": "Admin",
        "dash_letter": "O",
        "steps": [
            ("db", "Read DB: bookings, photographer_availability, photo_outputs", None),
            ("para", "Select Booking & Action (Assign / Status / Cancel / Reschedule)", "in_q"),
            ("diamond", "Is Action Assign or\nReassign (After Decline)?", "para", "Proceed to Status or\nCancel / Reschedule Check", "SKIP_TO:chk_cancel", "Yes", "No"),
            ("para", "Select Photographer for Assignment / Reassignment", "in_asgn"),
            ("diamond", "Is Photographer Available\n(No Slot Conflict)?", "para", "Display Photographer Schedule\nConflict Error", "in_asgn", "Yes", "No"),
            ("db", "Write DB: bookings (Status: Assigned), admin_activity_logs", None),
            ("rect", "Send Assignment Notification to Photographer (L)", None),
            ("para_return", "Display Photographer Assigned Screen"),
            ("diamond", "Is Action Cancel,\nReschedule or Refund?", "para", "Proceed to Milestone\nStatus Update", "SKIP_TO:in_status", "Yes", "No", "chk_cancel", True),
            ("diamond", "Confirm Cancel, Reschedule\nor Refund Action?", "para", "Display Action Aborted —\nKeep Existing Booking", "ONPAGE_TO:in_q", "Yes", "No"),
            ("rect", "Release Reserved Studio Slot & Process Refund / Reschedule", None),
            ("db", "Write DB: bookings (Cancelled / Rescheduled), payments, logs", None),
            ("rect", "Send Cancel / Reschedule SMS & Notification to Customer", None),
            ("para_return", "Display Booking Cancelled / Rescheduled Screen"),
            ("para", "Select Target Status (Captured / Editing / Printing / Ready / Completed)", "in_status", True),
            ("diamond", "If Setting Ready/Completed,\nDo All Uploads Exist (N)?", "para", "Display Cannot Mark Ready\nBefore All Uploads Exist", "in_status", "Yes", "No"),
            ("db", "Write DB: bookings, booking_status_history, admin_activity_logs", None),
            ("rect", "Send Status Update Notification (No Ready SMS Here)", None),
            ("para", "Display Booking Status Updated Screen", None),
            ("end_return", "O"),
        ],
    },

    # ── Q: VERIFY PAYMENTS & RECORD TREASURY LEDGER (Admin Dashboard O) ──
    {
        "letter": "Q",
        "title": "Verify Payments & Record Treasury Ledger",
        "role": "Admin",
        "dash_letter": "O",
        "steps": [
            ("db", "Read DB: payments, bookings", None),
            ("para", "Select Pending Receivable / Cash Receipt & Inspect Proof", "in_insp"),
            ("diamond", "Is Reference Number\nUnique (Not Duplicate)?", "rect_para", "Write DB: payments (Rejected)\n& Send Reject SMS to Client", "in_insp", "Yes", "No"),
            ("diamond", "Are Payment Proof &\nAmount Valid?", "rect_para", "Write DB: payments (Rejected)\n& Send Reject SMS to Client", "in_insp", "Yes", "No"),
            ("diamond", "Does Amount Exceed\n2nd-Approver Threshold?", "para", "Standard Amount (No 2nd\nApprover Required)", "SKIP_TO:recalc_bal", "Yes", "No"),
            ("rect", "Hold Payment – Request 2nd Admin Approval", None),
            ("para", "2nd Admin Reviews Payment Dossier", "in_2nd_rev"),
            ("diamond", "Approved by\n2nd Admin?", "rect_para", "Write DB: payments (Rejected)\n& Send Reject SMS to Client", "ONPAGE_TO:in_insp", "Yes", "No"),
            ("rect", "Recalculate Remaining Booking Balance", "recalc_bal"),
            ("diamond", "Is Remaining Balance >=\n0 (No Overpayment)?", "rect_para", "Record Overpayment Refund\nor Client Credit Balance", "SKIP_TO:w_ver", "Yes", "No"),
            ("db", "Write DB: payments (Verified), bookings (Payment Verified)", "w_ver"),
            ("rect", "Confirm Booking Slot & Send Payment Verified Notice", None),
            ("diamond", "Is Remaining Balance <=\n0 (Fully Settled)?", "para", "Display Downpayment Verified\n& Partial Receipt Screen", "RETURN_DASH", "Yes", "No"),
            ("rect", "Unlock Soft Copy Downloads (H)", None),
            ("para", "Display Official Full Treasury Receipt Screen", None),
            ("end_return", "O"),
        ],
    },

    # ── R: MANAGE SERVICE PACKAGES, TIERS & ADD-ONS (Admin Dashboard O) ──
    {
        "letter": "R",
        "title": "Manage Service Packages, Tiers & Add-Ons",
        "role": "Admin",
        "dash_letter": "O",
        "steps": [
            ("db", "Read DB: service_categories, services, add_ons", None),
            ("para", "Select CRUD Action: Create / Edit / Deactivate / Soft Delete", "in_crud"),
            ("diamond", "Is Action Create or\nEdit Package / Add-On?", "rect_para", "Write DB: Deactivate / Soft-\nDelete (Hide from B & C)", "RETURN_DASH", "Yes", "No"),
            ("para", "Enter Name, Unique Slug, Inclusions, Price & Downpayment", "in_pkg"),
            ("diamond", "Are Name, Unique Slug\n& Inclusions Valid?", "para", "Display Missing Fields or\nDuplicate Slug Error", "in_pkg", "Yes", "No"),
            ("diamond", "Is Downpayment Amount <=\nTotal Package Price?", "para", "Display Downpayment Exceeds\nPackage Price Error", "in_pkg", "Yes", "No"),
            ("rect", "Apply Price Changes to New Bookings Only (Keep Existing)", None),
            ("db", "Write DB: service_categories, services, add_ons, activity_logs", None),
            ("para", "Display Package Catalog Saved & Synced with B & C", None),
            ("end_return", "O"),
        ],
    },

    # ── S: MANAGE CUSTOMER & PHOTOGRAPHER DIRECTORY (Admin Dashboard O) ──
    {
        "letter": "S",
        "title": "Manage Customer & Photographer Directory",
        "role": "Admin",
        "dash_letter": "O",
        "steps": [
            ("db", "Read DB: profiles, photographer_profiles, bookings", None),
            ("para", "Select Action: Create Staff / Edit Role / Deactivate User", "in_dir"),
            ("diamond", "Is Action Create New\nStaff Account?", "rect_para", "Send Staff Invite & Verify OTP\n-> Write DB: profiles & Logs", "RETURN_DASH", "No", "Yes"),
            ("para", "Select Target User & Role Change or Deactivation", "in_usr"),
            ("diamond", "Are Profile Edits &\nRole Assignment Valid?", "para", "Display Invalid Role or\nProfile Format Error", "in_usr", "Yes", "No"),
            ("diamond", "Not Attempting Admin\nSelf-Demotion?", "para", "Display Self-Demotion Not\nPermitted Error", "in_usr", "Yes", "No"),
            ("diamond", "At Least One Active\nAdmin Remains?", "para", "Display Cannot Remove Last\nAdmin Account Error", "in_usr", "Yes", "No"),
            ("diamond", "If Deactivating, Are Active\nShoots Reassigned First?", "rect_para", "Reassign Active Bookings /\nShoots Before Deactivating", "in_usr", "Yes", "No"),
            ("diamond", "Confirm Directory Account\nModification?", "para", "Discard Edits & Return\nto User Selection", "in_usr", "Yes", "No"),
            ("db", "Write DB: profiles, photographer_profiles, admin_activity_logs", None),
            ("rect", "Force-Logout Target User & Revoke Session Tokens", None),
            ("para", "Display Directory Updated & Activity Logged Screen", None),
            ("end_return", "O"),
        ],
    },

    # ── T: UPLOAD & OCR PARSE SCHOOL MASTERLISTS (Admin Dashboard O) ──
    {
        "letter": "T",
        "title": "Upload & OCR Parse School Masterlists",
        "role": "Admin",
        "dash_letter": "O",
        "steps": [
            ("para", "Select School, Section & Upload Masterlist File", "in_file"),
            ("diamond", "Is File Type Valid\n(PDF or DOCX Only)?", "para", "Display Invalid File Type\nError (PDF / DOCX Only)", "in_file", "Yes", "No"),
            ("diamond", "Is File Size Within\nMax Limit (<= 10 MB)?", "para", "Display File Size Exceeds\n10 MB Limit Error", "in_file", "Yes", "No"),
            ("rect", "Execute Automated OCR & Flag Low-Confidence Rows", None),
            ("diamond", "Were Student Rows\nReadable & Extracted?", "para", "Display OCR Parse Failed —\nUpload Clearer Document", "in_file", "Yes", "No"),
            ("db", "Read DB: student_records (Check Duplicate Student IDs)", None),
            ("rect", "Highlight Low-Confidence Cells & Flag Duplicate Students", None),
            ("para", "Display Roster Preview with Low-Confidence & Duplicate Flags", None),
            ("para", "Edit Flagged / Duplicate Rows & Select Confirm Accuracy", "in_edit"),
            ("diamond", "Is Masterlist Accuracy\nConfirmed?", "para", "Display Roster Editor for\nFurther Manual Edits", "in_edit", "Yes", "No"),
            ("db", "Write DB: student_records, admin_activity_logs", None),
            ("para", "Display Masterlist Verified & Saved to Student Records", None),
            ("handoff", "U", "Proceed to Manage Yearbook Projects\n& Print PDF Export"),
        ],
    },

    # ── U: MANAGE YEARBOOK PROJECTS & PRINT PDF EXPORT (Admin Dashboard O) ──
    {
        "letter": "U",
        "title": "Manage Yearbook Projects & Print PDF Export",
        "role": "Admin",
        "dash_letter": "O",
        "cancel_cleanup": "Write DB: Mark or Delete Draft Yearbook Project",
        "steps": [
            ("para", "Select School Roster (From T), Title & Theme", "in_proj"),
            ("db", "Write DB: yearbook_projects (Save Draft Project on Creation)", None),
            ("para", "Upload Batch 2x2 Portraits for Student ID Matching", "in_port"),
            ("diamond", "Are All Student Portraits\nMatched & Linked?", "para", "Display Unlinked Portraits —\nMatch Remaining Students", "in_port", "Yes", "No"),
            ("para", "Review Spreads & Run Preflight Completeness Audit", "in_pref"),
            ("diamond", "Preflight Passed 100%\nor Override Reason Logged?", "para", "Display Audit Warnings — Fix\nSpreads or Enter Override", "in_pref", "Yes", "No"),
            ("rect", "Compile 300 DPI Print PDF & Preview Flipbook", "do_comp"),
            ("diamond", "Did PDF & Flipbook\nCompilation Succeed?", "para", "Display Compilation Failed —\nFix Assets & Re-Compile", "in_pref", "Yes", "No"),
            ("para", "Display Admin Preview & Request School Approval", "in_appr"),
            ("diamond", "Approved by Admin &\nSchool Adviser?", "para", "Display School Revision\nFeedback for Edits", "in_pref", "Yes", "No"),
            ("db", "Write DB: yearbook_projects (Status: Published to Flipbook I)", None),
            ("rect", "Send Published SMS to School Adviser & Batch Graduates", None),
            ("db", "Write DB: sms_logs, admin_activity_logs", None),
            ("para", "Display Yearbook Published & Print PDF Exported Screen", None),
            ("end_return", "O"),
        ],
    },

    # ── V: CONFIGURE STUDIO SETTINGS & CMS BULLETIN (Admin Dashboard O) ──
    {
        "letter": "V",
        "title": "Configure Studio Settings & CMS Bulletin",
        "role": "Admin",
        "dash_letter": "O",
        "steps": [
            ("db", "Read DB: studio_settings, announcements, faqs, bookings", None),
            ("para", "Select Form: (1) Studio Settings, (2) CMS, or (3) SMS Keys", "in_form"),
            ("diamond", "Is Form (3) Masked\nSMS Gateway Keys?", "rect_para", "Re-Auth Admin -> Test SMS ->\nWrite DB: Encrypted SMS Keys", "RETURN_DASH", "No", "Yes"),
            ("diamond", "Is Form (1) Studio\nHours & Payment QRs?", "para", "Proceed to Form (2): CMS\nBulletins, FAQs & Portfolio", "SKIP_TO:in_cms", "Yes", "No"),
            ("para", "Enter Studio Hours & Upload Payment QR Assets (Form 1)", "in_set"),
            ("diamond", "Are Studio Hours &\nQR Assets Valid?", "para", "Display Invalid Hours or\nQR Asset Format Error", "in_set", "Yes", "No"),
            ("diamond", "No Conflict with Existing\nScheduled Bookings?", "para", "Display Existing Booking\nConflict Warning & Confirm", "SKIP_TO:w_set", "Yes", "No"),
            ("db", "Write DB: studio_settings, admin_activity_logs", "w_set"),
            ("para_return", "Display Studio Settings Saved Screen (Form 1 Complete)"),
            ("para", "Enter CMS Bulletins, FAQs or Portfolio Media (Form 2)", "in_cms", True),
            ("diamond", "Are CMS Content &\nMedia Assets Valid?", "para", "Display Invalid CMS Content\nor Media Format Error", "in_cms", "Yes", "No"),
            ("diamond", "Publish CMS Bulletin &\nFAQs Live Now?", "rect_para", "Write DB: announcements, faqs\n(Saved as Draft) & Return", "RETURN_DASH", "Yes", "No"),
            ("db", "Write DB: announcements, faqs, gallery_items (Published)", None),
            ("para", "Display CMS Published & Synced with AI (C) Screen", None),
            ("end_return", "O"),
        ],
    },
]


def build_subprocess_svg(spec):
    width = 860
    cx = 330
    y = 18
    dletter = spec["dash_letter"]
    cancel_cleanup = spec.get("cancel_cleanup")

    # First pass: compute exact step coordinates and step_top_arrow_y map
    step_top_arrow_y = {}
    curr_y = y + 34

    for idx, step in enumerate(spec["steps"]):
        stype = step[0]
        step_id = None
        if stype in ("para", "para_resend", "rect", "db") and len(step) > 2:
            step_id = step[2]
        elif stype == "handoff" and len(step) > 3:
            step_id = step[3]
        elif stype == "diamond" and len(step) > 7:
            step_id = step[7]

        top_arrow_mid_y = curr_y + 13
        if step_id and not isinstance(step_id, bool):
            step_top_arrow_y[step_id] = top_arrow_mid_y

        if stype in ("para", "para_resend", "rect", "para_return"):
            curr_y += 22 + 34
        elif stype == "db":
            curr_y += 22 + 64
        elif stype == "diamond":
            has_branch_db = "DB:" in step[3]
            curr_y += 22 + 48 + (28 if has_branch_db else 0)
        elif stype == "diamond_otp":
            curr_y += 40 + 64
        elif stype == "handoff":
            curr_y += 22 + 36
        elif stype == "end_return":
            curr_y += 28 + 28

    ends_with_handoff = spec["steps"][-1][0] == "handoff"
    if ends_with_handoff:
        curr_y += 38 + 28

    pent_top_y = curr_y - 28
    merge_y = pent_top_y - 14
    height = curr_y + 24

    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="{width}" height="{height}" style="background-color: #ffffff; font-family: Arial, sans-serif;">'
    ]

    # 1. Start with Letter Pentagon Connector (REFERENCE shape: flat top, point down)
    svg.append(draw_down_pentagon(cx, y, 42, 34, spec["letter"], "11.0"))
    y += 34

    return_bus_x = cx + 455 if spec["letter"] == "E" else cx + 422
    return_bus_connected = False
    cancel_bus_x = cx - 236
    cancel_connected = False
    no_down_arrow_next = False
    INNER_TARGETS = {"in_asgn", "in_set", "SKIP_TO:w_set", "do_up", "ONPAGE_TO:gen_link", "SKIP_TO:recalc_bal", "SKIP_TO:in_status"}

    for step in spec["steps"]:
        stype = step[0]
        if stype in ("para", "para_resend"):
            text = step[1]
            step_id = step[2] if len(step) > 2 else None
            no_entry_arrow = (len(step) > 3 and step[3] is True) if stype == "para" else False
            if not no_down_arrow_next and not no_entry_arrow:
                svg.append(draw_arrow(cx, y, cx, y + 22))
            elif no_entry_arrow:
                svg.append(draw_arrow(cx, y + 13, cx, y + 22))
            no_down_arrow_next = False
            y += 22
            svg.append(draw_parallelogram(cx, y, 286, 34, text, "normal", "7.8"))

            if step_id and not isinstance(step_id, bool) and not text.startswith("Display "):
                mid_y = y + 17
                left_edge = cx - 143 + 5
                svg.append(f'<line x1="{left_edge}" y1="{mid_y}" x2="{cancel_bus_x}" y2="{mid_y}" stroke="#000000" stroke-width="1.35"/>')
                svg.append(f'<text x="{left_edge - 24}" y="{mid_y - 4}" font-size="6.8" font-weight="bold" fill="#000000">Cancel</text>')
                cancel_connected = True
                last_cancel_y = mid_y
                if "first_cancel_y" not in locals():
                    first_cancel_y = mid_y

            if stype == "para_resend":
                resend_target = step[3]
                dest_y = step_top_arrow_y.get(resend_target, y - 40)
                mid_y = y + 17
                right_edge = cx + 143 - 5
                res_x = cx + 185
                svg.append(draw_polyline_arrow([
                    (right_edge, mid_y),
                    (res_x, mid_y),
                    (res_x, dest_y),
                    (cx, dest_y),
                ]))
                svg.append(
                    f'<text x="{res_x + 5}" y="{(mid_y + dest_y)/2 + 3}" font-size="6.9" '
                    f'font-weight="bold" text-anchor="start" fill="#000000">Resend OTP (Max 3, 60s)</text>'
                )
            y += 34

        elif stype == "para_return":
            text = step[1]
            svg.append(draw_arrow(cx, y, cx, y + 22))
            y += 22
            svg.append(draw_parallelogram(cx, y, 286, 34, text, "normal", "7.8"))
            mid_y = y + 17
            right_edge = cx + 143 - 5
            svg.append(f'<line x1="{right_edge}" y1="{mid_y}" x2="{return_bus_x}" y2="{mid_y}" stroke="#000000" stroke-width="1.35"/>')
            return_bus_connected = True
            if "first_return_y" not in locals():
                first_return_y = mid_y
            y += 34
            no_down_arrow_next = True

        elif stype == "rect":
            text = step[1]
            if not no_down_arrow_next:
                svg.append(draw_arrow(cx, y, cx, y + 22))
            no_down_arrow_next = False
            y += 22
            svg.append(draw_rect(cx, y, 282, 34, text, "normal", "7.8"))
            y += 34

        elif stype == "db":
            table_text = step[1]
            if not no_down_arrow_next:
                svg.append(draw_arrow(cx, y, cx, y + 22))
            no_down_arrow_next = False
            y += 22
            svg.append(draw_rect(cx, y, 282, 30, table_text, "normal", "7.6"))
            y += 30
            svg.append(draw_arrow(cx, y, cx, y + 14))
            y += 14
            svg.append(draw_circle_conn(cx, y + 10, 10, "1"))
            y += 20

        elif stype == "diamond_otp":
            q_text = step[1]
            retry_target_id = step[2]
            svg.append(draw_arrow(cx, y, cx, y + 40))
            y += 40
            dia_cy = y + 24
            dia_w = 196
            svg.append(draw_diamond(cx, dia_cy, dia_w, 48, q_text, "7.6"))

            right_edge = cx + (dia_w / 2)
            att_cx = cx + 215
            att_w = 148
            svg.append(draw_arrow(right_edge, dia_cy, att_cx - (att_w / 2), dia_cy))
            svg.append(f'<text x="{right_edge + 10}" y="{dia_cy - 5}" font-size="7.5" font-weight="bold">No</text>')
            svg.append(draw_diamond(att_cx, dia_cy, att_w, 40, "Attempts <\nMax Limit (3)?", "7.3"))

            err_box_y = dia_cy - 56
            svg.append(draw_arrow(att_cx, dia_cy - 20, att_cx, err_box_y + 24))
            svg.append(f'<text x="{att_cx + 10}" y="{dia_cy - 22}" font-size="7.1" font-weight="bold">Yes</text>')
            svg.append(draw_parallelogram(att_cx, err_box_y, 156, 24, "Display Invalid OTP Error", "normal", "7.1"))
            dest_y = step_top_arrow_y.get(retry_target_id, dia_cy - 65)
            svg.append(draw_polyline_arrow([
                (att_cx, err_box_y),
                (att_cx, dest_y),
                (cx, dest_y),
            ]))

            lock_cx = att_cx + 158
            svg.append(draw_arrow(att_cx + (att_w / 2), dia_cy, lock_cx - 62, dia_cy))
            svg.append(f'<text x="{att_cx + (att_w / 2) + 6}" y="{dia_cy - 5}" font-size="7.1" font-weight="bold">No</text>')
            svg.append(draw_rect(lock_cx, dia_cy - 15, 124, 30, "Max Attempts Reached:\nTemp Lockout & Abort", "normal", "6.9"))
            svg.append(f'<line x1="{lock_cx + 62}" y1="{dia_cy}" x2="{return_bus_x}" y2="{dia_cy}" stroke="#000000" stroke-width="1.35"/>')
            return_bus_connected = True
            if "first_return_y" not in locals():
                first_return_y = dia_cy

            y += 48
            svg.append(f'<text x="{cx - 10}" y="{y + 12}" font-size="7.6" font-weight="bold" text-anchor="end">Yes</text>')
            svg.append(f'<line x1="{cx}" y1="{y}" x2="{cx}" y2="{y + 16}" stroke="#000000" stroke-width="1.35"/>')
            y += 16

        elif stype == "diamond":
            q_text = step[1]
            no_type = step[2]
            no_text = step[3]
            target_id = step[4]
            down_lbl = step[5] if len(step) > 5 else "Yes"
            right_lbl = step[6] if len(step) > 6 else "No"
            no_entry_arrow = step[8] if len(step) > 8 else False
            has_branch_db = "DB:" in no_text

            if not no_down_arrow_next and not no_entry_arrow:
                svg.append(draw_arrow(cx, y, cx, y + 22))
            elif no_entry_arrow:
                svg.append(draw_arrow(cx, y + 13, cx, y + 22))
            no_down_arrow_next = False
            y += 22
            dia_cy = y + 24
            dia_w = 196
            svg.append(draw_diamond(cx, dia_cy, dia_w, 48, q_text, "7.6"))

            right_edge = cx + (dia_w / 2)
            err_cx = cx + 235
            err_w = 182
            err_h = 26 if has_branch_db else 34
            err_top = (dia_cy - 18) if has_branch_db else (dia_cy - (err_h / 2))

            if no_type == "handoff_E":
                svg.append(draw_arrow(right_edge, dia_cy, err_cx - (err_w / 2), dia_cy))
                svg.append(f'<text x="{right_edge + 12}" y="{dia_cy - 5}" font-size="7.6" font-weight="bold">{right_lbl}</text>')
                svg.append(draw_rect(err_cx, err_top, err_w, err_h, no_text, "bold", "7.3"))
                box_right_e = err_cx + (err_w / 2)
                pent_e_cx = box_right_e + 26
                pent_e_top_y = dia_cy + 4
                svg.append(draw_polyline_arrow([
                    (box_right_e, dia_cy - 7),
                    (pent_e_cx, dia_cy - 7),
                    (pent_e_cx, pent_e_top_y),
                ]))
                svg.append(draw_down_pentagon(pent_e_cx, pent_e_top_y, 28, 25, target_id, "8.8"))
            else:
                left_in = err_cx - (err_w / 2) + (5 if no_type == "para" else 0)
                right_out = err_cx + (err_w / 2) - (5 if no_type == "para" else 0)
                svg.append(draw_arrow(right_edge, dia_cy, left_in, dia_cy))
                svg.append(f'<text x="{right_edge + 12}" y="{dia_cy - 5}" font-size="7.6" font-weight="bold">{right_lbl}</text>')
                if no_type == "para":
                    svg.append(draw_parallelogram(err_cx, err_top, err_w, err_h, no_text, "normal", "7.3"))
                else:
                    svg.append(draw_rect(err_cx, err_top, err_w, err_h, no_text, "normal", "7.1"))

                if has_branch_db:
                    # Inline circle "1" directly after right-branch DB process box (arrow in at top, arrow out at bottom)
                    svg.append(draw_arrow(err_cx, dia_cy + 8, err_cx, dia_cy + 18))
                    svg.append(draw_circle_conn(err_cx, dia_cy + 27, 9, "1"))

                if target_id == "RETURN_DASH":
                    if has_branch_db:
                        out_y = dia_cy + 41
                        svg.append(draw_polyline([
                            (err_cx, dia_cy + 36),
                            (err_cx, out_y),
                            (return_bus_x, out_y),
                        ]))
                    else:
                        out_y = dia_cy
                        svg.append(f'<line x1="{right_out}" y1="{out_y}" x2="{return_bus_x}" y2="{out_y}" stroke="#000000" stroke-width="1.35"/>')
                    return_bus_connected = True
                    if "first_return_y" not in locals():
                        first_return_y = out_y
                else:
                    if str(target_id) == "SKIP_TO:write_pay":
                        ch_x = cx + 440
                    elif str(target_id) == "ONPAGE_TO:in_q":
                        ch_x = cx + 398
                    elif str(target_id) in INNER_TARGETS:
                        ch_x = cx + 354
                    else:
                        ch_x = cx + 374

                    if has_branch_db:
                        out_pts_start = [(err_cx, dia_cy + 36), (err_cx, dia_cy + 41), (ch_x, dia_cy + 41)]
                    else:
                        out_pts_start = [(right_out, dia_cy), (ch_x, dia_cy)]

                    if str(target_id).startswith("SKIP_TO:") or str(target_id).startswith("ONPAGE_TO:"):
                        jump_key = str(target_id).split(":", 1)[1]
                        dest_y = step_top_arrow_y.get(jump_key, dia_cy + 37)
                        svg.append(draw_polyline_arrow(out_pts_start + [
                            (ch_x, dest_y),
                            (cx, dest_y),
                        ]))
                    else:
                        dest_y = step_top_arrow_y.get(target_id, 102)
                        svg.append(draw_polyline_arrow(out_pts_start + [
                            (ch_x, dest_y),
                            (cx, dest_y),
                        ]))

            y += 48
            svg.append(f'<text x="{cx - 10}" y="{y + 12}" font-size="7.6" font-weight="bold" text-anchor="end">{down_lbl}</text>')
            if has_branch_db:
                svg.append(f'<line x1="{cx}" y1="{y}" x2="{cx}" y2="{y + 28}" stroke="#000000" stroke-width="1.35"/>')
                y += 28

        elif stype == "handoff":
            target_letter, route_text = step[1], step[2]
            svg.append(draw_arrow(cx, y, cx, y + 22))
            y += 22
            box_w = 256
            svg.append(draw_rect(cx, y, box_w, 36, route_text, "bold", "7.9"))
            box_right = cx + (box_w / 2)
            pent_cx = box_right + 30
            pent_h_top_y = y + 15
            svg.append(draw_polyline_arrow([
                (box_right, y + 4),
                (pent_cx, y + 4),
                (pent_cx, pent_h_top_y),
            ]))
            svg.append(draw_down_pentagon(pent_cx, pent_h_top_y, 30, 26, target_letter, "9.0"))
            y += 36

        elif stype == "end_return":
            svg.append(draw_arrow(cx, y, cx, pent_top_y))
            svg.append(draw_down_pentagon(cx, pent_top_y, 34, 28, dletter, "9.5"))
            y = pent_top_y + 28

    if ends_with_handoff:
        svg.append(draw_arrow(cx, merge_y, cx, pent_top_y))
        svg.append(draw_down_pentagon(cx, pent_top_y, 34, 28, dletter, "9.5"))

    if return_bus_connected:
        svg.append(draw_polyline_arrow([
            (return_bus_x, first_return_y),
            (return_bus_x, merge_y),
            (cx, merge_y),
        ]))

    if cancel_connected:
        if cancel_cleanup:
            cleanup_txt = f"Cleanup:\n{cancel_cleanup}"
            if "DB:" in cancel_cleanup:
                cleanup_y = merge_y - 72
                svg.append(
                    f'<line x1="{cancel_bus_x}" y1="{first_cancel_y}" x2="{cancel_bus_x}" y2="{cleanup_y}" '
                    f'stroke="#000000" stroke-width="1.35"/>'
                )
                svg.append(draw_arrow(cancel_bus_x, cleanup_y - 6, cancel_bus_x, cleanup_y))
                svg.append(draw_rect(cancel_bus_x, cleanup_y, 166, 28, cleanup_txt, "normal", "6.6"))
                svg.append(draw_arrow(cancel_bus_x, cleanup_y + 28, cancel_bus_x, cleanup_y + 39))
                svg.append(draw_circle_conn(cancel_bus_x, cleanup_y + 48, 9, "1"))
                svg.append(draw_polyline_arrow([
                    (cancel_bus_x, cleanup_y + 57),
                    (cancel_bus_x, merge_y),
                    (cx, merge_y),
                ]))
            else:
                cleanup_y = merge_y - 42
                svg.append(
                    f'<line x1="{cancel_bus_x}" y1="{first_cancel_y}" x2="{cancel_bus_x}" y2="{cleanup_y}" '
                    f'stroke="#000000" stroke-width="1.35"/>'
                )
                svg.append(draw_arrow(cancel_bus_x, cleanup_y - 6, cancel_bus_x, cleanup_y))
                svg.append(draw_rect(cancel_bus_x, cleanup_y, 166, 28, cleanup_txt, "normal", "6.7"))
                svg.append(draw_polyline_arrow([
                    (cancel_bus_x, cleanup_y + 28),
                    (cancel_bus_x, merge_y),
                    (cx, merge_y),
                ]))
        else:
            svg.append(draw_polyline_arrow([
                (cancel_bus_x, first_cancel_y),
                (cancel_bus_x, merge_y),
                (cx, merge_y),
            ]))

    svg.append("</svg>")
    return "\n".join(svg), width, height


# ─────────────────────────────────────────────────────────────────────────────
# HEADLESS CHROME PNG RENDERER
# ─────────────────────────────────────────────────────────────────────────────
def render_svg_to_png(task):
    png_filename, svg_content, width, height = task
    out_png_path = os.path.join(OUT_DIR, png_filename)
    tmp_dir = tempfile.mkdtemp(prefix="ekodak_fc_")
    try:
        html_path = os.path.join(tmp_dir, "render.html")
        user_data_dir = os.path.join(tmp_dir, "profile")
        html_doc = (
            "<!DOCTYPE html><html><head><meta charset='utf-8'>"
            "<style>*{margin:0;padding:0;box-sizing:border-box;}html,body{background:#ffffff;overflow:hidden;}</style>"
            f"</head><body>{svg_content}</body></html>"
        )
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_doc)

        cmd = [
            CHROME_PATH,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--no-first-run",
            "--no-default-browser-check",
            f"--user-data-dir={user_data_dir}",
            "--force-device-scale-factor=2",
            f"--window-size={width},{height}",
            f"--screenshot={out_png_path}",
            html_path,
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return png_filename
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    tasks = []

    master_svg, mw, mh = build_master_flowchart_svg()
    tasks.append(("flowchart-master.png", master_svg, mw, mh))

    for role in ROLES_CONFIG:
        role_svg, rw, rh = build_role_flowchart_svg(role)
        tasks.append((f"flowchart-role-{role['key']}.png", role_svg, rw, rh))

    for spec in SUBPROCESS_SPECS:
        sub_svg, sw, sh = build_subprocess_svg(spec)
        tasks.append((f"flowchart-{spec['letter']}.png", sub_svg, sw, sh))

    expected_files = {t[0] for t in tasks}
    for fname in os.listdir(OUT_DIR):
        if fname not in expected_files:
            os.remove(os.path.join(OUT_DIR, fname))

    print(f"Rendering {len(tasks)} PNG flowcharts via Headless Chrome...")
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = [pool.submit(render_svg_to_png, t) for t in tasks]
        for fut in as_completed(futures):
            print("  -> Generated:", fut.result())

    print(f"All {len(tasks)} PNG flowcharts generated successfully.")


if __name__ == "__main__":
    main()
