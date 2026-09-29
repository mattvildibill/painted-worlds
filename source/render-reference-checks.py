"""CPU texture/depth rasterization of the exported live Three.js scene meshes."""
import json,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(sys.argv[1] if len(sys.argv)>1 else '/workspace/painted-worlds-checks')
ids=sys.argv[2:] or ['lily-lake','rose-peaks','canyon','orchard','coast','village']
cache={}
def tex(file):
    if file not in cache:
        im=Image.open(ROOT/'dist/assets/reference'/file).convert('RGBA')
        if not file.endswith('-patch.webp') and '-panorama.' not in file and '-tree-' not in file:im=im.resize((max(1,round(im.width*540/1536)),max(1,round(im.height*540/1536))),Image.Resampling.BILINEAR)
        cache[file]=np.asarray(im)
    return cache[file]
def sample(im,uv,repeat=False):
    if repeat:uv=uv%1
    h,w=im.shape[:2];x=np.clip((uv[...,0]*w).astype(int),0,w-1);y=np.clip(((1-uv[...,1])*h).astype(int),0,h-1)
    return im[y,x]
def linear(c):
    c=c/255.;return np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4)
def srgb(c):
    c=np.clip(c,0,1);return np.clip(np.where(c<=.0031308,c*12.92,1.055*c**(1/2.4)-.055)*255,0,255).astype('uint8')
def wash(im,uv):
    r=uv@np.array([[.8,.6],[-.6,.8]]).T
    return linear(sample(im,uv,True)[...,:3])*.48+linear(sample(im,r*1.731+[.27,.61],True)[...,:3])*.32+linear(sample(im,r*.613+[.71,.23],True)[...,:3])*.20
def pigment(im,p,normal):
    w=np.abs(normal)**4;w=w/max(.001,w.sum())
    a=wash(im,p[...,[2,1]]*.31);b=wash(im,p[...,[0,2]]*.31);c=wash(im,p[...,[0,1]]*.31)
    fine=wash(im,p[...,[0,2]]*.79+p[...,[0,1]]*.13)
    return (a*w[0]+b*w[1]+c*w[2])*.78+fine*.22
def environment(im,direction):
    direction=direction/np.maximum(1e-9,np.linalg.norm(direction,axis=-1,keepdims=True))
    u=(.5+np.arctan2(direction[...,0],-direction[...,2])/(2*np.pi))%1;v=.5+np.arcsin(np.clip(direction[...,1],-1,1))/np.pi
    col=linear(sample(im,np.stack([u,v],-1))[...,:3]);other=linear(sample(im,np.stack([1-u,v],-1))[...,:3])
    t=np.clip(np.minimum(u,1-u)/.015,0,1);seam=.5*(1-t*t*(3-2*t))
    return col*(1-seam[...,None])+other*seam[...,None]
def environment_tex(im,uv,profile):
    col=linear(sample(im,uv)[...,:3]);patch=profile.get('backgroundPatch')
    if patch:
        imageUV=np.stack([uv[...,0],1-uv[...,1]],-1);edge=np.minimum(np.minimum(imageUV[...,0]-patch[0],patch[2]-imageUV[...,0]),np.minimum(imageUV[...,1]-patch[1],patch[3]-imageUV[...,1]));t=np.clip(edge/.022,0,1);t=t*t*(3-2*t)
        other=linear(sample(im,np.stack([(uv[...,0]+patch[4])%1,uv[...,1]],-1))[...,:3]);col=col*(1-t[...,None])+other*t[...,None]
    return col
def relief_sample(im,p,profile):
    d=p-np.array([0,1.68,0]);u=(.5+np.arctan2(d[...,0],-d[...,2])/(2*np.pi))%1
    x=u*8;i=np.floor(x).astype(int);t=x-i;t=t*t*(3-2*t);cs=np.array(profile['contact']);contact=cs[i]*(1-t)+cs[i+1]*t
    factor=1.68/(profile['radius']*np.tan((contact-.5)*np.pi));pitch=np.arctan2(d[...,1],np.maximum(1e-5,np.linalg.norm(d[...,[0,2]],axis=-1)))
    pitch=np.where(pitch<0,np.arctan(np.tan(pitch)/factor),pitch);v=.5+pitch/np.pi
    col=environment_tex(im,np.stack([u,v],-1),profile);other=environment_tex(im,np.stack([1-u,v],-1),profile)
    t=np.clip(np.minimum(u,1-u)/.008,0,1);blend=.5*(1-t*t*(3-2*t));return col*(1-blend[...,None])+other*blend[...,None]
def raster(s,offset=(0,0,0),yaw=0,width=540,pitch=None):
    W=width;H=round(W/s['aspect']);depth=np.full((H,W),np.inf);image=np.full((H,W,3),[150,170,160],dtype='uint8')
    ref=np.array(s['referenceVP']).reshape(4,4).T
    p=s['pitch'] if pitch is None else pitch;cx,sx=np.cos(p),np.sin(p);cy,sy=np.cos(yaw),np.sin(yaw)
    rot=np.array([[cy,sy*sx,sy*cx],[0,cx,-sx],[-sy,cy*sx,cy*cx]])
    eye=np.array([offset[0],1.68+offset[1],offset[2]])
    tangent=np.tan(np.radians(s['fov']/2))
    for mesh in sorted(s['meshes'],key=lambda m:not m['sky']):
        P=np.array(mesh['positions']).reshape(-1,3)
        flags=mesh.get('settings',{})
        if flags.get('paintedStrokes'):
            offsets=np.array(mesh['strokeOffset']).reshape(-1,2);scales=np.array(mesh['strokeScale']).reshape(-1,2);toward=eye-P;toward[:,1]=0;toward/=np.maximum(1e-9,np.linalg.norm(toward,axis=1,keepdims=True));right=np.stack([toward[:,2],np.zeros(len(P)),-toward[:,0]],-1)
            P=P+right*(offsets[:,0]*scales[:,0])[:,None]+np.stack([np.zeros(len(P)),offsets[:,1]*scales[:,1],np.zeros(len(P))],-1)
        if flags.get('treeImpostor') or flags.get('sourceTree'):
            center=np.array(flags.get('pivot',mesh.get('transformCenter',[0,0,0])))
            angle=np.arctan2(eye[0]-center[0],eye[2]-center[2])-flags.get('referenceAngle',0)
            co,si=np.cos(angle),np.sin(angle);delta=P-center;P=center+delta@np.array([[co,0,-si],[0,1,0],[si,0,co]])
            if flags.get('treeImpostor'):P+=np.array([si,0,co])*.24
        UV=np.array(mesh['uv']).reshape(-1,2);COL=np.array(mesh['colors']).reshape(-1,3) if mesh.get('colors') else np.ones_like(P);V=(P-eye)@rot;Z=-V[:,2]
        inside=(Z.reshape(-1,3)>.035);whole=inside.all(axis=1);cross=inside.any(axis=1)&~whole
        goodP=P.reshape(-1,3,3)[whole].reshape(-1,3);goodUV=UV.reshape(-1,3,2)[whole].reshape(-1,2)
        goodCOL=COL.reshape(-1,3,3)[whole].reshape(-1,3);clippedCOL=[]
        clippedP=[];clippedUV=[]
        for triIndex in np.nonzero(cross)[0]:
            n=triIndex*3;poly=[(P[n+i],UV[n+i],Z[n+i]) for i in range(3)];result=[]
            for i in range(3):
                a,au,az=poly[i];b,bu,bz=poly[(i+1)%3]
                if az>.035:result.append((a,au))
                if (az>.035)!=(bz>.035):
                    t=(.036-az)/(bz-az);result.append((a+(b-a)*t,au+(bu-au)*t))
            for i in range(1,len(result)-1):
                for p0,u0 in [result[0],result[i],result[i+1]]:clippedP.append(p0);clippedUV.append(u0);clippedCOL.append(COL[n])
        P=np.concatenate([goodP,np.array(clippedP).reshape(-1,3)]);uv=np.concatenate([goodUV,np.array(clippedUV).reshape(-1,2)])
        COL=np.concatenate([goodCOL,np.array(clippedCOL).reshape(-1,3)]);V=(P-eye)@rot;Z=-V[:,2]
        screen=np.stack([(V[:,0]/Z/tangent/s['aspect']+1)*W/2,(1-V[:,1]/Z/tangent)*H/2],axis=1)
        texture=tex(mesh['texture']);patch=tex(mesh['patch']) if mesh.get('patch') else texture
        bounds=np.array(mesh['bounds']);R=np.c_[P,np.ones(len(P))]@ref.T
        for n in range(0,len(P),3):
            if np.any(Z[n:n+3]<=.025):continue
            A,B,C=screen[n:n+3];mn=np.maximum(np.floor(np.min([A,B,C],axis=0)).astype(int),0);mx=np.minimum(np.ceil(np.max([A,B,C],axis=0)).astype(int),[W-1,H-1])
            if np.any(mx<mn):continue
            den=(B[1]-C[1])*(A[0]-C[0])+(C[0]-B[0])*(A[1]-C[1])
            if abs(den)<1e-8:continue
            yy,xx=np.mgrid[mn[1]:mx[1]+1,mn[0]:mx[0]+1];xx=xx+.5;yy=yy+.5
            a=((B[1]-C[1])*(xx-C[0])+(C[0]-B[0])*(yy-C[1]))/den
            bb=((C[1]-A[1])*(xx-C[0])+(A[0]-C[0])*(yy-C[1]))/den;c=1-a-bb
            weights=np.stack([a,bb,c],-1);inside=np.all(weights>=-1e-5,axis=-1)
            weighted=weights/Z[n:n+3];inv=weighted.sum(axis=-1);d=1/np.maximum(inv,1e-9)
            old=depth[mn[1]:mx[1]+1,mn[0]:mx[0]+1];valid=inside&(d<old+.0001)
            if not valid.any():continue
            bary=weighted/np.maximum(inv[...,None],1e-9)
            wp=bary@P[n:n+3];normal=np.cross(P[n+1]-P[n],P[n+2]-P[n]);normal/=max(1e-9,np.linalg.norm(normal))
            if flags.get('paintedRelief') or flags.get('reliefSurface'):
                if flags.get('reliefSurface'):col=relief_sample(texture,wp,flags['profile'])
                else:
                    paintedUV=bary@uv[n:n+3];col=environment_tex(texture,paintedUV,flags['profile']);other=environment_tex(texture,np.stack([1-paintedUV[...,0],paintedUV[...,1]],-1),flags['profile'])
                    t=np.clip(np.minimum(paintedUV[...,0],1-paintedUV[...,0])/.008,0,1);seam=.5*(1-t*t*(3-2*t));col=col*(1-seam[...,None])+other*seam[...,None]
                    projected=bary@R[n:n+3];uvSky=projected[...,:2]/projected[...,3:4]*.5+.5
                    edge=np.minimum(np.min(uvSky,axis=-1),np.min(1-uvSky,axis=-1));t=np.clip(edge/.08,0,1);t=t*t*(3-2*t)*(projected[...,3]>0)
                    t*=sample(tex(mesh['skyMask']),np.clip(uvSky,0,1))[...,0]/255
                    source=linear(sample(tex(mesh['sourceSky']),np.clip(uvSky,0,1))[...,:3]);col=col*(1-t[...,None])+source*t[...,None]
                color=np.concatenate([srgb(col),np.full((*col.shape[:-1],1),255,dtype='uint8')],axis=-1)
            elif mesh.get('settings',{}).get('surroundingEnvironment'):
                direction=wp-np.array([0,1.68,0]);direction/=np.maximum(1e-9,np.linalg.norm(direction,axis=-1,keepdims=True))
                u=(.5+np.arctan2(direction[...,0],-direction[...,2])/(2*np.pi))%1;v=.5+np.arcsin(np.clip(direction[...,1],-1,1))/np.pi
                col=linear(sample(texture,np.stack([u,v],-1))[...,:3]);other=linear(sample(texture,np.stack([1-u,v],-1))[...,:3])
                t=np.clip(np.minimum(u,1-u)/.015,0,1);seam=.5*(1-t*t*(3-2*t));col=col*(1-seam[...,None])+other*seam[...,None]
                projected=bary@R[n:n+3];uvSky=projected[...,:2]/projected[...,3:4]*.5+.5
                edge=np.minimum(np.min(uvSky,axis=-1),np.min(1-uvSky,axis=-1));t=np.clip((edge+.01)/.08,0,1);t=t*t*(3-2*t)*(projected[...,3]>0)
                source=linear(sample(tex(mesh['sourceSky']),np.clip(uvSky,0,1))[...,:3]);col=col*(1-t[...,None])+source*t[...,None]
                color=np.concatenate([srgb(col),np.full((*col.shape[:-1],1),255,dtype='uint8')],axis=-1)
            elif flags.get('paintedStrokes'):
                color=sample(texture,bary@uv[n:n+3]);dab=bary@COL[n:n+3];edge=dab[...,0]**2+dab[...,1]**2+.10*np.sin(dab[...,0]*17+dab[...,1]*7)+.06*np.sin(dab[...,1]*29-dab[...,0]*11);valid&=edge<=1
                c=linear(color[...,:3]);hi=c.max(-1);lo=c.min(-1);valid&=~(((hi-lo<.15)&(lo>.43))|((c[...,2]>c[...,1]*1.06)&(c[...,2]>c[...,0]*1.03)))
            elif mesh.get('settings',{}).get('sourceTree') or mesh.get('settings',{}).get('treeImpostor'):
                treeUV=bary@uv[n:n+3]
                if mesh['settings'].get('sourceTree'):treeUV=(treeUV-np.array([bounds[0],1-bounds[3]]))/np.array([bounds[2]-bounds[0],bounds[3]-bounds[1]])
                color=sample(texture,treeUV)
            elif mesh.get('settings',{}).get('paintedSky'):
                direction=wp/np.maximum(1e-9,np.linalg.norm(wp,axis=-1,keepdims=True));t=np.clip(direction[...,1]*1.7,0,1)**.6
                uni=mesh['uniforms'];col=np.array(uni['horizon'])*(1-t[...,None])+np.array(uni['top'])*t[...,None]
                p=linear(sample(texture,direction[...,[0,2]]*1.8+direction[...,1:2]*.3,True)[...,:3]);col*=.96+(p@[.2126,.7152,.0722])[...,None]*.08
                if mesh.get('sourceSky'):
                    projected=bary@R[n:n+3];uvSky=projected[...,:2]/projected[...,3:4]*.5+.5
                    edge=np.maximum(np.maximum(-uvSky,uvSky-1),0);t=np.clip(np.linalg.norm(edge,axis=-1)/.32,0,1);t=(1-t*t*(3-2*t))*(projected[...,3]>0)
                    source=linear(sample(tex(mesh['sourceSky']),np.clip(uvSky,0,1))[...,:3]);col=col*(1-t[...,None])+source*t[...,None]
                color=np.concatenate([srgb(col),np.full((*col.shape[:-1],1),255,dtype='uint8')],axis=-1)
            elif mesh.get('pigment'):
                p=pigment(texture,wp,normal);settings=mesh['settings'];uni=mesh['uniforms']
                if settings.get('shoreClip'):
                    shore=np.where(wp[...,2]<-2.76,-2.38+(wp[...,2]+2.76)*.53,.508+(wp[...,2]+1.47)*2.24);valid&=wp[...,0]<=shore
                col=(bary@COL[n:n+3])*(.88+(p@[.2126,.7152,.0722])[...,None]*.28) if settings.get('vertexColors') else p*np.array(uni['tint'])
                if settings.get('vertexColors') and settings.get('sourceMix',0):col=col*(1-settings['sourceMix'])+p*settings['sourceMix']
                if settings.get('shade'):col*=.88+.12*max(0,normal@np.array([-.4,.85,.3])/np.linalg.norm([-.4,.85,.3]))
                near,far=uni['fogRange'];t=np.clip((np.linalg.norm(wp-eye,axis=-1)-near)/(far-near),0,1);t=t*t*(3-2*t)*.82
                col=col*(1-t[...,None])+np.array(uni['haze'])*t[...,None]
                if settings.get('distanceEnvironment'):
                    target=environment(tex(mesh['environment']),wp-np.array([0,1.68,0]));t=np.clip((np.linalg.norm(wp[...,[0,2]],axis=-1)-12)/33,0,1);t=t*t*(3-2*t);col=col*(1-t[...,None])+target*t[...,None]
                color=np.concatenate([srgb(col),np.full((*col.shape[:-1],1),255,dtype='uint8')],axis=-1)
            elif mesh['projection']:
                projected=bary@R[n:n+3];source=projected[...,:2]/projected[...,3:4]*.5+.5;source[...,1]=1-source[...,1]
                local=(source-bounds[:2])/(bounds[2:]-bounds[:2]);local[...,1]=1-local[...,1]
                wp=bary@P[n:n+3];patchUV=wp[...,[0,2]]*.23+wp[...,1:2]*.19
                color=sample(patch,patchUV,True).copy()
                if mesh.get('triplanar'):color[...,:3]=srgb(pigment(patch,wp,normal))
                bounded=np.clip(local,0,1);edge=np.linalg.norm(local-bounded,axis=-1)
                blend=np.clip(edge/.14,0,1);blend=blend*blend*(3-2*blend);sampled=sample(texture,bounded)
                mixed=sampled*(1-blend[...,None])+color*blend[...,None];use=projected[...,3]>0;color[use]=mixed[use].astype('uint8')
                if flags.get('reliefBlend'):
                    target=relief_sample(tex(mesh['environment']),wp,flags['profile'])
                    frameEdge=np.minimum(np.min(source,axis=-1),np.min(1-source,axis=-1));keep=np.clip(frameEdge/.065,0,1);keep=keep*keep*(3-2*keep)
                    cropFade=np.clip(edge/.08,0,1);keep*=1-cropFade*cropFade*(3-2*cropFade);keep*=use
                    col=target*(1-keep[...,None])+linear(sampled[...,:3])*keep[...,None];color[...,:3]=srgb(col)
                    color[...,3]=(255*(1-keep)+sampled[...,3]*keep).astype('uint8')
            else:color=sample(texture,bary@uv[n:n+3],True)
            if mesh['alpha']:valid&=color[...,3]>=114
            block=image[mn[1]:mx[1]+1,mn[0]:mx[0]+1];block[valid]=color[valid,:3]
            if not mesh['sky']:old[valid]=d[valid]
    return Image.fromarray(image)
for ident in (ids if __name__=='__main__' else []):
    s=json.loads((OUT/f'{ident}.json').read_text());im=raster(s);im.save(OUT/f'{ident}-entrance.png')
    source=Image.open(ROOT/'dist/assets/reference'/f"{s['source']}.webp").convert('RGB').resize(im.size,Image.Resampling.BILINEAR)
    a=np.asarray(im).astype(float);b=np.asarray(source).astype(float);err=np.abs(a-b).mean(axis=-1)
    pair=Image.new('RGB',(im.width*2,im.height+32),(24,32,31));pair.paste(source,(0,32));pair.paste(im,(im.width,32));draw=ImageDraw.Draw(pair);draw.text((10,10),'Original canvas',fill='white');draw.text((im.width+10,10),'Actual reconstructed meshes · CPU raster',fill='white');pair.save(OUT/f'{ident}-comparison.png')
    print(ident,'mean RGB error',round(err.mean(),2),'pixels within 15/255',round(float((err<15).mean()*100),2),flush=True)
    # A second angle reveals occlusion handling and real object sides.
    moved=raster(s,(-.55,0,-.7),-.08);moved.save(OUT/f'{ident}-stepped-in.png')
