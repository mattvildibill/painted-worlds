// Authored walking regions. Painted-relief.js supplies the surrounding scenery.
const limits={
 'lily-lake':{x:-9,z:-13,rx:45,rz:43},'rose-peaks':{x:-5,z:-10,rx:31,rz:32},
 canyon:{x:1,z:-9,rx:6,rz:41},orchard:{x:-2,z:-4,rx:15,rz:18},
 coast:{x:-7,z:-2,rx:24,rz:26},village:{x:-3,z:-8,rx:16,rz:26},
 'pine-trail':{x:-2,z:-4,rx:19,rz:22},'country-lane':{x:0,z:-5,rx:20,rz:24},'winter-barn':{x:1,z:-3,rx:12,rz:16}
};
export function buildSurroundings(b,spec){b.playArea={...limits[spec.id]};}
