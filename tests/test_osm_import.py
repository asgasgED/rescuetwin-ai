"""Offline OSM parser smoke test with *synthetic XML*, never bundled as genuine OSM data."""
import importlib.util
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('builder',ROOT/'scripts'/'build_graph.py')
builder=importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
nodes, edges, _=builder.get_demo_network()
ids={nid:i+1 for i,nid in enumerate(nodes)}
root=ET.Element('osm',version='0.6')
for nid,(lon,lat) in nodes.items():
    ET.SubElement(root,'node',id=str(ids[nid]),lon=str(lon),lat=str(lat))
for i,edge in enumerate(edges):
    element=ET.SubElement(root,'way',id=str(10000+i))
    for n in [edge['a'],edge['b']]:ET.SubElement(element,'nd',ref=str(ids[n]))
    ET.SubElement(element,'tag',k='highway',v='residential')
with tempfile.TemporaryDirectory() as dirname:
    path=Path(dirname)/'synthetic-test-fixture.osm'
    ET.ElementTree(root).write(path,encoding='utf-8')
    parsed_nodes,parsed_edges,label=builder.get_osm_network(path)
    parsed_nodes,parsed_edges=builder.largest_component(parsed_nodes,parsed_edges)
    chosen_places=builder.choose_places(parsed_nodes,parsed_edges,label)
    blocked=builder.choose_blocks(parsed_edges,chosen_places)
    assert label=='osm' and len(parsed_edges)==len(edges)
    assert len(chosen_places)==4 and len(blocked)>0
    origin_ids=('home_01','home_02','home_03')
    for home in origin_ids:
        old=builder.dijkstra(builder.adjacency_for(parsed_edges),chosen_places[home],chosen_places['meeting_01'])
        new=builder.dijkstra(builder.adjacency_for(parsed_edges,set(blocked)),chosen_places[home],chosen_places['meeting_01'])
        assert old and new and old[1]!=new[1]
print('OK — Lectura de XML OSM y generación de rutas (fixture sintética temporal).')
