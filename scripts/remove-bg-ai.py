import sys
from rembg import remove
from PIL import Image

if len(sys.argv) < 3:
    print("Usage: python remove-bg-ai.py <input_path> <output_path>")
    sys.exit(1)

input_path = sys.argv[1]
output_path = sys.argv[2]

print(f"Loading image from {input_path}...")
try:
    input_img = Image.open(input_path)
    print("Removing background with AI...")
    output_img = remove(input_img)
    output_img.save(output_path)
    print(f"Background perfectly removed with AI and saved to {output_path}!")
except Exception as e:
    print(f"Error: {e}")
