#!/usr/bin/env python3
"""Create a minimal .ico file"""
import struct
import zlib

def create_minimal_png(size, r, g, b):
    def write_chunk(chunk_type, data):
        chunk_len = struct.pack('>I', len(data))
        chunk_crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)
        return chunk_len + chunk_type + data + chunk_crc

    signature = b'\x89PNG\r\n\x1a\n'
    # Color type 6 = RGBA
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    ihdr = write_chunk(b'IHDR', ihdr_data)
    
    raw_data = b''
    for y in range(size):
        raw_data += b'\x00'
        for x in range(size):
            raw_data += bytes([r, g, b, 255])
    
    compressed = zlib.compress(raw_data, 9)
    idat = write_chunk(b'IDAT', compressed)
    iend = write_chunk(b'IEND', b'')
    
    return signature + ihdr + idat + iend

r, g, b = 139, 92, 246

# Create PNG data for different sizes
sizes = [16, 32, 48, 256]
png_data = []
for size in sizes:
    png_data.append(create_minimal_png(size, r, g, b))

# ICO header
ico_header = struct.pack('<HHH', 0, 1, len(sizes))  # Reserved, Type (1=ico), Count

# Calculate offsets
offset = 6 + 16 * len(sizes)  # Header + entries
entries = b''
image_data = b''

for i, size in enumerate(sizes):
    data = png_data[i]
    w = 0 if size >= 256 else size
    h = 0 if size >= 256 else size
    
    entry = struct.pack('<BBBBHHII',
        w,              # Width
        h,              # Height  
        0,              # Color palette
        0,              # Reserved
        1,              # Color planes
        32,             # Bits per pixel
        len(data),      # Size of image data
        offset          # Offset to image data
    )
    entries += entry
    image_data += data
    offset += len(data)

with open('icon.ico', 'wb') as f:
    f.write(ico_header + entries + image_data)

print("icon.ico created!")
