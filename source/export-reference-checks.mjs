// Export actual scene geometry for offline multi-angle visual checks.
// This is not a GPU/browser test.
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.min.js';
import {createWorld} from '../dist/worlds.js';
import {worlds,canOccupy,moveWithCollision,walkHeight} from '../dist/world-data.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../dist/assets/manifest.json',import.meta.url)));
const textures=JSON.parse(fs.readFileSync(new URL('../dist/assets/reference/textures.json',import.meta.url)));
const out=process.argv[2]||'/workspace/painted-worlds-checks';fs.mkdirSync(out,{recursive:true});
for(const def of worlds.slice(1).filter(w=>process.argv.length<4||process.argv.slice(3).includes(w.id))){
 const b=createWorld(def.id,manifest,null,textures),ref=b.reference.camera;
 const meshes=[];let count=0,maxError=0;
 b.scene.updateMatrixWorld(true);
 b.scene.traverse(m=>{
  if(!m.isMesh||!m.material.userData.projection&&!m.material.userData.patch&&!m.material.userData.paintedSky&&!m.material.userData.treeImpostor&&!m.material.userData.sourceTree&&!m.material.userData.paintedRelief&&!m.material.userData.reliefSurface&&!m.material.userData.paintedStrokes)return;
  const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry;
  const p=geo.attributes.position,uv=geo.attributes.uv,positions=[];
  for(let i=0;i<p.count;i++){const q=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);if(!q.toArray().every(Number.isFinite))throw Error(def.id+' nonfinite geometry');positions.push(...q.toArray());}
  const mat=m.material;meshes.push({name:m.name,gl:{vertex:mat.vertexShader,fragment:mat.fragmentShader,model:m.matrixWorld.toArray(),depthWrite:mat.depthWrite,renderOrder:m.renderOrder,surfaceId:m.userData.sourceSurfaceId||0,attributes:Object.fromEntries(Object.entries(geo.attributes).map(([k,a])=>[k,{size:a.itemSize,data:Array.from(a.array)}])),uniforms:Object.fromEntries(Object.entries(mat.uniforms||{}).map(([k,u])=>[k,u.value?.isTexture?{texture:u.value.userData.file,repeat:u.value.wrapS===THREE.RepeatWrapping,colorSpace:u.value.colorSpace,nearest:u.value.magFilter===THREE.NearestFilter}:u.value?.toArray?u.value.toArray():u.value]))},transformCenter:m.position.toArray(),positions,strokeOffset:geo.attributes.strokeOffset?Array.from(geo.attributes.strokeOffset.array):null,strokeScale:geo.attributes.strokeScale?Array.from(geo.attributes.strokeScale.array):null,uv:uv?Array.from(uv.array):Array(p.count*2).fill(0),colors:geo.attributes.color?Array.from(geo.attributes.color.array):null,pigment:mat.userData.pigment||false,triplanar:mat.userData.triplanar||false,settings:mat.userData,uniforms:Object.fromEntries(['tint','haze','fogRange','top','horizon'].filter(k=>mat.uniforms?.[k]).map(k=>[k,mat.uniforms[k].value.toArray()])),projection:!!mat.userData.projection,alpha:mat.userData.alpha||mat.userData.treeImpostor||mat.userData.sourceTree||false,bounds:mat.userData.bounds||[0,0,1,1],environment:mat.uniforms?.panorama?.value.userData.file,texture:((mat.userData.surroundingEnvironment||mat.userData.paintedRelief||mat.userData.reliefSurface)?mat.uniforms?.panorama?.value.userData.file:null)||mat.uniforms?.paint?.value.userData.file||mat.uniforms?.pigmentMap?.value.userData.file||mat.map?.userData.file,patch:mat.uniforms?.continuation?.value.userData.file,sourceSky:mat.uniforms?.sourceSky?.value.userData.file,skyMask:mat.uniforms?.skyMask?.value.userData.file,sky:m.name==='Painted sky'});count+=p.count/3;
 });
 for(const m of b.referenceMeshes){const p=m.geometry.attributes.position,uv=m.geometry.attributes.uv;for(let i=0;i<p.count;i++){const q=new THREE.Vector3().fromBufferAttribute(p,i).project(ref);maxError=Math.max(maxError,Math.abs((q.x+1)/2-uv.getX(i)),Math.abs((q.y+1)/2-uv.getY(i)));}}
 let pos=[0,0],failure=null;for(const point of def.tour){for(let i=0;i<2000&&Math.hypot(point[0]-pos[0],point[1]-pos[1])>.1;i++){const dx=point[0]-pos[0],dz=point[1]-pos[1],len=Math.hypot(dx,dz);pos=moveWithCollision(b,...pos,dx/len*.08,dz/len*.08)}if(Math.hypot(point[0]-pos[0],point[1]-pos[1])>.5){failure={goal:point,stopped:pos,colliders:b.colliders.filter(c=>Math.hypot(c.x-pos[0],c.z-pos[1])<3)};break}}
 const walk=def.tour[2]||def.tour[1],snapshot={forwardPose:(()=>{const p=def.tour.find(p=>p[1]<-2)||def.tour[1];return [p[0],walkHeight(b,...p),p[1]]})(),walkPose:[walk[0],walkHeight(b,...walk),walk[1]],id:def.id,source:def.source,aspect:b.reference.aspect,fov:b.reference.fov,pitch:ref.rotation.x,referenceVP:ref.projectionMatrix.clone().multiply(ref.matrixWorldInverse).toArray(),meshes};
 fs.writeFileSync(`${out}/${def.id}.json`,JSON.stringify(snapshot));
 console.log(JSON.stringify({id:def.id,triangles:count,referenceProjectionError:maxError,spawnFree:canOccupy(b,0,0),routeFailure:failure}));b.dispose();
}
