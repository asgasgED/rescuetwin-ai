const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {simulate,debugRoute,getDemoGraph}=require('../.test-build/lib/simulator.js');
const {shortestRoute}=require('../.test-build/lib/graph.js');
const {GET}=require('../.test-build/app/api/simulate/route.js');
const expected=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../public/data/test_expectations.json'),'utf8'));
const homes=['home_01','home_02','home_03'];
const routes=new Map();
let assertions=0;
(async()=>{
  const graph=getDemoGraph();
  assert.equal(Object.keys(graph.placeNodeIds).length,4);assertions++;
  for (const home of homes){
    for (const scenario of ['normal','blocked']){
      const response=simulate(scenario,home);
      const result=debugRoute(scenario,home);
      const snapshot=expected.cases.find(v=>v.scenario===scenario&&v.originId===home);
      assert.equal(response.scenario,scenario);assertions++;
      assert.equal(response.originId,home);assertions++;
      assert.equal(response.destinationId,'meeting_01');assertions++;
      assert.equal(response.roads.type,'FeatureCollection');assertions++;
      assert.equal(response.riskZones.type,'FeatureCollection');assertions++;
      assert.match(response.warning,/Simulación educativa/);assertions++;
      assert.equal(response.route?.geometry.type,result?'LineString':undefined);assertions++;
      assert.equal(response.routeDistanceM,snapshot.routeDistanceM);assertions++;
      assert.deepEqual(result?.roadIds??[],snapshot.roadIds);assertions++;
      for(const roadId of result?.roadIds??[]) {
        assert(!response.blockedRoadIds.includes(roadId),'Road uses blocked segment');assertions++;
      }
      if(result) {
        assert.deepEqual(result.coordinates[0],graph.nodes[graph.placeNodeIds[home]]);assertions++;
        assert.deepEqual(result.coordinates.at(-1),graph.nodes[graph.placeNodeIds.meeting_01]);assertions++;
        assert(result.lengthM>0);assertions++;
      }
      const http=await GET(new Request(`https://synapse.example/api/simulate?scenario=${scenario}&originId=${home}`));
      assert.equal(http.status,200);assertions++;
      const json=await http.json();
      assert.equal(json.routeDistanceM,response.routeDistanceM);assertions++;
      routes.set(`${home}:${scenario}`,result);
    }
    const normal=routes.get(`${home}:normal`);
    const blocked=routes.get(`${home}:blocked`);
    assert(normal);assertions++;
    assert(blocked);assertions++;
    assert.notDeepEqual(normal.roadIds,blocked.roadIds);assertions++;
  }
  const invalidScenario=await GET(new Request('https://synapse.example/api/simulate?scenario=flood&originId=home_01'));
  assert.equal(invalidScenario.status,400);assertions++;
  assert.equal((await invalidScenario.json()).error.code,'INVALID_SCENARIO');assertions++;
  const invalidHome=await GET(new Request('https://synapse.example/api/simulate?scenario=normal&originId=home_99'));
  assert.equal(invalidHome.status,400);assertions++;
  assert.equal((await invalidHome.json()).error.code,'INVALID_ORIGIN');assertions++;
  const disconnected=shortestRoute(graph,graph.placeNodeIds.home_01,graph.placeNodeIds.meeting_01,
    new Set(graph.edges.map(x=>x.roadId)));
  assert.equal(disconnected,null);assertions++;
  console.log(`OK — ${assertions} afirmaciones. 6 casos; bloqueos, distancias, topología, API y errores verificados.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
