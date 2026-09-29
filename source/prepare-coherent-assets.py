"""Build source-owned textures and rounded silhouette fields for physical scenery.
No runtime inference. Original RGB is retained where an object is visible;
generated repair plates are used only where another subject occludes it.
"""
from pathlib import Path
import json,base64,sys
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
from scipy.ndimage import distance_transform_edt,maximum_filter,gaussian_filter
R=Path(__file__).resolve().parents[1];O=R/'dist/assets/reference';S=json.loads((R/'source/references/compositions.json').read_text())
G=json.loads((R/'dist/coherent-data.js').read_text().removeprefix('export const volumeFields=').strip().removesuffix(';')) if len(sys.argv)>1 else {}
for id,s in S.items():
 if len(sys.argv)>1 and id not in sys.argv[1:]:continue
 im=Image.open(O/f"{s['source']}.webp").convert('RGB');w,h=im.size;arr=np.array(im)
 plate=O/f'{id}-hidden.webp';repair=np.array(Image.open(plate).resize((w,h))) if plate.exists() else None
 def mask(poly):
  m=Image.new('L',(w,h));ImageDraw.Draw(m).polygon([(u*w,v*h) for u,v in poly],fill=255);return np.asarray(m)>127
 masks=[]
 for i,l in enumerate(s['layers']):
  p=O/f'{id}-{i}-matte.png'
  masks.append(np.array(Image.open(p).convert('L'))>127 if l['kind']=='tree' and p.exists() else mask(l['poly']))
 # Ground layers remain original paint, not holes in a generic fill texture.
 blocked=np.zeros((h,w),bool);floor_blocked=np.zeros((h,w),bool)
 for j,l in enumerate(s['layers']):
  if l['kind'] not in ['ground','water','wave']:
   blocked|=maximum_filter(masks[j],size=13)
  if l['kind'] in ['ridge','building','wall','roof','backdrop']:
   floor_blocked|=masks[j]
 ground_repair=repair if repair is not None else np.array(Image.open(O/f'{id}-ground.webp').resize((w,h)))
 blend=gaussian_filter(blocked.astype(float),2)[...,None]
 Image.fromarray(np.uint8(arr*(1-blend)+ground_repair*blend)).save(O/f'{id}-coherent-ground.webp',quality=96)
 floor=(~floor_blocked)&(np.arange(h)[:,None]/h>s['horizon']+.012)
 Image.fromarray(np.uint8(floor)*255).save(O/f'{id}-coherent-ground-mask.webp',quality=98)
 # Conservative ownership margins prevent silhouettes from being copied into walls.
 G[id]={}
 for i,l in enumerate(s['layers']):
  if l['kind'] in ['ground','water','wave','backdrop']:continue
  rgb=arr.copy();hidden=np.zeros((h,w),bool)
  for j in range(i+1,len(masks)):
   if s['layers'][j]['kind'] not in ['ground','water']:hidden|=maximum_filter(masks[j],size=21)
  if repair is not None and l['kind'] not in ['tree','figure','prop','sign','cloth','detail','trunk']:
   mix=np.clip(gaussian_filter(hidden.astype(float),2),0,1)[...,None];rgb=np.uint8(arr*(1-mix)+repair*mix)
  else:
   # Extracted image supplies source-only repaired pixels beneath occluders.
   meta=json.loads((O/'textures.json').read_text())[id][str(i)];box=[round(meta['bounds'][0]*w),round(meta['bounds'][1]*h),round(meta['bounds'][2]*w),round(meta['bounds'][3]*h)]
   p=np.array(Image.open(O/meta['file']).convert('RGB').resize((box[2]-box[0],box[3]-box[1])))
   a=rgb[box[1]:box[3],box[0]:box[2]];m=hidden[box[1]:box[3],box[0]:box[2]];a[m]=p[m]
  if id=='village' and i==0 and (O/'village-canopy-repair.webp').exists():
   wall=np.array(Image.open(O/'village-canopy-repair.webp').resize((w,h)))
   cover=gaussian_filter(maximum_filter(masks[3],size=15).astype(float),2)[...,None]
   rgb=np.uint8(rgb*(1-cover)+wall*cover)
  # Keep full RGB for organic volumes: individual leaves retain their paint.
  if l['kind']=='tree':rgb=arr.copy()
  if id=='winter-barn' and i==5:
   r,g,b=rgb.astype(float).transpose(2,0,1)
   spill=masks[i]&((r>g*1.35)&(r>b*1.3)&(r>100))
   yy,xx=np.where(spill);rgb[yy,xx]=arr[yy,np.clip(np.int32(w*.235)+(xx%max(1,int(w*.035))),0,w-1)]
  Image.fromarray(rgb).save(O/f'{id}-{i}-surface.webp',quality=93)
  if l['kind'] not in ['tree','trunk','figure']:continue
  m=masks[i].copy()
  Image.fromarray(np.uint8(m)*255).save(O/f'{id}-{i}-coherent-mask.png')
  ys,xs=np.where(m)
  if not len(xs):continue
  x0=max(0,xs.min()-4);x1=min(w,xs.max()+5);y0=max(0,ys.min()-4);y1=min(h,ys.max()+5)
  # Continue image-clipped subjects beyond the canvas and curve them closed.
  # Source paint is mirrored only across the cropped boundary, at a fixed scale.
  ex0=round(w*.16) if x0==0 else 0;ex1=round(w*.16) if x1==w else 0
  ey0=round(h*.16) if y0==0 else 0;ey1=round(h*.10) if y1==h else 0
  crop=m[y0:y1,x0:x1]
  crop=np.pad(crop,((ey0,ey1),(ex0,ex1)),mode='reflect')
  x0-=ex0;x1+=ex1;y0-=ey0;y1+=ey1
  nx=max(12,min(128,round((x1-x0)/w*155)));ny=max(12,min(152,round((y1-y0)/h*180)))
  small=np.asarray(Image.fromarray(np.uint8(crop)*255).resize((nx+1,ny+1),Image.Resampling.BOX))>90
  small[0,:]=False;small[-1,:]=False;small[:,0]=False;small[:,-1]=False
  dist=distance_transform_edt(small);dist=np.minimum(dist/max(2,min(nx,ny)*.23),1)
  data=np.uint8(np.sqrt(dist)*255)
  G[id][str(i)]={'rect':[x0/w,y0/h,x1/w,y1/h],'nx':nx,'ny':ny,'field':base64.b64encode(data.tobytes()).decode()}
 print(id,'source surfaces prepared',flush=True)
(R/'dist/coherent-data.js').write_text('export const volumeFields='+json.dumps(G,separators=(',',':'))+';\n')
