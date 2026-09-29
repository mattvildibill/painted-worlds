import * as THREE from './vendor/three.module.min.js';

// Authored depth envelopes, not estimated measurements. Values are image rows,
// top to bottom, sampled around the complete panorama (rear at both ends).
export const reliefProfiles={
 'lily-lake':{radius:32,contact:[.66,.73,.79,.81,.82,.80,.76,.69,.66],sky:[.30,.35,.32,.40,.40,.37,.34,.29,.30]},
 'pine-trail':{radius:25,contact:[.54,.54,.58,.59,.61,.61,.67,.65,.54],sky:[.20,.25,.31,.33,.30,.28,.22,.20,.20]},
 'country-lane':{radius:30,contact:[.64,.63,.66,.67,.64,.65,.65,.62,.64],sky:[.30,.28,.35,.42,.43,.40,.37,.34,.30]},
 'winter-barn':{radius:23,backgroundPatch:[.355,.36,.535,.63,-.25],contact:[.56,.54,.59,.63,.57,.56,.57,.54,.56],sky:[.27,.22,.26,.26,.32,.23,.25,.26,.27]},
 'rose-peaks':{radius:32,contact:[.70,.67,.65,.68,.80,.69,.65,.67,.70],sky:[.26,.29,.32,.25,.18,.25,.30,.28,.26]},
 canyon:{radius:40,contact:[.74,.71,.71,.73,.80,.73,.71,.71,.74],sky:[.18,.16,.14,.20,.30,.20,.14,.16,.18]},
 orchard:{radius:23,backgroundPatch:[.44,.19,.655,.68,-.29],contact:[.70,.68,.68,.72,.77,.72,.68,.68,.70],sky:[.26,.25,.30,.32,.35,.30,.26,.25,.26]},
 coast:{radius:34,contact:[.73,.69,.70,.78,.82,.78,.70,.69,.73],sky:[.43,.43,.43,.44,.44,.44,.43,.43,.43]},
 village:{radius:30,contact:[.75,.71,.70,.72,.80,.72,.70,.71,.75],sky:[.20,.16,.18,.24,.37,.24,.18,.16,.20]}
};
export function profileAt(values,u){const x=((u%1+1)%1)*8,i=Math.floor(x),t=x-i,s=t*t*(3-2*t);return THREE.MathUtils.lerp(values[i],values[i+1],s)}
export function reliefFactor(profile,u){return 1.68/(profile.radius*Math.tan((profileAt(profile.contact,u)-.5)*Math.PI))}
export const environmentTextureGLSL=`
 uniform vec4 backgroundPatch;uniform float backgroundShift;
 vec3 environmentTex(sampler2D map,vec2 uv){
  vec3 c=texture2D(map,uv).rgb;vec2 imageUV=vec2(uv.x,1.-uv.y);
  float edge=min(min(imageUV.x-backgroundPatch.x,backgroundPatch.z-imageUV.x),min(imageUV.y-backgroundPatch.y,backgroundPatch.w-imageUV.y));
  float a=smoothstep(0.,.022,edge);return mix(c,texture2D(map,vec2(fract(uv.x+backgroundShift),uv.y)).rgb,a);
 }
`;
export const reliefGLSL=`
 ${environmentTextureGLSL}
 uniform float reliefRadius;
 uniform float groundContact[9];
 float contactAtU(float u){float x=fract(u)*8.;int i=int(floor(x));float t=fract(x);t=t*t*(3.-2.*t);return mix(groundContact[i],groundContact[i+1],t);}
 vec2 reliefUV(vec3 p){
  vec3 d=p-vec3(0.,1.68,0.);float u=fract(.5+atan(d.x,-d.z)/6.28318530718);
  float pitch=atan(d.y,max(.00001,length(d.xz)));
  if(pitch<0.){float f=1.68/(reliefRadius*tan((contactAtU(u)-.5)*3.14159265359));pitch=atan(tan(pitch)/f);}
  return vec2(u,.5+pitch/3.14159265359);
 }
 vec3 reliefPaint(sampler2D map,vec3 p){vec2 uv=reliefUV(p);vec3 c=environmentTex(map,uv);
  float blend=.5*(1.-smoothstep(0.,.008,min(uv.x,1.-uv.x)));
  return mix(c,environmentTex(map,vec2(1.-uv.x,uv.y)),blend);
 }
`;
export function reliefUniforms(spec){const p=reliefProfiles[spec.id];return {reliefRadius:{value:p.radius},groundContact:{value:p.contact},backgroundPatch:{value:new THREE.Vector4(...(p.backgroundPatch||[0,0,0,0]).slice(0,4))},backgroundShift:{value:p.backgroundPatch?.[4]||0}}}
export function reliefTerrain(spec,x,z){
 if(['village','canyon'].includes(spec.id))return 0;
 const a=Math.abs(Math.atan2(x,-z)),front=THREE.MathUtils.smoothstep(a,.85,1.25),near=THREE.MathUtils.smoothstep(Math.hypot(x,z),2,5);
 const scale=spec.id==='winter-barn'?.10:spec.id==='country-lane'?.32:.20;
 return front*near*scale*(.55+.35*Math.sin(x*.27)*Math.cos(z*.21)+.1*Math.sin(x*.53+z*.32));
}
export function reliefGeometry(spec){
 const profile=reliefProfiles[spec.id],nx=192,ny=100,p=[],uv=[],idx=[];
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
  const u=i/nx,v=j/ny,theta=(u-.5)*Math.PI*2,c=profileAt(profile.contact,u),sky=profileAt(profile.sky,u);
  const a=(.5-v)*Math.PI,phi=a<0?Math.atan(Math.tan(Math.max(-Math.PI/2+.00001,a))*reliefFactor(profile,u)):Math.min(Math.PI/2-.00001,a);
  let radius;
  if(v>=c)radius=1.68/Math.max(.00001,-Math.tan(phi));
  else {const t=THREE.MathUtils.smoothstep(c-v,0,c-sky);radius=THREE.MathUtils.lerp(profile.radius,280*Math.cos(phi),t);}
  let y=v>=c?-.018:1.68+radius*Math.tan(phi);
  if(v>=c)for(let k=0;k<3;k++){y=reliefTerrain(spec,Math.sin(theta)*radius,-Math.cos(theta)*radius)-.018;radius=(1.68-y)/Math.max(.00001,-Math.tan(phi));}
  p.push(Math.sin(theta)*radius,y,-Math.cos(theta)*radius);uv.push(u,1-v);
  if(i<nx&&j<ny){const k=j*(nx+1)+i;idx.push(k,k+1,k+nx+1,k+1,k+nx+2,k+nx+1);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function reliefMaterial(panorama,source,mask,vp,spec){
 const m=new THREE.ShaderMaterial({side:THREE.DoubleSide,toneMapped:false,uniforms:{panorama:{value:panorama},sourceSky:{value:source},skyMask:{value:mask},skyThreshold:{value:1-spec.horizon},skyTone:{value:new THREE.Color(spec.skyColor)},referenceVP:{value:vp},...reliefUniforms(spec)},
 vertexShader:`varying vec2 paintUV;varying vec4 refP;uniform mat4 referenceVP;void main(){paintUV=uv;vec4 p=modelMatrix*vec4(position,1.);refP=referenceVP*p;gl_Position=projectionMatrix*viewMatrix*p;}`,
 fragmentShader:`varying vec2 paintUV;varying vec4 refP;uniform sampler2D panorama;uniform sampler2D sourceSky;uniform sampler2D skyMask;uniform float skyThreshold;uniform vec3 skyTone;${environmentTextureGLSL}
 void main(){vec3 c=environmentTex(panorama,paintUV);float seam=.5*(1.-smoothstep(0.,.008,min(paintUV.x,1.-paintUV.x)));c=mix(c,environmentTex(panorama,vec2(1.-paintUV.x,paintUV.y)),seam);
 if(refP.w>0.){vec2 uv=refP.xy/refP.w*.5+.5;float edge=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));float a=(1.-smoothstep(0.,.40,-edge));vec3 sky=texture2D(sourceSky,vec2(1.)-abs(mod(uv,vec2(2.))-vec2(1.))).rgb;c=mix(c,sky,a);}
 gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}`});
 m.userData={paintedRelief:true,profile:reliefProfiles[spec.id]};return m;
}
export function reliefSurfaceMaterial(panorama,spec){
 const m=new THREE.ShaderMaterial({side:THREE.DoubleSide,toneMapped:false,uniforms:{panorama:{value:panorama},...reliefUniforms(spec)},vertexShader:`varying vec3 wp;void main(){vec4 p=modelMatrix*vec4(position,1.);wp=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`varying vec3 wp;uniform sampler2D panorama;${reliefGLSL}void main(){gl_FragColor=vec4(reliefPaint(panorama,wp),1.);\n#include <colorspace_fragment>\n}`});m.userData={reliefSurface:true,profile:reliefProfiles[spec.id]};return m;
}
