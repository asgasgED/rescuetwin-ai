#!/usr/bin/env python3
"""SYNAPSE RescueTwin AI: build a verifiable demonstration graph or fetch OSM data.

Run offline: python scripts/build_graph.py --source demo
Run online : python scripts/build_graph.py --source osm
OSM mode REQUIRES live responses; never silently falls back to simulated streets.
"""
from __future__ import annotations
import argparse
import json
import math
import pathlib
from collections import defaultdict
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data"
GENERATED = ROOT / "src" / "lib" / "generated" / "dataset.ts"
CENTER = (-80.67417, -5.26167)  # approximate urban Catacaos center [longitude, latitude]
BBOX = (-80.6815, -5.2685, -80.6665, -5.2545)  # west, south, east, north
DISCLAIMER = "Simulación educativa de SYNAPSE. Inundaciones y cierres hipotéticos; no es un mapa oficial, alerta ni ruta segura de evacuación."
OSM_COPYRIGHT = '© OpenStreetMap contributors — https://www.openstreetmap.org/copyright'


def distance_m(a, b):
    """Haversine distance in meters, for WGS84 lon/lat pairs."""
    lon1, lat1 = map(math.radians, a)
    lon2, lat2 = map(math.radians, b)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
    return 6371008.8 * 2 * math.atan2(math.sqrt(h), math.sqrt(1-h))


def get_demo_network():
    """Offline fixture: explicitly FICTIONAL graph, NOT OSM cartography."""
    nodes = {}
    edges = []
    lon0, lat0 = CENTER
    for row in range(9):
        for col in range(9):
            # ~100 m cells with tiny deterministic perturbations to prevent artificial straightness
            lon = lon0 + (col - 4) * 0.00093 + math.sin(row*1.4 + col*0.5)*0.00009
            lat = lat0 + (row - 4) * 0.00084 + math.sin(row*0.7 + col*1.9)*0.00007
            nodes[f"n_{row}_{col}"] = [round(lon, 7), round(lat, 7)]
    for row in range(9):
        for col in range(9):
            a = f"n_{row}_{col}"
            for dr,dc in ((0,1),(1,0)):
                if row+dr < 9 and col+dc < 9:
                    b = f"n_{row+dr}_{col+dc}"
                    edges.append({'roadId':f"road_{len(edges)+1:04d}", 'a':a,'b':b,'coordinates':[nodes[a],nodes[b]],'lengthM':round(distance_m(nodes[a],nodes[b]),3), 'name':'Calle ilustrativa'})
    return nodes, edges, 'synthetic'


def get_osm_network(osm_file=None):
    """Fetch *real* raw walkable highways from Overpass and split into node-pair edges.
    Individual routing segments are based on OSM node topology. Does not treat
    bridges/crossings as connected unless they share exact OSM node IDs.
    """
    if osm_file:
        path=pathlib.Path(osm_file)
        if not path.is_file():
            raise RuntimeError(f'Archivo OSM no existe: {path}')
        if path.suffix.lower() in {'.json', '.geojson'}:
            payload=json.loads(path.read_text(encoding='utf-8'))
        elif path.suffix.lower() in {'.osm', '.xml'}:
            from xml.etree import ElementTree as ET
            root=ET.parse(path).getroot()
            elements=[]
            for node in root.findall('node'):
                elements.append({'type':'node','id':node.get('id'),
                                 'lon':float(node.get('lon')),'lat':float(node.get('lat'))})
            for way in root.findall('way'):
                tags={t.get('k'):t.get('v') for t in way.findall('tag')}
                refs=[ref.get('ref') for ref in way.findall('nd')]
                elements.append({'type':'way','id':way.get('id'),'tags':tags,'nodes':refs})
            payload={'elements':elements}
        else:
            raise RuntimeError('Se requiere archivo .osm, .xml o .json de Overpass')
        print('Datos OSM importados desde:',path)
    else:
        try:
            import requests
        except ImportError as exc:
            raise RuntimeError('Instala dependencia con: pip install requests') from exc
        w,s,e,n = BBOX
        query = f'''[out:json][timeout:80];(way["highway"]({s},{w},{n},{e}););out body;>;out skel qt;'''
        endpoints = (
            'https://overpass.kumi.systems/api/interpreter',
            'https://overpass-api.de/api/interpreter',
            'https://overpass.nchc.org.tw/api/interpreter'
        )
        payload = None
        problems = []
        for endpoint in endpoints:
            try:
                response = requests.post(endpoint, data={'data':query}, timeout=35,
                                         headers={'User-Agent':'SYNAPSE-RescueTwinAI-educational-mvp/1.0'})
                response.raise_for_status()
                candidate = response.json()
                if 'elements' not in candidate:
                    raise ValueError('Respuesta sin elements')
                payload = candidate
                print('Datos descargados de:',endpoint)
                break
            except (requests.RequestException, ValueError) as exc:
                problems.append(f'{endpoint}: {str(exc)[:150]}')
        if payload is None:
            raise RuntimeError('No se pudieron obtener datos REALES de OSM. No se fabricaron calles.\n'+'\n'.join(problems))
    elements = payload['elements']
    source_nodes = {str(item['id']): [item['lon'],item['lat']] for item in elements if item['type']=='node' and 'lat' in item}
    exclude = {'motorway','motorway_link','trunk','trunk_link','construction','proposed','raceway','bus_guideway','platform'}
    nodes = {}
    edges = []
    for way in elements:
        if way.get('type')!='way':
            continue
        tags = way.get('tags',{})
        if 'highway' not in tags or tags['highway'] in exclude:
            continue
        if tags.get('access') in {'no','private'} or tags.get('foot') in {'no','private'}:
            continue
        if tags.get('highway') in {'cycleway'} and tags.get('foot') not in {'yes','designated','permissive'}:
            continue
        refs = [str(nid) for nid in way.get('nodes', [])]
        for j in range(len(refs)-1):
            a,b = refs[j:j+2]
            if a not in source_nodes or b not in source_nodes or a==b:
                continue
            w,s,e,n=BBOX
            if not all(w<=source_nodes[k][0]<=e and s<=source_nodes[k][1]<=n for k in (a,b)):
                continue
            coords = [source_nodes[a], source_nodes[b]]
            length = distance_m(*coords)
            if length < 0.05:
                continue
            nodes[a]=coords[0]
            nodes[b]=coords[1]
            edges.append({'roadId':f"osm_{way['id']}_{j}",'a':a,'b':b,'lengthM':round(length,3),'coordinates':coords,'name':tags.get('name','Vía OSM sin nombre'), 'highway':tags['highway']})
    if len(edges) < 60:
        raise RuntimeError(f'Red OSM insuficiente: {len(edges)} tramos. Amplía BBOX o revisa consulta.')
    return nodes, edges, 'osm'


def adjacency_for(edges, blocked=None):
    blocked = blocked or set()
    adj = defaultdict(list)
    for edge in edges:
        if edge['roadId'] in blocked:
            continue
        adj[edge['a']].append((edge['b'],edge['roadId'],edge['lengthM']))
        adj[edge['b']].append((edge['a'],edge['roadId'],edge['lengthM']))
    return adj


def dijkstra(adj, start, destination):
    import heapq
    distances = {start: 0}
    parents = {}
    queue = [(0.0, start)]
    while queue:
        dist,cur = heapq.heappop(queue)
        if dist > distances[cur]+1e-7:
            continue
        if cur == destination:
            break
        for nxt, eid, weight in sorted(adj.get(cur, []), key=lambda item:(item[0],item[1])):
            candidate=dist+weight
            if candidate < distances.get(nxt,float('inf'))-1e-7:
                distances[nxt]=candidate
                parents[nxt]=(cur,eid)
                heapq.heappush(queue,(candidate,nxt))
    if destination not in distances:
        return None
    curr=destination
    road_ids=[]
    while curr!=start:
        pred,eid=parents[curr]
        road_ids.append(eid)
        curr=pred
    road_ids.reverse()
    return distances[destination],road_ids


def largest_component(nodes, edges):
    adj=adjacency_for(edges)
    visited=set()
    components=[]
    for node in sorted(adj):
        if node in visited:
            continue
        stack=[node]
        visited.add(node)
        comp=set()
        while stack:
            curr=stack.pop();comp.add(curr)
            for neighbor,*_ in adj.get(curr,[]):
                if neighbor not in visited:
                    visited.add(neighbor);stack.append(neighbor)
        components.append(comp)
    if not components:
        raise RuntimeError('No hay componentes conectadas en la red vial')
    largest=max(components,key=len)
    filtered=[e for e in edges if e['a'] in largest and e['b'] in largest]
    if len(largest)<20:
        raise RuntimeError('Componente vial muy pequeña')
    print('Componente conectada:',len(largest),'nodos,',len(filtered),'tramos')
    return {k:v for k,v in nodes.items() if k in largest}, filtered


def choose_places(nodes,edges,source):
    if source == 'synthetic':
        return {'home_01':'n_7_1','home_02':'n_4_1','home_03':'n_1_1','meeting_01':'n_4_7'}
    degree=defaultdict(int)
    for edge in edges:
        degree[edge['a']]+=1;degree[edge['b']]+=1
    candidates=[n for n in nodes if degree[n]>=2]
    lon0,lat0=CENTER
    if len(candidates) < 8:
        raise RuntimeError('Pocos nodos aptos para puntos de demostración')
    def closest(target,excluded=()):
        eligible=[n for n in candidates if n not in excluded]
        return min(eligible,key=lambda n:distance_m(nodes[n],target))
    meeting=closest(CENTER)
    # Three distinct starting sectors, with some separation from meeting node.
    targets=[(lon0-.004,lat0+.0033),(lon0-.004,lat0),(lon0-.004,lat0-.0033)]
    chosen=[]
    adj=adjacency_for(edges)
    for target in targets:
        shortlist=sorted(candidates,key=lambda n:distance_m(nodes[n],target))
        choice=next((n for n in shortlist if n!=meeting and n not in chosen and
                     distance_m(nodes[n],nodes[meeting])>250 and
                     dijkstra(adj,n,meeting) is not None),None)
        if choice is None:
            raise RuntimeError('No se identificaron tres hogares conectados. Ajusta BBOX.')
        chosen.append(choice)
    return dict(zip(('home_01','home_02','home_03','meeting_01'),(*chosen,meeting)))


def choose_blocks(edges, places):
    """Pick non-bridge route edges greedily to produce changes for all three homes.
    This is a demonstration design, *not* observed flooding.
    """
    initial_adj=adjacency_for(edges)
    dest=places['meeting_01']
    origins=[places[f'home_0{i}'] for i in range(1,4)]
    baselines=[dijkstra(initial_adj,orig,dest) for orig in origins]
    if not all(baselines):
        raise RuntimeError('Algún hogar carece de ruta inicial')
    ids={e['roadId']:e for e in edges}
    chosen=set()
    for _ in range(5):
        current=[dijkstra(adjacency_for(edges,chosen),o,dest) for o in origins]
        affected=[i for i,(a,b) in enumerate(zip(baselines,current)) if b and a[1] != b[1]]
        if len(affected)==3:
            break
        # Look for shortest current path candidate that preserves all 3 routes.
        options=[]
        for idx in range(3):
            route=current[idx]
            if route is None or idx in affected:
                continue
            path=route[1]
            for eid in path[1:-1] if len(path)>3 else path:
                if eid in chosen:
                    continue
                trial=chosen|{eid}
                alternatives=[dijkstra(adjacency_for(edges,trial),o,dest) for o in origins]
                if not all(alternatives):
                    continue
                now_aff=sum(x[1]!=y[1] for x,y in zip(baselines,alternatives))
                # Prefer fewer closures, material detour, not tiny changes.
                options.append((now_aff, abs(baselines[idx][0]-alternatives[idx][0]),eid))
        if not options:
            break
        _,_,eid=max(options,key=lambda x:(x[0],x[1],x[2]))
        chosen.add(eid)
    # If no reroutes possible, still select one edge that permits a detour for >=1 home.
    if not chosen:
        for edge in edges:
            eid=edge['roadId']
            trial=[dijkstra(adjacency_for(edges,{eid}),o,dest) for o in origins]
            if all(trial) and any(a[1]!=b[1] for a,b in zip(baselines,trial)):
                chosen.add(eid)
                break
    blocked_routes=[dijkstra(adjacency_for(edges,chosen),o,dest) for o in origins]
    print('Bloqueos:',len(chosen),'Casos recalculados:',sum((x is not None and y is not None and x[1]!=y[1]) for x,y in zip(baselines,blocked_routes)),'de 3')
    if not chosen:
        raise RuntimeError('No se encontraron aristas con desvíos; elegir otra red')
    return sorted(chosen)


def illustrate_water_polygon(edge):
    """Small illustrative rectangle around blocked segment midpoint in lon/lat; not hydrology."""
    a,b=edge['coordinates']
    cx,cy=(a[0]+b[0])/2,(a[1]+b[1])/2
    dx=b[0]-a[0];dy=b[1]-a[1]
    length=math.hypot(dx,dy) or 1e-6
    # Scale length ~25% edge / width ~10m, avoiding huge water footprints.
    ux,uy=dx/length,dy/length
    scale=max(0.00007,min(length*.28,0.00019))
    width=0.000055
    points=[]
    for along,across in [(-1,-1),(1,-1),(1,1),(-1,1),(-1,-1)]:
        points.append([round(cx+along*ux*scale-across*uy*width,7),
                       round(cy+along*uy*scale+across*ux*width,7)])
    return points


def feature_collection(features):
    return {'type':'FeatureCollection','features':features}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--source',choices=('demo','osm'),default='demo',help='demo=ficticio offline; osm=calles reales con internet o archivo')
    parser.add_argument('--osm-file',help='Archivo .osm/.xml o JSON crudo de Overpass, opcional para modo osm')
    args=parser.parse_args()
    nodes,edges,source = get_demo_network() if args.source=='demo' else get_osm_network(args.osm_file)
    nodes,edges=largest_component(nodes,edges)
    places=choose_places(nodes,edges,source)
    blocked_ids=choose_blocks(edges,places)
    edge_by_id={e['roadId']:e for e in edges}
    roads=feature_collection([{'type':'Feature','properties':{'roadId':edge['roadId'],'lengthM':edge['lengthM'],'simulated':source!='osm','name':edge['name']},
        'geometry':{'type':'LineString','coordinates':edge['coordinates']}} for edge in edges])
    places_data=feature_collection([{'type':'Feature','properties':{'placeId':id,'kind':'meeting' if id=='meeting_01' else 'home',
       'label':('Punto de encuentro ilustrativo' if id=='meeting_01' else f'Hogar ficticio {id[-2:]}'), 'simulated':True,'nodeId':nid},
       'geometry':{'type':'Point','coordinates':nodes[nid]}} for id,nid in places.items()])
    zones=feature_collection([{'type':'Feature','properties':{'riskLevel':'high','sourceType':'illustrative',
      'label':f'Aniego hipotético {i+1} (no validado)'},'geometry':{'type':'Polygon','coordinates':[illustrate_water_polygon(edge_by_id[road])]} }
      for i,road in enumerate(blocked_ids)])
    scenarios={'normal':{'blockedRoadIds':[],'description':'Condiciones normales modeladas'},
               'blocked':{'blockedRoadIds':blocked_ids,'description':'Cierre hipotético de tramos; no representa un evento medido'}}
    dataset={'schemaVersion':'1.0.1','sourceType':source,'metadata':{
       'studyArea':'Zona piloto Catacaos, Piura, Perú','bbox':list(BBOX),'center':list(CENTER),
       'roadsSource':(OSM_COPYRIGHT if source=='osm' else 'Red vial totalmente sintética, con coordenadas aproximadas de Catacaos; NO es OpenStreetMap'),
       'riskSource':'Polígonos ilustrativos de aniego, no provienen de mediciones ni mapas oficiales',
       'generatedAt':datetime.now(timezone.utc).isoformat(),
       'warning':DISCLAIMER},'nodes':nodes,'edges':edges,'placeNodeIds':places,'roads':roads,'riskZones':zones,'scenarios':scenarios}
    OUT.mkdir(parents=True,exist_ok=True)
    GENERATED.parent.mkdir(parents=True,exist_ok=True)
    for filename,contents in {
      'roads.geojson':roads,'places.geojson':places_data,'risk_zones.geojson':zones,
      'scenarios.json':scenarios,'graph.json':{'nodes':nodes,'edges':edges,'placeNodeIds':places,'metadata':dataset['metadata']},
      'dataset_meta.json':{'schemaVersion':dataset['schemaVersion'],'sourceType':source,'metadata':dataset['metadata']}
    }.items():
        (OUT/filename).write_text(json.dumps(contents,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    # Embedding JSON as a generated TS module guarantees Vercel includes it without FS handling.
    GENERATED.write_text('// AUTOMATICALLY GENERATED by python scripts/build_graph.py. DO NOT EDIT.\n'
        'export const DATASET = '+json.dumps(dataset,ensure_ascii=False,separators=(',',':'))+' as const;\n',encoding='utf-8')
    # Snapshot of all 6 expected distances, for CI and reproducibility.
    baseline=adjacency_for(edges)
    report={'sourceType':source,'blockedRoadIds':blocked_ids,'cases':[]}
    for id in ('home_01','home_02','home_03'):
        for scenario in ('normal','blocked'):
            blocked=set(scenarios[scenario]['blockedRoadIds'])
            answer=dijkstra(adjacency_for(edges,blocked),places[id],places['meeting_01'])
            report['cases'].append({'originId':id,'scenario':scenario,'routeDistanceM':round(answer[0],3) if answer else None,
                                     'roadIds':answer[1] if answer else []})
    (OUT/'test_expectations.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Generados:',len(nodes),'nodos;',len(edges),'tramos; fuente:',source)
    for case in report['cases']:
        print(case['originId'],case['scenario'],case['routeDistanceM'],'m')
    print('Archivos guardados en:',OUT)

if __name__=='__main__':
    main()
