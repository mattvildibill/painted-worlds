# Painted Worlds: source fidelity review, revision 8

## Verdict

Opening views are materially closer to the original paintings. Movement remains an unfinished image-based reconstruction. A successful shader render, low entrance pixel error, or collision check does **not** establish that the world is a convincing, continuous painted environment.

This revision addresses the user's seven phone screenshots. Two independent reviewers inspected the screenshots and source images. The primary reviewer inspected movement renders for all nine worlds. The browser preview was opened and its original-art fallback and settings were inspected, but that browser disables WebGL. The 3D evidence is therefore standalone Mesa software rendering of the actual exported geometry, materials and textures, not a browser screenshot, mobile performance test or live first-person browser session.

## Changes

- Original canvas proportions are now the default, including on phones. The Original comparison and entrance occupy the same image rectangle. Older implicit expanded-view preferences migrate to canvas framing; an explicitly selected expanded view remains available.
- A baked visibility atlas assigns the source image's visible pixels to their rendered surfaces. Those colors remain fixed on the geometry during movement. Occluded surface regions retain separate repair textures. This is not a screen overlay; imperfect semantic ownership still causes artifacts away from the entrance.
- Complete, source-derived foliage silhouettes replace the previous scattered dabs. Country Lane's cypress and Orchard's apple branches have individually reviewed masks. These remain thin impostors and do not provide correct all-angle tree volume.
- Standing subjects now derive their depth from painted ground contact. The barn is a joined, closed shell with a traced gambrel profile, shared roof/wall vertices, and a matching collision footprint. Its old overlapping facade and roof cards were removed.
- The barn's background is repaired woodland extracted from its source; the painting does not imply a large open-sky rectangle above the shed.
- Hidden sky repair rejects residual dark foliage and carries source canvas grain through the repaired regions. Source-to-surroundings blending is widened entirely outside the original frame, with reflected texture continuation to reduce narrow stretched edge bands. This is a restrained image-based transition, not authored unseen geography; repetition and mismatches remain possible.
- The source visible frame no longer loses a 6.5% edge strip to generated surroundings. Ground no longer has a hard fragment discard at the source frame boundary.

## Individual worlds

| World | Main problems identified | Corrections | Remaining visual problems |
|---|---|---|---|
| Lily Lake | Different entrance scale, source lake stops against an unrelated surrounding shore; mountain layers separate after movement. | Canvas framing, protected original pigment, outside-frame transition. | Lake/shore continuation, distant layer separation, enlarged ground strokes and paper rim remain visible in some views. |
| Rose Peaks | Fragmented conifers, incorrect contact, source/panorama boundary. | Complete source foliage, grounded subjects, protected source palette and wider outside transition. | Trees remain thin, water/ground continuation and distant peak depth are approximate. |
| Canyon | Cliff/sky ownership errors, floating travelers, stretched valley continuation. | Grounded figures, protected source composition and wider outside transition. | Cliff silhouettes can expose strips of background; cliff backs and valley floor need deliberate meshes and painted texture work. |
| Orchard Garden | Apple branches carry cottage/sky fragments, hens and plants float relative to hillside, cottage behaves like an extruded sheet. | Reviewed branch/leaf/apple masks, larger occluder exclusions, grounded subjects, adjusted route, clean sky repair. | Cottage/branch occlusions, edge branches, paper rim and hidden house faces remain conspicuous during longer walks. |
| Coast | Different entrance framing; sea patch meets unrelated sandy surroundings. | Matched entrance framing, protected source colors, outside-frame texture transition. | Sea is largely planar and beach/sea continuation is not geometrically consistent from all views. |
| Main Street | Trees fragment, bin and pavement objects float, facades and sky appear as cards. | Intact silhouettes, grounded street objects, protected source paint. | Tree/sky gaps, thin trunks and repeated or stretched shop textures remain visible after movement. |
| Pine Trail | Sparse foliage dabs; large pale wedges behind treetops; source frame boundary. | Complete silhouettes, source-derived sky repair without dark tree remnants, grounded trees and wider transition. | Coarse crown ownership, flat tree backs and distant ridge/background mismatch still need reconstruction. |
| Country Lane | Broken cypress, duplicate canopy fragments and gray smears, abrupt sky/field boundary. | Individually traced cypress, source matte, ground contact, sky repair with source grain and outside-frame transition. | Overhead boughs and hedges have incomplete depth/hidden geometry; repeated paint and frame transition can still be evident. |
| Winter Barn | Entrance disagrees with source, pale sky strip, floating trunks/ornament, unrelated overlapping roof/facade slabs. | Calibrated horizon, traced closed barn shell, shared gambrel edges, contact-derived subject depth, repaired woodland background. | Hidden walls use limited paint patches; woodland and trunks are still layered and can expose seams at large movements. |

## Evidence and limits

`review-images/v8/` contains nine contact sheets generated from the actual scene shaders in software OpenGL. Each tests the entrance, left/right 15-degree turns, left/right 0.5 m steps, a 0.75 m forward step, a longer walk and 90/180-degree turns after walking. The visible render area is cropped consistently in each contact sheet; the underlying phone renders also verify letterboxing. Additional portrait expanded-view checks were made for the barn, pines, country lane and orchard.

The visual review is intentionally **not** marked as a pass for unrestricted walking. The next substantive improvement requires per-object depth ownership and complete hidden surfaces, with source-style textures painted for those surfaces. Blender could author such geometry, but simply importing the existing cards into Blender would not repair them. A single painting does not determine the unseen sides, so those areas remain artistic interpretations.

Original reference pixels and extracted texture patches come from the already-cached authorized Paintings collection. Existing generated panoramas remain interpretations from earlier revisions; no new generated panorama was introduced here. The 61 original collection images are preserved. No new visitor account, runtime API, paid service or external CDN is required.

## Reproduction

The static `dist/` folder is the website. Diagnostic dependencies are development-only.

```sh
python source/prepare-source-mattes.py
python source/extract-painted-surfaces.py
python source/prepare-sky-masks.py
node source/export-reference-checks.mjs /tmp/painted-worlds-review
python source/render-shader-review.py /tmp/painted-worlds-review lily-lake rose-peaks canyon orchard coast village pine-trail country-lane winter-barn --bake
npm run check
python source/render-shader-review.py /tmp/painted-worlds-review lily-lake rose-peaks canyon orchard coast village pine-trail country-lane winter-barn --phone
```

The render script requires ModernGL, Pillow, NumPy, and an EGL OpenGL implementation. Matte and texture preparation also requires SciPy. Regenerate the visibility atlas after changing the authored geometry, scene shaders or mattes. Its manifest fingerprint is checked by `npm run check`. The original historical composition scripts apply the reviewed correction files before writing data.
