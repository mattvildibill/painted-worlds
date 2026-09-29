"""Semantic source sky masks from the existing hand-traced subject polygons."""
from pathlib import Path
import json
import numpy as np
from scipy.ndimage import distance_transform_edt,gaussian_filter,minimum_filter,maximum_filter
from PIL import Image,ImageDraw,ImageFilter
root=Path(__file__).resolve().parents[1];out=root/'dist/assets/reference'
for ident,s in json.loads((root/'source/references/compositions.json').read_text()).items():
 im=Image.open(out/f"{s['source']}.webp");w,h=im.size
 mask=Image.new('L',(w,h),255);d=ImageDraw.Draw(mask)
 # Below the artistic horizon is never sky, even when a foreground mask has holes.
 d.rectangle((0,h*s['horizon'],w,h),fill=0)
 for layer in s['layers']:d.polygon([(u*w,v*h) for u,v in layer['poly']],fill=0)
 mask=mask.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(3))
 mask.save(out/f'{ident}-sky-mask.webp',lossless=True)
 # A conservative source-only sky plate cannot carry mountain fragments.
 pixels=np.asarray(im.convert('RGB'));r,g,b=pixels.astype(float).transpose(2,0,1)
 # Polygon traces are approximate. Reject residual dark foliage, even when it
 # falls just outside a trace; otherwise nearest-neighbour repair copies whole
 # tree fragments into the supposedly empty sky behind a moving foreground.
 sky_color=(np.minimum(np.minimum(r,g),b)>145)&(b>g*.89)&(b>r*.82)
 safe=(minimum_filter(np.asarray(mask),size=31,mode='nearest')>250)&(minimum_filter(sky_color,size=19)>0)
 if safe.any():
  indices=distance_transform_edt(~safe,return_distances=False,return_indices=True)
  nearby=pixels[indices[0],indices[1]].astype(float)
  # Carry low-frequency painted color into occluded areas while retaining
  # actual source canvas grain. No dark fragments or radially stretched dabs.
  patch=np.asarray(Image.open(out/f'{ident}-sky-patch.webp').convert('RGB'))
  tiled=np.tile(patch,(int(np.ceil(h/patch.shape[0])),int(np.ceil(w/patch.shape[1])),1))[:h,:w].astype(float)
  grain=tiled-gaussian_filter(tiled,(7,7,0))
  repair=gaussian_filter(nearby,(24,24,0))+grain
  clean=np.where(safe[...,None],pixels,repair)
  Image.fromarray(np.clip(clean,0,255).astype('uint8')).save(out/f'{ident}-clean-sky.webp',quality=95)
 else:Image.new('RGB',(w,h),s['skyColor']).save(out/f'{ident}-clean-sky.webp',quality=95)
 ground=Image.new('L',(w,h),0);gd=ImageDraw.Draw(ground);gd.rectangle((0,h*(s['horizon']+.015),w,h),fill=255)
 for layer in s['layers']:gd.polygon([(u*w,v*h) for u,v in layer['poly']],fill=0)
 ground=ground.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(2));ground.save(out/f'{ident}-ground-mask.webp',lossless=True)
print('Nine source sky masks saved.')
