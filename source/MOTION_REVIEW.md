# Movement review

This records the preceding movement pass. See [the finishing review](FINISH_REVIEW.md) for the latest changes and evidence.

The prior entrance comparisons optimized the wrong thing for unrestricted exploration. They measured a source image projected into one camera. Side and rear views exposed empty environments, repeated ground grids, flat tree crowns and camera-ray-shaped backs. Those scenes should not have been described as convincingly walkable based on the entrance checks.

## Current changes and remaining work

| World | Motion failure found | Changes in this pass | Still limited |
|---|---|---|---|
| Lily Lake | The mountain composition occupied only the forward view; turning exposed a repeating dark ground sheet and noisy sky. | Continuous banks, ochre shore pigment, multi-scale material sampling, continuous sky, ground-descending ridge backs. | Far mountains and reflections remain source-projected; the water reflection is not view-dependent. Side terrain is a quiet inferred continuation, not recovered scenery. |
| Rose-colored peaks | Foreground trees became cards; mountain backs intruded or stretched, and the rear terrain repeated. | Closed foliage clusters sampled from the painting, solid larch/pine/fir stems, corrected ridge backs, continuous rolling terrain. | Tree forms are approximations. Original leaf strokes cannot all be preserved literally once modeled as volume. Mountain depth still needs more authored work. |
| Canyon | Looking sideways left the canyon entirely and exposed a patterned floor; cliff backs stretched along rays. | Existing plum/peach cliff forms continue behind the viewer as solid walls with collision; physically fixed extrusion and three-plane pigment mapping. | The walls are simplified and the figures remain static painted forms. The forward slot is not a recovered full canyon. |
| Orchard | Boughs and foreground plants flattened out; a repeated lawn appeared outside the canvas; house geometry expanded toward the back. | Volumetric source-colored foliage, solid trunk/branches, fixed-depth gabled volume and continuous rolling lawn. | House-front occlusion repair and plant silhouettes remain approximate. Hens and laundry are simple painted forms. No interior is invented. |
| Breaking waves | Turning right could leave the sea; the background became an endless repeating sand texture. | Continuous sea beyond the front image, explicit extended shore collision, shallow surrounding banks, fixed-depth rocks and stable painted sand. | Wave shapes and reflected paint are static. It is not a fluid simulation. The source's painted perspective is still strongest at the entrance. |
| Main street | The crown was a large card; the shop ended behind the camera; pavement repeated and signs had ray-stretched backs. | Source-colored foliage volumes, branches, solid sign/prop backs, continued right-hand shop volume, continuous sidewalk curb and world-space pigments. | The facade remains a source-derived plane with simplified mass behind it. Opposite buildings and interiors are not inferred from nonexistent evidence. |

## Method choice

The best long-term approach is deliberately authored, complete 3D objects and terrain, with the painting used for composition and material reference. Projection is appropriate for distant painted detail or a calibrated facade, but cannot substitute for modeling a full environment. More image stretching, or a single automatic depth map, will not solve the movement problem. Larger unexplored areas would require more interpretation, not greater certainty.

This pass is a bounded improvement to that hybrid reconstruction, not a claim that the full game-world goal has been achieved. The original-art toggle remains the exact source reference. Entrance exactness alone is no longer the acceptance criterion.

## Evidence and limits

- Before sheets: actual prior meshes at the entrance, 90-degree left view, 180-degree turn, and an offset looking back.
- After sheets: actual revised meshes at the entrance, left, right, behind, and a point on the world-specific guided route looking back. The revised route pose uses the scene's walking height.
- All seven builders, closed guided routes, collision boundaries, portal centers, required files and geometry budgets pass the structural check.
- Live browser preview now works as a server. The hosted browser itself disables WebGL and reports failure creating a context. The original collection and a full-size original were verified through the browser, but live 3D controls, GPU shading and frame rate could not be verified.
- Contact sheets omit the navigation portal and UI to isolate the environment. They are offline CPU renders, not live browser screenshots. CPU texture filtering and flat-normal approximations differ from WebGL. They support the identified geometric and material issues, not a claim of exact final GPU appearance.
- No new paid service, account, plugin, runtime API or Drive-folder access was introduced.

## Contact sheets

- lily-lake: [before](review-images/before-lily-lake-motion.jpg) · [after](review-images/after-lily-lake-motion.jpg)
- rose-peaks: [before](review-images/before-rose-peaks-motion.jpg) · [after](review-images/after-rose-peaks-motion.jpg)
- canyon: [before](review-images/before-canyon-motion.jpg) · [after](review-images/after-canyon-motion.jpg)
- orchard: [before](review-images/before-orchard-motion.jpg) · [after](review-images/after-orchard-motion.jpg)
- coast: [before](review-images/before-coast-motion.jpg) · [after](review-images/after-coast-motion.jpg)
- village: [before](review-images/before-village-motion.jpg) · [after](review-images/after-village-motion.jpg)
