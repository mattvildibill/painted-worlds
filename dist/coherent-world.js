import * as THREE from './vendor/three.module.min.js';
import {references} from './reference-data.js';
import {reliefGeometry,reliefGLSL,reliefUniforms,reliefProfiles,environmentTextureGLSL} from './painted-relief.js';
import {volumeFields} from './coherent-data.js';
import {scenes} from './scenes.js';
import {aspectFor} from './geometry.js';

const pigment=`
vec3 pigmentAt(sampler2D tex,vec3 p,vec3 n){
 vec3 w=pow(abs(n),vec3(5.));w/=max(.001,w.x+w.y+w.z);
 vec3 a=texture2D(tex,p.zy*.083).rgb,b=texture2D(tex,p.xz*.083).rgb,c=texture2D(tex,p.xy*.083).rgb;
 return a*w.x+b*w.y+c*w.z;
}`;
function material(patch,{source=null,vp=null,mask=null,uvPaint=false,fullSource=false,bounds=[0,0,1,1],sky=false}={}){
 const m=new THREE.ShaderMaterial({side:THREE.DoubleSide,toneMapped:false,uniforms:{patch:{value:patch},paint:{value:source||patch},sourceMask:{value:mask||patch},hasMask:{value:!!mask},sourceVP:{value:vp||new THREE.Matrix4()},crop:{value:new THREE.Vector4(...bounds)},useUV:{value:uvPaint},hasSource:{value:!!source},fullSource:{value:fullSource},sky:{value:sky}},
 vertexShader:`varying vec3 wp;varying vec3 wn;varying vec2 ownUV;varying vec4 refP;uniform mat4 sourceVP;void main(){vec4 w=modelMatrix*vec4(position,1.);wp=w.xyz;wn=normalize(mat3(modelMatrix)*normal);ownUV=uv;refP=sourceVP*w;gl_Position=projectionMatrix*viewMatrix*w;}`,
 fragmentShader:`varying vec3 wp;varying vec3 wn;varying vec2 ownUV;varying vec4 refP;uniform sampler2D patch;uniform sampler2D paint;uniform sampler2D sourceMask;uniform bool hasMask;uniform bool useUV;uniform bool hasSource;uniform bool fullSource;uniform bool sky;uniform vec4 crop;${pigment}
 void main(){vec3 n=normalize(wn);vec3 c=pigmentAt(patch,wp,n);vec2 uv=useUV?ownUV:refP.xy/refP.w*.5+.5;
 if(sky){vec3 d=normalize(wp-vec3(0.,1.68,0.));c=texture2D(patch,vec2(atan(d.x,-d.z)*.48,d.y*.8)).rgb;}
 if(useUV)uv=clamp(vec2(1.)-abs(mod(uv,vec2(2.))-vec2(1.)),vec2(.012),vec2(.988));
 if(hasSource&&(useUV||refP.w>0.)){
  float e=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));
  if(hasMask&&useUV&&texture2D(sourceMask,uv).r<.5)discard;
  vec2 local=(vec2(uv.x,1.-uv.y)-crop.xy)/(crop.zw-crop.xy);
  vec2 pUV=vec2(local.x,1.-local.y);if(!useUV)pUV=vec2(1.)-abs(mod(pUV,vec2(2.))-vec2(1.));float ce=min(min(local.x,1.-local.x),min(local.y,1.-local.y));
  float a=useUV?1.:(1.-smoothstep(0.,.32,-e));
  if(!fullSource)a*=1.-smoothstep(0.,.22,-ce);
  if(hasMask&&!useUV)a*=texture2D(sourceMask,uv).r;
  vec3 painted=texture2D(paint,clamp(pUV,vec2(.012),vec2(.988))).rgb;
  c=mix(c,painted,a);
 }
 gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}`});
 m.userData={projection:!!source,patch:true,coherentPaint:true};return m;
}
function geometric(triangles,vp){const p=[],uv=[];for(const tri of triangles)for(const v of tri){p.push(...v.toArray());const q=v.clone().applyMatrix4(vp);uv.push(q.x*.5+.5,q.y*.5+.5);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;}
function closeSurface(front,layer,thickness,vp){
 const a=front.attributes.position,tri=[];const offset=new THREE.Vector3(layer.plane?.[0]||0,0,layer.plane?.[2]||-1).normalize().multiplyScalar(thickness);
 const behind=p=>{const q=p.clone().add(offset);if(['ridge','mound'].includes(layer.kind))q.y=-.018;return q;};
 const verts=[];for(let i=0;i<a.count;i++)verts.push(new THREE.Vector3().fromBufferAttribute(a,i));
 const edges=new Map(),key=p=>p.toArray().map(x=>x.toFixed(5)).join(',');
 for(let i=0;i<verts.length;i+=3){tri.push([behind(verts[i+2]),behind(verts[i+1]),behind(verts[i])]);for(let j=0;j<3;j++){const a=verts[i+j],b=verts[i+(j+1)%3],k=[key(a),key(b)].sort().join('|');if(edges.has(k))edges.delete(k);else edges.set(k,[a,b]);}}
 for(const [a,b]of edges.values())tri.push([a,b,behind(a)],[b,behind(b),behind(a)]);
 return geometric(tri,vp);
}
function roundedObject(spec,aspect,layer,field,H){
 const {rect,nx,ny}=field,data=Uint8Array.from(atob(field.field),c=>c.charCodeAt(0));const base={...layer,bulge:0};
 if(spec.id==='village'&&[7,8].includes(layer.index)){delete base.contact;base.depth=4.9;}
 const p=[],uv=[],weights=[],indices=[],thickness=layer.kind==='tree'?Math.max(.14,Math.min(layer.thickness||.5,1.4)):Math.max(.08,layer.thickness||.2);
 for(const side of [1,-1])for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){
  const u=THREE.MathUtils.lerp(rect[0],rect[2],x/nx),v=THREE.MathUtils.lerp(rect[1],rect[3],y/ny),q=H.surfacePoint(spec,aspect,base,u,v),ray=q.clone().sub(new THREE.Vector3(0,1.68,0));
  const depth=data[y*(nx+1)+x]/255*thickness;ray.multiplyScalar(1-side*depth/Math.max(.5,-ray.z));q.copy(ray).add(new THREE.Vector3(0,1.68,0));p.push(...q.toArray());uv.push(u,1-v);weights.push(side===1?1:0);
 }
 const N=(nx+1)*(ny+1);for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const a=y*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;if(!(data[a]||data[b]||data[c]||data[d]))continue;
  indices.push(a,b,c,b,d,c,N+c,N+b,N+a,N+c,N+d,N+b);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('sourceWeight',new THREE.Float32BufferAttribute(weights,1));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function buildCoherentWorld(b,textureManifest,H){
 const spec=structuredClone(references[b.def.id]),id=spec.id,aspect=aspectFor(scenes.find(s=>s.id===spec.source),b.manifest[spec.source]);
 const camera=H.referenceCamera(spec,aspect),vp=camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse);b.reference={...spec,aspect,camera};b.coherent=true;b.referenceMeshes=[];b.referenceWater=[];b.walkTriangles=[];b.navigationPolygons=[];b.surroundRadius=Math.min(spec.bounds-3,reliefProfiles[id].radius*.90);
 for(const o of [...b.scene.children])if(o!==b.root)b.scene.remove(o);b.scene.fog=null;b.scene.background=new THREE.Color(spec.skyColor);
 const cache=new Map(),pending=[],loader=typeof document==='undefined'?null:new THREE.TextureLoader();b.ownedTextures=[];
 const load=(file,repeat=false)=>{if(cache.has(file))return cache.get(file);let resolve,reject;const ready=loader?new Promise((a,c)=>{resolve=a;reject=c}):null,t=loader?loader.load('/assets/reference/'+file,resolve,undefined,reject):new THREE.Texture();t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.userData.file=file;if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;cache.set(file,t);b.ownedTextures.push(t);if(ready)pending.push(ready);return t;};
 const add=(g,m,name)=>{const mesh=new THREE.Mesh(g,m);mesh.name=name;mesh.frustumCulled=false;mesh.userData.noBatch=true;b.root.add(mesh);return mesh;};
 const patch=kind=>load(`${id}-${kind}-patch.webp`,true),groundPatch=patch('ground'),skyPatch=patch('sky');
 const panorama=load(id==='orchard'?'orchard-background.webp':`${id}-panorama.webp`);const envelope=reliefGeometry(spec);const ep=envelope.attributes.position;for(let i=0;i<ep.count;i++)if(ep.getY(i)<.25)ep.setY(i,-.04);envelope.computeVertexNormals();
 const backdrop=material(skyPatch);Object.assign(backdrop.uniforms,reliefUniforms(spec),{panorama:{value:panorama}});if(id==='orchard'){backdrop.uniforms.backgroundPatch.value.set(0,0,0,0);backdrop.uniforms.backgroundShift.value=0;}backdrop.vertexShader='varying vec2 paintUV;void main(){paintUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';backdrop.fragmentShader=`varying vec2 paintUV;uniform sampler2D panorama;${environmentTextureGLSL}void main(){vec3 c=environmentTex(panorama,paintUV);float seam=.5*(1.-smoothstep(0.,.008,min(paintUV.x,1.-paintUV.x)));c=mix(c,environmentTex(panorama,vec2(1.-paintUV.x,paintUV.y)),seam);gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}`;
 if(!['orchard','village'].includes(id)){
  Object.assign(backdrop.uniforms,{sourceAtmosphere:{value:load(id==='winter-barn'?'winter-barn-woodland.webp':`${id}-sky.webp`)},referenceVP:{value:vp},skyCut:{value:1-spec.horizon}});
  backdrop.vertexShader='varying vec2 paintUV;varying vec4 sourcePoint;uniform mat4 referenceVP;void main(){paintUV=uv;vec4 p=modelMatrix*vec4(position,1.);sourcePoint=referenceVP*p;gl_Position=projectionMatrix*viewMatrix*p;}';
  backdrop.fragmentShader=backdrop.fragmentShader.replace('varying vec2 paintUV;', 'varying vec2 paintUV;varying vec4 sourcePoint;uniform sampler2D sourceAtmosphere;uniform float skyCut;').replace('gl_FragColor=vec4(c,1.);', `if(sourcePoint.w>0.){vec2 uv=sourcePoint.xy/sourcePoint.w*.5+.5;float edge=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));float a=(1.-smoothstep(0.,.5,-edge))*${id==='winter-barn'?'1.':'smoothstep(skyCut-.025,skyCut+.055,uv.y)'};vec2 sampleUV=clamp(vec2(1.)-abs(mod(uv,vec2(2.))-vec2(1.)),vec2(.012),vec2(.988));c=mix(c,texture2D(sourceAtmosphere,sampleUV).rgb,a);}gl_FragColor=vec4(c,1.);`);
 }
 const sky=add(envelope,backdrop,'Continuous distant painted environment');sky.material.depthWrite=false;sky.renderOrder=-10;
 // A single ground surface continues beneath every scene object in all directions.
 const terrain=new THREE.PlaneGeometry(260,260,100,100);terrain.rotateX(-Math.PI/2);terrain.translate(0,-.012,0);
 const ground=material(groundPatch,{source:load(`${id}-coherent-ground.webp`),vp,fullSource:true,mask:load(`${id}-coherent-ground-mask.webp`)});
 Object.assign(ground.uniforms,reliefUniforms(spec),{panorama:{value:panorama}});if(id==='orchard'){ground.uniforms.backgroundPatch.value.set(0,0,0,0);ground.uniforms.backgroundShift.value=0;}
 if(['orchard','village'].includes(id))ground.fragmentShader=ground.fragmentShader.replace('float a=useUV?1.:(1.-smoothstep(0.,.32,-e));',`float a=useUV?1.:smoothstep(-.12,.02,e);a*=1.-smoothstep(${id==='orchard'?.365:.385},${id==='orchard'?.385:.405},uv.y);`);ground.fragmentShader=ground.fragmentShader.replace('void main(){',`uniform sampler2D panorama;${reliefGLSL}void main(){`).replace('vec3 c=pigmentAt(patch,wp,n);','vec3 c=reliefPaint(panorama,wp);');add(terrain,ground,'Continuous source-painted terrain');b.terrainHeight=()=>0;
 const skip=new Set(id==='orchard'?[1,2]:id==='village'?[0,2]:id==='winter-barn'?[0,1,2,3,4]:[]);
 const sourceMat=(i,alpha=false)=>{
  const m=material(patch(i),{source:load(`${id}-${i}-surface.webp`),vp,uvPaint:alpha,fullSource:true,mask:alpha?load(`${id}-${i}-coherent-mask.png`):null});
  if(alpha){
   m.vertexShader='attribute float sourceWeight;varying float ownedPaint;'+m.vertexShader.replace('ownUV=uv;', 'ownUV=uv;ownedPaint=sourceWeight;');
   m.fragmentShader='varying float ownedPaint;'+m.fragmentShader.replace('if(hasMask&&useUV&&texture2D(sourceMask,uv).r<.5)discard;','if(hasMask&&useUV&&ownedPaint>.5&&texture2D(sourceMask,uv).r<.5)discard;').replace('c=mix(c,painted,a);','c=mix(c,painted,a*ownedPaint);');
  }
  if(spec.layers[i].kind==='ridge'){
   Object.assign(m.uniforms,reliefUniforms(spec),{panorama:{value:panorama}});if(id==='orchard')m.uniforms.backgroundPatch.value.set(0,0,0,0);
   m.fragmentShader=m.fragmentShader.replace('void main(){',`uniform sampler2D panorama;${reliefGLSL}void main(){`).replace('vec3 c=pigmentAt(patch,wp,n);','vec3 c=reliefPaint(panorama,wp);');
  }
  if(id==='village'&&i===0){
   // Texture continuation follows the wall in world space and has building-size
   // windows and brushwork, instead of enlarging a tiny white plaster patch.
   m.fragmentShader=m.fragmentShader.replace('vec3 c=pigmentAt(patch,wp,n);','vec2 wallUV=vec2(.36+.62*(1.-abs(mod((wp.z+4.)*.095,2.)-1.)),clamp(wp.y/10.,.005,.94));vec3 c=texture2D(paint,wallUV).rgb;');
  }
  return m;
 };
 // Each subject now owns a physical surface; original pixels are never painted
 // onto a separate background visibility card.
 for(let i=0;i<spec.layers.length;i++){
  const layer={...spec.layers[i],index:i};if(skip.has(i)||['ground','backdrop'].includes(layer.kind))continue;
  if(id==='village'&&i===8){layer.depth=4.9;layer.thickness=1.65;}
  if(id==='orchard'&&i===3){delete layer.contact;layer.depth=16;}
  if(id==='orchard'&&i===0){layer.thickness=16;}
  const field=volumeFields[id]?.[i],organic=!!field;
  const g=organic?roundedObject(spec,aspect,layer,field,H):H.surfaceGeometry(spec,aspect,layer);
  let m;
  if(['water','wave'].includes(layer.kind)){
   const info=textureManifest[id][String(i)];m=material(patch(i),{source:load(info.file),vp,bounds:info.bounds,fullSource:layer.kind==='water'});
  }else m=sourceMat(i,organic);
  const mesh=add(g,m,layer.name+' · sculpted');if(!organic)b.referenceMeshes.push(mesh);
  if(!organic&&layer.thickness){add(closeSurface(g,layer,layer.thickness,vp),(layer.kind==='mound'||['canyon','coast'].includes(id))?sourceMat(i):material(patch(i)),layer.name+' · closed sides');}
  if(layer.kind==='ridge'&&id!=='orchard'){
   const us=layer.poly.map(p=>p[0]);
   for(let u=Math.max(-.3,Math.min(...us));u<=Math.min(1.3,Math.max(...us));u+=.025){
    let foot=layer.foot;
    if(layer.footline){const f=layer.footline;foot=f.at(-1)[1];for(let k=0;k<f.length-1;k++)if(u<=f[k+1][0]){foot=THREE.MathUtils.lerp(f[k][1],f[k+1][1],THREE.MathUtils.clamp((u-f[k][0])/(f[k+1][0]-f[k][0]),0,1));break;}}
    if(foot===undefined)continue;const q=H.surfacePoint(spec,aspect,layer,u,foot);b.colliders.push({kind:'circle',x:q.x,z:q.z,r:.30});
   }
  }
  if(id==='orchard'&&i===0){const a=g.attributes.position;for(let j=0;j<a.count;j+=3)b.walkTriangles.push([j,j+1,j+2].map(k=>[a.getX(k),a.getY(k),a.getZ(k)]));}
  if(['prop','figure','trunk','sign'].includes(layer.kind)||layer.kind==='tree'&&layer.contact!==undefined&&layer.contact<.84){
   const u=layer.poly.reduce((n,p)=>n+p[0],0)/layer.poly.length,foot=layer.contact??Math.max(...layer.poly.map(p=>p[1])),q=H.surfacePoint(spec,aspect,layer,u,foot);
   if(q.y<1&&Math.abs(q.x)<5&&q.z>-15&&layer.kind!=='sign')b.colliders.push({kind:'circle',x:q.x,z:q.z,r:layer.kind==='tree'?.12:.18});
  }
 }
 // Closed architecture uses shared vertices rather than independently projected slabs.
 const shell=(front,back,matFront,matSide,name)=>{
  const axis=front.at(-1).clone().sub(front[0]).normalize();const cap=pts=>THREE.ShapeUtils.triangulateShape(pts.map(p=>new THREE.Vector2(axis.dot(p),p.y)),[]).map(t=>t.map(i=>pts[i]));
  add(geometric(cap(front),vp),matFront,`${name} · front`);add(geometric(cap(back),vp),matSide,`${name} · back`);
  const sides=[];for(let i=0;i<front.length;i++){const j=(i+1)%front.length;sides.push([front[i],back[i],front[j]],[front[j],back[i],back[j]]);}add(geometric(sides,vp),matSide,`${name} · joined sides and roof`);
  b.solidFootprints??=[];b.solidFootprints.push([front[0],front.at(-1),back.at(-1),back[0]].map(p=>[p.x,p.z]));
 };
 if(id==='orchard'){
  const profile=[[.518,.602],[.508,.247],[.699,.011],[.846,.136],[.855,.606]],A=H.groundPoint(spec,aspect,...profile[0]),C=H.groundPoint(spec,aspect,...profile.at(-1)),axis=C.clone().sub(A).normalize(),n=new THREE.Vector3(axis.z,0,-axis.x),k=n.dot(A);
  const front=profile.map(p=>{const r=H.referenceRay(spec,aspect,...p);return r.multiplyScalar(k/n.dot(r)).add(new THREE.Vector3(0,1.68,0));});
  const back=front.map(p=>p.clone().add(new THREE.Vector3(2.4,0,-4.6)));shell(front,back,sourceMat(1),material(patch(1)),'Cottage');
 }
 if(id==='winter-barn'){
  const pr=spec.barnProfile,A=H.groundPoint(spec,aspect,...pr.front[0]),C=H.groundPoint(spec,aspect,...pr.front.at(-1)),B=H.groundPoint(spec,aspect,...pr.rear[0]),axis=C.clone().sub(A).normalize(),n=new THREE.Vector3(axis.z,0,-axis.x);
  const hit=(uv,k)=>{const r=H.referenceRay(spec,aspect,...uv);return r.multiplyScalar(k/n.dot(r)).add(new THREE.Vector3(0,1.68,0));},front=pr.front.map(p=>hit(p,n.dot(A))),back=pr.rear.map(p=>hit(p,n.dot(B)));
  for(let i=pr.front.length-pr.ridge-2;i>=0;i--)back.push(back[i].clone().addScaledVector(axis,-2*axis.dot(back[i].clone().sub(back[pr.ridge]))));
  const cap=pts=>THREE.ShapeUtils.triangulateShape(pts.map(p=>new THREE.Vector2(axis.dot(p),p.y)),[]).map(t=>t.map(i=>pts[i]));
  add(geometric(cap(front),vp),sourceMat(4),'Barn · front');add(geometric(cap(back),vp),material(patch(2)),'Barn · back');
  for(let i=0;i<front.length;i++){const j=(i+1)%front.length;add(geometric([[front[i],back[i],front[j]],[front[j],back[i],back[j]]],vp),i<pr.ridge?sourceMat(i===0?2:3):material(patch(i===front.length-1?2:3)),`Barn · side ${i}`);}
  b.solidFootprints??=[];b.solidFootprints.push([front[0],front.at(-1),back.at(-1),back[0]].map(p=>[p.x,p.z]));
 }
 if(id==='village'){
  const layer={...spec.layers[0],plane:[1,0,-.428271,3.947949]};
  const front=H.surfaceGeometry(spec,aspect,layer);add(front,sourceMat(0),'Street · grounded facade');add(closeSurface(front,layer,8,vp),sourceMat(0),'Street · roofs and building backs');
  for(let z=-60;z<=18;z+=1)b.colliders.push({kind:'circle',x:.428271*z+3.95,z,r:.32});
  const curb=new THREE.BoxGeometry(.13,.16,115,1,1,60),a=curb.attributes.position;for(let i=0;i<a.count;i++){const z=a.getZ(i)-15;a.setXYZ(i,a.getX(i)+.428271*z+.10,a.getY(i)+.04,z);}curb.computeVertexNormals();add(curb,material(groundPatch),'Street · continuous curb');
  b.colliders.push({kind:'circle',x:-1.969,z:-4.786,r:.28});
 }
 b.referenceWater=spec.water?spec.water.map(([u,v])=>{const q=H.groundPoint(spec,aspect,u,v,.006);return [q.x,q.z]}):[];
 b.def.spawn=[0,0];b.def.yaw=0;b.def.pitch=camera.rotation.x;b.def.bounds=spec.bounds;b.def.tour=spec.route;
 b.art(spec.source,0,2.4,4.4,3.5,Math.PI,'gallery');b.points=[{x:0,z:0,label:'Canvas viewpoint'},{x:0,z:4.4,label:'Garden portal'}];b.ready=Promise.all(pending);
 const dispose=b.dispose.bind(b);b.dispose=()=>{for(const t of b.ownedTextures)t.dispose();dispose();};return b;
}
