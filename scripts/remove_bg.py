import sys
import os
from rembg import remove
from PIL import Image

def remove_background(input_path, output_path):
    print(f"Processing {input_path}...")
    try:
        input_image = Image.open(input_path)
        output_image = remove(input_image)
        output_image.save(output_path, "PNG")
        print(f"Successfully saved to {output_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    input_file = "public/supercar-ferrari-shining.jpg"
    output_file = "public/supercar-ferrari-shining-nobg.png"
    remove_background(input_file, output_file)
