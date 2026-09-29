"""Source-only opacity masks and a woodland repair plate; no generated pixels.

Remove background-connected sky from tree silhouettes, preserving isolated
paint highlights. Original RGB is retained separately by source-fidelity.js.
"""
from pathlib import Path
import json,shutil
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
from scipy.ndimage import binary_propagation,maximum_filter,gaussian_filter

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'dist/assets/reference'
specs=json.loads((ROOT/'source/references/compositions.json').read_text())
for ident,s in specs.items():
 im=Image.open(OUT/f"{s['source']}.webp").convert('RGB');a=np.asarray(im).astype(float);h,w=a.shape[:2];r,g,b=a.transpose(2,0,1);yy=np.arange(h)[:,None]/h
 def polygon(poly):
  m=Image.new('L',(w,h));ImageDraw.Draw(m).polygon([(u*w,v*h) for u,v in poly],fill=255);return np.asarray(m)>0
 for i,l in enumerate(s['layers']):
  if l['kind']!='tree':continue
  reviewed=ROOT/f'source/references/mattes/{ident}-{i}-matte.png'
  if reviewed.exists():shutil.copy(reviewed,OUT/reviewed.name);continue
  silhouette=polygon(l['poly'])
  sky=(b>r*.90)&(b>g*.89)&(g>145)&(r>135)
  if ident in ['pine-trail','rose-peaks']:sky|=(r>g*1.05)&(b>g*.98)&(yy<s['horizon']+.04)
  sky&=yy<s['horizon']+.07
  outside=~silhouette
  holes=binary_propagation(outside&sky,mask=sky)
  alpha=(silhouette&~holes).astype('uint8')*255
  Image.fromarray(alpha).save(OUT/f'{ident}-{i}-matte.png')
 if ident=='winter-barn':
  # The painting contains woodland, not open sky. Use woodland pigment from
  # both sides to repair occluded regions; never diffuse red roof-edge pixels.
  def tiled(box):
   patch=im.crop(tuple(int(v*d) for v,d in zip(box,[w,h,w,h])))
   pw,ph=patch.size;tile=Image.new('RGB',(pw*2,ph*2));tile.paste(patch,(0,0));tile.paste(patch.transpose(Image.Transpose.FLIP_LEFT_RIGHT),(pw,0));tile.paste(tile.crop((0,0,pw*2,ph)).transpose(Image.Transpose.FLIP_TOP_BOTTOM),(0,ph))
   return np.tile(np.asarray(tile),(int(np.ceil(h/(2*ph))),int(np.ceil(w/(2*pw))),1))[:h,:w].astype(float)
  left=tiled([.008,.015,.115,.16]);right=tiled([.694,.24,.787,.53]);blend=np.clip((np.arange(w)/w-.05)/.8,0,1)[None,:,None]
  repaired=left*(1-blend)+right*blend
  blocked=np.zeros((h,w),bool)
  for l in s['layers'][2:]:blocked|=polygon(l['poly'])
  blocked=maximum_filter(blocked,size=65)
  # Texture repairs may alter hidden pixels only. The atlas separately protects
  # visible source paint and the ground mesh provides the lower scene.
  mask=gaussian_filter(blocked.astype(float),7)[...,None]
  repaired=a*(1-mask)+repaired*mask
  Image.fromarray(np.clip(repaired,0,255).astype('uint8')).save(OUT/'winter-barn-woodland.webp',quality=96)
 print(ident,'source silhouettes prepared',flush=True)
