"""Wide-angle checks of actual exported geometry; not browser screenshots."""
import importlib.util,json,sys
from pathlib import Path
from PIL import Image,ImageDraw
spec=importlib.util.spec_from_file_location('raster',Path(__file__).with_name('render-reference-checks.py'))
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
out=Path(sys.argv[1]);ids=sys.argv[2:] or ['lily-lake','rose-peaks','canyon','orchard','coast','village']
for ident in ids:
    s=json.loads((out/f'{ident}.json').read_text());views=[]
    for title,position,yaw in [('Entrance',(0,0,0),0),('Look left',(0,0,0),1.57),('Look right',(0,0,0),-1.57),('Turn around',(0,0,0),3.14),('Along the route, look back',s.get('walkPose',(-2,0,-2.5)),2.5)]:
        im=mod.raster(s,position,yaw,width=320,pitch=0 if yaw else None)
        views.append((title,im))
    h=max(i.height for _,i in views);sheet=Image.new('RGB',(1600,h+28),(24,32,31));d=ImageDraw.Draw(sheet)
    for k,(title,im) in enumerate(views):sheet.paste(im,(k*320,28));d.text((k*320+8,8),title,fill='white')
    sheet.save(out/f'{ident}-motion.jpg',quality=90);print(ident,flush=True)
