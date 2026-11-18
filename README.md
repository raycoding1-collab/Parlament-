# Országház — a measured 3D model of the Hungarian Parliament Building

An interactive, physically lit, fully procedural WebGL model of Imre Steindl's
Országház (Budapest, 1885–1904), set in the real city. It is built from survey
data, not freehand. The footprint comes from OpenStreetMap; heights, bay rhythms
and storey lines were measured on a long-lens photograph of the whole Danube
front. Every value is listed with its source in [`ref/SPEC.md`](ref/SPEC.md).

## What is modelled

* **Plan:** the surveyed OSM outline (relation 3199085).
  * 264 × 118 m main range, 45.4 m deep, along the river.
  * End blocks, end-façade risalits and the central river risalit.
  * East wing with the grand-staircase spine, entrance block and porch.
  * 8 courtyards with brick and Zsolnay-accented façades.
* **Danube front:** 2 × 13 bays of the round-arched arcade at 5.07 m pitch, with accent bays under the chamber towers. Above the arcade are the main-floor triple windows, the corbel table, pierced parapets, pinnacles, gable dormers and statues of the rulers on corbels under canopies.
* **Central risalit:** a seven-arch loggia, crocketed gables and the two front towers. Each tower rises through stages with galleries and an octagonal belfry to a crocketed stone spire at 65.8 m.
* **Chamber halls:** blocks with three-light tracery windows, near-vertical slate roofs with copper flat tops, and four dark-spired turrets reaching 57.7 m.
* **End blocks:** corner gables and roof turrets. Each end façade has a risalit with a rose-window gable and a twin portal.
* **Dome:**
  * a 16-sided drum with tracery windows, quatrefoil oculi and a small-arch gallery
  * buttress pinnacles round the shell
  * a slate shell fitted point by point to the photographed silhouette, with 16 dark ribs
  * the lantern, and a spire to 96 m
* **Materials:** Hungarian limestone, maroon fish-scale slate, verdigris copper, lead, brick and glazed Zsolnay bands. All textures are generated procedurally at load time.
* **City:** 17,000 surrounding buildings from OSM, at Copernicus-measured heights. The scene also includes:
  * the Danube with its quay walls and the lowered Pest quay road
  * Kossuth tér's paving, lawns and reflecting pool
  * tram line 2 and the mapped trees
  * the bridges, and the Buda hills
* **Lighting:**
  * five moods: Morning, Day, Golden hour, Blue hour and Night
  * the golden night floodlighting, modelled as rows of uplights plus projectors
  * planar reflections in the river, GTAO, bloom and filmic tone mapping
* **Exports:** 4K stills (3840 × 2160) and a GLB of the building, using `EXT_mesh_gpu_instancing`.

The Kossuth tér (east) side follows the surveyed plan and the documented
elements: the porch, the flight of steps and Béla Markup's lions. No measured
photograph of that side was available, so its elevation is a composition in the
building's own vocabulary. `ref/SPEC.md` marks which parts are measured and
which are inferred.

## Run it

```bash
npm install
node tools/build.mjs          # → dist/index.html + dist/app.js, and dist/orszaghaz.html (single file)
npx http-server dist          # or open dist/orszaghaz.html directly
```

URL parameters:
* `?preset=morning|day|golden|blue|night`
* `&view=danube|river|castle|aerial|dome|square|north`
* `&q=high|medium|low`

On a phone the viewer starts at medium quality and steps down automatically if it is slow.

## How it was measured

1. **Plan.** OSM relation 3199085 was converted to local metres and aligned to its dominant edge (bearing 6.4°). It is symmetric to within 0.5 m.
2. **Elevation.** A 3708 px long-lens photograph of the full Danube front was calibrated:
   * The horizontal scale came from the plan (end pavilions at ±125.8 m, towers at ±21.4 m).
   * The camera distance was solved from the parallax of the chamber turrets (~300 m).
   * As a check, the dome tip lands at 96.2 m against the published 96 m.
3. **Bays.** Arcade arches were counted and placed at their measured centres. Storey lines were read from the calibrated image.
4. **Dome.** The shell's silhouette was sampled row by row and used directly as the lathe profile.
5. **Roofs and colours.** These come from a 5472 px elevated photograph taken from Buda Castle.
6. **Comparison.** Renders from the reference viewpoints were compared side by side with the photographs, and the model was corrected until they matched.

## Data & licences

* Map data © OpenStreetMap contributors, ODbL 1.0. The extract was taken via the
  committed extracts in `Victor-EU/danube-flyover`. `src/data/site.json` and
  `ref/*.json` are ODbL derivative databases.
* Building heights: Copernicus Urban Atlas Building Height, joined to OSM ids as
  published in `woliwia/sunny-upside-down`.
* The reference photographs were used only for measurement and are not
  redistributed here.
* Code: three.js (MIT); everything else in this repository was written for this project.

`tools/osm_site.py` and `tools/terrain.py` regenerate `src/data/site.json`.
`tools/shots.cjs` renders batches of stills headlessly, and `tools/export.cjs`
writes the GLB.
