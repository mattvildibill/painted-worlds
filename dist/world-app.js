import * as THREE from './vendor/three.module.min.js';
import {worlds,worldForPainting,groundAt,walkHeight,moveWithCollision,clamp,shoreAt} from './world-data.js';
import {createWorld} from './worlds.js';
import {surroundingWorlds} from './painted-environment.js';
import {scenes,groups} from './scenes.js';
import {readSettings,routeMetrics,routeProgress,viewportFor,filterPaintings} from './experience.js';

const $=id=>document.getElementById(id),stage=$('stage'),app=$('app');
const mobile=matchMedia('(pointer:coarse)').matches,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const keys=new Set(),textureCache=new Map(),loader=new THREE.TextureLoader();
const player={x:0,z:16,y:1.68,yaw:0,pitch:0};
let settings;try{settings=readSettings(localStorage)}catch{settings=readSettings({getItem:()=>null})}
let tourActive=false,tourMetrics=null,comparisonPose=null,visiblePaintings=[...scenes],boundaryNotice=0,artOnly=false;
let manifest,surfaceTextures,renderer,camera,current,busy=false,playing=false,locked=false,guide=false,waypoint=1,nearest=null,selectedPainting=null,comparing=false;
let lastTime=0,clock=0,walkClock=0,frame=0,enteredAt=0,loadToken=0,drag=null,joystick={x:0,y:0},lastMini=0,toastTimer,portalCooldown=0;
const mapCtx=$('minimap').getContext('2d');
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3800)}
function openDialog(id){stopGuide();clearMovement();if(document.pointerLockElement)document.exitPointerLock();if(!$(id).open)$(id).showModal()}
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close())}
function clearMovement(){keys.clear();joystick={x:0,y:0};$('joystick-knob').style.transform='translate(0,0)';drag=null}
function setPlaying(){playing=true;app.classList.add('playing');$('welcome').hidden=true}
function stopGuide(resetTour=false){guide=false;if(resetTour){tourActive=false;waypoint=1}$('guide-button').setAttribute('aria-pressed','false');$('guide-button').textContent=tourActive?'▷ Resume tour':'▷ Guided walk';updateTourStatus()}
function manual(){stopGuide(true);setPlaying()}
function updateTourStatus(){if(!tourMetrics||!current){$('tour-status').hidden=true;return}$('tour-status').hidden=!tourActive||comparing;const progress=routeProgress(current.def.tour,tourMetrics,waypoint,player.x,player.z);$('tour-progress').value=progress;$('tour-label').textContent=(guide?'Guided walk':'Paused')+' · '+Math.round(progress*100)+'%';}
function saveSettings(){try{localStorage.setItem('painted-worlds-settings',JSON.stringify({...settings,framingVersion:2}))}catch{}if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='light'?1:settings.quality==='sharp'?2:mobile?1.25:1.6));resize()}}
function texture(id,thumb=false){
 const small=thumb||mobile,key=id+(small?'-thumb':'');if(textureCache.has(key))return textureCache.get(key);
 const p=loader.loadAsync('/assets/'+key+'.webp').then(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer?Math.min(4,renderer.capabilities.getMaxAnisotropy()):1;return t}).catch(e=>{textureCache.delete(key);throw e});textureCache.set(key,p);return p;
}
function sourceForHash(){const hash=location.hash.slice(1);if(worlds.some(w=>w.id===hash))return hash;const s=scenes.find(s=>s.id===hash);return s?worldForPainting(s):'gallery'}
async function loadWorld(id,{historyEntry=true,initial=false}={}){
 const def=worlds.find(w=>w.id===id);if(!def)throw new Error('Unknown world');if(busy)return {busy:true};
 if(artOnly){id==='gallery'?openDialog('collection-dialog'):showPainting(def.source);return {error:'3D unavailable'}}
 const token=++loadToken;busy=true;stopGuide(true);clearMovement();nearest=null;$('interaction').hidden=true;closeDialogs();$('transition').classList.add('cover');
 if(!initial)await new Promise(resolve=>setTimeout(resolve,reduced?0:270));
 $('loading-text').textContent='Opening '+def.title+'…';$('loading').hidden=false;
 await new Promise(resolve=>requestAnimationFrame(resolve));
 try{
  if(!renderer)throw new Error('This browser cannot run the 3D view.');
  const next=createWorld(id,manifest,texture,surfaceTextures);try{await next.ready}catch(e){next.dispose();throw e}if(token!==loadToken){next.dispose();return {superseded:true}}
  const old=current;current=next;old?.dispose();Object.assign(player,{x:def.spawn[0],z:def.spawn[1],y:walkHeight(next,...def.spawn)+1.68,yaw:def.yaw,pitch:def.pitch||0});
  comparing=false;comparisonPose=null;tourMetrics=routeMetrics(def.tour);app.classList.remove('comparing');app.classList.toggle('in-painting',!!next.reference);$('compare-overlay').hidden=true;$('source-button').setAttribute('aria-pressed','false');$('canvas-caption').textContent='PAINTED WORLD';
  if(next.reference){$('compare-image').src='/assets/reference/'+def.source+'.webp';$('compare-image').alt='Original canvas: '+def.title;setPlaying()}
  enteredAt=clock;portalCooldown=clock+2;waypoint=1;renderer.shadowMap.needsUpdate=true;
  $('place-eyebrow').textContent=def.eyebrow;$('world-number').textContent=id==='gallery'?'THE PAINTING GARDEN':'WALKABLE WORLD '+worlds.indexOf(def)+' / '+(worlds.length-1);
  $('place-title').textContent=id==='gallery'&&!playing?'Walk into a painting.':def.title;$('place-detail').textContent=def.summary;$('welcome-copy').textContent=id==='gallery'?'Walk toward a painting and step through its frame.':def.summary;
  $('garden-button').disabled=id==='gallery';$('source-button').hidden=id==='gallery';$('source-button').textContent=id==='gallery'?'Original collection':'Original painting';
  document.title=def.title+' · Painted Worlds';document.querySelectorAll('.world-card').forEach(b=>b.classList.toggle('current',b.dataset.world===id));
  if(historyEntry)history.pushState(null,'','#'+id);
  resize();updateCamera(0);renderer.render(current.scene,camera);drawMap();$('error-panel').hidden=true;
  return {world:id,title:def.title,position:[player.x,player.z],portals:next.portals.length};
 }catch(e){console.error('World failed to open',e);$('error-panel').hidden=false;$('error-message').textContent='The 3D world could not open in this browser. The original painting collection is still available.';return {error:String(e.message)}}
 finally{busy=false;if(playing)stage.focus({preventScroll:true});$('loading').hidden=true;$('transition').classList.remove('cover')}
}
function reset(quiet=false){if(!current)return;stopGuide(true);clearMovement();const d=current.def;Object.assign(player,{x:d.spawn[0],z:d.spawn[1],y:walkHeight(current,...d.spawn)+1.68,yaw:d.yaw,pitch:d.pitch||0});portalCooldown=clock+1;if(!quiet)toast(current.reference?'Back to the canvas viewpoint':'Back to the starting viewpoint')}
function comparePainting(){if(!current?.reference||busy)return;clearMovement();stopGuide();if(document.pointerLockElement)document.exitPointerLock();comparing=!comparing;if(comparing){comparisonPose={...player};const d=current.def;Object.assign(player,{x:d.spawn[0],z:d.spawn[1],y:walkHeight(current,...d.spawn)+1.68,yaw:d.yaw,pitch:d.pitch||0});}else if(comparisonPose){Object.assign(player,comparisonPose);comparisonPose=null;portalCooldown=clock+1;}$('compare-overlay').hidden=!comparing;app.classList.toggle('comparing',comparing);$('source-button').textContent=comparing?'Back to walk':'Original painting';$('source-button').setAttribute('aria-pressed',String(comparing));$('canvas-caption').textContent=comparing?'ORIGINAL PAINTING':'PAINTED WORLD';resize();}
function startWalking(){if(!current||busy)return;manual();stage.focus({preventScroll:true});if(!mobile&&stage.requestPointerLock&&!document.pointerLockElement){try{const p=stage.requestPointerLock();if(p?.catch)p.catch(()=>toast('Drag to look around. WASD still moves you.'))}catch{toast('Drag to look around. WASD still moves you.')}}}

function buildMenus(){
 const ordered=[worlds[0],...worlds.filter(w=>surroundingWorlds.has(w.id)),...worlds.filter(w=>w.id!=='gallery'&&!surroundingWorlds.has(w.id))];
 for(const w of ordered){const b=document.createElement('button');b.className='world-card';b.dataset.world=w.id;b.innerHTML='<img loading="lazy" decoding="async" alt=""><div><span class="eyebrow"></span><h3></h3><p></p><span class="go"></span></div>';b.querySelector('img').src='/assets/'+w.source+'-thumb.webp';b.querySelector('img').alt='Source painting for '+w.title;b.querySelector('.eyebrow').textContent=w.id==='gallery'?'61 ORIGINAL PAINTINGS':surroundingWorlds.has(w.id)?'SURROUNDING PAINTED WORLD':'FIRST-PERSON WORLD';b.querySelector('h3').textContent=w.title;b.querySelector('p').textContent=w.summary;b.querySelector('.go').textContent=w.id==='gallery'?'Visit the garden →':'Step inside →';b.addEventListener('click',()=>{setPlaying();loadWorld(w.id)});$('world-grid').append(b)}
 groups.forEach((g,i)=>{const option=document.createElement('option');option.value=i;option.textContent=g.name;$('painting-group').append(option)});
 for(const s of scenes){const b=document.createElement('button');b.className='painting-card';b.dataset.painting=s.id;b.innerHTML='<img loading="lazy" decoding="async" alt=""><span></span>';b.querySelector('img').src='/assets/'+s.id+'-thumb.webp';b.querySelector('img').alt='';b.querySelector('span').textContent=s.title;if(s.rotation)b.querySelector('img').style.transform='rotate(-90deg) scale(.72)';b.addEventListener('click',()=>showPainting(s.id));$('painting-grid').append(b)}
}
function filterCollection(){visiblePaintings=filterPaintings(scenes,$('painting-search').value,$('painting-group').value);const ids=new Set(visiblePaintings.map(s=>s.id));document.querySelectorAll('.painting-card').forEach(b=>b.hidden=!ids.has(b.dataset.painting));$('painting-count').textContent=visiblePaintings.length+' of 61 paintings';$('painting-empty').hidden=visiblePaintings.length>0;}
function stepPainting(delta){const list=visiblePaintings.some(s=>s.id===selectedPainting?.id)?visiblePaintings:scenes;const index=list.findIndex(s=>s.id===selectedPainting?.id);showPainting(list[(index+delta+list.length)%list.length].id)}
function showPainting(id){
 const s=scenes.find(s=>s.id===id);if(!s)return;selectedPainting=s;const modeled=worlds.find(w=>w.id!=='gallery'&&w.source===id),related=worlds.find(w=>w.id===worldForPainting(s));
 $('original-title').textContent=s.title;$('original-image').src='/assets/'+id+'.webp';$('original-image').alt='Original source painting: '+s.title;$('original-image').style.transform=s.rotation?'rotate(-90deg)':'';$('original-image').style.maxHeight=s.rotation?'50dvh':'';
 $('source-context').textContent=modeled?'This original is the main reference for '+modeled.title+'. The walkable environment interprets its painted scene and imagines the unseen sides.':related.id==='gallery'?'This original is preserved in the painting garden. It does not have a separate modeled environment.':'This original is part of the collection. '+related.title+' is a shared interpretation of related paintings; it is not a separate reconstruction of this image.';
 const list=visiblePaintings.some(p=>p.id===id)?visiblePaintings:scenes;$('original-count').textContent=(list.findIndex(p=>p.id===id)+1)+' / '+list.length;$('previous-painting').disabled=list.length<2;$('next-painting').disabled=list.length<2;$('related-world').disabled=artOnly;
 $('related-world').textContent=artOnly?'3D unavailable in this browser':modeled?'Enter this painting world →':related.id==='gallery'?'Visit the painting garden →':'Explore '+related.title+' →';openDialog('original-dialog');
}
function interact(){if(!nearest||busy)return;if(nearest.type==='portal'){setPlaying();loadWorld(nearest.item.to)}else showPainting(nearest.item.id)}
function inspectNearby(){
 if(!current||busy||document.querySelector('dialog[open]')){$('interaction').hidden=true;return}
 const forward={x:-Math.sin(player.yaw),z:-Math.cos(player.yaw)};let best=null,score=Infinity;
 for(const p of current.portals){
  const dx=p.x-player.x,dz=p.z-player.z,d=Math.hypot(dx,dz),co=Math.cos(p.angle),si=Math.sin(p.angle),lx=(player.x-p.x)*co-(player.z-p.z)*si,lz=(player.x-p.x)*si+(player.z-p.z)*co;
  if(playing&&clock>portalCooldown&&Math.abs(lx)<p.w*.44&&Math.abs(lz)<.48){loadWorld(p.to);return}
  if(d<5.6&&(dx*forward.x+dz*forward.z)/Math.max(d,.01)>.2&&d<score){score=d;best={type:'portal',item:p}}
 }
 for(const art of current.artworks){const dx=art.x-player.x,dz=art.z-player.z,d=Math.hypot(dx,dz);if(d<3.4&&(dx*forward.x+dz*forward.z)/Math.max(d,.01)>.65&&d<score){score=d;best={type:'art',item:art}}}
 nearest=best;$('interaction').hidden=!best;if(best)$('interact-button').textContent=best.type==='portal'?(best.item.to==='gallery'?'Return to the painting garden':'Enter '+best.item.title):'View '+best.item.title;
}
function resize(){if(!renderer||!camera)return;const W=Math.max(1,stage.clientWidth),H=Math.max(1,stage.clientHeight),v=viewportFor(W,H,current?.reference,settings.view);renderer.setSize(W,H,false);renderer.setScissorTest(false);renderer.setClearColor(0x15201f,1);renderer.clear();camera.aspect=v.aspect;camera.fov=v.fov;renderer.setViewport(v.x,v.y,v.width,v.height);renderer.setScissor(v.x,v.y,v.width,v.height);renderer.setScissorTest(true);const original=viewportFor(W,H,current?.reference,'canvas');Object.assign($('compare-overlay').style,{left:original.x+'px',top:original.y+'px',width:original.width+'px',height:original.height+'px'});camera.updateProjectionMatrix()}
function updateCamera(dt,moving=false){if(!current)return;const target=walkHeight(current,player.x,player.z)+1.68;player.y+= (target-player.y)*(dt===0?1:Math.min(1,dt*14));const bob=!reduced&&settings.motion&&moving?Math.sin(walkClock*8)*.012:0;camera.position.set(player.x,player.y+bob,player.z);camera.rotation.set(player.pitch,player.yaw,0,'YXZ')}
function guideMovement(dt){
 const route=current.def.tour;if(waypoint>=route.length){reset(true);toast('Tour complete. You’re back at the entrance.');return false}const goal=route[waypoint],dx=goal[0]-player.x,dz=goal[1]-player.z,d=Math.hypot(dx,dz);
 if(d<.08){waypoint++;return false}
 const aim=Math.atan2(-dx,-dz),diff=Math.atan2(Math.sin(aim-player.yaw),Math.cos(aim-player.yaw));player.yaw+=diff*Math.min(1,dt*3.5);player.pitch*=Math.exp(-dt*3);
 const step=Math.min(d,(current.reference?1.15:2.4)*dt),next=moveWithCollision(current,player.x,player.z,dx/d*step,dz/d*step);const moved=Math.hypot(next[0]-player.x,next[1]-player.z);player.x=next[0];player.z=next[1];return moved>.0001;
}
function drawMap(){
 if(!current)return;const ctx=mapCtx,W=320,H=320,id=current.def.id,range=id==='gallery'?89:105;
 const actualRange=current.reference?(id==='orchard'||id==='village'?25:id==='coast'?35:75):range;const center=id==='gallery'?[0,0]:[player.x,player.z],sc=W/actualRange,xy=(x,z)=>[(x-center[0])*sc+W/2,(z-center[1])*sc+H/2];
 ctx.fillStyle='#a9ab89';ctx.fillRect(0,0,W,H);
 if(current.referenceWater?.length){ctx.fillStyle='#608b91';ctx.beginPath();current.referenceWater.forEach((p,i)=>i?ctx.lineTo(...xy(...p)):ctx.moveTo(...xy(...p)));ctx.closePath();ctx.fill()}
 ctx.strokeStyle='#e0d1a7';ctx.lineWidth=5;ctx.lineJoin='round';ctx.beginPath();current.def.tour.forEach((p,i)=>{const a=xy(...p);i?ctx.lineTo(...a):ctx.moveTo(...a)});ctx.stroke();
 ctx.fillStyle='#7b856c';for(const c of current.colliders){const p=xy(c.x,c.z);if(c.kind==='circle'&&c.r>1){ctx.beginPath();ctx.arc(...p,Math.min(c.r*sc,35),0,TAU);ctx.fill()}else if(c.kind==='box'&&c.w>2){ctx.save();ctx.translate(...p);ctx.rotate(-(c.angle||0));ctx.fillRect(-c.w*sc/2,-c.d*sc/2,c.w*sc,Math.max(c.d*sc,1));ctx.restore()}}
 for(const p of current.portals){const [x,y]=xy(p.x,p.z);ctx.fillStyle='#f1ce77';ctx.strokeStyle='#604f31';ctx.lineWidth=3;ctx.fillRect(x-7,y-7,14,14);ctx.strokeRect(x-7,y-7,14,14)}
 for(const p of current.points){if(p.label.toLowerCase().includes('portal'))continue;const [x,y]=xy(p.x,p.z);ctx.fillStyle='#e9e2c7';ctx.beginPath();ctx.arc(x,y,3.5,0,TAU);ctx.fill()}
 const [px,py]=xy(player.x,player.z);ctx.save();ctx.translate(px,py);ctx.rotate(-player.yaw);ctx.fillStyle='#253e35';ctx.strokeStyle='#fff8dc';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(8,7);ctx.lineTo(0,3);ctx.lineTo(-8,7);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
 ctx.fillStyle='#304d3c';ctx.font='bold 22px system-ui';ctx.textAlign='center';ctx.fillText('N',W/2,25);ctx.strokeStyle='#d8d5b188';ctx.lineWidth=5;ctx.strokeRect(2,2,W-4,H-4);
}
const TAU=Math.PI*2;
function animate(ms){
 requestAnimationFrame(animate);const dt=Math.min((ms-lastTime)/1000||0,.05);lastTime=ms;if(document.hidden||!current||!renderer||busy)return;
 clock+=dt;frame++;let moving=false;const modal=!!document.querySelector('dialog[open]');
 if(playing&&!modal&&!comparing){
  if(guide)moving=guideMovement(dt);
  else{player.yaw+=((keys.has('j')?1:0)-(keys.has('l')?1:0))*dt*1.25;player.pitch=clamp(player.pitch+((keys.has('i')?1:0)-(keys.has('k')?1:0))*dt*.8,-1.2,1.2);let strafe=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joystick.x;let forward=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)-joystick.y;const len=Math.hypot(strafe,forward);if(len>.04){strafe/=Math.max(1,len);forward/=Math.max(1,len);const base=current?.reference?(current.def.id==='orchard'||current.def.id==='village'?1.25:2.1):3.6,speed=(keys.has('shift')?base*1.7:base)*(settings.speed==='gentle'?.8:1),dx=(strafe*Math.cos(player.yaw)-forward*Math.sin(player.yaw))*speed*dt,dz=(-strafe*Math.sin(player.yaw)-forward*Math.cos(player.yaw))*speed*dt,next=moveWithCollision(current,player.x,player.z,dx,dz);moving=Math.hypot(next[0]-player.x,next[1]-player.z)>.0001;player.x=next[0];player.z=next[1];if(!moving&&current.playArea&&clock>boundaryNotice){const p=current.playArea;if(((player.x-p.x)/p.rx)**2+((player.z-p.z)/p.rz)**2>.93){toast('You’re at the edge of this painted world.');boundaryNotice=clock+8;}}}}
 }
 if(moving)walkClock+=dt;app.classList.toggle('away-from-canvas',!!current.reference&&(Math.hypot(player.x,player.z)>.15||Math.abs(player.yaw)>.03||Math.abs(player.pitch-(current.def.pitch||0))>.03));updateCamera(dt,moving);current.clock.value=reduced?0:clock;
 if(!modal||frame%3===0)renderer.render(current.scene,camera);
 if(ms-lastMini>110){drawMap();updateTourStatus();if(!comparing)inspectNearby();lastMini=ms}
}

// Desktop pointer lock is optional. Drag-to-look and keyboard movement work without it.
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===stage;clearMovement();if(locked)setPlaying();else if(playing)toast('Mouse released. Click the view to resume, or drag to look.');});
document.addEventListener('pointerlockerror',()=>toast('Mouse capture is unavailable here. Drag to look; WASD to walk.'));
document.addEventListener('mousemove',e=>{if(!locked||busy||comparing)return;manual();player.yaw-=e.movementX*.0021;player.pitch=clamp(player.pitch-e.movementY*.0021,-1.2,1.2)});
stage.addEventListener('pointerdown',e=>{if(busy||comparing||document.querySelector('dialog[open]'))return;manual();stage.focus({preventScroll:true});if(locked){if(nearest)interact();return}drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:0};stage.setPointerCapture(e.pointerId)});
stage.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||locked)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;player.yaw-=dx*(mobile?.004:.0032);player.pitch=clamp(player.pitch-dy*(mobile?.0037:.003),-1.2,1.2)});
stage.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId){const click=drag.moved<5;drag=null;if(click&&!mobile)startWalking()}});stage.addEventListener('pointercancel',()=>drag=null);
window.addEventListener('keydown',e=>{
 const key=e.key.toLowerCase();
 if($('original-dialog').open&&['arrowleft','arrowright'].includes(key)){e.preventDefault();stepPainting(key==='arrowleft'?-1:1);return}
 if(document.querySelector('dialog[open]')||busy||!current||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
 if(key==='c'){e.preventDefault();comparePainting();return}if(comparing)return;
 if(['w','a','s','d','j','l','i','k','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key)){
  if(/BUTTON|A/.test(e.target.tagName)&&key.startsWith('arrow'))return;e.preventDefault();manual();keys.add(key)
 }
 if(key==='e'){e.preventDefault();interact()}if(key==='m')openDialog('worlds-dialog');if(key==='r')reset();
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',clearMovement);document.addEventListener('visibilitychange',()=>{if(document.hidden){clearMovement();stopGuide()}});
const joy=$('joystick');let joyPointer=null;
function updateJoy(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,limit=r.width*.32,len=Math.hypot(dx,dy),scale=len>limit?limit/len:1;joystick={x:dx*scale/limit,y:dy*scale/limit};$('joystick-knob').style.transform=`translate(${dx*scale}px,${dy*scale}px)`}
joy.addEventListener('pointerdown',e=>{e.preventDefault();manual();joyPointer=e.pointerId;joy.setPointerCapture(e.pointerId);updateJoy(e)});joy.addEventListener('pointermove',e=>{if(joyPointer===e.pointerId)updateJoy(e)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])joy.addEventListener(ev,e=>{if(joyPointer===e.pointerId){joyPointer=null;joystick={x:0,y:0};$('joystick-knob').style.transform='translate(0,0)'}});

$('start-button').addEventListener('click',startWalking);$('worlds-button').addEventListener('click',()=>openDialog('worlds-dialog'));$('welcome-worlds').addEventListener('click',()=>openDialog('worlds-dialog'));
$('source-button').addEventListener('click',()=>!current||current.def.id==='gallery'?openDialog('collection-dialog'):comparePainting());
$('compare-overlay').addEventListener('click',comparePainting);
$('collection-button').addEventListener('click',()=>openDialog('collection-dialog'));$('error-collection').addEventListener('click',()=>{$('error-panel').hidden=true;openDialog('collection-dialog')});$('help-button').addEventListener('click',()=>openDialog('help-dialog'));
for(const id of ['home-button','garden-button'])$(id).addEventListener('click',()=>loadWorld('gallery'));
$('reset-button').addEventListener('click',()=>{if(comparing)comparePainting();reset()});$('interact-button').addEventListener('click',interact);$('retry-button').addEventListener('click',()=>location.reload());
$('related-world').addEventListener('click',()=>{if(!selectedPainting)return;setPlaying();loadWorld(worldForPainting(selectedPainting))});
$('guide-button').addEventListener('click',()=>{
 if(!current||busy)return;if(comparing)comparePainting();
 if(guide){stopGuide();return}
 clearMovement();setPlaying();
 if(!tourActive){reset(true);tourActive=true;waypoint=1;toast('The guided walk will bring you back to this entrance.');}
 guide=true;$('guide-button').setAttribute('aria-pressed','true');$('guide-button').textContent='Ⅱ Pause tour';updateTourStatus();
});
$('fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(app.requestFullscreen)await app.requestFullscreen();else toast('Fullscreen is not available in this browser.')}catch{toast('Fullscreen is not available in this browser.')}});document.addEventListener('fullscreenchange',()=>{$('fullscreen-button').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');resize()});
for(const d of document.querySelectorAll('dialog')){d.querySelector('.close').addEventListener('click',()=>d.close());d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});d.addEventListener('close',clearMovement)}
window.addEventListener('hashchange',()=>{const id=sourceForHash();if(id!==current?.def.id)loadWorld(id,{historyEntry:false})});new ResizeObserver(resize).observe(stage);
$('painting-search').addEventListener('input',filterCollection);$('painting-group').addEventListener('change',filterCollection);
$('previous-painting').addEventListener('click',()=>stepPainting(-1));$('next-painting').addEventListener('click',()=>stepPainting(1));$('retry-3d').addEventListener('click',()=>location.reload());
for(const [id,key]of [['view-setting','view'],['quality-setting','quality'],['speed-setting','speed']]){$(id).value=settings[key];$(id).addEventListener('change',()=>{settings[key]=$(id).value;saveSettings()})}
$('motion-setting').checked=settings.motion&&!reduced;$('motion-setting').disabled=reduced;$('motion-setting').addEventListener('change',()=>{settings.motion=$('motion-setting').checked;saveSettings()});


function registerTools(){const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});const list=[
 {name:'list_painting_worlds',title:'List walkable painting worlds',description:'List the nine modeled painting worlds and the garden gallery.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({worlds:worlds.map(w=>({id:w.id,title:w.title,source:w.source})),current:current?.def.id})},
 {name:'enter_painting_world',title:'Enter a painting world',description:'Move to the entrance of a selected first-person world. This changes the current scene.',inputSchema:{type:'object',properties:{world_id:{type:'string',enum:worlds.map(w=>w.id)}},required:['world_id'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async input=>{if(!input||!worlds.some(w=>w.id===input.world_id))throw new Error('Unknown world_id');setPlaying();return await loadWorld(input.world_id)}}];for(const t of list)try{Promise.resolve(context.registerTool(t,{signal:lifecycle.signal})).catch(()=>{})}catch{}}
async function start(){
 buildMenus();try{const responses=await Promise.all([fetch('/assets/manifest.json'),fetch('/assets/reference/textures.json')]);if(responses.some(r=>!r.ok))throw new Error('Image manifest unavailable');[manifest,surfaceTextures]=await Promise.all(responses.map(r=>r.json()));camera=new THREE.PerspectiveCamera(65,1,.035,1200);
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='light'?1:settings.quality==='sharp'?2:mobile?1.25:1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;stage.append(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();clearMovement();stopGuide();$('error-panel').hidden=false;$('error-message').textContent='The browser paused the 3D view. Try again to reopen it.'});
  requestAnimationFrame(animate);await loadWorld(sourceForHash(),{historyEntry:false,initial:true});registerTools();
 }catch(e){
  $('loading').hidden=true;$('welcome').hidden=true;artOnly=!renderer;app.classList.toggle('art-only',artOnly);$('error-panel').hidden=artOnly;
  if(artOnly){$('place-title').textContent='The original paintings.';$('place-detail').textContent='Browse 61 preserved works, from mountain landscapes to quiet interiors.';$('collection-notice-text').textContent=manifest?'3D is unavailable in this browser. You can explore every original painting here.':'The 3D files could not load. You can browse the original collection or try again.';$('collection-notice').hidden=false;document.querySelectorAll('.world-card .go').forEach(el=>el.textContent='View source painting →');openDialog('collection-dialog');}
  console.error('Unable to start the world',e);
 }}
start();
