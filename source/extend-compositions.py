"""Three hand-authored scenes from the source paintings; no depth-sheet extrusion."""
import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
p=root/'source/references/compositions.json';spec=json.loads(p.read_text())
def layer(name,poly,kind,**kw):return dict(name=name,poly=poly,kind=kind,**kw)
def rect(a,b,c,d):return [[a,b],[c,b],[c,d],[a,d]]
def ridge(name,top,foot,far,**kw):return layer(name,top+[[top[-1][0],foot],[top[0][0],foot]],'ridge',foot=foot,far=far,thickness=kw.pop('thickness',12),**kw)
spec['pine-trail']=dict(id='pine-trail',source='9930',horizon=.48,fov=54,groundColor='#aaac76',skyColor='#cedbce',groundPatch=[.58,.84,.69,.92],skyPatch=[.20,.04,.29,.16],bounds=55,
 route=[[0,0],[.1,-2],[-.65,-4],[-1.5,-6],[-2.7,-9],[-3.3,-12]],review='The warm trail, asymmetrical dark conifers, sage scrub and low mauve ridge are individually placed from the painting.',
 layers=[
 ridge('Pale mauve distant ridge',[[0,.245],[.12,.272],[.20,.285],[.29,.325],[.39,.367],[.49,.38],[.60,.35],[.74,.37],[1,.39]],.56,62,patch=[.12,.31,.22,.35]),
 layer('Sage undergrowth',[[0,.52],[.1,.49],[.19,.46],[.29,.51],[.4,.49],[.47,.51],[.6,.52],[.72,.56],[.86,.57],[1,.55],[1,1],[.77,.96],[.68,.87],[.63,.77],[.49,.7],[.42,.59],[.36,.64],[.31,.75],[.22,.85],[.2,1],[0,1]],'ground',patch=[.11,.75,.2,.81]),
 layer('Winding ochre walking trail',[[.46,.54],[.49,.55],[.48,.59],[.59,.69],[.7,.76],[.77,.87],[1,1.04],[.20,1.04],[.30,.83],[.35,.75],[.41,.65],[.42,.59]],'ground',patch=[.54,.82,.62,.89]),
 layer('Left broken conifer',[[0,.10],[.05,.15],[.07,.21],[.12,.11],[.13,.28],[.18,.34],[.14,.35],[.19,.44],[.26,.47],[.29,.54],[.24,.61],[.18,.60],[.14,.63],[.07,.61],[0,.64]],'tree',depth=9,thickness=1.8,key='canopy',patch=[.09,.39,.14,.44]),
 layer('Central tall pine',[[.34,.35],[.34,.30],[.37,.28],[.38,.2],[.4,.22],[.41,.13],[.39,.10],[.43,.07],[.43,.025],[.46,.065],[.49,.073],[.46,.11],[.49,.14],[.47,.17],[.51,.22],[.50,.28],[.55,.34],[.59,.43],[.55,.49],[.55,.56],[.49,.59],[.44,.56],[.39,.59],[.36,.53],[.31,.51],[.32,.44]],'tree',depth=11,thickness=2,key='canopy',patch=[.40,.35,.45,.4]),
 layer('Right golden evergreen group',[[.48,.34],[.53,.23],[.55,.16],[.57,.1],[.57,.04],[.60,0],[.64,.015],[.67,.08],[.64,.12],[.68,.17],[.70,.20],[.72,.14],[.74,.16],[.77,.11],[.8,.2],[.80,.28],[.86,.32],[.86,.45],[.91,.4],[.93,.34],[.94,.30],[.97,.36],[1,.32],[1,.6],[.95,.62],[.87,.62],[.81,.57],[.74,.64],[.67,.60],[.59,.62],[.54,.56]],'tree',depth=13,thickness=2.8,key='canopy',patch=[.63,.32,.69,.40])])
spec['country-lane']=dict(id='country-lane',source='2802',horizon=.545,fov=54,groundColor='#7b893d',skyColor='#d1d9ce',groundPatch=[.12,.87,.2,.94],skyPatch=[.44,.11,.53,.23],bounds=60,
 route=[[0,0],[-.35,-2],[-.7,-4],[.0,-7],[1.3,-11],[1.6,-16]],review='The light twin tracks lead to the center-right, with a tall left cypress, irregular meadow hedges and distant blue hills.',
 layers=[
 ridge('Distant blue hills',[[0,.53],[.04,.55],[.13,.55],[.19,.54],[.27,.55],[.36,.53],[.44,.52],[.49,.535],[.58,.54],[.65,.56],[.76,.56],[.85,.535],[.92,.545],[1,.51]],.62,150,patch=[.32,.55,.4,.58]),
 layer('Open meadow',[[0,.70],[.11,.72],[.2,.67],[.29,.69],[.41,.62],[.50,.66],[.62,.67],[.68,.70],[.73,.68],[.83,.68],[.9,.66],[1,.69],[1,1.04],[0,1.04]],'ground',patch=[.08,.81,.18,.88]),
 layer('Pale lane and grassy center',[[.64,.705],[.681,.716],[.71,.708],[.733,.743],[.705,.797],[.69,.86],[.705,.91],[.78,1.04],[.48,1.04],[.54,.94],[.57,.855],[.598,.802],[.62,.754]],'ground',patch=[.61,.9,.66,.94]),
 layer('Tall left cypress',[[.08,.59],[.107,.56],[.12,.53],[.116,.47],[.139,.43],[.148,.38],[.14,.33],[.173,.29],[.176,.26],[.21,.24],[.2,.19],[.225,.16],[.252,.20],[.266,.16],[.294,.15],[.298,.21],[.318,.23],[.3,.26],[.318,.29],[.317,.34],[.29,.36],[.291,.4],[.308,.43],[.288,.46],[.274,.49],[.27,.55],[.246,.58],[.233,.65],[.212,.7],[.212,.77],[.17,.82],[.139,.807],[.139,.74],[.097,.76]],'tree',depth=10,thickness=1.5,key='canopy',patch=[.18,.48,.23,.55]),
 layer('Left meadow hedges',[[0,.55],[.045,.57],[.08,.56],[.11,.585],[.2,.57],[.27,.58],[.32,.55],[.37,.55],[.4,.575],[.45,.557],[.5,.566],[.54,.59],[.57,.61],[.575,.665],[.53,.69],[.47,.69],[.43,.685],[.38,.7],[.31,.69],[.25,.71],[.18,.73],[.1,.735],[0,.75]],'tree',depth=23,thickness=3,key='canopy',patch=[.37,.61,.42,.65]),
 layer('Trees at the lane bend',[[.58,.65],[.6,.59],[.635,.57],[.638,.54],[.66,.52],[.68,.5],[.714,.51],[.725,.55],[.752,.535],[.77,.55],[.76,.59],[.795,.6],[.82,.57],[.875,.55],[.912,.59],[.95,.55],[1,.59],[1,.72],[.85,.71],[.78,.69],[.734,.74],[.67,.71],[.62,.69]],'tree',depth=24,thickness=3,key='canopy',patch=[.64,.6,.71,.65]),
 layer('Near right overhead boughs',[[.75,0],[1,0],[1,.59],[.978,.56],[.97,.50],[.955,.47],[.94,.44],[.917,.43],[.926,.39],[.891,.35],[.916,.29],[.877,.27],[.869,.24],[.808,.21],[.81,.17],[.75,.17],[.73,.14],[.77,.12],[.84,.10],[.85,.05]],'tree',depth=5.5,thickness=1,key='canopy',patch=[.92,.2,.96,.3])])
spec['winter-barn']=dict(id='winter-barn',source='7409',horizon=.61,fov=54,groundColor='#d8d7c6',skyColor='#c1c6b8',groundPatch=[.56,.67,.65,.74],skyPatch=[.01,.06,.07,.18],bounds=36,
 route=[[0,0],[1.8,-.5],[3.2,-2],[3.6,-4],[3.8,-6],[3.7,-9],[3.2,-12]],review='The red gambrel barn, gray roof, white trim, dominant left trunk and dark woods are modeled separately above the snow.',
 layers=[
 layer('Dark winter woodland',rect(0,0,1,.65),'backdrop',depth=38,thickness=0,patch=[.77,.33,.84,.45]),
 layer('Patchy snow and earth',rect(0,.61,1,1.04),'ground',patch=[.57,.69,.67,.75]),
 layer('Red barn side',[[.087,.39],[.436,.41],[.436,.64],[.087,.625]],'wall',plane=[.55,0,-1,10.4],thickness=2.7,patch=[.13,.45,.19,.53]),
 layer('Barn gambrel roof',[[.083,.39],[.107,.25],[.172,.183],[.277,.137],[.446,.14],[.535,.17],[.482,.25],[.45,.41]],'roof',depth=12.1,thickness=.15,patch=[.334,.17,.407,.22]),
 layer('Gambrel barn front',[[.435,.64],[.428,.42],[.458,.285],[.491,.221],[.562,.17],[.615,.24],[.65,.36],[.664,.63]],'building',depth=10.8,thickness=4.8,patch=[.6,.41,.634,.5]),
 layer('Foreground trunk',[[.192,0],[.293,0],[.29,.15],[.298,.36],[.306,.61],[.325,.69],[.364,.725],[.349,.76],[.322,.742],[.295,.74],[.278,.72],[.257,.72],[.247,.746],[.216,.728],[.196,.75],[.182,.73],[.204,.68],[.202,.44]],'trunk',depth=5.2,thickness=.7,patch=[.22,.26,.27,.4]),
 layer('Right bare tree',[[.86,0],[.899,0],[.856,.155],[.868,.24],[.931,.21],[1,.16],[1,.195],[.909,.28],[.872,.31],[.865,.47],[.854,.58],[.878,.60],[.822,.63],[.798,.61],[.822,.58],[.834,.41],[.85,.27],[.83,.22],[.819,.12]],'trunk',depth=17,thickness=.5,patch=[.84,.44,.853,.5]),
 layer('Tiny garden ornament',[[.411,.708],[.456,.716],[.487,.76],[.494,.81],[.485,.87],[.486,.95],[.397,.946],[.391,.882],[.4,.80],[.385,.775]],'prop',depth=2.5,thickness=.25,patch=[.406,.847,.434,.872])])
for ident in ['pine-trail','country-lane','winter-barn']:
 s=spec[ident];s['route']+=list(reversed(s['route'][:-1]));s['surround']='panorama'
 for i,l in enumerate(s['layers']):
  l['index']=i
  if l['kind']=='tree':l['impostor']=True
spec['lily-lake']['surround']='panorama'
# Start tours with a short walk behind the canvas, clear of the return portal.
for ident in ['lily-lake','pine-trail','country-lane','winter-barn']:
 s=spec[ident];loop=[[0,0],[-3,2],[-4,6],[0,8],[4,6],[3,2],[0,0]]
 if s['route'][1]!=[-3,2]:s['route']=loop+s['route'][1:]
# Keep the v7 tour inside the near-shore relief.
import math
lily=[]
for point in spec['lily-lake']['route']:
 if math.hypot(*point)<29 and (not lily or lily[-1]!=point):lily.append(point)
spec['lily-lake']['route']=lily
from apply_fidelity_corrections import apply
spec=apply(spec)
p.write_text(json.dumps(spec,indent=2));(root/'dist/reference-data.js').write_text('export const references = '+json.dumps(spec,separators=(',',':'))+';\n')
cropsp=root/'source/references/crops.json';crops=json.loads(cropsp.read_text())
for sid in ['9930','2802','7409']:
 im=Image.open(root/f'dist/assets/{sid}.webp');crop=[.014,.016,.985,.981];aspect=im.width/im.height*(crop[2]-crop[0])/(crop[3]-crop[1])
 if not any(c['id']==sid for c in crops):crops.append(dict(id=sid,crop=crop,aspect=aspect))
cropsp.write_text(json.dumps(crops,indent=2))
print('Authored three new source compositions and enabled surrounding artwork for four worlds.')
