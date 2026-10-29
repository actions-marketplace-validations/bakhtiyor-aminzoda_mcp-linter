import math
from PIL import Image, ImageDraw, ImageFont

W, H = 780, 440
img = Image.new("RGBA", (W, H), (13, 17, 23, 255))
draw = ImageDraw.Draw(img)

# Background subtle grid and gradient glow
for y in range(H):
    # subtle gradient from top-left (15, 23, 42) to bottom-right (9, 13, 20)
    ratio = y / H
    r = int(14 + (8 - 14) * ratio)
    g = int(22 + (12 - 22) * ratio)
    b = int(36 + (20 - 36) * ratio)
    draw.line([(0, y), (W, y)], fill=(r, g, b, 255))

# Subtle grid lines
grid_color = (255, 255, 255, 8)
for x in range(0, W, 40):
    draw.line([(x, 0), (x, H)], fill=grid_color)
for y in range(0, H, 40):
    draw.line([(0, y), (W, y)], fill=grid_color)

# Glowing circles in the background
# Top-left cyan glow
# Bottom-right coral/orange glow (Claude color)
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gdraw = ImageDraw.Draw(glow)

for radius in range(220, 10, -5):
    alpha = int(22 * (1 - radius / 220))
    gdraw.ellipse([(-50 - radius, -50 - radius), (-50 + radius, -50 + radius)], fill=(56, 189, 248, alpha))
    gdraw.ellipse([(W - 100 - radius, H - 50 - radius), (W - 100 + radius, H - 50 + radius)], fill=(217, 119, 87, alpha))

img = Image.alpha_composite(img, glow)
draw = ImageDraw.Draw(img)

# Load fonts
try:
    font_title = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 46)
    font_subtitle = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 19)
    font_tag = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 15)
    font_cmd = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 17)
    font_badge = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 15)
except Exception:
    font_title = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 46)
    font_subtitle = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 19)
    font_tag = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 15)
    font_cmd = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 17)
    font_badge = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 15)

# Stethoscope / Security badge pill at top left
pill_x, pill_y = 50, 48
pill_w, pill_h = 240, 32
draw.rounded_rectangle([pill_x, pill_y, pill_x + pill_w, pill_y + pill_h], radius=16, fill=(30, 41, 59, 230), outline=(56, 189, 248, 120), width=1)
draw.text((pill_x + 18, pill_y + 7), "MODEL CONTEXT PROTOCOL", font=font_tag, fill=(56, 189, 248, 255))

# Title: mcp-linter
draw.text((50, 96), "mcp-linter", font=font_title, fill=(248, 250, 252, 255))

# Subtitle
draw.text((50, 160), "Zero-dependency security auditor & protocol linter for AI agents", font=font_subtitle, fill=(148, 163, 184, 255))

# Feature cards row
cards = [
    ("🛡️  34 Rules", "Protocol & Safety", (30, 41, 59)),
    ("✨  Autofix", "--fix JSON patches", (30, 41, 59)),
    ("📊  Health Score", "Grade A+ to F (0-100)", (30, 41, 59)),
    ("🚀  Zero Deps", "Pure Node.js stdlib", (30, 41, 59)),
]

card_y = 210
card_h = 76
card_w = 155
spacing = 16

for i, (head, sub, bg) in enumerate(cards):
    cx = 50 + i * (card_w + spacing)
    # card container
    draw.rounded_rectangle([cx, card_y, cx + card_w, card_y + card_h], radius=10, fill=(22, 27, 34, 240), outline=(51, 65, 85, 180), width=1)
    draw.text((cx + 14, card_y + 14), head, font=font_badge, fill=(226, 232, 240, 255))
    draw.text((cx + 14, card_y + 42), sub, font=ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 13), fill=(148, 163, 184, 255))

# Terminal command box at bottom
cmd_box_x = 50
cmd_box_y = 315
cmd_box_w = 680
cmd_box_h = 58
draw.rounded_rectangle([cmd_box_x, cmd_box_y, cmd_box_x + cmd_box_w, cmd_box_y + cmd_box_h], radius=12, fill=(15, 23, 42, 240), outline=(56, 189, 248, 90), width=1)

# Terminal traffic lights
draw.ellipse([cmd_box_x + 18, cmd_box_y + 24, cmd_box_x + 28, cmd_box_y + 34], fill=(239, 68, 68, 220))
draw.ellipse([cmd_box_x + 36, cmd_box_y + 24, cmd_box_x + 46, cmd_box_y + 34], fill=(245, 158, 11, 220))
draw.ellipse([cmd_box_x + 54, cmd_box_y + 24, cmd_box_x + 64, cmd_box_y + 34], fill=(34, 197, 94, 220))

# Prompt symbol & command
draw.text((cmd_box_x + 85, cmd_box_y + 19), "$", font=font_cmd, fill=(56, 189, 248, 255))
draw.text((cmd_box_x + 105, cmd_box_y + 19), "npx mcp-linter -- <your-mcp-server>", font=font_cmd, fill=(241, 245, 249, 255))

# Right tag in command box
tag_text = "npm v1.0.0"
draw.rounded_rectangle([cmd_box_x + cmd_box_w - 110, cmd_box_y + 14, cmd_box_x + cmd_box_w - 18, cmd_box_y + cmd_box_h - 14], radius=6, fill=(30, 41, 59, 200))
draw.text((cmd_box_x + cmd_box_w - 100, cmd_box_y + 20), tag_text, font=ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 13), fill=(52, 211, 153, 255))

# Save
output_path = "c:/projects/claude-gpt/habr_cover.png"
img.convert("RGB").save(output_path, "PNG", quality=95)
print(f"Cover generated: {output_path}")
