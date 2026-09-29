"""Keep reviewed source contours/contact measurements when rerunning old authors."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent/'references'
def apply(spec):
 for ident,c in json.loads((ROOT/'fidelity-corrections.json').read_text()).items():
  if ident not in spec:continue
  s=spec[ident];s['horizon']=c['horizon'];s['route']=c['route']
  for i,v in c['contacts'].items():s['layers'][int(i)]['contact']=v
 for ident,items in json.loads((ROOT/'reviewed-silhouettes.json').read_text()).items():
  if ident not in spec:continue
  for i,c in items.items():spec[ident]['layers'][int(i)]['poly']=c['poly']
 if 'winter-barn' in spec:
  s=spec['winter-barn'];b=json.loads((ROOT/'barn-profile.json').read_text());front=b['frontProfile'];rear=b['rearLeftProfile'];ridge=len(rear)-1
  s['barnProfile']={'front':front,'rear':rear,'ridge':ridge};s['layers'][4]['poly']=front;s['layers'][2]['poly']=[rear[0],rear[1],front[1],front[0]]
  s['layers'][3]['poly']=rear[1:]+[[.424479,.133624],[.449219,.129258],[.503255,.137991],[.541016,.150218]]+list(reversed(front[1:ridge+1]))
 return spec
