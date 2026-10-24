#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
folder=ROOT/'public'/'data'
def read(filename):return json.loads((folder/filename).read_text(encoding='utf-8'))
roads=read('roads.geojson');places=read('places.geojson');zones=read('risk_zones.geojson');graph=read('graph.json');scenario=read('scenarios.json');tests=read('test_expectations.json');meta=read('dataset_meta.json')
assert roads['type']=='FeatureCollection' and len(roads['features'])>25
assert places['type']=='FeatureCollection' and len(places['features'])==4
assert zones['type']=='FeatureCollection'
assert {p['properties']['placeId'] for p in places['features']}=={'home_01','home_02','home_03','meeting_01'}
assert {s['properties']['kind'] for s in places['features']}=={'home','meeting'}
roadids={f['properties']['roadId'] for f in roads['features']}
assert set(scenario['blocked']['blockedRoadIds'])<=roadids
assert len(scenario['blocked']['blockedRoadIds'])>0
assert scenario['normal']['blockedRoadIds']==[]
for f in roads['features']:
  assert f['geometry']['type']=='LineString'
  assert len(f['geometry']['coordinates'])>=2
  assert f['properties']['lengthM']>0
  for lon,lat in f['geometry']['coordinates']:
    assert -81<lon<-80 and -6<lat<-5
for f in places['features']:
  assert f['properties']['nodeId'] in graph['nodes']
  assert f['geometry']['coordinates']==graph['nodes'][f['properties']['nodeId']]
assert len(tests['cases'])==6
assert all(x['routeDistanceM'] is None or x['routeDistanceM']>0 for x in tests['cases'])
assert all(z['properties']['sourceType']=='illustrative' for z in zones['features'])
if meta['sourceType']=='synthetic':
  assert all(f['properties']['simulated'] is True for f in roads['features'])
elif meta['sourceType']=='osm':
  assert all(f['properties']['simulated'] is False for f in roads['features'])
else: raise AssertionError('Invalid source label')
print('OK — GeoJSON, coordenadas, puntos, trazabilidad, seis casos y metadatos validados. Fuente:',meta['sourceType'])
