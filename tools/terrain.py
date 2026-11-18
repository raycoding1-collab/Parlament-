"""Land / quay / river-wall geometry from the OSM Danube polygons (ODbL).

land  : area box minus the river (y = 0), Pest bank eroded by the 14 m quay-road strip
quay  : the lowered Pest quay road strip (y = -3.6)
walls : polylines along the river edge (river walls) and the strip's inland edge (retaining wall)
Output merged into src/data/site.json as triangulated arrays.
"""
import json, sys, numpy as np
from shapely.geometry import Polygon, MultiPolygon, box, LineString
from shapely.ops import unary_union
import mapbox_earcut as earcut

site = json.load(open('src/data/site.json'))
def poly(flat_rings):
    rings = [[(r[i], r[i + 1]) for i in range(0, len(r), 2)] for r in flat_rings]
    p = Polygon(rings[0], rings[1:])
    return p.buffer(0)
river = unary_union([poly(w['r']) for w in site['water'] if w['k'] == 'river'])
area = box(-4500, -3600, 4500, 4200)
river = river.intersection(area)
PEST_Z = 230  # river centre line near the Parliament lies around z≈230; Pest is the -z side
pest = box(-4500, -3600, 4500, PEST_Z)
strip = river.buffer(14.0, join_style=2).difference(river).intersection(pest)
def polys_only(g):
    gs = g.geoms if hasattr(g, 'geoms') else [g]
    ps = []
    for x in gs:
        if x.geom_type == 'Polygon': ps.append(x)
        elif x.geom_type == 'MultiPolygon': ps += list(x.geoms)
    return MultiPolygon(ps)
# river-front stairs of the Parliament: pits cut into the terrace in front of the
# middle of each arcade wing (S3 elevation), descending to the quay road
STAIRS = [(-56.7, 55.73), (56.7, 56.82)]  # (x centre, retaining-wall z at that x)
pits = unary_union([box(cx - 7.6, zr - 9.4, cx + 7.6, zr + 2.0) for cx, zr in STAIRS])
strip = unary_union([strip, pits.difference(river)])
strip = polys_only(strip)
land = polys_only(area.difference(river).difference(strip))
def tri(geom, y):
    verts, idx = [], []
    geoms = geom.geoms if hasattr(geom, 'geoms') else [geom]
    for g in geoms:
        if g.is_empty or g.geom_type != 'Polygon' or g.area < 4: continue
        g = g.simplify(0.4)
        rings = [np.array(g.exterior.coords[:-1], dtype=np.float64)] + [np.array(r.coords[:-1], dtype=np.float64) for r in g.interiors]
        rings = [r for r in rings if len(r) >= 3]
        allv = np.vstack(rings); ends = np.cumsum([len(r) for r in rings]).astype(np.uint32)
        t = earcut.triangulate_float64(allv, ends)
        base = len(verts) // 2
        verts += [round(float(v), 2) for v in allv.flatten()]
        idx += [int(i) + base for i in t]
    return {'v': verts, 'i': idx, 'y': y}
def lines(geom):
    out = []
    geoms = geom.geoms if hasattr(geom, 'geoms') else [geom]
    for g in geoms:
        if g.geom_type != 'Polygon': continue
        for r in [g.exterior] + list(g.interiors):
            c = list(r.simplify(0.5).coords)
            out.append([round(v, 2) for p in c for v in p])
    return out
from shapely.geometry import Point
retain = strip.boundary.difference(river.buffer(0.6))
def lines_any(g):
    gs = g.geoms if hasattr(g, 'geoms') else [g]
    out = []
    for x in gs:
        if x.geom_type == 'LineString' and x.length > 2: out.append([round(v, 2) for p in x.simplify(0.5).coords for v in p])
    return out
def lowered(flat):
    pts = [Point(flat[i], flat[i + 1]) for i in range(0, len(flat), 2)]
    return 1 if sum(1 for q in pts if strip.buffer(1.0).contains(q)) > len(pts) * 0.5 else 0
for r in site['roads']: r['q'] = lowered(r['p'])
site['tramsQ'] = [lowered(t) for t in site['trams']]
site['terrain'] = {
    'retain': lines_any(retain),
    'land': tri(land, 0.0),
    'quay': tri(strip, -3.6),
    'riverWalls': lines(river),
    'stripEdges': lines(strip),
    'stairs': [[cx, round(zr - 9.4, 2), round(zr, 2)] for cx, zr in STAIRS],
}
json.dump(site, open('src/data/site.json', 'w'), separators=(',', ':'))
print('land tris', len(site['terrain']['land']['i']) // 3, 'quay tris', len(site['terrain']['quay']['i']) // 3, 'walls', len(site['terrain']['riverWalls']))
