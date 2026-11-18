# Országház — measured specification (v2)

Everything in the v2 model is derived from the sources below. Where a value is
an estimate, the method and the uncertainty are given.

## Sources

| # | Source | Used for |
|---|--------|----------|
| S1 | OpenStreetMap relation 3199085 “Országház” (via the ODbL extract committed in `Victor-EU/danube-flyover/tools/osm/buildings.geojson`) | Exact footprint, 8 courtyards, all wing depths and projections. © OpenStreetMap contributors, ODbL 1.0 |
| S2 | Copernicus Urban Atlas building height for OSM 3199085 (`woliwia/sunny-upside-down/building_heights.json`) | Mean measured height 32.0 m (cross-check) |
| S3 | Long-lens photograph of the whole Danube façade, 3708×2756 (kremalicious.com, “Országház I”, 2019) | Elevation: every height, bay count and storey line on the river front |
| S4 | Elevated view from Buda Castle, 5472×3648 (ivanludvig.github.io, 2023) | Roof forms (slate + copper flat tops), dome ribs, south end façade, chamber blocks |
| S5 | User-supplied photo grid (8 photos) and further river photos | Colours, night lighting, cross-checks |
| S6 | Texts: Parliament/Budapest Info/MTAK/pestbuda/kozterkep | 96 m from pavement incl. spire; 16-sided Dome Hall Ø 20 m, star vault 27 m; slate roofs on riveted iron frame; 10 courtyards, 27 gates, 29 staircases, 691 rooms, 4 levels; Upper House north, Lower House south; ~88–90 façade statues of rulers on corbels/canopies along the Danube arcade; Béla Markup's lions at the Kossuth tér stairs |

Photos (S3–S5) are used only as measurement references and are not redistributed.

## Frame

* x along the building (south +), z towards the Danube (west +), y up.
* y = 0 is the terrace / Kossuth tér pavement level (the “96 m” datum).
* The long axis bears 6.4° east of north (OSM).

## Plan (S1, symmetric about x = 0, residual < 0.5 m)

| Part | x | z |
|------|---|---|
| Main range | −102.2 … 102.2 | −14.4 … 31.0 (45.4 m deep) |
| End blocks | ±102.2 … ±125.8 | −24.1 … 40.6 |
| End-façade risalits | ±125.8 … ±131.9 | 0.6 … 15.5 |
| Central river risalit | −25.05 … 25.05 | 31.0 … 45.4 |
| Front towers (8.8 m sq.) | ±17.0 … ±25.8 | 36.6 … 45.4 |
| East wing outer ranges | ±19.7 … ±31.85 | −52.1 … −14.4 (step to ±35.6 for z −18.9 … −14.4) |
| Grand staircase spine | −8.3 … 8.3 | −52.1 … −14.4 |
| Entrance block | −38.4 … 38.4 | −67.5 … −52.1 |
| Main porch | −14.3 … 14.3 | −73.0 … −67.5 |
| Courtyards, central (4) | ±14.7 … ±41.2 | 13.8 … 22.5 and −7.0 … 1.8 (chamfered at the dome) |
| Courtyards, end (2) | ±80.6 … ±113.4 | −1.3 … 17.4 |
| Courtyards, east (2) | ±8.3 … ±19.7 | −52.4 … −19.4 |
| Dome centre | 0 | 7.8 (ring radius ≈ 18 m from the courtyard chamfers) |
| Chamber blocks | ±49.7 … ±72.1 | −4.6 … 17.8 (from turret positions, S3 parallax) |

Overall 263.8 × 118.4 m on the footprint (published 268 × 123 m incl. steps/plinths).

## Camera solution for S3

Plane scale s(z) = 14.24 · 300 / (340.6 − z) px/m; terrace line at y = 2638 px.
Solved from pavilion corners (x = ±125.8), tower axes (±21.4) and chamber-turret
parallax; checks: dome tip → 96.2 m (published 96 m), chamber block width front
22.3 m / back 22.6 m.

## River front (S3)

From each end block to the centre: 5 regular bays, accent bay, 3 regular,
accent bay, 3 regular, then the tower. That makes 13 bays at 5.07 m pitch, and
the accent piers are about 1 m wider.

| Element | Height (m) |
|---|---|
| Arcade floor (podium, steps) | 2.8 |
| Arcade arch crown (round arches) | 11.8 |
| Main-floor balustrade | 12.6 – 14.0 |
| Main-floor windows: 3 round-headed per bay; accent bays one tall pointed window | 14.4 – 18.7 |
| Cornice | 21.0 |
| Pierced parapet | 22.3 |
| Pier pinnacles | ≈ 24.5 |
| Accent-bay gables (3 lancets, crockets) | 27.8 |
| Dormer gables on the roof (one per bay) | ≈ 27.4 |
| Roof ridge | ≈ 30 |
| Ruler statues on the arcade piers, under canopies | ≈ 12.6 – 15.5 |

Central risalit (7 bays × 4.86 m between the towers):

| Element | Height (m) |
|---|---|
| Basement | 0 – 2.6 |
| Paired round-arched windows | 3.7 – 7.5 |
| Triple rectangular windows | 9.2 – 11.3 |
| Balustrade | 12.6 |
| Loggia of 7 semicircular arches on colonnettes | 12.6 – 21.3 (springing 19.2) |
| Cornice, directly over the arch crowns | 22.0 |
| Attic screens: five round-headed lights (centre one open) | 22.6 – 24.6 |
| Gable shoulders | 25.2 |
| 7 crocketed gables with quatrefoils | 27.9 |
| Pinnacles between the gables | ≈ 27.7 |

Front towers (re-measured on the S3 close-up, s = 14.26 px/m at z = 41):

| Element | Height (m) |
|---|---|
| Open arcade band (8 round arches per face) | 23.9 – 25.9 |
| Corbel table, shaft set-back | 26.3 |
| Twin-light window between two slim lancets, each gabled | 27.4 – 33.3 |
| Deep corbelled balcony, about 1 m beyond the shaft | 35.4 |
| Statue stage: two canopied niches per face, statues on the angles | 37.0 – 41.4 |
| Gallery | 41.4 |
| Octagonal belfry, tall slender lancets, pinnacled angles | 42.4 – 47.5 |
| Cornice | 47.5 – 48.2 |
| Crown arcade (two small lancets per side) | 48.2 – 51.3 |
| Crocketed stone spire (base Ø ≈ 3.4 m) | 51.5 – 65.2, cross to ≈ 67 |

End blocks, river face (5 bays × 4.7 m):

| Element | Height (m) |
|---|---|
| Basement | 0 – 2.6 |
| Paired pointed windows | 4.1 – 7.6 |
| Paired rectangular windows | 9.3 – 11.4 |
| Tall paired lancets with oculus | 13.2 – 19.2 |
| Cornice | 20.6 |
| Pierced parapet | 23.7 |
| Corner gables | 27.2 |
| Flat roof top | 33.2 |
| Corner turrets: lantern | 30.8 – 35.6 |
| Corner turrets: spire tip | 40.7 |

Chamber blocks:

| Element | Height (m) |
|---|---|
| Three great tracery windows per face | 25.5 – 30.7 |
| Small-arch gallery | 31.5 – 33 |
| Eaves | 33.7 |
| Truncated hip, flat copper top | 45.8 |
| Corner shafts | to 40.5 |
| Octagonal lantern | 40.5 – 47.3 |
| Slate spire | to 57.7 |

Terrace and quay (S3):

| Element | Value |
|---|---|
| Embankment wall: dressed limestone, plinth, cornice, pilaster strips | quay −3.6 → terrace 0 |
| Balustrade with pedestals about every 7.6 m | 0 – 1.24 m |
| Stair flights to the quay, centred on the accent-bay axes | x = ±56.7, 15.2 m wide, 22 risers |
| Steps up to the river arcade floor, full width of each wing | 0 → 2.8 m |
| Bollards on the river edge of the quay road | every 4 m |

## Dome (S3, S4)

| Element | Value |
|---|---|
| Drum | 16-sided, outer Ø ≈ 28 m; buttresses to r ≈ 17 m with pinnacles to ≈ 57 m |
| Drum tracery windows (run down to just above the risalit gables) | 30.4 – 41.5 m |
| Eight-petalled rose windows | 44.2 – 47.0 m |
| Small-arch gallery | 48.5 – 50.9 m |
| Balustrade | 52.4 m |
| Shell | 53.6 → 73.1 m, widest Ø 24.5 m at 59 m; maroon slate, 16 dark ribs |
| Lantern | 73.1 – 77.7 m, Ø ≈ 4.7 m, ring of small pinnacles |
| Spire | 77.7 → 96.0 m |

## Materials

* Walls: light Hungarian limestone.
* Roofs: maroon/red-brown slate (fish-scale), with flat tops and ridges in green copper and ornamental cresting.
* Dome: maroon slate with dark ribs; lantern and spire dark metal with a gilded finial.
* Courtyard façades: brick with Zsolnay ceramic accents (S6).
