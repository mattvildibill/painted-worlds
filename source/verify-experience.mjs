import assert from 'node:assert/strict';
import {DEFAULT_SETTINGS,readSettings,routeMetrics,routeProgress,viewportFor,filterPaintings} from '../dist/experience.js';
import {scenes} from '../dist/scenes.js';
import {references} from '../dist/reference-data.js';

// Preferences remain usable with blocked storage, old values or corrupt JSON.
for(const getItem of [()=>null,()=>'{broken',()=>null,()=>{throw Error('Blocked')}])
 assert.deepEqual(readSettings({getItem}),DEFAULT_SETTINGS);
assert.deepEqual(readSettings({getItem:()=>JSON.stringify({view:'canvas',quality:'light',speed:'normal',motion:false})}),{view:'canvas',quality:'light',speed:'normal',motion:false});
assert.deepEqual(readSettings({getItem:()=>JSON.stringify({view:'unknown',quality:8,speed:null,motion:'false'})}),DEFAULT_SETTINGS);
assert.equal(readSettings({getItem:()=>JSON.stringify({view:'immersive'})}).view,'canvas','Migrate the old implicit expanded view');
assert.equal(readSettings({getItem:()=>JSON.stringify({view:'immersive',framingVersion:2})}).view,'immersive','Keep an explicit expanded-view choice');

// Both viewport modes preserve the complete source frame on portrait/landscape
// displays. Fitting the frame must never change its internal perspective.
for(const [width,height] of [[390,600],[709,817],[1363,730],[844,320]])for(const aspect of [.8,1,1.3415,1.57]){
 const ref={aspect,fov:54},canvas=viewportFor(width,height,ref,'canvas'),full=viewportFor(width,height,ref,'immersive');
 assert(canvas.width<=width+.0001&&canvas.height<=height+.0001);
 assert(Math.abs(canvas.width/canvas.height-aspect)<1e-9);
 assert.equal(full.width,width);assert.equal(full.height,height);
 const frameH=height*Math.tan(ref.fov*Math.PI/360)/Math.tan(full.fov*Math.PI/360);
 assert(Math.abs(frameH-canvas.height)<1e-8);
 assert(Math.abs(frameH*aspect-canvas.width)<1e-8);
}

for(const ref of Object.values(references)){
 const route=ref.route,m=routeMetrics(route);assert(m.total>0);
 assert.equal(routeProgress(route,m,1,...route[0]),0);
 let previous=0;
 for(let i=1;i<route.length;i++)for(let j=0;j<=10;j++){
  const x=route[i-1][0]+(route[i][0]-route[i-1][0])*j/10,z=route[i-1][1]+(route[i][1]-route[i-1][1])*j/10;
  const progress=routeProgress(route,m,i,x,z);
  assert(progress>=previous-1e-9&&progress<=1);previous=progress;
 }
 assert.equal(previous,1);
}

assert.equal(filterPaintings(scenes,'').length,61);
assert.equal(filterPaintings(scenes,'  ORCHARD ').length,1);
assert.equal(filterPaintings(scenes,'no-matching-painting').length,0);
for(const group of new Set(scenes.map(s=>s.group))){
 const result=filterPaintings(scenes,'',String(group));
 assert(result.length>0&&result.every(s=>s.group===group));
}
console.log('Settings recovery, source-frame fitting, all tour progress paths and collection filters passed.');
