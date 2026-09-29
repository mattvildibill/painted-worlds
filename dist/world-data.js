import {references} from './reference-data.js';
export const worlds=[
 {id:'gallery',title:'The painting garden',eyebrow:'THE GATEWAY',source:'3177',summary:'Nine paintings open into nine walkable worlds. All 61 originals live in the garden gallery.',spawn:[0,16],yaw:0,sky:['#688f9c','#d4dbc8'],fog:'#ccd1b7',sun:'#fff0c5',ground:['#acae86','#bbb38f','#959b75'],path:'#c2b494',bounds:48,tour:[[0,16],[0,2],[-8,-2],[-10,-12],[0,-17],[10,-12],[8,-2],[0,16]]},
 {id:'lily-lake',title:'Lily Lake',eyebrow:'WATER & MOUNTAINS',source:'3177',summary:'Follow the shore, step onto the wooden jetty, and look back at the mountains from the other side of the lake.',spawn:[0,17],yaw:0,sky:['#7d9faf','#d0d9ca'],fog:'#b7c4be',sun:'#fff0ca',ground:['#9b9869','#888963','#ada777'],path:'#cbb795',bounds:135,tour:[[0,17],[-18,13],[-37,1],[-43,-20],[-34,-42],[-10,-51],[19,-48],[39,-29],[37,-4],[21,13],[0,17]]},
 {id:'rose-peaks',title:'Rose-colored peaks',eyebrow:'THE ALPINE WORLD',source:'6343',summary:'A turquoise lake beneath rose-colored rock. Follow the path between the pines and around the water.',spawn:[0,17],yaw:0,sky:['#63a8b0','#a9d0c1'],fog:'#99b9b1',sun:'#ffe3b6',ground:['#819365','#77967a','#98a477'],path:'#bcac83',bounds:140,tour:[[0,17],[-22,13],[-38,-1],[-43,-20],[-36,-43],[-12,-51],[18,-48],[40,-24],[36,1],[18,14],[0,17]]},
 {id:'canyon',title:'Through the canyon',eyebrow:'THE RED ROCK WORLD',source:'6345',summary:'Walk between complete sandstone walls, follow the bend in the trail, and look up at the sky between the cliffs.',spawn:[0,21],yaw:0,sky:['#52a6b8','#a5cbd0'],fog:'#c5978b',sun:'#ffe1a9',ground:['#b7a57b','#a18d67','#859b79'],path:'#c7ae86',bounds:145,tour:[[0,21],[-4,7],[-7,-9],[-3,-27],[5,-43],[7,-59],[0,-78],[-4,-92],[0,-78],[7,-59],[5,-43],[-3,-27],[-7,-9],[-4,7],[0,21]]},
 {id:'orchard',title:'The orchard garden',eyebrow:'THE COUNTRYSIDE WORLD',source:'2667',summary:'Apple trees, a clothesline, and a cottage with an open doorway. Beyond the garden, a lane leads to a red barn and the fields.',spawn:[0,19],yaw:0,sky:['#91b5b3','#e0dfb8'],fog:'#c7ccaa',sun:'#fff0a2',ground:['#789348','#8a9d4d','#aaa452'],path:'#bca276',bounds:115,tour:[[0,19],[0,4],[8,0],[13,-2],[13,-10],[13,-2],[0,4],[-12,-10],[-18,-25],[-18,-38],[-18,-25],[-23,-12],[-23,12],[0,19]]},
 {id:'coast',title:'The painted coast',eyebrow:'THE COASTAL WORLD',source:'0786',summary:'Explore the headland, walk down to the beach, and visit the boathouse. The coast draws on the sea and harbor paintings.',spawn:[-10,20],yaw:-.34,sky:['#7b9cac','#cdd8d0'],fog:'#bdd0ce',sun:'#fff0ce',ground:['#a7a27e','#909373','#bab08c'],path:'#d0bf99',bounds:145,tour:[[-10,20],[-14,5],[-18,-10],[-22,-26],[-18,-36],[-8,-36],[-18,-36],[-18,-38],[-30,-38],[-18,-38],[-22,-26],[-40,-20],[-30,5],[-10,20]]},
 {id:'village',title:'The village street',eyebrow:'THE VILLAGE WORLD',source:'0169',summary:'Walk along the shopfronts, step inside the café, or turn into the quiet side streets. Every building has real sides and a roof.',spawn:[0,22],yaw:0,sky:['#8bacae','#dedac0'],fog:'#c2c3ae',sun:'#ffe7b2',ground:['#a6a18c','#979c83','#b4ae94'],path:'#b7aa92',bounds:105,tour:[[0,22],[0,10],[0,-5],[0,-19],[0,-36],[0,-54],[0,-69],[-18,-77],[-21,-55],[-21,-25],[-21,24],[0,25],[0,22]]}
];
for(const [id,title,source,summary] of [
 ['pine-trail','The pine trail','9930','Follow the ochre trail through painted pines, rocks and sage, with woodland continuing all around.'],
 ['country-lane','Country lane','2802','Walk the pale twin tracks between olive meadows, tall trees and distant blue hills.'],
 ['winter-barn','Winter barn','7409','Explore the snowy woodland clearing around the red barn and its bare trees.']
])worlds.push({id,title,source,summary,eyebrow:'SURROUNDING PAINTED WORLD',spawn:[0,0],yaw:0,sky:['#aebdb9','#d4d9c8'],fog:'#bbc6b6',sun:'#fff0cc',ground:['#8c9670','#b2ad86','#767d59'],path:'#c5b394',bounds:55,tour:[]});
for(const w of worlds){if(!references[w.id])continue;const r=references[w.id];w.spawn=[0,0];w.yaw=0;w.pitch=Math.atan((2*r.horizon-1)*Math.tan(r.fov*Math.PI/360));w.bounds=r.bounds;w.tour=r.route;}
Object.assign(worlds.find(w=>w.id==='lily-lake'),{summary:'Enter the watercolor at its original viewpoint. Follow the near shore toward the ochre banks and snowy saddle.'});
Object.assign(worlds.find(w=>w.id==='rose-peaks'),{summary:'The towering rose summit, violet shadows, larches and emerald water, reconstructed from this canvas.'});
Object.assign(worlds.find(w=>w.id==='canyon'),{summary:'Walk toward the narrow slot between the great plum and peach cliffs.'});
Object.assign(worlds.find(w=>w.id==='orchard'),{summary:'Stand beneath the apple boughs, beside the laundry and two hens, facing the gray garden house.'});
Object.assign(worlds.find(w=>w.id==='coast'),{title:'Breaking waves',summary:'A low headland, dark rocks and thick white breakers. Explore the sandy edge of the original seascape.'});
Object.assign(worlds.find(w=>w.id==='village'),{title:'The main street',summary:'Walk along the painted sidewalk beside the red awning, projecting shop signs and flower-filled planter.'});
export const worldForPainting=s=>{
 const exact=worlds.find(w=>w.id!=='gallery'&&w.source===s.id);if(exact)return exact.id;
 if(s.id==='6343'||s.id==='6344')return 'rose-peaks';if(s.id==='6345')return 'canyon';
 return ['lily-lake','orchard','coast','village','gallery'][s.group]||'gallery';
};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
export function heightAt(id,x,z){
 if(references[id])return 0;
 if(id==='gallery'||id==='village')return 0;
 if(id==='lily-lake'||id==='rose-peaks'){
  const r=Math.sqrt((x/33)**2+((z+20)/23)**2);
  const waves=(Math.sin(x*.055+z*.025)+Math.cos(z*.068))*.7;
  return r<1?-.95:Math.max(.05,smooth(1.2,2.8,r)*(2.8+waves)+Math.max(0,-z-55)*.025);
 }
 if(id==='canyon')return .08*Math.sin(z*.08)+smooth(12,40,Math.abs(x-6*Math.sin(z*.052)))*3;
 if(id==='orchard')return smooth(24,66,Math.hypot(x,z))*(1.8*Math.sin(x*.036)+2.2*Math.cos(z*.035)+1.8);
 if(id==='coast'){const shore=shoreAt(z);if(x>shore-.35)return -1.1*smooth(shore-.35,shore+1.6,x);return x<-22?smooth(-22,-55,x)*4:0;}
 return 0;
}
export function blockedWater(id,x,z){
 if(id==='lily-lake'||id==='rose-peaks'){
  const onJetty=Math.abs(x-4)<1.5&&z>=-7&&z<=10;
  return !onJetty&&(x/32.7)**2+((z+20)/22.7)**2<1;
 }
 if(id==='coast')return x>shoreAt(z)-.7&&!(z>-38&&z<-34&&x<-2&&x>-24);
 return false;
}
export const shoreAt=z=>8+Math.sin(z*.045)*9;
export function groundAt(id,x,z){
 if(references[id])return 0;
 if((id==='lily-lake'||id==='rose-peaks')&&Math.abs(x-4)<1.5&&z>=-7&&z<=10)return .31;
 if(id==='coast'&&z>-38&&z<-34&&x<-2&&x>-24)return .35;
 return Math.max(heightAt(id,x,z),0);
}
export function walkHeight(world,x,z){let y=world.terrainHeight?.(x,z)??groundAt(world.def.id,x,z);for(const t of world.walkTriangles||[]){const [a,b,c]=t,den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(den)<1e-8)continue;const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den;if(u>=0&&v>=0&&u+v<=1)y=Math.max(y,u*a[1]+v*b[1]+(1-u-v)*c[1]);}for(const f of world.walkSurfaces||[]){const dx=x-f.x,dz=z-f.z,co=Math.cos(f.angle||0),si=Math.sin(f.angle||0);if(Math.abs(dx*co-dz*si)<f.w/2&&Math.abs(dx*si+dz*co)<f.d/2)y=Math.max(y,f.y)}return y;}
export function canOccupy(world,x,z,r=.32){
 if(world.surroundRadius&&Math.hypot(x,z)>world.surroundRadius-r)return false;
 if(world.playArea){const p=world.playArea;if(((x-p.x)/(p.rx-r))**2+((z-p.z)/(p.rz-r))**2>1)return false;}
 if(Math.abs(x)>world.def.bounds-3||Math.abs(z)>world.def.bounds-3)return false;
 if(world.reference){
  const pts=world.referenceWater||[];let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}if(inside)return false;
 }else if(blockedWater(world.def.id,x,z))return false;
 for(const pts of world.solidFootprints||[]){
  let inside=false;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){
   const a=pts[i],b=pts[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
   const dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);
   if(Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<r)return false;
  }
  if(inside)return false;
 }
 for(const c of world.colliders){
  if(c.kind==='circle'&&Math.hypot(x-c.x,z-c.z)<c.r+r)return false;
  if(c.kind==='box'){
   const dx=x-c.x,dz=z-c.z,co=Math.cos(c.angle||0),si=Math.sin(c.angle||0),lx=dx*co-dz*si,lz=dx*si+dz*co;
   if(Math.abs(lx)<c.w/2+r&&Math.abs(lz)<c.d/2+r)return false;
  }
 }
 return true;
}
export function moveWithCollision(world,x,z,dx,dz){
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.18));
 for(let i=0;i<n;i++){
  let nx=x+dx/n,nz=z+dz/n;
  if(canOccupy(world,nx,nz)){x=nx;z=nz;continue}
  if(canOccupy(world,nx,z))x=nx;
  if(canOccupy(world,x,nz))z=nz;
 }
 return [x,z];
}
