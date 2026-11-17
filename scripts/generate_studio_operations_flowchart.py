import os
import shutil
import subprocess
import xml.sax.saxutils as saxutils

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUTPUT_DIR = r"d:\E-kodak Final\docs\figures"
PNG_FILE = os.path.join(OUTPUT_DIR, "studio-operations-flowchart.png")


def escape(text):
    return saxutils.escape(str(text))


def generate_exact_flowchart_svg():
    width = 1060
    height = 1280

    svg = []
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" style="background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif;">')

    # Defs: crisp black arrowheads
    svg.append('''
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 Z" fill="#000000" />
    </marker>
  </defs>
''')

    # Drawing helper functions (Strict Black & White, Clean Box Styling)
    def draw_oval(cx, cy, rx, ry, text):
        return f'''
    <ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#ffffff" stroke="#000000" stroke-width="1.6"/>
    <text x="{cx}" y="{cy + 4.5}" font-size="13.5" font-weight="normal" text-anchor="middle" fill="#000000">{escape(text)}</text>'''

    def draw_titled_box(cx, y, w, h, title, subtext, divider_w=None):
        x = cx - (w / 2)
        if divider_w is None:
            divider_w = w * 0.75
        div_x1 = cx - (divider_w / 2)
        div_x2 = cx + (divider_w / 2)
        div_y = y + 33
        return f'''
    <rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#ffffff" stroke="#000000" stroke-width="1.6"/>
    <text x="{cx}" y="{y + 24}" font-size="13.5" font-weight="bold" text-anchor="middle" fill="#000000">{escape(title)}</text>
    <line x1="{div_x1}" y1="{div_y}" x2="{div_x2}" y2="{div_y}" stroke="#000000" stroke-width="1.2"/>
    <text x="{cx}" y="{y + 54}" font-size="12" font-weight="normal" text-anchor="middle" fill="#000000">{escape(subtext)}</text>'''

    def draw_rect(cx, y, w, h, text):
        x = cx - (w / 2)
        return f'''
    <rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#ffffff" stroke="#000000" stroke-width="1.6"/>
    <text x="{cx}" y="{y + (h / 2) + 4.5}" font-size="12.5" font-weight="normal" text-anchor="middle" fill="#000000">{escape(text)}</text>'''

    def draw_parallelogram(cx, y, w, h, text, offset=18):
        x = cx - (w / 2)
        pts = f"{x + offset},{y} {x + w},{y} {x + w - offset},{y + h} {x},{y + h}"
        return f'''
    <polygon points="{pts}" fill="#ffffff" stroke="#000000" stroke-width="1.6"/>
    <text x="{cx}" y="{y + (h / 2) + 4.5}" font-size="12.5" font-weight="normal" text-anchor="middle" fill="#000000">{escape(text)}</text>'''

    def draw_diamond(cx, cy, w, h, lines):
        x = cx - (w / 2)
        y = cy - (h / 2)
        pts = f"{cx},{y} {x + w},{cy} {cx},{y + h} {x},{cy}"
        if len(lines) == 1:
            t_content = f'<text x="{cx}" y="{cy + 4.5}" font-size="12.5" font-weight="normal" text-anchor="middle" fill="#000000">{escape(lines[0])}</text>'
        else:
            t_content = (
                f'<text x="{cx}" y="{cy - 4}" font-size="12.5" font-weight="normal" text-anchor="middle" fill="#000000">{escape(lines[0])}</text>'
                f'<text x="{cx}" y="{cy + 13}" font-size="12.5" font-weight="normal" text-anchor="middle" fill="#000000">{escape(lines[1])}</text>'
            )
        return f'''
    <polygon points="{pts}" fill="#ffffff" stroke="#000000" stroke-width="1.6"/>
    {t_content}'''

    def draw_v_arrow(x, y1, y2):
        return f'<line x1="{x}" y1="{y1}" x2="{x}" y2="{y2}" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>'

    def draw_h_arrow(x1, y, x2):
        return f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>'

    # Coordinate Channels
    left_cx = 190
    center_cx = 530
    right_cx = 870

    # 1. Start (Oval)
    start_cy = 45
    svg.append(draw_oval(left_cx, start_cy, 60, 26, "Start"))

    # Arrow down to Client Acquisition
    svg.append(draw_v_arrow(left_cx, start_cy + 26, 98))

    # 2. Client Acquisition (Titled Box)
    acq_y = 100
    svg.append(draw_titled_box(left_cx, acq_y, 260, 75, "Client Acquisition", "Visit School/Online or Walk Inquiry", divider_w=185))

    # Arrow right to Offer Services and Packages
    offer_x_left = center_cx - 150  # 380
    acq_x_right = left_cx + 130     # 320
    svg.append(draw_h_arrow(acq_x_right, acq_y + 37.5, offer_x_left - 2))

    # 3. Offer Services and Packages (Titled Box)
    svg.append(draw_titled_box(center_cx, acq_y, 300, 75, "Offer Services and Packages", "Pictorial packages, ID slings, Lanyards, etc.", divider_w=230))

    # Arrow down to Distribute Order Form...
    dist_y = 205
    svg.append(draw_v_arrow(center_cx, acq_y + 75, dist_y - 2))

    # 4. Distribute Order Form/ Recieve Order Request (Parallelogram)
    svg.append(draw_parallelogram(center_cx, dist_y, 330, 52, "Distribute Order Form/ Recieve Order Request", offset=18))

    # Arrow down to Client Selects Package / Services
    sel_y = 285
    svg.append(draw_v_arrow(center_cx, dist_y + 52, sel_y - 2))

    # 5. Client Selects Package / Services (Parallelogram)
    svg.append(draw_parallelogram(center_cx, sel_y, 310, 52, "Client Selects Package / Services", offset=18))

    # Arrow down to Record Order Details & Take Down Payment
    rec_y = 365
    svg.append(draw_v_arrow(center_cx, sel_y + 52, rec_y - 2))

    # 6. Record Order Details & Take Down Payment (Rectangle)
    svg.append(draw_rect(center_cx, rec_y, 320, 52, "Record Order Details & Take Down Payment"))

    # Arrow down to Issue Reciept and Verify Order
    iss_y = 445
    svg.append(draw_v_arrow(center_cx, rec_y + 52, iss_y - 2))

    # 7. Issue Reciept and Verify Order (Rectangle)
    svg.append(draw_rect(center_cx, iss_y, 320, 52, "Issue Reciept and Verify Order"))

    # Arrow down to Types of Services?
    d1_cy = 585
    d1_h = 110
    d1_w = 160
    svg.append(draw_v_arrow(center_cx, iss_y + 52, d1_cy - (d1_h / 2) - 2))

    # 8. Types of Services? (Diamond)
    svg.append(draw_diamond(center_cx, d1_cy, d1_w, d1_h, ["Types of Services?"]))

    # Arrow left to Pictorial Sessions
    pic_x_right = left_cx + 130 # 320
    d1_x_left = center_cx - (d1_w / 2) # 450
    svg.append(draw_h_arrow(d1_x_left, d1_cy, pic_x_right + 2))

    # Pictorial Sessions (Titled Box)
    svg.append(draw_titled_box(left_cx, d1_cy - 37.5, 260, 75, "Pictorial Sessions", "Capture Photos", divider_w=170))

    # Arrow right to Printing Production
    d1_x_right = center_cx + (d1_w / 2) # 610
    print_x_left = right_cx - 130 # 740
    svg.append(draw_h_arrow(d1_x_right, d1_cy, print_x_left - 2))

    # Printing Production (Titled Box)
    svg.append(draw_titled_box(right_cx, d1_cy - 37.5, 260, 75, "Printing Production", "Print, Heat press, etc.", divider_w=170))

    # Arrow down from Types of Services? to Editing and Processing
    edit_y = 695
    svg.append(draw_v_arrow(center_cx, d1_cy + (d1_h / 2), edit_y - 2))

    # 9. Editing and Processing (Rectangle)
    svg.append(draw_rect(center_cx, edit_y, 320, 52, "Editing and Processing"))

    # Arrow down to Printing Framing and Quality Check
    frame_y = 775
    svg.append(draw_v_arrow(center_cx, edit_y + 52, frame_y - 2))

    # 10. Printing Framing and Quality Check (Rectangle)
    svg.append(draw_rect(center_cx, frame_y, 320, 52, "Printing Framing and Quality Check"))

    # Arrow down to Notify Client for Completion
    notif_y = 855
    svg.append(draw_v_arrow(center_cx, frame_y + 52, notif_y - 2))

    # 11. Notify Client for Completion (Parallelogram)
    svg.append(draw_parallelogram(center_cx, notif_y, 320, 52, "Notify Client for Completion", offset=18))

    # Arrow down to Full payment received?
    d2_cy = 995
    d2_h = 130
    d2_w = 160
    svg.append(draw_v_arrow(center_cx, notif_y + 52, d2_cy - (d2_h / 2) - 2))

    # 12. Full payment received? (Diamond)
    svg.append(draw_diamond(center_cx, d2_cy, d2_w, d2_h, ["Full payment", "received?"]))

    # Branch Left: -NO->
    d2_x_left = center_cx - (d2_w / 2) # 450
    hold_x_right = left_cx + 120 # 310
    # Line with text label NO
    mid_no_x = (d2_x_left + hold_x_right) / 2
    svg.append(f'''
    <line x1="{d2_x_left}" y1="{d2_cy}" x2="{hold_x_right + 2}" y2="{d2_cy}" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
    <rect x="{mid_no_x - 14}" y="{d2_cy - 10}" width="28" height="20" fill="#ffffff"/>
    <text x="{mid_no_x}" y="{d2_cy + 4.5}" font-size="12" font-weight="normal" text-anchor="middle" fill="#000000">NO</text>''')

    # Hold Release (Parallelogram)
    svg.append(draw_parallelogram(left_cx, d2_cy - 26, 240, 52, "Hold Release", offset=16))

    # Arrow down to Send Payment Reminder
    remind_y = 1080
    svg.append(draw_v_arrow(left_cx, d2_cy + 26, remind_y - 2))

    # Send Payment Reminder (Rectangle)
    svg.append(draw_rect(left_cx, remind_y, 240, 52, "Send Payment Reminder"))

    # Branch Right: -YES->
    d2_x_right = center_cx + (d2_w / 2) # 610
    rel_x_left = right_cx - 130 # 740
    mid_yes_x = (d2_x_right + rel_x_left) / 2
    svg.append(f'''
    <line x1="{d2_x_right}" y1="{d2_cy}" x2="{rel_x_left - 2}" y2="{d2_cy}" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
    <rect x="{mid_yes_x - 16}" y="{d2_cy - 10}" width="32" height="20" fill="#ffffff"/>
    <text x="{mid_yes_x}" y="{d2_cy + 4.5}" font-size="12" font-weight="normal" text-anchor="middle" fill="#000000">YES</text>''')

    # Release Products and Photos (Parallelogram)
    svg.append(draw_parallelogram(right_cx, d2_cy - 26, 260, 52, "Release Products and Photos", offset=16))

    # Arrow down to Delivery or Client Pickup
    deliv_y = 1080
    svg.append(draw_v_arrow(right_cx, d2_cy + 26, deliv_y - 2))

    # Delivery or Client Pickup (Rectangle)
    svg.append(draw_rect(right_cx, deliv_y, 260, 52, "Delivery or Client Pickup"))

    # Arrow down to End
    end_cy = 1195
    svg.append(draw_v_arrow(right_cx, deliv_y + 52, end_cy - 26 - 2))

    # End (Oval)
    svg.append(draw_oval(right_cx, end_cy, 60, 26, "End"))

    svg.append('</svg>')
    return "\n".join(svg), width, height


def render_to_png(svg_content, width, height):
    tmp_dir = os.path.join(OUTPUT_DIR, "_tmp_exact")
    os.makedirs(tmp_dir, exist_ok=True)
    html_path = os.path.join(tmp_dir, "render.html")
    profile_dir = os.path.join(tmp_dir, "profile")

    html_content = f'''<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    html, body {{
      margin: 0;
      padding: 0;
      width: {width}px;
      height: {height}px;
      overflow: hidden;
      background: #ffffff;
    }}
    svg {{
      position: absolute;
      top: 0;
      left: 0;
      width: {width}px;
      height: {height}px;
      display: block;
    }}
  </style>
</head>
<body>
  {svg_content}
</body>
</html>'''

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        f"--user-data-dir={profile_dir}",
        "--force-device-scale-factor=2",
        f"--window-size={width},{height}",
        f"--screenshot={PNG_FILE}",
        html_path
    ]

    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"[OK] Rendered exact clean PNG: {PNG_FILE}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def main():
    svg_content, w, h = generate_exact_flowchart_svg()
    render_to_png(svg_content, w, h)


if __name__ == "__main__":
    main()
