import * as THREE from './vendor/three.module.min.js';
import {worlds,heightAt,shoreAt,smooth,clamp} from './world-data.js';
import {scenes} from './scenes.js';
import {cropPoint,aspectFor} from './geometry.js';
import {buildReconstruction} from './reconstruction.js';

const TAU=Math.PI*2;
export function seeded(seed){let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
const hash=(x,z)=>{const a=Math.sin(x*12.9898+z*78.233)*43758.5453;return a-Math.floor(a)};
function routeDistance(route,x,z){let d=Infinity;for(let i=0;i<route.length-1;i++){const a=route[i],b=route[i+1],dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);d=Math.min(d,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t))}return d}
const mixColor=(a,b,t)=>new THREE.Color(a).lerp(new THREE.Color(b),t);
const shaderNoise=`
float hashP(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noiseP(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hashP(i),hashP(i+vec3(1,0,0)),f.x),mix(hashP(i+vec3(0,1,0)),hashP(i+vec3(1,1,0)),f.x),f.y),mix(mix(hashP(i+vec3(0,0,1)),hashP(i+vec3(1,0,1)),f.x),mix(hashP(i+vec3(0,1,1)),hashP(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
function paintMaterial(color,{vertexColors=false,flat=false}={}){
 const mat=new THREE.MeshStandardMaterial({color,roughness:1,metalness:0,flatShading:flat,vertexColors});
 mat.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vPaintP;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPaintP=(modelMatrix*vec4(position,1.0)).xyz;');
  shader.fragmentShader='varying vec3 vPaintP;\n'+shaderNoise+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float coarse=noiseP(vPaintP*vec3(2.5,5.,2.5));
    float stroke=noiseP(vPaintP*vec3(35.,8.,23.));
    float grain=noiseP(vPaintP*vec3(120.,120.,120.));
    diffuseColor.rgb*=.87+coarse*.16+stroke*.08+grain*.035;`);
 };mat.customProgramCacheKey=()=>`paint-v2-${vertexColors}-${flat}`;return mat;
}
function buildSky(def,clock){return new THREE.Mesh(new THREE.SphereGeometry(500,28,18),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{topColor:{value:new THREE.Color(def.sky[0])},lowColor:{value:new THREE.Color(def.sky[1])},time:clock},vertexShader:'varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 vPos;uniform vec3 topColor;uniform vec3 lowColor;uniform float time;${shaderNoise}
 void main(){vec3 d=normalize(vPos);float h=clamp(d.y*1.6,0.,1.);vec3 col=mix(lowColor,topColor,pow(h,.55));float n=noiseP(d*7.+vec3(time*.007,0.,0.))*.7+noiseP(d*17.)*.3;float cloud=smoothstep(.48,.68,n)*smoothstep(.04,.19,d.y);col=mix(col,vec3(.85,.85,.72),cloud*.66);gl_FragColor=vec4(col,1.);#include <tonemapping_fragment>
 #include <colorspace_fragment>}`.replace(';#include',';\n#include')}))}

class Builder{
 constructor(def,manifest,loadTexture){this.def=def;this.manifest=manifest;this.loadTexture=loadTexture;this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog(def.fog,75,270);this.root=new THREE.Group();this.scene.add(this.root);this.colliders=[];this.walkSurfaces=[];this.portals=[];this.artworks=[];this.materials=new Map();this.dynamic=[];this.clock={value:0};this.rng=seeded(751+worlds.indexOf(def)*211);this.points=[];this.disposed=false;
  this.scene.add(buildSky(def,this.clock));this.scene.add(new THREE.HemisphereLight(def.sky[1],'#5f614d',1.35));const sun=new THREE.DirectionalLight(def.sun,2.3);sun.position.set(-55,95,40);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-65;sun.shadow.camera.right=65;sun.shadow.camera.top=65;sun.shadow.camera.bottom=-65;sun.shadow.camera.far=260;sun.shadow.normalBias=.055;sun.shadow.bias=-.0005;this.scene.add(sun);this.sun=sun;
 }
 mat(c,opts={}){const key=c+JSON.stringify(opts);if(!this.materials.has(key))this.materials.set(key,paintMaterial(c,opts));return this.materials.get(key)}
 add(g,m,x,y,z,parent=this.root){const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
 box(x,y,z,w,h,d,c,parent=this.root){return this.add(new THREE.BoxGeometry(w,h,d),this.mat(c),x,y,z,parent)}
 cyl(x,y,z,rt,rb,h,c,n=7,parent=this.root){return this.add(new THREE.CylinderGeometry(rt,rb,h,n),this.mat(c,{flat:true}),x,y,z,parent)}
 rock(x,z,s=1,c='#8f8c72',y=null){if(routeDistance(this.def.tour,x,z)<s+1)return null;const r=this.rng,g=new THREE.DodecahedronGeometry(1,0);const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)*(1+r()*.15),p.getY(i)*(1+r()*.2),p.getZ(i)*(1+r()*.15));g.computeVertexNormals();const m=this.add(g,this.mat(c,{flat:true}),x,(y??heightAt(this.def.id,x,z))+.4*s,z);m.scale.set(s,.63*s,s*.8);m.rotation.set(r()*.2,r()*TAU,r()*.2);if(s>.7)this.colliders.push({kind:'circle',x,z,r:s*.63});return m}
 tree(x,z,s=1,type='pine',palette=null,fruit=false){
  if(routeDistance(this.def.tour,x,z)<.35*s+.6)return;const r=this.rng,y=heightAt(this.def.id,x,z),colors=palette||(type==='pine'?['#354b40','#465747','#637047','#727b50']:['#657a41','#7f8c48','#96a052','#54663e']);
  this.cyl(x,y+2.1*s,z,.11*s,.22*s,4.2*s,'#6d6046');this.colliders.push({kind:'circle',x,z,r:.24*s});
  if(type==='pine'){
   for(let tier=0;tier<4;tier++){const g=new THREE.ConeGeometry((1.6-tier*.31)*s,(2.4-tier*.26)*s,9,2),p=g.attributes.position;for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i));const jitter=1+.11*Math.sin(a*5+tier);p.setXYZ(i,p.getX(i)*jitter,p.getY(i),p.getZ(i)*jitter)}g.computeVertexNormals();const m=this.add(g,this.mat(colors[tier],{flat:true}),x,y+(2+tier*1.0)*s,z);m.rotation.y=tier*1.37}
  }else{
   for(let i=0;i<9;i++){const a=i*2.4,rad=i<6?1.5*s:.7*s,xx=x+Math.cos(a)*rad,zz=z+Math.sin(a)*rad,yy=y+(4.1+(i%3)*.52)*s;const g=new THREE.IcosahedronGeometry(1,1);const m=this.add(g,this.mat(colors[i%4],{flat:true}),xx,yy,zz);m.scale.set((1.2+r()*.5)*s,(.8+r()*.4)*s,(1.1+r()*.5)*s);m.rotation.y=r()*TAU;if(i<6){const branch=new THREE.Vector3(xx-x,yy-y-2,zz-z);const cyl=this.cyl(x+branch.x*.5,y+2+branch.y*.5,z+branch.z*.5,.06*s,.12*s,branch.length(),'#75624a');cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),branch.normalize())}if(fruit)for(let j=0;j<4;j++){this.add(new THREE.IcosahedronGeometry(.11*s,0),this.mat(j%2?'#b9422e':'#d06936'),xx+(r()-.5)*1.6*s,yy-.7*s,zz+(r()-.5)*1.6*s)}}
  }
 }
 terrain(size=280,segments=140){
  const g=new THREE.PlaneGeometry(size,size,segments,segments);g.rotateX(-Math.PI/2);const p=g.attributes.position,colors=[];
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,heightAt(this.def.id,x,z));const t=(Math.sin(x*.079+z*.031)*.4+Math.cos(z*.087-x*.05)*.4+hash(x,z)*.2+1)/2,c=mixColor(this.def.ground[0],this.def.ground[t>.57?1:2],Math.abs(t-.5)*1.8);colors.push(c.r,c.g,c.b)}g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();const m=this.add(g,this.mat('#ffffff',{vertexColors:true}),0,0,0);m.castShadow=false;
 }
 path(points,width=2.5,color=null){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],0,p[1]))),samples=curve.getPoints(Math.max(48,points.length*14)),positions=[],colors=[],indices=[];
  for(let i=0;i<samples.length;i++){const p=samples[i],t=curve.getTangent(i/(samples.length-1)),side=new THREE.Vector3(-t.z,0,t.x);for(const n of [-1,1]){const x=p.x+side.x*width*.5*n,z=p.z+side.z*width*.5*n;positions.push(x,heightAt(this.def.id,x,z)+.027,z);const c=mixColor(color||this.def.path,'#d3c5a0',hash(i,n)*.16);colors.push(c.r,c.g,c.b)}if(i<samples.length-1){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3)}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();this.add(g,this.mat('#ffffff',{vertexColors:true}),0,0,0).castShadow=false;
 }
 mountain(x,z,radius,height,palette,snow=false,seed=1){
  const r=seeded(seed),n=15,levels=10,positions=[],colors=[],indices=[];const factors=Array.from({length:n},()=>.76+r()*.4);const base=heightAt(this.def.id,x,z)-1;
  for(let j=0;j<=levels;j++){const f=j/levels,rad=radius*Math.pow(1-f, .8);for(let i=0;i<=n;i++){const a=i/n*TAU,idx=i%n;const rr=rad*factors[idx]*(1+Math.sin(j*1.2+idx)*.055),yy=base+f*height+(j===0||j===levels?0:(r()-.5)*height*.04);positions.push(x+Math.cos(a)*rr+Math.sin(f*4)*radius*.1,yy,z+Math.sin(a)*rr);let c=new THREE.Color(palette[(Math.floor(i/2)+Math.floor(j/3))%palette.length]);if(snow&&f>.68+r()*.18)c=new THREE.Color(['#e4e0cd','#cad5cf','#f1e7cb'][i%3]);colors.push(c.r,c.g,c.b)}}
  for(let j=0;j<levels;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i;indices.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();const m=this.add(g,this.mat('#ffffff',{vertexColors:true,flat:true}),0,0,0);m.castShadow=false;this.colliders.push({kind:'circle',x,z,r:radius*1.10});
 }
 water(x,z,w,d,palette,lake=false){
  const g=lake?new THREE.CircleGeometry(1,96):new THREE.PlaneGeometry(w,d,48,48);g.rotateX(-Math.PI/2);if(lake)g.scale(w/2,1,d/2);
  const m=new THREE.ShaderMaterial({uniforms:{time:this.clock,deep:{value:new THREE.Color(palette[0])},light:{value:new THREE.Color(palette[1])},foam:{value:new THREE.Color(palette[2])},isLake:{value:lake?1:0},center:{value:new THREE.Vector2(x,z)},scaleW:{value:new THREE.Vector2(w/2,d/2)}},vertexShader:'varying vec3 vWP;void main(){vec4 wp=modelMatrix*vec4(position,1.);vWP=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}',fragmentShader:`varying vec3 vWP;uniform float time;uniform vec3 deep;uniform vec3 light;uniform vec3 foam;uniform float isLake;uniform vec2 center;uniform vec2 scaleW;${shaderNoise}
  void main(){vec2 p=vWP.xz;float a=noiseP(vec3(p.x*.12,p.y*.65,time*.06));float b=noiseP(vec3(p.x*.035,p.y*.3,time*.018));vec3 c=mix(deep,light,smoothstep(.25,.78,b));float wave=pow(max(0.,sin(p.y*1.6+p.x*.18+time*.75+a*3.)),16.);float shore=isLake>.5?smoothstep(.90,1.,length((p-center)/scaleW)):1.-smoothstep(0.,12.,p.x-(8.+sin(p.y*.045)*9.));c=mix(c,foam,wave*(.05+shore*.34));c*=.94+a*.12;gl_FragColor=vec4(c,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>}`});const mesh=this.add(g,m,x,-.08,z);mesh.castShadow=false;mesh.receiveShadow=false;mesh.userData.noBatch=true;return mesh;
 }
 flower(x,z,c='#e5cf73',s=1){const y=heightAt(this.def.id,x,z);this.cyl(x,y+.2*s,z,.018,.025,.4*s,'#5a753a',4);const m=this.add(new THREE.IcosahedronGeometry(.11*s,0),this.mat(c,{flat:true}),x,y+.4*s,z);m.scale.set(1,.55,1)}
 fence(points){for(let i=0;i<points.length-1;i++){const a=new THREE.Vector3(points[i][0],0,points[i][1]),b=new THREE.Vector3(points[i+1][0],0,points[i+1][1]),n=Math.ceil(a.distanceTo(b)/2.4);for(let j=0;j<n;j++){const p=a.clone().lerp(b,j/n),q=a.clone().lerp(b,(j+1)/n),y=heightAt(this.def.id,p.x,p.z);this.box(p.x,y+.65,p.z,.12,1.3,.12,'#8b795d');for(const h of [.43,.97]){const beam=this.box((p.x+q.x)/2,y+h,(p.z+q.z)/2,.09,.11,p.distanceTo(q),'#afa17d');beam.rotation.y=Math.atan2(q.x-p.x,q.z-p.z)}this.colliders.push({kind:'box',x:(p.x+q.x)/2,z:(p.z+q.z)/2,w:.11,d:p.distanceTo(q),angle:Math.atan2(q.x-p.x,q.z-p.z)})}}}
 textLabel(text,x,y,z,width=4,angle=0){
  if(typeof document==='undefined')return;
  const c=document.createElement('canvas');c.width=1024;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#202c2be8';ctx.fillRect(0,0,1024,192);ctx.strokeStyle='#ccb985';ctx.lineWidth=5;ctx.strokeRect(9,9,1006,174);ctx.font='48px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f5e5bd';ctx.fillText(text,512,96,950);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const mesh=this.add(new THREE.PlaneGeometry(width,width*192/1024),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}),x,y,z);mesh.rotation.y=angle;mesh.userData.noBatch=true;mesh.castShadow=false;
 }
 art(id,x,y,z,w=3,angle=0,portalTo=null){
  const source=scenes.find(s=>s.id===id),a=aspectFor(source,this.manifest[id]);const h=w/a,group=new THREE.Group();if(portalTo)y=h/2+.3+heightAt(this.def.id,x,z);group.position.set(x,y,z);group.rotation.y=angle;this.root.add(group);
  const thickness=portalTo?.16:.08,frame=portalTo?'#bc965a':'#63583e';
  this.box(0,0,-.045,w+.3,h+.3,.15,'#423e31',group);
  for(const sign of [-1,1]){this.box(sign*(w/2+.075),0,.06,.15,h+.3,thickness,frame,group);this.box(0,sign*(h/2+.075),.06,w,.15,thickness,frame,group)}
  const geo=new THREE.PlaneGeometry(w,h),uv=geo.attributes.uv;for(let i=0;i<uv.count;i++){const p=cropPoint(source,uv.getX(i),1-uv.getY(i));uv.setXY(i,p[0],1-p[1])}const material=new THREE.MeshBasicMaterial({color:'#c8c2a1',side:THREE.DoubleSide,toneMapped:false});const mesh=this.add(geo,material,0,0,.06,group);mesh.userData.noBatch=true;mesh.castShadow=false;
  if(this.loadTexture)this.loadTexture(id,!!portalTo?false:true).then(t=>{if(!this.disposed){material.map=t;material.color.set('#ffffff');material.needsUpdate=true}}).catch(()=>{});
  if(portalTo){
   this.portals.push({x,z,y,w,h,angle,to:portalTo,source:id,title:portalTo==='gallery'?'Return to the painting garden':worlds.find(q=>q.id===portalTo).title});
   // Only the frame posts block movement. Crossing the image activates the portal.
   const co=Math.cos(angle),si=Math.sin(angle);for(const sign of [-1,1]){const dx=sign*(w/2+.12);this.colliders.push({kind:'circle',x:x+dx*co,z:z-dx*si,r:.2})}
   this.textLabel(portalTo==='gallery'?'Return to the painting garden':worlds.find(q=>q.id===portalTo).title,x,y+h/2+.65,z,w+.5,angle);
   this.textLabel('STEP THROUGH',x,Math.max(.35,y-h/2-.38),z,w*.58,angle);
  }else this.artworks.push({id,x,y,z,title:source.title});
 }
 building({x,z,w=7,d=7,h=4.8,color='#c6bca0',roof='#565b58',angle=0,open=false,sign=null,barn=false}){
  const y=heightAt(this.def.id,x,z),group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=angle;this.root.add(group);
  const addWall=(lx,ly,lz,ww,hh,dd,c=color)=>{this.box(lx,ly,lz,ww,hh,dd,c,group);const co=Math.cos(angle),si=Math.sin(angle);this.colliders.push({kind:'box',x:x+lx*co+lz*si,z:z-lx*si+lz*co,w:ww,d:dd,angle})};
  const door=barn?3.3:1.6,doorH=barn?3.1:2.6;
  addWall(-w/2,h/2,0,.25,h,d);addWall(w/2,h/2,0,.25,h,d);addWall(0,h/2,-d/2,w,h,.25);
  if(open){addWall(-(w+door)/4,h/2,d/2,(w-door)/2,h,.25);addWall((w+door)/4,h/2,d/2,(w-door)/2,h,.25);this.box(0,(h+doorH)/2,d/2,door,h-doorH,.25,color,group)}else addWall(0,h/2,d/2,w,h,.25);
  this.box(0,.025,0,w,.05,d,'#a59273',group);this.walkSurfaces.push({x,z,w,d,angle,y:y+.05});
  const roofH=barn?2.8:2.2,verts=new Float32Array([-w/2-.35,h,-d/2-.4,w/2+.35,h,-d/2-.4,0,h+roofH,-d/2-.4,-w/2-.35,h,d/2+.4,w/2+.35,h,d/2+.4,0,h+roofH,d/2+.4]);
  const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.BufferAttribute(verts,3));rg.setIndex([0,2,1,3,4,5,0,3,2,2,3,5,2,5,1,1,5,4,0,1,3,1,4,3]);rg.computeVertexNormals();this.add(rg,this.mat(roof,{flat:true}),0,0,0,group);
  if(!barn){this.box(w*.26,h+1.6,-d*.2,.65,2.4,.75,'#b5a18a',group);
   for(const side of [-1,1]){const px=side*w*.30;for(const yy of (h>6?[1.9,4.4]:[2.0])){this.box(px,yy,d/2+.16,1.14,1.45,.09,'#e3d6ad',group);this.box(px,yy,d/2+.22,.93,1.25,.08,'#3c5b60',group);this.box(px,yy,d/2+.28,.055,1.27,.055,'#d2c6a3',group);this.box(px,yy,d/2+.28,.95,.055,.055,'#d2c6a3',group);for(const sh of [-1,1])this.box(px+sh*.72,yy,d/2+.18,.27,1.50,.08,'#637366',group)}}
  }
  if(open){
   // An actual furnished interior, accessible through the open doorway.
   if(barn){for(const bx of [-w*.33,w*.33])for(let j=0;j<3;j++)this.box(bx,.45+j*.48,-d*.27,1.5,.75,1.3,j%2?'#bfa659':'#d6ba6b',group)}
   else{this.box(-w*.27,.74,-d*.20,1.8,.12,1.15,'#846a4b',group);for(const xx of [-w*.27-.68,-w*.27+.68])for(const zz of [-d*.2-.4,-d*.2+.4])this.box(xx,.38,zz,.1,.76,.1,'#5e5845',group);this.cyl(-w*.27,.90,-d*.2,.19,.16,.25,'#d7c9a5',8,group);this.box(w*.27,.95,-d*.35,1.25,1.9,.42,'#6a654a',group);for(let i=0;i<4;i++)this.box(w*.27,.2+i*.48,-d*.35,1.28,.055,.45,'#aa9268',group);for(let i=0;i<7;i++)this.box(w*.27-.5+i*.14,.91,-d*.34,.10,.42,.29,['#9c6550','#89917a','#b9a879'][i%3],group)}
  }
  if(open){const items=barn?[[-w*.33,-d*.27,1.5,1.3],[w*.33,-d*.27,1.5,1.3]]:[[-w*.27,-d*.2,1.8,1.15],[w*.27,-d*.35,1.25,.45]];for(const [lx,lz,ww,dd] of items){const co=Math.cos(angle),si=Math.sin(angle);this.colliders.push({kind:'box',x:x+lx*co+lz*si,z:z-lx*si+lz*co,w:ww,d:dd,angle})}}
  if(sign){const xx=x+(d/2+.33)*Math.sin(angle),zz=z+(d/2+.33)*Math.cos(angle);this.textLabel(sign,xx,y+h-.65,zz,w*.65,angle)}
 }
 boat(x,z,s=1,color='#548b85',sail=false){
  const group=new THREE.Group();group.position.set(x,.02,z);this.root.add(group);const shape=new THREE.Shape();shape.moveTo(0,-2.2*s);shape.quadraticCurveTo(1.05*s,-1.15*s,.82*s,1.5*s);shape.quadraticCurveTo(0,2*s,-.82*s,1.5*s);shape.quadraticCurveTo(-1.05*s,-1.15*s,0,-2.2*s);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.48*s,bevelEnabled:true,bevelThickness:.1,bevelSize:.07,bevelSegments:1,steps:1});geo.rotateX(-Math.PI/2);this.add(geo,this.mat(color),0,0,0,group);this.box(0,.51*s,0,1.27*s,.03,2.45*s,'#b7ae8e',group);for(const zz of [-.8,.7])this.box(0,.63*s,zz*s,1.36*s,.08,.35*s,'#817e61',group);
  if(sail){this.cyl(0,2.7*s,0,.045*s,.07*s,5.4*s,'#8e7d62',6,group);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([.1,1,0,.1,5.1,0,2.2,1,0,-.1,1,0,-.1,4.5,0,-1.35,1,0].map(v=>v*s),3));g.computeVertexNormals();const sailMat=this.mat('#eee4cc');sailMat.side=THREE.DoubleSide;this.add(g,sailMat,0,0,0,group)}
 }
 jetty(x,z,length=14,width=2.6,angle=0){const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=angle;this.root.add(group);for(let i=0;i<Math.ceil(length/.38);i++)this.box(0,.21,-length/2+i*.38,width,.20,.35,i%3?'#a89976':'#817b66',group);for(let i=0;i<=length;i+=3)for(const sign of [-1,1])this.cyl(sign*width*.49,.35,-length/2+i,.07,.10,1.5,'#74654e',6,group)}
 finish(){
  // Merge static geometry by material so hundreds of modeled objects remain inexpensive.
  this.root.updateMatrixWorld(true);const batches=new Map(),remove=[];
  this.root.traverse(m=>{if(!m.isMesh||m.userData.noBatch||m.material.isShaderMaterial||m.material.map)return;const key=m.material.uuid+'-'+m.castShadow;let bucket=batches.get(key);if(!bucket){bucket={material:m.material,cast:m.castShadow,parts:[]};batches.set(key,bucket)}let g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrixWorld);bucket.parts.push(g);remove.push(m)});
  for(const m of remove){m.parent.remove(m);m.geometry.dispose()}
  for(const batch of batches.values()){
   const g=new THREE.BufferGeometry(),all=batch.parts;for(const attr of ['position','normal','color']){if(!all[0].attributes[attr])continue;const size=all[0].attributes[attr].itemSize,total=all.reduce((n,p)=>n+p.attributes[attr].array.length,0),arr=new Float32Array(total);let offset=0;for(const part of all){arr.set(part.attributes[attr].array,offset);offset+=part.attributes[attr].array.length}g.setAttribute(attr,new THREE.BufferAttribute(arr,size))}g.computeBoundingSphere();const mesh=new THREE.Mesh(g,batch.material);mesh.castShadow=batch.cast;mesh.receiveShadow=true;this.scene.add(mesh);all.forEach(g=>g.dispose())
  }return this;
 }
 dispose(){this.disposed=true;const geos=new Set(),mats=new Set();this.scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m))});geos.forEach(g=>g.dispose());mats.forEach(m=>{if(m.map?.isCanvasTexture)m.map.dispose();m.dispose()});this.sun.shadow.map?.dispose();}
}

function galleryWorld(b){
 b.terrain(140,50);b.box(0,-.08,-2,77,.14,77,'#b9ae90');
 // Garden paving; short joints and borders stay part of the navigable environment.
 for(let i=-36;i<=36;i+=3){b.box(i,.006,-2,.018,.012,74,'#9b997f');b.box(0,.006,i-2,74,.012,.018,'#9b997f')}
 const placements=[[-14,-3,.62],[-20,-18,.90],[-10,-28,.30],[10,-28,-.30],[20,-18,-.90],[14,-3,-.62],[-24,19,2.3],[0,27,Math.PI],[24,19,-2.3]];
 worlds.slice(1).forEach((d,i)=>{const [x,z,a]=placements[i];const s=scenes.find(s=>s.id===d.source),aspect=aspectFor(s,b.manifest[d.source]),w=6.2,h=w/aspect;b.art(d.source,x,h/2+.3,z,w,a,d.id);b.path([[0,9],[x*.5,z*.5],[x,z+1]],2.8)});
 // The perimeter gallery contains every source painting, including still lifes and studies.
 const walls=[{x:0,z:-38,w:78,d:.4,a:0},{x:-39,z:0,w:78,d:.4,a:Math.PI/2},{x:39,z:0,w:78,d:.4,a:-Math.PI/2},{x:0,z:38,w:78,d:.4,a:Math.PI}];
 for(const w of walls){const m=b.box(w.x,2.4,w.z,w.w,4.8,w.d,'#c9c7ad');m.rotation.y=w.a;b.colliders.push({kind:'box',x:w.x,z:w.z,w:w.w,d:w.d,angle:w.a})}
 scenes.forEach((s,i)=>{const wall=walls[Math.floor(i/16)],n=i%16,local=-35+n*4.65,x=wall.x+local*Math.cos(wall.a)+.26*Math.sin(wall.a),z=wall.z-local*Math.sin(wall.a)+.26*Math.cos(wall.a);b.art(s.id,x,2.35,z,2.8,wall.a);});
 for(const [x,z]of [[-28,8],[28,8],[-29,-28],[29,-28],[-26,26],[26,26]]){b.cyl(x,.35,z,2.1,2.15,.7,'#9e9678',12);b.tree(x,z,1.2,'oak');b.colliders.push({kind:'circle',x,z,r:2.2})}
 for(const x of [-12,12]){b.box(x,.43,17,4,.2,1,'#8f876c');for(const sign of [-1,1])b.box(x+sign*1.4,.2,17,.22,.45,.7,'#706c57');b.colliders.push({kind:'box',x,z:17,w:4,d:1})}
 b.textLabel('THE PAINTING GARDEN',0,5.25,-38,12);b.points=placements.map((p,i)=>({x:p[0],z:p[1],label:worlds[i+1].title}));
}
export function createWorld(id,manifest,loadTexture=null,textureManifest=null){const def=worlds.find(d=>d.id===id);if(!def)throw new Error('Unknown world');const b=new Builder(def,manifest,loadTexture);if(id==='gallery')galleryWorld(b);else if(textureManifest)buildReconstruction(b,textureManifest);else throw new Error('Painted surface textures are required');return b.finish()}
