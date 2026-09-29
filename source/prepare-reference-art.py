"""Rectify the six source paintings without synthesizing or repainting their art."""
from pathlib import Path
import json,sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist/assets/reference'
OUT.mkdir(exist_ok=True)
for entry in json.loads((ROOT / 'source/references/crops.json').read_text()):
    if len(sys.argv)>1 and entry['id'] not in sys.argv[1:]:continue
    im = Image.open(ROOT / f"dist/assets/{entry['id']}.webp").convert('RGB')
    crop = entry['crop']
    if isinstance(crop[0], list):
        tl, tr, br, bl = crop
    else:
        x0,y0,x1,y1 = crop
        tl,tr,br,bl = [x0,y0],[x1,y0],[x1,y1],[x0,y1]
    aspect = entry['aspect']
    size = (1536, round(1536/aspect)) if aspect >= 1 else (round(1536*aspect),1536)
    quad = [n for p in [tl,bl,br,tr] for n in [p[0]*im.width,p[1]*im.height]]
    im = im.transform(size,Image.Transform.QUAD,quad,Image.Resampling.BICUBIC)
    im.save(OUT / f"{entry['id']}.webp",quality=96,method=6)
    im.thumbnail((900,900))
    im.save(OUT / f"{entry['id']}-study.jpg",quality=94)
print('Selected canvas crops prepared')
