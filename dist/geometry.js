export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const lerp=(a,b,t)=>a+(b-a)*t;
function smooth(a,b,x){const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)}
function lineValue(points,x){const t=clamp(x,0,1)*(points.length-1),i=Math.floor(t);return lerp(points[i],points[Math.min(i+1,points.length-1)],t-i)}
function distanceToSegment(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1];const t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)}
export function polygonDistance(x,y,pts){let inside=false,d=1e9;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))inside=!inside;d=Math.min(d,distanceToSegment(x,y,a,b));}return inside?d:-d}
export function sceneDepth(s,u,v){
 let depth;
 if(['still','interior'].includes(s.kind)){
  depth=v>s.horizon?Math.max(7,22/(1+((v-s.horizon)/(1-s.horizon))*2.05)):22;
 }else{
  const horizon=s.horizon,sky=lineValue(s.skyline,u);
  const ground=clamp(3.9/Math.max(.045,v-horizon+.14),6.6,28);
  const middle=lerp(26,18,smooth(sky,horizon,v));
  depth=v>horizon?ground:lerp(38,middle,smooth(sky-.015,sky+.05,v));
  if(s.kind==='land'&&v>horizon)depth+=Math.sin(u*10+v*15)*Math.sin(v*8)*.5;
  if(s.kind==='street')depth=Math.min(depth,12+27*(1-Math.abs(u-.42)*1.8));
 }
 for(const r of s.regions){const d=polygonDistance(u,v,r.points);const w=smooth(-r.soft,r.soft,d);if(w>0)depth=lerp(depth,r.depth-Math.min(Math.max(d,0)*4,.75),w);}
 return clamp(depth,6.2,40);
}
export function cropPoint(s,u,v){
 const c=s.crop;let x,y;
 if(Array.isArray(c[0])){x=lerp(lerp(c[0][0],c[1][0],u),lerp(c[3][0],c[2][0],u),v);y=lerp(lerp(c[0][1],c[1][1],u),lerp(c[3][1],c[2][1],u),v)}
 else{x=lerp(c[0],c[2],u);y=lerp(c[1],c[3],v)}
 if(s.rotation<0)return [1-y,x];return [x,y];
}
export function aspectFor(s,m){const c=s.crop;let w,h;if(Array.isArray(c[0])){w=(Math.hypot(c[1][0]-c[0][0],c[1][1]-c[0][1])+Math.hypot(c[2][0]-c[3][0],c[2][1]-c[3][1]))/2;h=(Math.hypot(c[3][0]-c[0][0],c[3][1]-c[0][1])+Math.hypot(c[2][0]-c[1][0],c[2][1]-c[1][1]))/2}else{w=c[2]-c[0];h=c[3]-c[1]};return (s.rotation?m.height/m.width:m.width/m.height)*w/h}
export function createSurfaceData(s,aspect,nx=220,ny=160,flat=false){
 const positions=new Float32Array((nx+1)*(ny+1)*3),uvs=new Float32Array((nx+1)*(ny+1)*2),indices=new Uint32Array(nx*ny*6);let p=0,q=0,k=0;
 for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){const u=x/nx,v=y/ny,d=flat?20:sceneDepth(s,u,v);positions[p++]=(u-.5)*d*aspect;positions[p++]=(.5-v)*d;positions[p++]=-d;const uv=cropPoint(s,u,v);uvs[q++]=uv[0];uvs[q++]=1-uv[1];}
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;indices[k++]=a;indices[k++]=c;indices[k++]=b;indices[k++]=b;indices[k++]=c;indices[k++]=d}
 return {positions,uvs,indices};
}
