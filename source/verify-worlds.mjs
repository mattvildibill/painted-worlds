import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createWorld} from '../dist/worlds.js';
import {worlds,canOccupy,moveWithCollision,walkHeight} from '../dist/world-data.js';
import {scenes} from '../dist/scenes.js';
import * as THREE from '../dist/vendor/three.module.min.js';
import {surfacePoint} from '../dist/reconstruction.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../dist/assets/manifest.json',import.meta.url)));
const textures=JSON.parse(fs.readFileSync(new URL('../dist/assets/reference/textures.json',import.meta.url)));
assert.equal(scenes.length,61);assert.equal(worlds.length,10);
assert.deepEqual(new Set(scenes.map(s=>s.id)),new Set(Object.keys(manifest)));
for(const def of worlds){
 const w=createWorld(def.id,manifest,null,textures);assert(canOccupy(w,...def.spawn),def.id+' spawn is obstructed');
 assert.deepEqual(def.tour[0],def.spawn,def.id+' tour must begin at the entrance');
 assert.deepEqual(def.tour.at(-1),def.spawn,def.id+' tour must finish at the entrance');
 let triangles=0,meshes=0;w.scene.traverse(o=>{if(!o.isMesh)return;meshes++;const p=o.geometry.attributes.position;for(const v of p.array)assert(Number.isFinite(v));triangles+=(o.geometry.index?.count||p.count)/3});
 assert(meshes<160,def.id+' excessive draw calls');assert(triangles<200000,def.id+' excessive geometry');
 for(let i=0;i<def.tour.length-1;i++){
  const a=def.tour[i],b=def.tour[i+1],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.12);let p=[...a];
  for(let j=0;j<n;j++)p=moveWithCollision(w,...p,(b[0]-a[0])/n,(b[1]-a[1])/n);
  assert(Math.hypot(p[0]-b[0],p[1]-b[1])<.025,def.id+' guided route blocked at segment '+i);
 }
 for(const p of w.portals){assert(worlds.some(d=>d.id===p.to));assert(canOccupy(w,p.x,p.z),def.id+' portal center blocked')}
 if(w.reference){
  assert(w.coherent,def.id+' must use the continuous environment renderer');
  assert(w.surroundRadius<40,def.id+' navigation must stay inside the painted environment');
  const environment=w.root.children.find(m=>m.name==='Continuous distant painted environment');
  assert(environment&&!environment.material.uniforms.sourceSky,def.id+' canvas sky must not be projected onto a background rectangle');
  assert(w.root.children.some(m=>m.name==='Continuous source-painted terrain'),def.id+' missing continuous ground');
  for(const t of w.ownedTextures||[])assert(fs.existsSync(new URL('../dist/assets/reference/'+t.userData.file,import.meta.url)),def.id+' missing loaded texture '+t.userData.file);
  assert.equal(w.reference.source,def.source);assert.deepEqual(def.tour[0],def.tour.at(-1),'Guided route must close without an untested jump');
  for(const layer of w.reference.layers.filter(l=>l.contact!==undefined)){
   const u=(Math.min(...layer.poly.map(p=>p[0]))+Math.max(...layer.poly.map(p=>p[0])))/2;
   assert(Math.abs(surfacePoint(w.reference,w.reference.aspect,layer,u,layer.contact).y)<.00001,def.id+' floating '+layer.name);
  }
  if(['winter-barn','orchard'].includes(def.id)){
   const edges=new Map();
   for(const mesh of w.root.children.filter(m=>m.name.startsWith(def.id==='winter-barn'?'Barn ·':'Cottage ·'))){
    const p=mesh.geometry.attributes.position,point=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(n=>n.toFixed(4)).join(',');
    for(let i=0;i<p.count;i+=3)for(let j=0;j<3;j++){const key=[point(i+j),point(i+(j+1)%3)].sort().join('|');edges.set(key,(edges.get(key)||0)+1);}
   }
   assert(edges.size>10&&[...edges.values()].every(n=>n===2),def.id+' building shell has an unjoined edge');
   const footprint=w.solidFootprints[0],center=footprint.reduce((a,p)=>[a[0]+p[0]/4,a[1]+p[1]/4],[0,0]);assert(!canOccupy(w,...center),def.id+' building interior collision missing');
  }
  for(const item of Object.values(textures[def.id]))assert(fs.existsSync(new URL('../dist/assets/reference/'+item.file,import.meta.url)));
  for(const m of w.referenceMeshes){const p=m.geometry.attributes.position,uv=m.geometry.attributes.uv;for(let i=0;i<p.count;i++){const q=new THREE.Vector3().fromBufferAttribute(p,i).project(w.reference.camera);assert(Math.abs((q.x+1)/2-uv.getX(i))<.000002&&Math.abs((q.y+1)/2-uv.getY(i))<.000002,def.id+' source-camera alignment changed');}}
  if(w.referenceWater.length){const centroid=w.referenceWater.reduce((a,p)=>[a[0]+p[0]/w.referenceWater.length,a[1]+p[1]/w.referenceWater.length],[0,0]);assert(!canOccupy(w,...centroid),def.id+' water collision missing')}
  const wall=w.colliders.find(c=>c.kind==='box');if(wall)assert(!canOccupy(w,wall.x,wall.z),def.id+' solid object collision missing');
  for(const p of def.tour)assert(Number.isFinite(walkHeight(w,...p)),def.id+' invalid walking height');
 }
 assert(!canOccupy(w,def.bounds+10,0));
 if(def.id==='gallery'){assert.equal(w.artworks.length,61);assert.equal(w.portals.length,9)}
 console.log(`${def.id}: ${meshes} meshes, ${Math.round(triangles)} triangles; entrances, guided route, boundaries and collision checks passed.`);w.dispose();
}
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'),app=fs.readFileSync(new URL('../dist/world-app.js',import.meta.url),'utf8');
const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
for(const [,id]of app.matchAll(/\$\('([^']+)'\)/g))assert(ids.has(id),'Missing DOM id '+id);
console.log('All ten worlds and all 61 source references verified.');
