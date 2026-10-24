/** Real shortest paths over model edges; no arbitrary straight-line fallback. */
import type { GraphData, RoadSegment, RouteCalculation, Coordinates } from "../types/simulation";

type Neighbor = { node: string; roadId: string; lengthM: number };
type QueueEntry = {node: string; distance: number};

// Binary min-heap: handles thousands of street-network nodes without an O(V^2) scan.
class MinHeap {
  private values: QueueEntry[] = [];
  get length(): number {return this.values.length;}
  push(item:QueueEntry):void {
    const v=this.values; v.push(item);let i=v.length-1;
    while(i>0){const p=Math.floor((i-1)/2);if(v[p].distance<=v[i].distance) break;
      [v[p],v[i]]=[v[i],v[p]];i=p;}
  }
  pop(): QueueEntry | undefined {
    const v=this.values;if(v.length===0)return undefined;
    const result=v[0];const last=v.pop()!;
    if(v.length===0)return result;
    v[0]=last;let i=0;
    while(true){const l=i*2+1,r=i*2+2;let smallest=i;
      if(l<v.length&&v[l].distance<v[smallest].distance)smallest=l;
      if(r<v.length&&v[r].distance<v[smallest].distance)smallest=r;
      if(smallest===i)break;
      [v[smallest],v[i]]=[v[i],v[smallest]];i=smallest;
    }
    return result;
  }
}

export function shortestRoute(graph: GraphData, from: string, to: string, blockedRoadIds: ReadonlySet<string> = new Set()): RouteCalculation | null {
  if(!graph.nodes[from] || !graph.nodes[to]) return null;
  if(from===to) return {coordinates:[graph.nodes[from]],lengthM:0,roadIds:[]};
  const adj=new Map<string,Neighbor[]>();
  const edges=new Map<string,RoadSegment>();
  for(const edge of graph.edges){
    if(blockedRoadIds.has(edge.roadId))continue;
    if(!Number.isFinite(edge.lengthM)||edge.lengthM<=0)throw new Error(`Invalid edge length: ${edge.roadId}`);
    edges.set(edge.roadId,edge);
    for(const [a,b] of [[edge.a,edge.b],[edge.b,edge.a]]){
      const values=adj.get(a)||[];
      values.push({node:b,roadId:edge.roadId,lengthM:edge.lengthM});
      adj.set(a,values);
    }
  }
  const dist=new Map<string,number>([[from,0]]);
  const parent=new Map<string,{prev:string,roadId:string}>();
  const heap=new MinHeap();heap.push({node:from,distance:0});
  while(heap.length){
    const current=heap.pop()!;
    if(current.distance>(dist.get(current.node)??Infinity)+1e-7)continue;
    if(current.node===to)break;
    for(const next of adj.get(current.node)||[]){
      const value=current.distance+next.lengthM;
      if(value<(dist.get(next.node)??Infinity)-1e-7){
        dist.set(next.node,value);
        parent.set(next.node,{prev:current.node,roadId:next.roadId});
        heap.push({node:next.node,distance:value});
      }
    }
  }
  const lengthM=dist.get(to);
  if(lengthM===undefined)return null;
  const sequence:{a:string;b:string;roadId:string}[]=[];
  let cursor=to;
  while(cursor!==from){
    const step=parent.get(cursor);
    if(!step)return null;
    sequence.push({a:step.prev,b:cursor,roadId:step.roadId});cursor=step.prev;
  }
  sequence.reverse();
  const coords:Coordinates[]=[];
  for(const step of sequence){
    const edge=edges.get(step.roadId)!;
    const points=edge.a===step.a? edge.coordinates:[...edge.coordinates].reverse();
    for(const p of points){
      const previous=coords[coords.length-1];
      if(!previous||previous[0]!==p[0]||previous[1]!==p[1])coords.push([p[0],p[1]]);
    }
  }
  return {coordinates:coords,lengthM:Number(lengthM.toFixed(3)),roadIds:sequence.map(x=>x.roadId)};
}
