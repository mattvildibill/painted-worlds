"""Sample source pigments into small, spatially distributed foliage elements.
No generated images. The original traced crown defines the sample envelope.
"""
import json,math
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
root=Path(__file__).resolve().parents[1]
refs=json.loads((root/'source/references/compositions.json').read_text());out={}
for ident,spec in refs.items():
    im=Image.open(root/'dist/assets/reference'/f"{spec['source']}.webp").convert('RGB');a=np.asarray(im)/255
    w,h=im.size;out[ident]={}
    for i,layer in enumerate(spec['layers']):
        if layer['kind']!='tree' or ('trunk' in layer['name'].lower() and 'foliage' not in layer['name'].lower()):continue
        poly=layer['poly'];mask=Image.new('1',(w,h));ImageDraw.Draw(mask).polygon([(u*w,v*h) for u,v in poly],fill=1);mask=np.asarray(mask)
        # Preserve foliage, woody pigment and fruit; omit pale sky/paper holes.
        bright=a.mean(axis=2);sat=a.max(axis=2)-a.min(axis=2)
        keep=mask & ((bright<.51)|((sat>.17)&(a[:,:,2]<a[:,:,1]*.94)))
        rng=np.random.default_rng(730+i);samples=[]
        step=max(12,int(math.sqrt(max(1,keep.sum())/650)))
        for y in range(step//2,h,step):
            for x in range(step//2,w,step):
                xx=min(w-1,max(0,x+int(rng.uniform(-step*.28,step*.28))));yy=min(h-1,max(0,y+int(rng.uniform(-step*.28,step*.28))))
                if keep[yy,xx]:samples.append([round(xx/w,5),round(yy/h,5),round(step/w,5),*[round(float(c),4) for c in a[yy,xx]]])
        out[ident][str(i)]=samples
(root/'dist/foliage-data.js').write_text('export const foliageSamples='+json.dumps(out,separators=(',',':'))+';\n')
print('Source pigment samples:',sum(len(p) for s in out.values() for p in s.values()))
