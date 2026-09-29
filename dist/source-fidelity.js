import * as THREE from './vendor/three.module.min.js';

// The offline visibility atlas records which physical surface is visible through
// each source pixel. That surface keeps the original paint; its hidden portions
// retain their separate repair texture. This is fixed texture mapping, not a
// screen overlay or a fade back to the original when the camera returns home.
export function preserveVisiblePaint(root,original,atlas,referenceVP){
 atlas.colorSpace=THREE.NoColorSpace;atlas.minFilter=atlas.magFilter=THREE.NearestFilter;atlas.generateMipmaps=false;
 let index=0;
 root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.material.isShaderMaterial)return;
  const m=mesh.material,id=++index;mesh.userData.sourceSurfaceId=id;
  Object.assign(m.uniforms,{originalPaint:{value:original},visibleSurface:{value:atlas},sourceSurfaceId:{value:id},authoredVP:{value:referenceVP}});
  m.vertexShader='varying vec4 authoredP;uniform mat4 authoredVP;\n'+m.vertexShader;
  m.vertexShader=m.vertexShader.replace('void main(){','void main(){authoredP=authoredVP*modelMatrix*vec4(position,1.);');
  m.fragmentShader='varying vec4 authoredP;uniform sampler2D originalPaint;uniform sampler2D visibleSurface;uniform float sourceSurfaceId;\n'+m.fragmentShader;
  m.fragmentShader=m.fragmentShader.replace('#include <colorspace_fragment>',`
   if(authoredP.w>0.){
    vec2 sourceUV=authoredP.xy/authoredP.w*.5+.5;
    if(sourceUV.x>=0.&&sourceUV.x<=1.&&sourceUV.y>=0.&&sourceUV.y<=1.){
     float owner=floor(texture2D(visibleSurface,sourceUV).r*255.+.5);
     if(abs(owner-sourceSurfaceId)<.25)gl_FragColor.rgb=texture2D(originalPaint,sourceUV).rgb;
    }
   }
   #include <colorspace_fragment>`);
  m.userData.sourceSurfaceId=id;
 });
}
