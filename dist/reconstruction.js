import * as THREE from './vendor/three.module.min.js';
import {buildCoherentWorld} from './coherent-world.js';

// World coordinates are metres. Each object's surface is reconstructed separately
// from explicit planes, ground contact, depth and silhouette, never one depth sheet.
export function referenceCamera(spec,aspect){
 const camera=new THREE.PerspectiveCamera(spec.fov,aspect,.035,1200);
 camera.position.set(0,1.68,0);camera.rotation.x=Math.atan((2*spec.horizon-1)*Math.tan(spec.fov*Math.PI/360));
 camera.updateMatrixWorld();camera.updateProjectionMatrix();return camera;
}
export function referenceRay(spec,aspect,u,v){
 const t=Math.tan(spec.fov*Math.PI/360),p=Math.atan((2*spec.horizon-1)*t),c=Math.cos(p),s=Math.sin(p),y=(1-2*v)*t;
 return new THREE.Vector3((u*2-1)*t*aspect,y*c+s,y*s-c);
}
export function groundPoint(spec,aspect,u,v,height=0){
 const d=referenceRay(spec,aspect,u,v),distance=(height-1.68)/Math.min(-.0001,d.y);
 return d.multiplyScalar(Math.min(700,distance)).add(new THREE.Vector3(0,1.68,0));
}
function contactAt(layer,u){if(!layer.footline)return layer.foot;const a=layer.footline;for(let i=0;i<a.length-1;i++)if(u<=a[i+1][0]){const t=Math.max(0,Math.min(1,(u-a[i][0])/(a[i+1][0]-a[i][0])));return a[i][1]+(a[i+1][1]-a[i][1])*t}return a.at(-1)[1];}
export function surfacePoint(spec,aspect,layer,u,v){
 const d=referenceRay(spec,aspect,u,v);let t;
 if(layer.kind==='ground'||layer.kind==='water')return groundPoint(spec,aspect,u,v,layer.kind==='water'?.006:.002+(layer.index||0)*.0008);
 if(layer.kind==='wave'){
  const vs=layer.poly.map(p=>p[1]),lo=Math.min(...vs),hi=Math.max(...vs),f=Math.max(0,Math.sin(Math.PI*(v-lo)/(hi-lo)));
  return groundPoint(spec,aspect,u,v,(layer.height||.15)*f+.014);
 }
 if(layer.plane){const [a,b,c,k]=layer.plane;t=(k-b*1.68)/(a*d.x+b*d.y+c*d.z);t=Math.min(300,Math.max(.25,t));}
 else{
  let depth=layer.depth;if(layer.contact!==undefined)depth=-groundPoint(spec,aspect,(Math.min(...layer.poly.map(p=>p[0]))+Math.max(...layer.poly.map(p=>p[0])))/2,layer.contact).z;
  if(depth===undefined){
   const foot=contactAt(layer,u)??Math.max(...layer.poly.map(p=>p[1]));
   const top=Math.min(...layer.poly.map(p=>p[1]));
   // The foot sits on the floor. Height and recession create an actual mountain
   // mass; distinct ridges do not inherit the depth of foreground trees.
   const footDepth=-groundPoint(spec,aspect,u,Math.max(foot,spec.horizon+.025)).z;
   const f=Math.max(0,Math.min(1,(foot-v)/Math.max(.02,foot-top)));
   const near=footDepth;
   depth=near+((layer.far??near)-near)*Math.pow(f,.72);
   if(v>spec.horizon+.012){const floorDepth=-groundPoint(spec,aspect,u,v).z;depth=Math.min(depth,floorDepth*(1-.18*Math.sin(Math.PI*f)));}
  }
  if(layer.bulge){const us=layer.poly.map(p=>p[0]),vs=layer.poly.map(p=>p[1]),cx=(Math.min(...us)+Math.max(...us))/2,cy=(Math.min(...vs)+Math.max(...vs))/2,rx=(Math.max(...us)-Math.min(...us))/2,ry=(Math.max(...vs)-Math.min(...vs))/2;depth-=layer.bulge*Math.max(0,1-((u-cx)/rx)**2-((v-cy)/ry)**2);}
  t=depth/-d.z;
 }
 return d.multiplyScalar(t).add(new THREE.Vector3(0,1.68,0));
}
function subdivide(a,b,c,out,depth=0){
 const ab=a.distanceTo(b),bc=b.distanceTo(c),ca=c.distanceTo(a);
 if(Math.max(ab,bc,ca)<.045||depth>9){out.push(a,b,c);return;}
 if(ab>=bc&&ab>=ca){const m=a.clone().lerp(b,.5);subdivide(a,m,c,out,depth+1);subdivide(m,b,c,out,depth+1)}
 else if(bc>=ca){const m=b.clone().lerp(c,.5);subdivide(a,b,m,out,depth+1);subdivide(a,m,c,out,depth+1)}
 else{const m=c.clone().lerp(a,.5);subdivide(a,b,m,out,depth+1);subdivide(m,b,c,out,depth+1)}
}
function geometryPolygon(layer){
 if(!['ridge','wall','ground','water','wave','trunk'].includes(layer.kind))return layer.poly;
 return layer.poly.map(([u,v])=>[u<=.001?-.45:u>=.999?1.45:u,v<=.001?-.3:v>=.999?1.32:v]);
}
export function surfaceGeometry(spec,aspect,layer){
 const contour=geometryPolygon(layer).map(p=>new THREE.Vector2(...p));
 const triangles=THREE.ShapeUtils.triangulateShape(contour,[]),uvPoints=[];
 for(const tri of triangles)subdivide(contour[tri[0]],contour[tri[1]],contour[tri[2]],uvPoints);
 const p=[],uv=[];
 for(const point of uvPoints){const q=surfacePoint(spec,aspect,layer,point.x,point.y);p.push(q.x,q.y,q.z);uv.push(point.x,1-point.y)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}

export function buildReconstruction(b,textureManifest){
 return buildCoherentWorld(b,textureManifest,{referenceCamera,referenceRay,groundPoint,surfacePoint,surfaceGeometry});
}
