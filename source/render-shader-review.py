"""Render actual scene shaders with standalone Mesa OpenGL, not a browser.
Requires moderngl, Pillow and NumPy. WebGL shader syntax/output conversion only.
"""
import json,sys,re,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
import moderngl
ROOT=Path(__file__).resolve().parents[1];OUT=Path(sys.argv[1]);IDS=[s for s in sys.argv[2:] if not s.startswith('--')]
BAKE='--bake' in sys.argv;PHONE='--phone' in sys.argv;EXPANDED='--expanded' in sys.argv
ctx=moderngl.create_standalone_context(backend='egl');print(ctx.info['GL_RENDERER'],flush=True)
input_files=['dist/reconstruction.js','dist/painted-relief.js','dist/source-fidelity.js','dist/painted-volume.js','dist/reference-data.js','dist/geometry.js','dist/scenes.js','dist/assets/manifest.json']
input_files+=sorted(str(p.relative_to(ROOT)) for p in (ROOT/'dist/assets/reference').glob('*-matte.png'))
digest=hashlib.sha256()
for name in input_files:digest.update(name.encode()+b'\0'+(ROOT/name).read_bytes())
atlas_meta=ROOT/'dist/assets/reference/visibility-manifest.json'
atlas_records=json.loads(atlas_meta.read_text()) if atlas_meta.exists() else {}
textures={}
def texture(desc):
 key=(desc['texture'],desc.get('repeat'),desc.get('colorSpace'),desc.get('nearest'))
 if key not in textures:
  im=Image.open(ROOT/'dist/assets/reference'/key[0]).convert('RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM)
  t=ctx.texture(im.size,4,im.tobytes(),internal_format=0x8C43 if key[2]=='srgb' else 0x8058)
  t.repeat_x=t.repeat_y=bool(key[1]);t.build_mipmaps();t.filter=(moderngl.NEAREST,moderngl.NEAREST) if key[3] else (moderngl.LINEAR_MIPMAP_LINEAR,moderngl.LINEAR);textures[key]=t
 return textures[key]
def shader(src,vertex):
 src=src.replace('texture2D(', 'texture(').replace('varying ', 'out ' if vertex else 'in ').replace('attribute ','in ')
 src=src.replace('#include <colorspace_fragment>', 'gl_FragColor.rgb=mix(gl_FragColor.rgb*12.92,1.055*pow(max(gl_FragColor.rgb,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),gl_FragColor.rgb));')
 if vertex:
  declarations='uniform mat4 modelMatrix;uniform mat4 viewMatrix;uniform mat4 projectionMatrix;uniform mat4 modelViewMatrix;uniform mat3 normalMatrix;uniform vec3 cameraPosition;'
  for name,typ in [('position','vec3'),('normal','vec3'),('uv','vec2'),('color','vec3')]:
   if not re.search(r'\bin\s+\w+\s+'+name+r'\b',src):declarations+=f'in {typ} {name};'
 else:declarations='uniform vec3 cameraPosition;out vec4 resultColor;';src=src.replace('gl_FragColor','resultColor')
 return '#version 330\n'+declarations+'\n'+src
for ident in IDS:
 scene=json.loads((OUT/f'{ident}.json').read_text());batches=[]
 for m in sorted(scene['meshes'],key=lambda m:m['gl']['renderOrder']):
  g=m['gl'];frag=g['fragment']
  if BAKE:frag=frag.replace('#include <colorspace_fragment>',f"gl_FragColor=vec4({g.get('surfaceId',0)}./255.,0.,0.,1.);")
  program=ctx.program(vertex_shader=shader(g['vertex'],True),fragment_shader=shader(frag,False));content=[];buffers=[]
  for name,a in g['attributes'].items():
   if name in program:
    vbo=ctx.buffer(np.asarray(a['data'],dtype='f4').tobytes());buffers.append(vbo);content.append((vbo,f"{a['size']}f",name))
  vao=ctx.vertex_array(program,content);batches.append((m,program,vao,buffers))
 width=640;height=738 if PHONE else round(width/scene['aspect'])
 if BAKE:width,height=Image.open(ROOT/f"dist/assets/reference/{scene['source']}.webp").size
 target=ctx.simple_framebuffer((width,height),components=4);target.use();ctx.enable(moderngl.DEPTH_TEST);ctx.depth_func='<='
 renderAspect=width/height if EXPANDED else scene['aspect'];fov=scene['fov']
 if EXPANDED:fov=np.degrees(2*np.arctan(np.tan(np.radians(fov/2))*max(1,scene['aspect']/renderAspect)))
 viewW=width if EXPANDED else min(width,round(height*renderAspect));viewH=height if EXPANDED else round(viewW/renderAspect);vx=(width-viewW)//2;vy=(height-viewH)//2
 poses=[('Canvas viewpoint',(0,0,0),0,scene['pitch']),('Turn left 15 degrees',(0,0,0),.262,scene['pitch']),('Turn right 15 degrees',(0,0,0),-.262,scene['pitch']),('Step left 0.5 m',(-.5,0,0),0,scene['pitch']),('Step right 0.5 m',(.5,0,0),0,scene['pitch']),('Step forward 0.75 m',(0,0,-.75),0,scene['pitch']),('Walked into the scene',scene.get('forwardPose',scene['walkPose']),0,0),('Turn sideways after walking',scene.get('forwardPose',scene['walkPose']),1.57,0),('Look back after walking',scene.get('forwardPose',scene['walkPose']),3.14,0)]
 if BAKE:poses=poses[:1]
 shots=[]
 for label,pos,yaw,pitch in poses:
  eye=np.array([pos[0],1.68+pos[1],pos[2]],dtype=float);cy,sy=np.cos(yaw),np.sin(yaw);cp,sp=np.cos(pitch),np.sin(pitch)
  rot=np.array([[cy,sy*sp,sy*cp],[0,cp,-sp],[-sy,cy*sp,cy*cp]])
  view=np.eye(4);view[:3,:3]=rot.T;view[:3,3]=-rot.T@eye
  f=1/np.tan(np.radians(fov/2));near=.035;far=1200.;proj=np.zeros((4,4));proj[0,0]=f/renderAspect;proj[1,1]=f;proj[2,2]=-(far+near)/(far-near);proj[2,3]=-2*far*near/(far-near);proj[3,2]=-1
  target.clear(0 if BAKE else 21/255,0 if BAKE else 32/255,0 if BAKE else 31/255,1,depth=1);ctx.viewport=(vx,vy,viewW,viewH)
  for m,program,vao,_ in batches:
   g=m['gl'];model=np.asarray(g['model']).reshape(4,4).T
   for name,value in [('modelMatrix',model),('viewMatrix',view),('projectionMatrix',proj),('modelViewMatrix',view@model),('normalMatrix',np.linalg.inv((view@model)[:3,:3]).T)]:
    if name in program:program[name].write(np.asarray(value.T,dtype='f4').tobytes())
   if 'cameraPosition' in program:program['cameraPosition'].value=tuple(eye)
   unit=0
   for name,value in g['uniforms'].items():
    if name not in program:continue
    if isinstance(value,dict) and 'texture' in value:
     texture(value).use(unit);program[name].value=unit;unit+=1
    elif isinstance(value,list):program[name].write(np.asarray(value,dtype='f4').tobytes())
    else:program[name].value=value
   ctx.depth_mask=g['depthWrite'];vao.render(moderngl.TRIANGLES)
  im=Image.frombytes('RGBA',(width,height),target.read(components=4)).transpose(Image.Transpose.FLIP_TOP_BOTTOM).convert('RGB')
  if BAKE:
   im.save(ROOT/f'dist/assets/reference/{ident}-visibility.png');atlas_records[ident]={'geometrySha256':digest.hexdigest(),'width':width,'height':height};atlas_meta.write_text(json.dumps(atlas_records,indent=2)+'\n');shots.append((label,im));continue
  suffix=('-phone' if PHONE else '')+('-expanded' if EXPANDED else '')
  im.save(OUT/f'{ident}{suffix}-{len(shots)}.jpg',quality=96)
  if not shots:
   frameW=min(width,round(height*scene['aspect']));frameH=round(frameW/scene['aspect']);fx=(width-frameW)//2;fy=height-(height-frameH)//2-frameH
   expected=Image.open(ROOT/f"dist/assets/reference/{scene['source']}.webp").convert('RGB').resize((frameW,frameH),Image.Resampling.LANCZOS)
   actual=im.crop((fx,fy,fx+frameW,fy+frameH));diff=np.abs(np.asarray(actual).astype(float)-np.asarray(expected).astype(float));print(ident,'entry mean RGB error',round(float(diff.mean()),3),'pixels error>20',round(float((diff.mean(2)>20).mean()*100),2),'%',flush=True)
   compare=Image.new('RGB',(frameW*2,frameH));compare.paste(expected,(0,0));compare.paste(actual,(frameW,0));compare.save(OUT/f'{ident}{suffix}-comparison.jpg',quality=96)
  shots.append((label,im))
 sheetH=height if EXPANDED else viewH
 sheet=Image.new('RGB',(width*3,(sheetH+28)*3),(23,30,29));draw=ImageDraw.Draw(sheet)
 for k,(label,im) in enumerate(shots):
  if not EXPANDED:im=im.crop((vx,height-vy-viewH,vx+viewW,height-vy))
  x=(k%3)*width;y=(k//3)*(sheetH+28);sheet.paste(im,(x,y+28));draw.text((x+9,y+8),label,fill='white')
 if not BAKE:sheet.save(OUT/f'{ident}{suffix}-shader-review.jpg',quality=94)
 for _,program,vao,buffers in batches:
  vao.release();program.release()
  for b in buffers:b.release()
 target.release();print(ident,'visibility baked' if BAKE else 'nine actual-shader views rendered',flush=True)
