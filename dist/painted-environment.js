import * as THREE from './vendor/three.module.min.js';

export const surroundingWorlds=new Set(['lily-lake','pine-trail','country-lane','winter-barn','rose-peaks','canyon','orchard','coast','village']);
export const panoramaGLSL=`
vec3 surroundingPaint(sampler2D map,vec3 direction){
 vec3 d=normalize(direction);float u=fract(.5+atan(d.x,-d.z)/6.28318530718);
 float v=.5+asin(clamp(d.y,-1.,1.))/3.14159265359;
 vec3 c=texture2D(map,vec2(u,v)).rgb;
 float seam=.5*(1.-smoothstep(0.,.015,min(u,1.-u)));
 return mix(c,texture2D(map,vec2(1.-u,v)).rgb,seam);
}`;

// Complete distant environment, with a fixed world direction. Camera rotation
// reveals different painted scenery; it never stretches the original canvas.
export function environmentMaterial(panorama,source,vp){
 const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,toneMapped:false,
  uniforms:{panorama:{value:panorama},sourceSky:{value:source},referenceVP:{value:vp}},
  vertexShader:`varying vec3 worldP;varying vec4 refP;uniform mat4 referenceVP;void main(){vec4 p=modelMatrix*vec4(position,1.);worldP=p.xyz;refP=referenceVP*p;gl_Position=projectionMatrix*viewMatrix*p;}`,
  fragmentShader:`varying vec3 worldP;varying vec4 refP;uniform sampler2D panorama;uniform sampler2D sourceSky;${panoramaGLSL}
  void main(){vec3 c=surroundingPaint(panorama,worldP-vec3(0.,1.68,0.));
   if(refP.w>0.){vec2 uv=refP.xy/refP.w*.5+.5;float edge=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));float a=smoothstep(-.01,.07,edge);c=mix(c,texture2D(sourceSky,clamp(uv,vec2(0.),vec2(1.))).rgb,a);}
   gl_FragColor=vec4(c,1.);
   #include <colorspace_fragment>
  }`});
 m.userData={paintedSky:true,surroundingEnvironment:true};return m;
}

// Cylindrical tree impostors keep fine extracted brush marks at middle distance.
// Nearby trunks/branches, terrain and rocks remain physical geometry.
export function treeImpostorMaterial(map,spec){
 const m=new THREE.ShaderMaterial({side:THREE.DoubleSide,toneMapped:false,uniforms:{paint:{value:map}},
  vertexShader:`varying vec2 paintUV;void main(){paintUV=uv;vec3 center=(modelMatrix*vec4(0.,0.,0.,1.)).xyz;vec3 toward=normalize(vec3(cameraPosition.x-center.x,0.,cameraPosition.z-center.z));vec3 right=vec3(toward.z,0.,-toward.x);vec3 p=center+right*position.x+vec3(0.,position.y,0.)+toward*.24;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
  fragmentShader:`varying vec2 paintUV;uniform sampler2D paint;void main(){vec4 c=texture2D(paint,paintUV);if(c.a<.52)discard;gl_FragColor=vec4(c.rgb,1.);
  #include <colorspace_fragment>
  }`});m.userData={treeImpostor:true,file:map.userData.file};return m;
}

export function meetPaintedDistance(material,panorama){
 material.uniforms.panorama={value:panorama};
 material.fragmentShader=material.fragmentShader.replace('void main(){',`uniform sampler2D panorama;${panoramaGLSL}\nvoid main(){`).replace('gl_FragColor=vec4(c,1.);','c=mix(c,surroundingPaint(panorama,wp-vec3(0.,1.68,0.)),smoothstep(12.,45.,length(wp.xz)));gl_FragColor=vec4(c,1.);');
 material.userData.distanceEnvironment=true;return material;
}

export function sourceTreeMaterial(map,bounds,geometry){
 geometry.computeBoundingBox();const center=geometry.boundingBox.getCenter(new THREE.Vector3());center.y=0;
 const m=new THREE.ShaderMaterial({side:THREE.DoubleSide,toneMapped:false,uniforms:{paint:{value:map},crop:{value:new THREE.Vector4(...bounds)},pivot:{value:center},referenceAngle:{value:Math.atan2(-center.x,-center.z)}},
 vertexShader:`varying vec2 paintUV;uniform vec3 pivot;uniform float referenceAngle;void main(){paintUV=uv;float a=atan(cameraPosition.x-pivot.x,cameraPosition.z-pivot.z)-referenceAngle;vec3 d=position-pivot;vec3 p=pivot+vec3(cos(a)*d.x+sin(a)*d.z,d.y,-sin(a)*d.x+cos(a)*d.z);gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
 fragmentShader:`varying vec2 paintUV;uniform sampler2D paint;uniform vec4 crop;void main(){vec2 uv=vec2((paintUV.x-crop.x)/(crop.z-crop.x),(paintUV.y-1.+crop.w)/(crop.w-crop.y));vec4 c=texture2D(paint,uv);if(c.a<.5)discard;gl_FragColor=vec4(c.rgb,1.);
 #include <colorspace_fragment>
 }`});
 m.userData={sourceTree:true,bounds,pivot:center.toArray(),referenceAngle:Math.atan2(-center.x,-center.z)};return m;
}
