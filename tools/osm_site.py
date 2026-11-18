"""Convert OpenStreetMap extracts (ODbL, © OpenStreetMap contributors) into the model frame.

Inputs: Victor-EU/danube-flyover tools/osm/*.geojson (+ far/*.geojson.gz) and the
Copernicus-joined heights in woliwia/sunny-upside-down building_heights.json.
Output: src/data/site.json (compact, metres, model frame of ref/SPEC.md).
"""
import json, math, gzip, sys, os
FLY = sys.argv[1]; HEIGHTS = sys.argv[2]; OUT = sys.argv[3]
ref = json.load(open('ref/osm_orszaghaz.json'))
la0, lo0 = ref['center_latlon']
ang = math.radians(83.634278086995)
MID = -7.55
kx = 111320 * math.cos(math.radians(la0)); ky = 110540
def tf(lo, la):
    x = (lo - lo0) * kx; y = (la - la0) * ky
    xr = x * math.cos(-ang) - y * math.sin(-ang); yr = x * math.sin(-ang) + y * math.cos(-ang)
    return (round(-xr - MID, 2), round(yr, 2))
def load(name, far=False):
    p = os.path.join(FLY, 'tools/osm', 'far' if far else '', name + ('.geojson.gz' if far else '.geojson'))
    return json.load(gzip.open(p) if far else open(p))['features']
def rings_of(g):
    if g['type'] == 'Polygon': return [g['coordinates']]
    if g['type'] == 'MultiPolygon': return g['coordinates']
    return []
def dist(p): return math.hypot(p[0], p[1])
def simplify(r, tol=0.4):
    out = [r[0]]
    for p in r[1:]:
        if math.hypot(p[0] - out[-1][0], p[1] - out[-1][1]) > tol: out.append(p)
    if len(out) > 2 and math.hypot(out[0][0] - out[-1][0], out[0][1] - out[-1][1]) < tol: out.pop()
    return out
H = json.load(open(HEIGHTS))
site = {'buildings': [], 'water': [], 'green': [], 'paved': [], 'roads': [], 'trams': [], 'trees': [], 'bridges': [], 'pool': []}
skip = {'relation/3199085', 'way/762834282'}
seen = set()
def add_buildings(feats, rmax, far):
    for f in feats:
        pid = f['properties'].get('id')
        if pid in skip or pid in seen: continue
        for poly in rings_of(f['geometry']):
            outer = [tf(*c[:2]) for c in poly[0]]
            cx = sum(p[0] for p in outer) / len(outer); cz = sum(p[1] for p in outer) / len(outer)
            if math.hypot(cx, cz) > rmax: continue
            seen.add(pid)
            hid = pid.split('/')[-1] if pid else None
            h = H.get(hid)
            tags = f['properties']
            if h is None:
                if 'height' in tags:
                    try: h = float(str(tags['height']).split()[0])
                    except: h = None
                if h is None and 'building:levels' in tags:
                    try: h = float(tags['building:levels']) * 3.4 + 2
                    except: h = None
            rings = [simplify(outer, 0.5 if not far else 1.5)] + [simplify([tf(*c[:2]) for c in r], 0.5) for r in poly[1:]]
            if len(rings[0]) < 3: continue
            site['buildings'].append({'h': round(h, 1) if h else None, 'r': [[v for p in r for v in p] for r in rings if len(r) >= 3], 't': tags.get('building', 'yes')[:12]})
add_buildings(load('buildings'), 1500, False)
add_buildings(load('buildings', True), 3200, True)
# water (Danube + islands), within a 7 km box
for f in load('water'):
    for poly in rings_of(f['geometry']):
        rs = [[tf(*c[:2]) for c in r] for r in poly]
        if not any(any(abs(p[0]) < 4000 and abs(p[1]) < 4000 for p in r) for r in rs): continue
        tag = f['properties'].get('water') or f['properties'].get('natural') or 'water'
        key = 'pool' if tag in ('reflecting_pool', 'pond', 'fountain') else 'water'
        site[key].append({'k': tag, 'r': [[v for p in simplify(r, 1.0) for v in p] for r in rs]})
for f in load('landcover'):
    for poly in rings_of(f['geometry']):
        rs = [[tf(*c[:2]) for c in r] for r in poly]
        if min(dist(p) for p in rs[0]) > 1400: continue
        p = f['properties']; k = p.get('landuse') or p.get('leisure') or p.get('natural') or 'green'
        site['green'].append({'k': k, 'r': [[v for q in simplify(r, 0.6) for v in q] for r in rs]})
for f in load('roads'):
    g = f['geometry']; p = f['properties']
    if g['type'] in ('Polygon', 'MultiPolygon'):
        for poly in rings_of(g):
            rs = [[tf(*c[:2]) for c in r] for r in poly]
            if min(dist(q) for q in rs[0]) > 1200: continue
            site['paved'].append({'k': p.get('highway') or p.get('area:highway') or p.get('amenity') or 'area', 'r': [[v for q in simplify(r, 0.5) for v in q] for r in rs]})
    elif g['type'] == 'LineString':
        pts = [tf(*c[:2]) for c in g['coordinates']]
        if min(dist(q) for q in pts) > 1500: continue
        k = p.get('highway') or p.get('railway') or 'road'
        site['roads'].append({'k': k, 'l': p.get('lanes'), 'p': [v for q in simplify(pts, 1.0) for v in q], 'b': 1 if p.get('bridge') else 0})
for f in load('trams'):
    g = f['geometry']
    if g['type'] != 'LineString': continue
    pts = [tf(*c[:2]) for c in g['coordinates']]
    if min(dist(q) for q in pts) > 1500: continue
    site['trams'].append([v for q in simplify(pts, 1.0) for v in q])
for f in load('trees'):
    g = f['geometry']
    if g['type'] == 'Point':
        p = tf(*g['coordinates'][:2])
        if dist(p) < 1100: site['trees'].append([p[0], p[1]])
for f in load('bridges'):
    for poly in rings_of(f['geometry']):
        rs = [[tf(*c[:2]) for c in r] for r in poly]
        if min(dist(q) for q in rs[0]) > 4000: continue
        site['bridges'].append({'n': f['properties'].get('name') or f['properties'].get('id'), 'r': [[v for q in simplify(r, 0.8) for v in q] for r in rs], 'p': f['properties']})
json.dump(site, open(OUT, 'w'), separators=(',', ':'))
print({k: len(v) for k, v in site.items()}, os.path.getsize(OUT) // 1024, 'KB')
print('buildings with measured height:', sum(1 for b in site['buildings'] if b['h']), '/', len(site['buildings']))
