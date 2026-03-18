import os
from PIL import Image

# Path to the logos
logo_dir = r"c:\Users\400041460038\Desktop\code main\airank0307-main (1)\extracted_logos"
output_path = os.path.join(logo_dir, "combined_logos.png")

# List and sort images
images = [f for f in os.listdir(logo_dir) if f.endswith(".png") and not f.startswith("combined")]
images.sort()

# Settings
THUMB_SIZE = 128
COLS = 5
ROWS = 4 # (20 / 5 = 4)
BG_COLOR = (255, 255, 255) # White background

# Create new image
combined_img = Image.new("RGBA", (COLS * THUMB_SIZE, ROWS * THUMB_SIZE), (0,0,0,0))

# Paste images
for idx, filename in enumerate(images):
    img_path = os.path.join(logo_dir, filename)
    with Image.open(img_path) as img:
        # Resize maintaining aspect ratio but fitting in THUMB_SIZE
        img.thumbnail((THUMB_SIZE - 20, THUMB_SIZE - 20), Image.Resampling.LANCZOS)
        
        # Calculate position for top-left (center in cell)
        row = idx // COLS
        col = idx % COLS
        x = col * THUMB_SIZE + (THUMB_SIZE - img.width) // 2
        y = row * THUMB_SIZE + (THUMB_SIZE - img.height) // 2
        
        combined_img.paste(img, (x, y))

# Save
combined_img.save(output_path)
print(f"Combined image saved to: {output_path}")
