# Finishing review — 12 September 2026

## Scope and finding

Reviewed the six individual painting worlds, the garden, original-art browsing, navigation, comfort settings, responsiveness, failure handling and delivery. The main weakness remains the difference between a source-rich entrance composition and the simpler spatial continuation. Adding more worlds would multiply that weakness. This pass develops the existing six compact environments and finishes their supporting visitor experience.

This is an improved, bounded painting exploration project. It is not an accurate reconstruction of unseen scenery or a completed GTA-scale world. The source remains the authority; large rotations still reveal interpretation and simplified geometry.

## Individual world review

| World | Main issue reviewed | Implemented in this pass | Remaining visual limit |
|---|---|---|---|
| Lily Lake | Turning exposed largely empty ochre banks. | Branching alpine trees, boundary rocks, fine terrain marks and quieter ground color variation around the calibrated lake composition. | Rear banks are inferred. Painted reflections remain static; mountains retain projected detail. |
| Rose-colored peaks | Sparse side terrain and oversized, simplified foliage. | More finely divided tree crowns, solid branches, low boundary rocks and fixed-scale ground marks. | New trees remain stylized; the massif is not a geologically accurate mesh. |
| Canyon | Side continuations read as tall flat walls. | Multi-level cliff faces with projecting/recessed rock facets, plum/peach color planes and talus rocks; source texture stays fixed in space. | Wall structure is an interpretation. The two figures remain static painted forms. |
| Orchard | Large empty lawn beyond the boughs and generic-looking foliage masses. | Finer branching garden trees, broken hedge, source-colored ground marks and a compact garden boundary. | The house front remains reconstructed from one view; laundry/hens are simple forms. No invented interior. |
| Breaking waves | Sea and sand had little spatial context beyond the original view. | Coastal rocks, small dune vegetation, fixed-scale sand marks and a bounded shoreline walk. | Water and foam are static painted geometry, not animated fluid. |
| Main street | Continued shop was a blank mass; street edges lacked context. | Recessed glazing, timber mullions/sills, continued road/curb and finer street trees. | The original front facade remains mostly planar; no unsupported opposite city or interiors were added. |

## Navigation and usability

- Original comparison saves and restores position, yaw, pitch and walking height. Returning to the canvas is a separate reset action.
- Tours pause/resume without restarting, display distance progress and finish at the entrance. Manual movement takes control. Menus and hidden tabs pause the tour.
- Added full-view framing while retaining original canvas proportions as a setting. The complete reference frame fits within both modes without changing internal perspective.
- Added keyboard look controls (IJKL), saved pace/resolution/motion preferences, reduced-motion handling and responsive access to the important buttons.
- Search and subject filters cover all 61 originals. Full-image browsing has previous/next controls, keyboard navigation, position counts and honest links to the six modeled worlds.
- Thumbnails contain the complete painting rather than cropping it. Dialogs have accessible names and controls have visible focus styles.
- Browsers without WebGL open the original collection with a clear explanation and retry action. Failed manifest loading has a separate message. Shared scene textures load once per world.
- Walkable extents now stay within the developed scene. Reaching the edge shows a message instead of silently allowing travel into the distant empty ground.

## Validation

The actual scene builders, source assets, entrances, collision paths, closed guided routes, portal centers, walking heights and geometry budgets pass `npm run check`. Rendering budgets range from 17,198 triangles in the garden to 147,008 in the most detailed world; scene mesh counts range from 20 to 84. These are structural budgets, not measured frame rates. Preference recovery, frame fitting, route progress and collection filters also pass.

Supported browser preview was used to verify the no-WebGL fallback, search matches, empty search results, subject filtering, original-image browsing, next-image navigation, settings layout and preference persistence across reload. The browser reports `GL_VENDOR = Disabled` and cannot create a WebGL context. Live GPU shading, walking/turning, mobile touch and frame rate remain unverified. No claim of full live 3D acceptance is made.

The six contact sheets below render actual exported scene geometry from the entrance, left, right, behind and along the guided route looking back. They are offline CPU rasterizations, not browser screenshots. They approximate material shading/filtering and omit the navigation portal/UI. Their purpose is to expose composition and surrounding-geometry weaknesses rather than score an entrance projection as a successful full reconstruction.

## Final scene contact sheets

- [Lily Lake](review-images/v5-lily-lake-motion.jpg)
- [Rose-colored peaks](review-images/v5-rose-peaks-motion.jpg)
- [Canyon](review-images/v5-canyon-motion.jpg)
- [Orchard](review-images/v5-orchard-motion.jpg)
- [Breaking waves](review-images/v5-coast-motion.jpg)
- [Main street](review-images/v5-village-motion.jpg)

The site remains static, public and self-contained. No paid APIs, subscriptions, visitor accounts, external runtime assets or additional Drive folder access were introduced.
