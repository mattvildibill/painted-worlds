# Surrounding painted worlds — September 2026

## Delivered scope

Three additional, individually authored painting worlds: **The pine trail** (9930), **Country lane** (2802), and **Winter barn** (7409). **Lily Lake** (3177) is rebuilt with the same surrounding-environment approach. Nine modeled worlds and nine garden portals now sit alongside the unchanged collection of 61 original images.

These four worlds carry painted scenery in every direction, including above and behind the visitor. They combine source-calibrated foreground surfaces and objects, walkable terrain, physical rocks/trunks/branches, source-extracted tree impostors, and a distant spherical painting. Their tours first make a small loop behind the canvas, clear of the garden portal, then follow the original scene's route.

## What changed and why

The previous rear views contained simple terrain and sparse procedural trees. Increasing their polygon count did not preserve the source's richness. This pass uses four generated environment paintings, each explicitly referenced to its original artwork, for the complete distant environment. These are stored as local WebP assets, not generated at runtime.

The original paintings remain untouched in the collection. Their main subjects are reconstructed separately: the lake/mountain arrangement, the winding ochre trail and asymmetric pine crowns, the pale twin-track lane with tall left cypress and distant blue hills, and the red gambrel barn with its gray roof, white trim, left trunk and patchy snow.

Extracted tree silhouettes preserve real source brush marks at middle distance. Cylindrical impostors turn toward the viewer as position changes; these are deliberate 2.5D elements, not scanned trees. Nearby terrain and modeled objects have ordinary 3D parallax and collisions. Distant scenery remains a spherical matte painting. Far ground blends toward that painting to avoid a hard line at the horizon; it is not a recovered depth field. The compact walking areas keep the visitor within the authored foreground.

Directional review rejected Lily Lake's enlarged tree crops: its original edge trees contain too few pixels and clipped silhouettes. The shore now remains open, with physical rocks and forest in the surrounding painting. Pine trail uses one isolated complete fir at middle distance, clear of the guided route; the cropped tree groups and their ground fragments are excluded.

The new source trees use fixed local texture coordinates, avoiding source-camera smearing as their orientation changes. Foliage sits just in front of its physical trunk to prevent trunks drawing over leaf paint. The country-lane mask excludes the blue hill behind the source tree. Separate ground layers have small height offsets to prevent coplanar flicker. Winter-barn wall collisions stop at the actual source wall extent rather than extending an invisible wall across the clearing.

## Source fidelity and inference

| Scene | Preserved reference | Inferred surrounding scenery |
|---|---|---|
| Lily Lake | Broad blue-gray lake, snowy saddle, dark mountain flanks and ochre shore | Rocky shore, conifers, mountain slopes and clouded watercolor sky around and behind the viewpoint |
| Pine trail | Warm winding path, irregular olive/dark pines, sage scrub and mauve ridge | Continuing woodland, rocks, scrub and trail surroundings; the generated distant painting includes a small additional water glimpse |
| Country lane | Pale twin tracks, tall slender left tree, overhead right tree and low blue hills | Olive fields, hedges, distant trees and continuing country lanes |
| Winter barn | Single red gambrel barn, white X door, roof, foreground trunk and snow patches | Snowy wooded clearing, bare trunks, branches, exposed earth and painted winter sky |

The original painting does not show the real landscape behind the artist. These extensions are artistic inferences, not geographically verified surroundings. They do not claim accurate unseen architecture, forestry or terrain. The generated panoramas match the medium and palette approximately rather than reproducing every physical brushstroke.

## Assets and reproduction

Built-in image generation supplied four native **1774×887** 2:1 panorama assets. A larger size was requested but was not returned; no artificial upscale or paid fallback was used. Full prompts, original input paths and generator provenance are in `source/references/surrounding-art-prompts.json`.

`source/extend-compositions.py` adds the three compositions to the existing six and enables surrounding artwork. Run it after the original composition authoring script. `source/prepare-reference-art.py 9930 2802 7409` creates the new comparison canvases, then `source/extract-painted-surfaces.py pine-trail country-lane winter-barn` extracts their surface paint. `source/prepare-surround-assets.py` packages the four already-generated panoramas and extracts nearby tree silhouettes from source artwork. It expects the generated PNGs in `/workspace/painted-worlds-v6-assets/`; the final WebPs and metadata are committed and sufficient to run the site without those intermediate PNGs.

## Verification and limits

- All ten scene builders, nine portals, 61 originals, source references, finite geometry, collision paths, closed tours, entrances and walking heights pass structural verification. The new rear loops do not cross return portals.
- The source-frame, collection-filter, preference-recovery and tour-progress checks remain in place.
- Browser preview verifies the nine-world chooser, new scene names, original-art links and fallback. The available Chrome browser disables WebGL. Live GPU shading, first-person movement, frame rate and touch input remain unverified.
- The final diagnostic sheets use actual exported meshes and shader-equivalent CPU texture evaluation. They include the tree-impostor orientation, source masks, environment seam blend and far-ground blend. They are offline renders, not browser screenshots; filtering and precision differ from the GPU. The navigation portal is omitted to isolate the scenery.
- No new account, paid API, subscription, visitor sign-in, Drive access or external runtime image request is required.

## Directional review sheets

- [Lily Lake](review-images/v6-lily-lake-motion.jpg)
- [Pine trail](review-images/v6-pine-trail-motion.jpg)
- [Country lane](review-images/v6-country-lane-motion.jpg)
- [Winter barn](review-images/v6-winter-barn-motion.jpg)
