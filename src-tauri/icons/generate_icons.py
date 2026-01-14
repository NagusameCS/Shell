#!/usr/bin/env python3
"""
Generate Tauri icons from favicon.svg

Requirements:
  pip install cairosvg pillow

Usage:
  python generate_icons.py
"""

import os
import sys

try:
    import cairosvg
    from PIL import Image
    import io
except ImportError:
    print("Installing required packages...")
    os.system("pip install cairosvg pillow")
    import cairosvg
    from PIL import Image
    import io

# Get the directory of this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SVG_PATH = os.path.join(SCRIPT_DIR, "..", "..", "public", "favicon.svg")

def svg_to_png(svg_path, png_path, size):
    """Convert SVG to PNG at specified size"""
    cairosvg.svg2png(
        url=svg_path,
        write_to=png_path,
        output_width=size,
        output_height=size
    )
    print(f"Created: {png_path} ({size}x{size})")

def create_icns(png_paths, icns_path):
    """Create macOS ICNS file from PNGs using iconutil or sips"""
    import subprocess
    import tempfile
    import shutil
    
    # Create iconset directory
    iconset_dir = tempfile.mkdtemp(suffix=".iconset")
    
    try:
        # Required icon sizes for ICNS
        sizes = {
            16: "icon_16x16.png",
            32: "icon_16x16@2x.png",
            32: "icon_32x32.png",
            64: "icon_32x32@2x.png",
            128: "icon_128x128.png",
            256: "icon_128x128@2x.png",
            256: "icon_256x256.png",
            512: "icon_256x256@2x.png",
            512: "icon_512x512.png",
            1024: "icon_512x512@2x.png",
        }
        
        # Generate all required sizes
        for size, name in [(16, "icon_16x16.png"), (32, "icon_16x16@2x.png"),
                           (32, "icon_32x32.png"), (64, "icon_32x32@2x.png"),
                           (128, "icon_128x128.png"), (256, "icon_128x128@2x.png"),
                           (256, "icon_256x256.png"), (512, "icon_256x256@2x.png"),
                           (512, "icon_512x512.png"), (1024, "icon_512x512@2x.png")]:
            out_path = os.path.join(iconset_dir, name)
            cairosvg.svg2png(url=SVG_PATH, write_to=out_path, 
                           output_width=size, output_height=size)
        
        # Run iconutil to create ICNS
        result = subprocess.run(
            ["iconutil", "-c", "icns", iconset_dir, "-o", icns_path],
            capture_output=True, text=True
        )
        
        if result.returncode == 0:
            print(f"Created: {icns_path}")
        else:
            print(f"iconutil failed: {result.stderr}")
            # Fallback: just copy the 256x256 PNG
            shutil.copy(png_paths.get(256, png_paths.get(128)), icns_path)
    finally:
        shutil.rmtree(iconset_dir, ignore_errors=True)

def create_ico(png_data_list, ico_path):
    """Create Windows ICO file from multiple PNG sizes"""
    # ICO file format
    # Header: 6 bytes
    # Directory entries: 16 bytes each
    # Image data
    
    num_images = len(png_data_list)
    
    # Calculate offsets
    header_size = 6
    directory_size = 16 * num_images
    data_offset = header_size + directory_size
    
    ico_data = bytearray()
    
    # ICO header
    ico_data.extend(b'\x00\x00')  # Reserved
    ico_data.extend(b'\x01\x00')  # Type: 1 = ICO
    ico_data.extend(num_images.to_bytes(2, 'little'))
    
    # Directory entries
    current_offset = data_offset
    directory_entries = []
    
    for png_bytes, size in png_data_list:
        entry = bytearray()
        # Width (0 means 256)
        entry.append(size if size < 256 else 0)
        # Height (0 means 256)
        entry.append(size if size < 256 else 0)
        entry.append(0)  # Color palette (0 for no palette)
        entry.append(0)  # Reserved
        entry.extend(b'\x01\x00')  # Color planes
        entry.extend(b'\x20\x00')  # Bits per pixel (32)
        entry.extend(len(png_bytes).to_bytes(4, 'little'))  # Size of image data
        entry.extend(current_offset.to_bytes(4, 'little'))  # Offset to image data
        
        directory_entries.append(entry)
        current_offset += len(png_bytes)
    
    for entry in directory_entries:
        ico_data.extend(entry)
    
    # Image data
    for png_bytes, size in png_data_list:
        ico_data.extend(png_bytes)
    
    with open(ico_path, 'wb') as f:
        f.write(ico_data)
    
    print(f"Created: {ico_path}")

def main():
    if not os.path.exists(SVG_PATH):
        print(f"Error: SVG not found at {SVG_PATH}")
        sys.exit(1)
    
    print(f"Converting: {SVG_PATH}")
    print("-" * 40)
    
    # Generate PNG icons
    sizes = [(32, "32x32.png"), (128, "128x128.png"), (256, "128x128@2x.png")]
    png_paths = {}
    
    for size, name in sizes:
        out_path = os.path.join(SCRIPT_DIR, name)
        svg_to_png(SVG_PATH, out_path, size)
        png_paths[size] = out_path
    
    # Generate ICO for Windows
    print("-" * 40)
    ico_sizes = [16, 32, 48, 64, 128, 256]
    png_data_list = []
    
    for size in ico_sizes:
        png_bytes = cairosvg.svg2png(
            url=SVG_PATH,
            output_width=size,
            output_height=size
        )
        png_data_list.append((png_bytes, size))
    
    ico_path = os.path.join(SCRIPT_DIR, "icon.ico")
    create_ico(png_data_list, ico_path)
    
    # Generate ICNS for macOS
    print("-" * 40)
    icns_path = os.path.join(SCRIPT_DIR, "icon.icns")
    create_icns(png_paths, icns_path)
    
    print("-" * 40)
    print("✅ All icons generated successfully!")

if __name__ == "__main__":
    main()
