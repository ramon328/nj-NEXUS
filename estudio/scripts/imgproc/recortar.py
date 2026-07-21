#!/usr/bin/env python3
# recortar.py <entrada> <salida.png> — quita el fondo de una imagen con rembg y
# guarda un PNG con transparencia. Corre LOCAL en el mini (venv .venv-img).
import sys
from rembg import remove
from PIL import Image

inp, out = sys.argv[1], sys.argv[2]
img = Image.open(inp).convert("RGBA")
res = remove(img)
res.save(out)
print("ok", res.size[0], res.size[1])
