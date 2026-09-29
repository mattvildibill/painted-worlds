export const DEFAULT_SETTINGS={view:'canvas',quality:'balanced',speed:'gentle',motion:true};
export function readSettings(storage){try{const s=JSON.parse(storage.getItem('painted-worlds-settings')||'{}');return {view:s.framingVersion===2&&['immersive','canvas'].includes(s.view)?s.view:DEFAULT_SETTINGS.view,quality:['light','balanced','sharp'].includes(s.quality)?s.quality:DEFAULT_SETTINGS.quality,speed:['gentle','normal'].includes(s.speed)?s.speed:DEFAULT_SETTINGS.speed,motion:typeof s.motion==='boolean'?s.motion:true}}catch{return {...DEFAULT_SETTINGS}}}
export function routeMetrics(route){const distances=[0];for(let i=1;i<route.length;i++)distances.push(distances.at(-1)+Math.hypot(route[i][0]-route[i-1][0],route[i][1]-route[i-1][1]));return {distances,total:distances.at(-1)||1};}
export function routeProgress(route,metrics,waypoint,x,z){const i=Math.min(route.length-1,Math.max(1,waypoint)),remaining=Math.hypot(x-route[i][0],z-route[i][1]);return Math.max(0,Math.min(1,(metrics.distances[i]-remaining)/metrics.total));}
export function viewportFor(width,height,reference,view){
 if(!reference)return {x:0,y:0,width,height,aspect:width/height,fov:width<650?73:65};
 const a=reference.aspect,w=Math.min(width,height*a),h=w/a;
 if(view==='canvas')return {x:(width-w)/2,y:(height-h)/2,width:w,height:h,aspect:a,fov:reference.fov};
 const aspect=width/height,fov=2*Math.atan(Math.tan(reference.fov*Math.PI/360)*Math.max(1,a/aspect))*180/Math.PI;
 return {x:0,y:0,width,height,aspect,fov};
}
export function filterPaintings(scenes,query,group='all'){const q=query.toLocaleLowerCase().trim();return scenes.filter(s=>(group==='all'||String(s.group)===group)&&s.title.toLocaleLowerCase().includes(q));}
