"""Package generated environment paintings; extract tree silhouettes from originals."""
from pathlib import Path
import json,shutil
from PIL import Image,ImageDraw
import numpy as np
root=Path(__file__).resolve().parents[1];out=root/'dist/assets/reference';assets=Path('/workspace/painted-worlds-v6-assets')
for ident in ['lily-lake','pine-trail','country-lane','winter-barn']:
 Image.open(assets/f'{ident}-panorama.png').convert('RGB').save(out/f'{ident}-panorama.webp',quality=95,method=6)
meta=root/'source/references/surrounding-art-prompts.json';shutil.copy2(assets/'prompt-metadata.json',meta)
refs=json.loads((root/'source/references/compositions.json').read_text())
# Reuse only depicted plants; alpha masks remove pale sky and paper holes.
for ident,layerids in [('lily-lake',[]),('pine-trail',[3,4,5]),('country-lane',[3,5])]:
 s=refs[ident];im=Image.open(out/f"{s['source']}.webp").convert('RGB');a=np.asarray(im);h,w=a.shape[:2]
 if ident=='lily-lake':
  polys=[[[.876,.43],[.89,.395],[.9,.39],[.9,.34],[.916,.32],[.927,.375],[.941,.395],[.935,.435],[.95,.461],[.932,.478],[.90,.463]],[[.974,.245],[.981,.23],[.99,.255],[1,.28],[1,.48],[.967,.474],[.962,.43],[.972,.401],[.966,.367],[.98,.33],[.965,.295]]]
 else:polys=[s['layers'][i]['poly'] for i in layerids]
 for i,poly in enumerate(polys):
  m=Image.new('L',(w,h));ImageDraw.Draw(m).polygon([(u*w,v*h) for u,v in poly],fill=255)
  mask=np.asarray(m).copy();r,g,b=a.astype(float).transpose(2,0,1)
  sky=(b>r*.90)&(b>g*.91)&(g>155)&(r>145);mask[sky]=0
  if ident=='country-lane':mask[(b>g*.98)&(b>r*1.05)]=0
  data=Image.fromarray(np.dstack([a,mask]),'RGBA');us,vs=zip(*poly);box=(max(0,int(min(us)*w)),max(0,int(min(vs)*h)),min(w,int(max(us)*w)+1),min(h,int(max(vs)*h)+1))
  data=data.crop(box)
  if ident=='pine-trail' and i==2:
   # Isolate the single complete fir; exclude the neighboring bush and ground.
   cw,ch=data.size;silhouette=Image.new('L',data.size)
   ImageDraw.Draw(silhouette).polygon([(u*cw,v*ch) for u,v in [(0,.53),(.14,.25),(.29,0),(.39,.15),(.36,.27),(.59,.33),(.56,.42),(.47,.46),(.56,.55),(.59,.69),(.52,.82),(.43,.86),(.39,.94),(.26,.92),(.12,.83),(.03,.70)]],fill=255)
   rgba=np.asarray(data).copy();rgba[:,:,3]=np.minimum(rgba[:,:,3],np.asarray(silhouette));data=Image.fromarray(rgba,'RGBA').crop((0,0,int(cw*.61),int(ch*.95)))
  data.thumbnail((640,960),Image.Resampling.LANCZOS);data.save(out/f'{ident}-tree-{i}.webp',quality=96,method=6)
print('Four surrounding paintings and source-extracted tree silhouettes saved.')
