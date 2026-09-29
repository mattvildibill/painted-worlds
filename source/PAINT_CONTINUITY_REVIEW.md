# Painted continuity review — September 2026

## Main finding

The old render combined a very detailed source-facing composition with a mostly flat, generic walking area. The nearby floor hid the rich ground in the surrounding paintings. Repeated two-triangle marks, faceted rocks, whole-tree cards, and pigment-colored solids made the contrast worse. Source sky projection also carried fragments of distant objects into newly exposed views. Distant mountain geometry produced excessive parallax when approached.

## Implemented

- All nine existing worlds now have local, source-referenced surrounding paintings. No new worlds or external runtime services were added.
- A continuous curved relief joins terrain, surrounding landscape and far sky. Its explicit per-world contact profiles place the ground at physical walking height, with gentle terrain variation. Texture coordinates stay attached to the relief as the camera translates. These are authored depth envelopes, not recovered scene measurements.
- Visible original ground pixels are projected separately through a subject mask. Unknown ground beneath objects blends into the surrounding painting instead of showing a repeated small patch.
- Removed the entire repeated polygon ground-mark field and generic surrounding tree/rock scatter. Canyon continuation surfaces now carry coherent surrounding paint. The village continuation carries projected source shopfront detail instead of a plain beige wall.
- Source foliage uses many small, individually positioned painted strokes sampled from the full original image. This preserves actual pigment colors and texture and substantially reduces triangles. Each stroke turns toward the viewer independently; it is deliberately an impostor technique, not a fully modeled leaf. Dark blue foliage is retained.
- Original foreground objects remain separately modeled. Camera-relative distant landscape impostors reduce mountain parallax to 8% of visitor translation. This prevents nearby-looking mountain folds while retaining the calibrated source-facing view.
- The surrounding sky uses the complete surrounding painting. Within the forward sky sector, a conservatively extracted clean source-sky plate prevents duplicate generated mountains and leaked original mountain fragments. This sky plate is filled only from source sky colors, so missing regions match approximately rather than pixel-for-pixel.
- The original image edges blend over a narrow transition into the surrounding paint. Two generated duplicate landmarks (orchard house and winter barn) are covered in the surrounding layer with neighboring painted background samples; original foreground buildings remain visible. This is an explicit artistic background repair and may still show local repetition.
- Walking is bounded inside the authored relief. Lily Lake's long outer excursion was shortened to the near-shore route; its rear loop and return to the canvas remain. Existing water and object collisions are preserved.

## Individual review

| World | Main correction | Remaining limit |
|---|---|---|
| Lily Lake | Continuous ochre shore, removed scattered polygon rocks, reduced mountain parallax | The inferred lake/shore envelope is not surveyed geography; close ground paint is enlarged |
| Rose peaks | Surrounding rose/violet mountains, gold larches, painted shore; source-colored foliage strokes | Golden trees outside the original are generated interpretations |
| Canyon | Repainted physical continuation walls with the surrounding canyon's actual color shapes | Depth-envelope joins and source cliff cut edges remain visible from some positions |
| Orchard | Full painted orchard and ground, source-paint leaf/fruit strokes, removed generic scattered trees | Missing sides of the house and distant trees are inferred; relief trees are not individually solid |
| Coast | Painted sand and dune surroundings; removed generic sea extension overlay | The wrap's water/land contours are illustrative, not a full ocean simulation |
| Village | Painted street all around; source shopfront detail on the previous blank continuation wall | Repeated facade sampling can soften or stretch at close angles |
| Pine trail | Actual surrounding path/brush color, removed repeated full-tree cards and ground chips | Fine foliage has some clipping at small source-patch edges |
| Country lane | Continuous twin-track and meadow paint, source-painted cypress/branch strokes | Panoramic texture detail is lower than the original canvas |
| Winter barn | Continuous snow/woods, removed generic stick-tree scatter, retained original barn | Background patch repair and inferred tree depth remain approximate |

## Verification

The previous CPU material approximations were insufficient to assess the actual shaders. This pass adds `source/render-shader-review.py`, which compiles and renders the site's exported shader programs using standalone Mesa OpenGL/llvmpipe through ModernGL. It performs a minimal WebGL-to-GLSL syntax and color-output translation; it uses the real textures, geometry, uniforms and depth testing. It is neither a browser screenshot nor a hardware-GPU performance test.

Review covers nine views per world: canvas viewpoint, left, right, rear, a route position, looking down, a forward route position, and sideways/rear after walking. The gallery portal and application HUD are omitted to isolate the scenery. Sheets are under `source/review-images/v7-*-shader-review.jpg`.

`npm run check` verifies all ten scenes including the garden, all nine portals, 61 source images, loaded texture paths, finite geometry, calibrated reference surfaces, guided routes, water/object collisions, walking bounds, source-frame fitting, preferences and collection filters. All pass. Browser preview verifies the existing collection and fallback; the hosted Chrome runtime still cannot create WebGL. Actual browser frame rate, pointer-lock movement and touch rendering remain unverified.

## Reproduction and cost

Final browser assets are committed in `dist/`. There is no visitor account, external image request, paid API, subscription or Drive connection at runtime. No Drive files were accessed this turn.

Five new source-referenced environment images were generated once each; native dimensions are 1774×887, not the higher resolution requested. Their full provenance is in `source/references/remaining-five-provenance.json`; the preceding four are documented in `surrounding-art-prompts.json`. They are panoramic illustrations with an authored spherical interpretation, not verified equirectangular photographs. There is unavoidable magnification in close views.

`source/prepare-sky-masks.py` creates the source subject/ground masks; `source/prepare-foliage.py` samples the original foliage. `node source/export-reference-checks.mjs OUT` exports all actual shader inputs. With ModernGL, Pillow and NumPy installed for offline diagnostics, run `python source/render-shader-review.py OUT lily-lake rose-peaks canyon orchard coast village pine-trail country-lane winter-barn`. ModernGL is a review-only dependency, not a website dependency. Historical CPU diagnostic scripts are not authoritative for the new rendering path.

## Blender

Blender can improve sculpted silhouettes, UV projection, texture painting, baking and GLB exports. It is free and does not require a visitor account. It is not installed in this environment and was not used or claimed as part of this implementation. Increasing polygon counts in Blender alone would not solve inconsistent painted textures or invent accurate hidden scenery. A fully modeled GTA-like environment with individually painted backs and interiors remains a larger asset-authoring project than this hybrid reconstruction.
