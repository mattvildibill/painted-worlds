import * as THREE from './vendor/three.module.min.js';
import {foliageSamples} from './foliage-data.js';

// Each small source-painted stroke occupies its own depth, rather than turning
// an entire tree as one card or replacing the crown with faceted solids.
export function paintedFoliage(spec,aspect,layer,index,surfacePoint,painting){
 const samples=foliageSamples[spec.id]?.[index];if(!samples?.length)return null;
 const positions=[],uv=[],offsets=[],sizes=[],colors=[];
 const tan=Math.tan(spec.fov*Math.PI/360),rand=n=>{const x=Math.sin(n*127.1+index*311.7)*43758.5453;return x-Math.floor(x)};
 const corners=[[-1,-1],[1,-1],[-1,1],[1,-1],[1,1],[-1,1]];
 samples.forEach(([u,v,size],i)=>{
  const depth=(layer.depth||7)+(rand(i)-.5)*Math.min(1.4,(layer.depth||7)*.16);
  const center=surfacePoint(spec,aspect,{...layer,depth,bulge:0},u,v);
  const r=size*depth*tan*aspect*1.6;
  for(const [x,y]of corners){positions.push(...center.toArray());offsets.push(x,y);sizes.push(r,r*.72);uv.push(u+x*size*.80,1-v+y*size*.80*aspect*.72);colors.push(x,y,0)}
 });
 const geometry=new THREE.BufferGeometry();for(const [name,data,n]of [['position',positions,3],['uv',uv,2],['strokeOffset',offsets,2],['strokeScale',sizes,2],['color',colors,3]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(data,n));
 geometry.computeBoundingSphere();
 const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,toneMapped:false,uniforms:{paint:{value:painting}},vertexShader:`attribute vec2 strokeOffset;attribute vec2 strokeScale;varying vec2 paintUV;varying vec2 dab;void main(){paintUV=uv;dab=strokeOffset;vec3 toward=normalize(vec3(cameraPosition.x-position.x,0.,cameraPosition.z-position.z));vec3 right=vec3(toward.z,0.,-toward.x);vec3 p=position+right*strokeOffset.x*strokeScale.x+vec3(0.,strokeOffset.y*strokeScale.y,0.);gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
 fragmentShader:`varying vec2 paintUV;varying vec2 dab;uniform sampler2D paint;void main(){float edge=dot(dab,dab)+.10*sin(dab.x*17.+dab.y*7.)+.06*sin(dab.y*29.-dab.x*11.);if(edge>1.)discard;vec3 c=texture2D(paint,paintUV).rgb;float hi=max(c.r,max(c.g,c.b)),lo=min(c.r,min(c.g,c.b));if((hi-lo<.15&&lo>.43)||(c.b>c.g*1.06&&c.b>c.r*1.03&&lo>.28))discard;gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}`});
 material.userData={paintedStrokes:true};return {geometry,material};
}
