# Painted Worlds: reconstruction review

This release fixes major rendering defects; it does not complete a free-roaming game reconstruction. Each environment still combines modeled source objects with an authored distant painted environment. The unseen geography is inferred. Close views can expose simplified silhouettes, mirrored edge continuation, limited texture resolution and different brushwork in synthesized areas.

## Changes shared by all nine worlds

- Removed the global visibility-atlas projection that copied source fragments onto unrelated surfaces.
- Replaced the separate canvas-shaped backdrop with one continuous environment. Source atmosphere is restricted to the sky above the horizon, except the barn's woodland setting; no blank sky plate is applied over the whole scene.
- Restored original paint in ground regions that had mistakenly been excluded from the terrain texture. Each world has continuous ground beneath the scene, with repaired hidden regions and a separate ground ownership mask.
- Replaced open organic cutouts with rounded front/back geometry, extended where a subject meets the image edge. Source paint belongs to the front; hidden surfaces use extracted pigment. Paper borders are excluded from texture samples.
- Closed ridge and rock masses down to the floor. Navigation stays inside the environment envelope and respects the cliff feet, water, buildings and relevant objects.
- Preserved all 61 original images, nine entrance cameras, keyboard/touch controls, guided routes and the original comparison.

## Individual review

| World | Corrected | Remaining limits |
| --- | --- | --- |
| Lily Lake | Restored lake/shore paint, original sky, separate mountain masses with grounded hidden faces; removed the separate backdrop panel. | Mountain backs and the distant environment remain inferred. Shore transition and enlarged strokes can be visible on longer walks. |
| Rose-colored peaks | Restored emerald lake and foreground paint, original atmosphere, closed rose mountain masses and rounded conifer silhouettes. | Close tree edges and mirrored extensions can remain visible. Distant rock and forest continuations are interpreted. |
| Canyon | Continuous canyon floor, closed cliff masses, original narrow sky opening and cliff-foot collision. | Hidden cliff texture is extrapolated; walking cannot recover real unseen geography. |
| Orchard garden | Rebuilt cottage with a shared closed roof/wall shell, grounded its base, kept the window on the wall, repaired paint hidden by foreground branches and laundry, and removed the duplicate cottage/clothesline/hens from the distant background. Extended image-clipped vegetation. | This remains the weakest scene. Broad foliage masks, a simplified cottage side and the source-to-surroundings ground transition remain visible. The new background matches the medium approximately. |
| Breaking waves | Restored source sea/shore paint, restricted atmosphere to the sky, grounded closed reef masses and retained modeled wave strips. | Waves are static; foam depth and rock sides are approximations. |
| Main street | Grounded the facade using the source pavement contacts; unified tree root/crown depth; replaced the ivory fallback wall with stable shop paint; repaired the facade behind the modeled canopy; extended the planter past the source edge. | The facade continuation repeats some architectural paint. Projecting signs and tree crowns use simplified volumes. |
| Pine trail | Restored the actual ochre path and sage ground; recovered source sky; replaced fragmented tree surfaces with rounded source silhouettes and continued clipped branches. | Branch depth remains approximate and side views can expose simplified forms. |
| Country lane | Restored the twin tracks and meadow instead of filler texture; recovered the source sky and hills; extended overhead boughs. | Large tree groups remain shallow volumes, with visible texture repetition close to their sides. |
| Winter barn | Retained a joined gambrel shell; restored woodland and patchy snow; grounded/rounded trunks and repaired red barn spill in the trunk texture. | Hidden barn surfaces and woodland are inferred; the tiny ornament remains simplified. |

## Visual assets

The rectified originals are unchanged. Existing surrounding panoramas remain authored interpretations. Four built-in image edits were used in this revision: orchard and street hidden-surface plates, an orchard background with duplicate foreground subjects removed, and facade paint behind the street canopy. Generated plates are used beneath occluding objects or as distant surroundings, not as replacements for the originals. Prompts are saved in `source/references/v9/`.

## Verification

`npm run check` covers the ten scenes, all original assets, finite geometry, drawing budgets, entrance framing, complete guided routes, water and object collisions, closed cottage/barn shells, viewport settings and collection filters.

The actual scene geometry, shader programs, uniforms and textures were exported and rendered with Mesa/ModernGL at nine poses per world: entrance, ±15-degree turns, ±0.5-m sideways steps, 0.75-m forward, a longer walk, sideways after walking, and looking back. Both the sheets and original/entrance comparisons were inspected. Images in `source/references/v9/review/` are the final evidence. Pixel errors are diagnostic, not proof of perceptual fidelity or recovered depth.

The managed browser loaded the interface, filtered the collection to Winter Barn and opened its preserved original successfully. That browser disables WebGL. Actual live GPU performance, pointer lock and touch 3D rendering remain unverified; the software renders are not claimed as live browser gameplay tests.

Reproduce the visual review with:

```
node source/export-reference-checks.mjs /workspace/painted-review
python source/render-shader-review.py /workspace/painted-review lily-lake rose-peaks canyon orchard coast village pine-trail country-lane winter-barn --phone
```

ModernGL, Pillow and NumPy are needed only for this developer diagnostic. Visitors need no install, account, paid service or runtime API.
