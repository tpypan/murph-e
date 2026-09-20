"""Pack the cabinet's Press Start 2P into small LVGL RGB565 font atlases."""
import json
import struct
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
font = json.loads((ROOT / 'packages/badge/font/press-start-2p-8px.json').read_text())
chars = ''.join(font)
app = ROOT / 'packages/badge/app'
def image(name, text, cols, rows, scale, color):
    size = 8 * scale
    width, height = cols * size, rows * size
    pixels = bytearray(width * height * 2)
    r,g,b = color
    rgb = struct.pack('<H', ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3))
    for index, ch in enumerate(text):
        for y, row in enumerate(font[ch]):
            for x, value in enumerate(row):
                if not value: continue
                for sy in range(scale):
                    for sx in range(scale):
                        px = (index % cols) * size + x * scale + sx
                        py = (index // cols) * size + y * scale + sy
                        offset = (py * width + px) * 2
                        pixels[offset:offset+2] = rgb
    header = struct.pack('<BBHHHHH', 0x19, 0x12, 0, width, height, width*2, 0)
    (app / name).write_bytes(header + pixels)
for style, scale, color in [('white16',2,(255,255,255)),('cyan8',1,(85,255,255))]:
    for group in range(3):
        image(f'font-{style}-{group}.bin', chars[group*16:(group+1)*16], 4, 4, scale, color)
image('font-heading-0.bin','MURPH-E',7,1,2,(255,255,85))

for index, text in enumerate(['START: CONFIRM   HOME: EXIT', 'START: PAUSE   HOME: EXIT']):
    image(f'font-footer-{index}.bin', text, len(text), 1, 1, (255,255,85))
