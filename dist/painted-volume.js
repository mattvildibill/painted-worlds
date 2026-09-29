import * as THREE from './vendor/three.module.min.js';
import {foliageSamples} from './foliage-data.js';

// Texture coordinates are in world metres and never depend on the viewing
// camera. Three planes prevent the stretched stripes on near-vertical faces.
export const pigmentGLSL=`
vec3 wash(sampler2D tex,vec2 uv){
 vec2 r=mat2(.8,.6,-.6,.8)*uv;
 return texture2D(tex,uv).rgb*.48+texture2D(tex,r*1.731+vec2(.27,.61)).rgb*.32+texture2D(tex,r*.613+vec2(.71,.23)).rgb*.20;
}
vec3 pigment(sampler2D tex,vec3 p,vec3 normal){
 vec3 w=pow(abs(normal),vec3(4.));w/=max(.001,w.x+w.y+w.z);
 vec3 a=wash(tex,p.zy*.31);
 vec3 b=wash(tex,p.xz*.31);
 vec3 c=wash(tex,p.xy*.31);
 vec3 fine=wash(tex,p.xz*.79+p.xy*.13);
 return (a*w.x+b*w.y+c*w.z)*.78+fine*.22;
}`;
export function pigmentMaterial(patch,{color='#ffffff',vertexColors=false,sourceMix=0,fogColor='#c3cebd',fogNear=45,fogFar=160,shade=true}={}){
 const m=new THREE.ShaderMaterial({side:THREE.DoubleSide,toneMapped:false,vertexColors,uniforms:{pigmentMap:{value:patch},tint:{value:new THREE.Color(color)},haze:{value:new THREE.Color(fogColor)},fogRange:{value:new THREE.Vector2(fogNear,fogFar)}},
 vertexShader:`varying vec3 wp;varying vec3 wn;${vertexColors?'varying vec3 paintColor;':''}
 void main(){vec4 p=modelMatrix*vec4(position,1.);wp=p.xyz;wn=normalize(mat3(modelMatrix)*normal);${vertexColors?'paintColor=color;':''}gl_Position=projectionMatrix*viewMatrix*p;}`,
 fragmentShader:`varying vec3 wp;varying vec3 wn;${vertexColors?'varying vec3 paintColor;':''}
 uniform sampler2D pigmentMap;uniform vec3 tint;uniform vec3 haze;uniform vec2 fogRange;${pigmentGLSL}
 void main(){vec3 n=normalize(wn);vec3 p=pigment(pigmentMap,wp,n);
 ${vertexColors?`vec3 c=mix(paintColor*(.88+dot(p,vec3(.2126,.7152,.0722))*.28),p,${sourceMix.toFixed(3)});`:'vec3 c=p*tint;'}
 ${shade?'c*=.88+.12*max(0.,dot(n,normalize(vec3(-.4,.85,.3))));':''}
 c=mix(c,haze,smoothstep(fogRange.x,fogRange.y,distance(cameraPosition,wp))*.82);
 gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}`});
 m.userData={pigment:true,patch:true,vertexColors,sourceMix,shade,color,fogColor,fogNear,fogFar};return m;
}
export function skyMaterial(patch,top,horizon,source,vp){
 const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,toneMapped:false,uniforms:{pigmentMap:{value:patch},sourceSky:{value:source},referenceVP:{value:vp},top:{value:new THREE.Color(top)},horizon:{value:new THREE.Color(horizon)}},
 vertexShader:'varying vec3 wp;varying vec4 refP;uniform mat4 referenceVP;void main(){wp=position;refP=referenceVP*modelMatrix*vec4(position,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`varying vec3 wp;varying vec4 refP;uniform sampler2D pigmentMap;uniform sampler2D sourceSky;uniform vec3 top;uniform vec3 horizon;
 void main(){vec3 d=normalize(wp);float t=pow(clamp(d.y*1.7,0.,1.),.6);vec3 col=mix(horizon,top,t);vec3 p=texture2D(pigmentMap,d.xz*1.8+d.yy*.3).rgb;col*=.96+dot(p,vec3(.2126,.7152,.0722))*.08;
 if(refP.w>0.){vec2 uv=refP.xy/refP.w*.5+.5;vec2 edge=max(max(-uv,uv-1.),vec2(0.));float fade=1.-smoothstep(0.,.32,length(edge));col=mix(col,texture2D(sourceSky,clamp(uv,vec2(0.),vec2(1.))).rgb,fade);}
 gl_FragColor=vec4(col,1.);\n#include <colorspace_fragment>\n}`});
 m.userData={paintedSky:true,top,horizon};return m;
}
export function foliageGeometry(spec,aspect,layer,index,surfacePoint){
 const samples=foliageSamples[spec.id]?.[index];if(!samples?.length)return null;
 const shape=new THREE.IcosahedronGeometry(1,0),v=shape.attributes.position;
 const positions=[],colors=[],uv=[];const rand=n=>{const x=Math.sin(n*127.1+index*311.7)*43758.5453;return x-Math.floor(x)};
 const tan=Math.tan(spec.fov*Math.PI/360);
 samples.forEach(([u,y,size,r,g,b],i)=>{
  const baseDepth=layer.depth||5;
  const extent=Math.min(2.4,Math.max(.28,baseDepth*.27));
  // Separate full leaf/fruit volumes along the crown's depth envelope. Their
  // reference centres stay within the artist's measured crown silhouette.
  const depth=baseDepth+(rand(i)-.35)*extent;
  const p=surfacePoint(spec,aspect,{...layer,depth,bulge:0},u,y);
  const radius=size*depth*tan*aspect*2.25;
  const red=r>g*1.3&&r>b*1.3;const a=rand(i+110)*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);
  const pigment=new THREE.Color(r,g,b).convertSRGBToLinear();
  for(let n=0;n<v.count;n++){
   const x=v.getX(n)*radius*(red?.8:1.3),yy=v.getY(n)*radius*(red?.85:.58),z=v.getZ(n)*radius*(red?.8:.75);
   positions.push(p.x+x*ca-yy*sa,p.y+x*sa+yy*ca,p.z+z);colors.push(pigment.r,pigment.g,pigment.b);uv.push(u,1-y);
  }
 });
 shape.dispose();const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();return geo;
}
