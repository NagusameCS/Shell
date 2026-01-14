#!/usr/bin/env python3
import struct
import zlib

def create_minimal_png(size, r, g, b):
    """Create a solid-color RGBA PNG"""
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

for size, name in [(32, '32x32.png'), (128, '128x128.png'), (256, '128x128@2x.png')]:
    with open(name, 'wb') as f:
        f.write(create_minimal_png(size, r, g, b))

print("Icons created!")
