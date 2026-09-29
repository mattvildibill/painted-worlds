"""Extract painted surface textures, repairing only pixels hidden behind other objects.

Visible reference pixels are copied from the source. Hidden areas use nearby paint
and a small surface-specific texture patch; these are restrained extrapolations.
"""
from pathlib import Path
import json,sys
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
from scipy.ndimage import distance_transform_edt,gaussian_filter,maximum_filter
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/assets/reference'
spec=json.loads((ROOT/'source/references/compositions.json').read_text())
def patch_image(im,rect):
    w,h=im.size;x0,y0,x1,y1=rect
    p=im.crop((int(x0*w),int(y0*h),max(int(x1*w),int(x0*w)+2),max(int(y1*h),int(y0*h)+2)))
    # Mirror-tile existing paint, avoiding wrap seams and retaining physical grain.
    p=p.resize((192,192),Image.Resampling.BICUBIC)
    tile=Image.new('RGB',(384,384))
    tile.paste(p,(0,0));tile.paste(p.transpose(Image.Transpose.FLIP_LEFT_RIGHT),(192,0))
    tile.paste(tile.crop((0,0,384,192)).transpose(Image.Transpose.FLIP_TOP_BOTTOM),(0,192))
    return tile
def fill_hidden(arr,valid,patch):
    if not valid.any(): return patch.copy()
    missing=~valid
    if not missing.any():return arr.copy()
    dist,indices=distance_transform_edt(missing,return_indices=True)
    # Diffuse neighboring pigment at reduced resolution. Nearest-pixel filling
    # creates radial smears when a branch or sign is revealed; this avoids them.
    h,w=valid.shape;size=(max(16,round(w/6)),max(16,round(h/6)))
    weights=np.asarray(Image.fromarray(valid.astype('float32'),mode='F').resize(size,Image.Resampling.BOX))
    small=np.stack([np.asarray(Image.fromarray((arr[:,:,c]*valid).astype('float32'),mode='F').resize(size,Image.Resampling.BOX)) for c in range(3)],-1)
    estimate=np.asarray(Image.fromarray(patch).resize(size,Image.Resampling.BILINEAR)).astype(float)
    for sigma in [24,12,5,2]:
        weight=gaussian_filter(weights,sigma);num=gaussian_filter(small,(sigma,sigma,0))
        use=weight>.015;estimate[use]=num[use]/weight[use,None]
    soft=np.asarray(Image.fromarray(np.clip(estimate,0,255).astype('uint8')).resize((w,h),Image.Resampling.BICUBIC)).astype(float)
    filled=arr[indices[0],indices[1]].astype(float)
    grain=patch.astype(float)-gaussian_filter(patch.astype(float),(4,4,0))
    blend=np.clip(dist/5,0,1)[...,None]
    repaired=filled*(1-blend)+(soft+grain*.6)*blend
    return np.where(valid[...,None],arr,np.clip(repaired,0,255)).astype('uint8')
meta=json.loads((OUT/'textures.json').read_text()) if (OUT/'textures.json').exists() else {}
for ident,s in spec.items():
    if len(sys.argv)>1 and ident not in sys.argv[1:]:continue
    im=Image.open(OUT/f"{s['source']}.webp").convert('RGB')
    w,h=im.size;arr=np.asarray(im)
    def mask(poly):
        m=Image.new('L',(w,h));ImageDraw.Draw(m).polygon([(round(x*w),round(y*h)) for x,y in poly],fill=255)
        return np.asarray(m)>0
    masks=[(np.asarray(Image.open(OUT/f'{ident}-{i}-matte.png').convert('L'))>127) if o['kind']=='tree' and (OUT/f'{ident}-{i}-matte.png').exists() else mask(o['poly']) for i,o in enumerate(s['layers'])]
    allmask=np.logical_or.reduce(masks)
    entries={}
    def export(name,data,bounds=(0,0,1,1),limit=1536):
        x0,y0,x1,y1=bounds
        box=(max(0,int(x0*w)),max(0,int(y0*h)),min(w,int(x1*w)+1),min(h,int(y1*h)+1))
        image=Image.fromarray(data).crop(box);image.thumbnail((limit,limit),Image.Resampling.LANCZOS)
        filename=f'{ident}-{name}.webp';image.save(OUT/filename,quality=94,method=5)
        entries[name]={'file':filename,'bounds':[box[0]/w,box[1]/h,box[2]/w,box[3]/h]}
    patches={}
    for name,rect in [('ground',s['groundPatch']),('sky',s['skyPatch'])]:
        p=patch_image(im,rect);p.save(OUT/f'{ident}-{name}-patch.webp',quality=94)
        tiled=Image.new('RGB',(w,h))
        for y in range(0,h,384):
            for x in range(0,w,384):tiled.paste(p,(x,y))
        patches[name]=np.asarray(tiled)
    yy=np.arange(h)[:,None]/h
    ground_valid=(~allmask)&(np.broadcast_to(yy,(h,w))>s['horizon']+.025)
    sky_valid=(~allmask)&(np.broadcast_to(yy,(h,w))<s['horizon'])
    export('ground',fill_hidden(arr,ground_valid,patches['ground']))
    export('sky',fill_hidden(arr,sky_valid,patches['sky']))
    for i,o in enumerate(s['layers']):
        poly=np.array(o['poly']);bounds=[max(0,poly[:,0].min()-.002),max(0,poly[:,1].min()-.002),min(1,poly[:,0].max()+.002),min(1,poly[:,1].max()+.002)]
        valid=masks[i].copy()
        for j in range(i+1,len(masks)):valid&=~maximum_filter(masks[j],size=25)
        p=patch_image(im,o.get('patch',s['groundPatch']))
        p.save(OUT/f'{ident}-{i}-patch.webp',quality=92)
        tiled=np.tile(np.asarray(p),(int(np.ceil(h/384)),int(np.ceil(w/384)),1))[:h,:w]
        cleaned=fill_hidden(arr,valid,tiled)
        alpha=np.full((h,w),255,dtype='uint8')
        if o.get('key')=='canopy':
            r,g,b=arr.astype(float).transpose(2,0,1)
            sky=(b>r*.90)&(b>g*.89)&(g>145)&(r>135)
            alpha[sky]=0
            if ident=='country-lane':alpha[(b>g*.98)&(b>r*1.05)]=0
        data=np.dstack([cleaned,alpha]) if o.get('key') else cleaned
        export(str(i),data,bounds,1536 if i<4 else 1024)
    meta[ident]=entries
    print(ident,len(s['layers']),'separate painted surfaces',flush=True)
(OUT/'textures.json').write_text(json.dumps(meta,separators=(',',':')))
