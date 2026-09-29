# Painted Worlds

Public, browser-based first-person painting walks: nine authored worlds, nine garden portals and 61 preserved originals. No visitor account, paid API, external CDN or runtime Drive access. `dist/` is authored static hosting output; no production build is required. Three.js 0.180.0 is vendored with its MIT license. Vite is a development-only preview dependency.

## Current rendering

The entrance uses the original canvas proportions, including on phones. Source-painted terrain and object-owned materials replace the global visibility atlas. Rounded foliage, closed mountain/rock masses, a joined cottage and gambrel barn, and a grounded street facade sit within continuous distant painted environments. Hidden-surface repairs remain separate from the unchanged originals.

This is an image-based 3D interpretation, not a complete GTA-style world or a recovered depth scan. Close views still reveal simplified foliage, repeated texture and inferred surroundings. See [the current visual review](source/FIDELITY_REVIEW_V9.md) for the nine-world review, source provenance, remaining limitations and rendered evidence. Earlier reports describe historical versions.

## Navigation

WASD/arrows walk; IJKL or dragging looks around; E interacts; C compares; R restores the canvas viewpoint; M opens worlds. Guided walks pause/resume and return to the entrance. The world chooser, local map, garden return, searchable collection, original-image browser and saved settings remain available. Touch controls and an original-art fallback are included. Walking stays inside the authored region and respects water/object collisions.

## Validation

`npm run check` validates the ten scenes, nine portals, source assets, geometry budgets, calibrated reference surfaces, complete guided routes, collision boundaries, walking heights, UI identifiers, preferences and collection filters. It also checks grounded source contacts and the cottage and barn shells’ watertight topology. The current renderer does not consume the legacy visibility atlases.

`source/render-shader-review.py` compiles and renders the exported actual shader programs in standalone Mesa OpenGL through ModernGL. It renders the exact entrance, ±15° turns, ±0.5 m sideways steps, a 0.75 m forward step, and longer walking poses. Portrait framing and optional expanded framing are tested separately. Rendered images must be visually reviewed; a successful render is not a fidelity pass. This is a software graphics renderer, not the browser or a hardware performance measurement. Browser preview still disables WebGL, so browser frame rate, pointer lock and touch rendering remain unverified.

The committed `dist/` assets are sufficient to serve the site. Source generation and offline graphics diagnostics are not required by visitors.
