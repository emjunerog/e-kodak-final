import os
import shutil
import subprocess
import xml.sax.saxutils as saxutils

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUTPUT_DIR = r"d:\E-kodak Final\docs\figures"
PNG_FILE = os.path.join(OUTPUT_DIR, "organizational-chart.png")


def escape(text):
    return saxutils.escape(str(text))


def generate_org_chart_svg():
    width = 980
    height = 500

    svg = []
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" style="background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif;">')

    def draw_box(cx, y, w, h, title, subtext, divider_w=140):
        x = cx - (w / 2)
        div_x1 = cx - (divider_w / 2)
        div_x2 = cx + (divider_w / 2)
        div_y = y + (h * 0.44)
        return f'''
    <rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#ffffff" stroke="#000000" stroke-width="1.6"/>
    <text x="{cx}" y="{y + (h * 0.33)}" font-size="14" font-weight="bold" text-anchor="middle" fill="#000000">{escape(title)}</text>
    <line x1="{div_x1}" y1="{div_y}" x2="{div_x2}" y2="{div_y}" stroke="#000000" stroke-width="1.2"/>
    <text x="{cx}" y="{y + (h * 0.74)}" font-size="10.5" font-weight="500" text-anchor="middle" fill="#000000" letter-spacing="0.5">{escape(subtext)}</text>'''

    def draw_box_2line_title(cx, y, w, h, title_line1, title_line2, subtext, divider_w=160):
        x = cx - (w / 2)
        div_x1 = cx - (divider_w / 2)
        div_x2 = cx + (divider_w / 2)
        div_y = y + (h * 0.54)
        return f'''
    <rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#ffffff" stroke="#000000" stroke-width="1.6"/>
    <text x="{cx}" y="{y + 22}" font-size="13" font-weight="bold" text-anchor="middle" fill="#000000">{escape(title_line1)}</text>
    <text x="{cx}" y="{y + 39}" font-size="13" font-weight="bold" text-anchor="middle" fill="#000000">{escape(title_line2)}</text>
    <line x1="{div_x1}" y1="{div_y}" x2="{div_x2}" y2="{div_y}" stroke="#000000" stroke-width="1.2"/>
    <text x="{cx}" y="{y + 68}" font-size="10.5" font-weight="500" text-anchor="middle" fill="#000000" letter-spacing="0.5">{escape(subtext)}</text>'''

    # Grid columns
    col_left = 180
    col_center = 490
    col_right = 800

    box_w = 230
    box_h = 74

    # Row coordinates
    row1_y = 35
    row2_y = 180
    row3_y = 335

    # 1. Manager (Top Center)
    svg.append(draw_box(col_center, row1_y, box_w, box_h, "Manager", "OVERALL HEAD", divider_w=95))

    # 2. OJT Trainer (Middle Center)
    svg.append(draw_box(col_center, row2_y, box_w, box_h, "OJT Trainer", "STAFF AND DEVELOPMENT", divider_w=125))

    # 3. Client Manager (Middle Left)
    svg.append(draw_box(col_left, row2_y, box_w, box_h, "Client Manager", "ACCOUNT MANAGEMENT", divider_w=120))

    # 4. Hiring Staff (Bottom Left)
    svg.append(draw_box(col_left, row3_y, box_w, box_h, "Hiring Staff", "TALENT ACQUISITION", divider_w=105))

    # 5. Editor and Photographer (Middle Right)
    svg.append(draw_box(col_right, row2_y, box_w, box_h, "Editor and Photographer", "CREATIVE AND PRODUCTION", divider_w=155))

    # 6. Photo Delivery and Maintenance Operations (Bottom Right)
    delivery_h = 82
    svg.append(draw_box_2line_title(col_right, row3_y, box_w, delivery_h, "Photo Delivery and", "Maintenance Operations", "ACCOUNT MANAGEMENT", divider_w=155))

    # Connecting Lines (Plain solid lines, 1.5px stroke, matching organizational hierarchy standard)
    # Line 1: Manager -> OJT Trainer
    svg.append(f'<line x1="{col_center}" y1="{row1_y + box_h}" x2="{col_center}" y2="{row2_y}" stroke="#000000" stroke-width="1.5"/>')

    # Line 2: Client Manager -> OJT Trainer
    cm_right = col_left + (box_w / 2)
    ojt_left = col_center - (box_w / 2)
    mid_y = row2_y + (box_h / 2)
    svg.append(f'<line x1="{cm_right}" y1="{mid_y}" x2="{ojt_left}" y2="{mid_y}" stroke="#000000" stroke-width="1.5"/>')

    # Line 3: OJT Trainer -> Editor and Photographer
    ojt_right = col_center + (box_w / 2)
    ep_left = col_right - (box_w / 2)
    svg.append(f'<line x1="{ojt_right}" y1="{mid_y}" x2="{ep_left}" y2="{mid_y}" stroke="#000000" stroke-width="1.5"/>')

    # Line 4: Client Manager -> Hiring Staff
    svg.append(f'<line x1="{col_left}" y1="{row2_y + box_h}" x2="{col_left}" y2="{row3_y}" stroke="#000000" stroke-width="1.5"/>')

    # Line 5: Editor and Photographer -> Photo Delivery and Maintenance Operations
    svg.append(f'<line x1="{col_right}" y1="{row2_y + box_h}" x2="{col_right}" y2="{row3_y}" stroke="#000000" stroke-width="1.5"/>')

    # Line 6: OJT Trainer -> Photo Delivery and Maintenance Operations (Down from bottom of OJT Trainer, then right into left side of Photo Delivery)
    cross_y = row3_y + (delivery_h / 2)
    delivery_left = col_right - (box_w / 2)
    svg.append(f'''
    <polyline points="{col_center},{row2_y + box_h} {col_center},{cross_y} {delivery_left},{cross_y}" fill="none" stroke="#000000" stroke-width="1.5"/>''')

    # Caption: Figure 1
    svg.append(f'''
    <text x="{col_center}" y="{cross_y + 48}" font-size="15" font-weight="normal" text-anchor="middle" fill="#000000">Figure 1</text>''')

    svg.append('</svg>')
    return "\n".join(svg), width, height


def render_to_png(svg_content, width, height):
    tmp_dir = os.path.join(OUTPUT_DIR, "_tmp_org")
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
        print(f"[OK] Rendered clean PNG: {PNG_FILE}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def main():
    svg_content, w, h = generate_org_chart_svg()
    render_to_png(svg_content, w, h)


if __name__ == "__main__":
    main()

