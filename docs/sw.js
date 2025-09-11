// SW V3.4.1 Ultra — HUD + SWR + per-arch + trigram + purge
const params = new URLSearchParams(self.location.search);
const ARCH = params.get('arch') || 'default';
const VERSION = 'v3_4_1';
const CACHE = `dual-hubs-${ARCH}-${VERSION}`;
const CORE = ["./","./index.html","./apps/apps.json"];

let HOT = new Map();                 // url -> score
let SEQ2 = new Map();                // bigram: A -> (B -> score)
let SEQ3 = new Map();                // trigram: A,B -> (C -> score)
let lastURL = null, prevURL = null;  // for trigram
let lastFetches = [];                // [{url, ms, t} ... last 10]
let latencySum = 0, latencyCount = 0;

function now(){ return Date.now() }
function pushFetch(url, ms){
  lastFetches.unshift({url, ms, t: new Date().toISOString()});
  if(lastFetches.length > 10) lastFetches.pop();
  latencySum += ms; latencyCount += 1;
}

async function saveState(){
  const cache = await caches.open(CACHE);
  const ser = (m) => Array.from(m.entries()).map(([k,v])=>[k, Array.from(v.entries())]);
  await cache.put('hot.json', new Response(JSON.stringify(Array.from(HOT.entries())), {headers:{'content-type':'application/json'}}));
  await cache.put('seq2.json', new Response(JSON.stringify(ser(SEQ2)), {headers:{'content-type':'application/json'}}));
  await cache.put('seq3.json', new Response(JSON.stringify(ser(SEQ3)), {headers:{'content-type':'application/json'}}));
  await cache.put('telemetry.json', new Response(JSON.stringify({latencySum, latencyCount, lastFetches}), {headers:{'content-type':'application/json'}}));
}
async function loadState(){
  try{
    const cache = await caches.open(CACHE);
    const h = await cache.match('hot.json'); if(h){ HOT = new Map(await h.json()) }
    const s2 = await cache.match('seq2.json'); if(s2){ const a=await s2.json(); SEQ2 = new Map(a.map(([k,v])=>[k,new Map(v)]) ) }
    const s3 = await cache.match('seq3.json'); if(s3){ const a=await s3.json(); SEQ3 = new Map(a.map(([k,v])=>[k,new Map(v)]) ) }
    const tel = await cache.match('telemetry.json'); if(tel){ const t=await tel.json(); latencySum=t.latencySum||0; latencyCount=t.latencyCount||0; lastFetches=t.lastFetches||[] }
  }catch(e){}
}

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));
});
self.addEventListener('activate', (e)=>{
  e.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.map(k=>k!==CACHE && caches.delete(k)));
    await loadState();
  })());
});

self.addEventListener('message', (e)=>{
  const {type, url} = e.data || {};
  if(type === 'used' && url){
    HOT.set(url, (HOT.get(url)||0)+1);
    if(lastURL){
      const m = SEQ2.get(lastURL) || new Map(); m.set(url, (m.get(url)||0)+1); SEQ2.set(lastURL, m);
      if(prevURL){
        const key = prevURL + "||" + lastURL;
        const m3 = SEQ3.get(key) || new Map(); m3.set(url, (m3.get(url)||0)+1); SEQ3.set(key, m3);
      }
    }
    prevURL = lastURL; lastURL = url;
    saveState();
    prefetchSmart(url).catch(()=>{});
  }
  if(type === 'purge'){
    e.waitUntil((async()=>{
      const keys = await caches.keys();
      await Promise.all(keys.filter(k=>k.startsWith('dual-hubs-')).map(k=>caches.delete(k)));
      HOT = new Map(); SEQ2 = new Map(); SEQ3 = new Map();
      lastFetches = []; latencySum=0; latencyCount=0;
      await saveState();
    })());
  }
});

async function prefetchSmart(current){
  const cache = await caches.open(CACHE);
  const hotTop = Array.from(HOT.entries()).sort((a,b)=>b[1]-a[1]).slice(0,6).map(x=>x[0]);
  const m2 = SEQ2.get(current) || new Map();
  const pred2 = Array.from(m2.entries()).sort((a,b)=>b[1]-a[1]).slice(0,6).map(x=>x[0]);
  const m3 = SEQ3.get((prevURL||'') + "||" + (lastURL||'')) || new Map();
  const pred3 = Array.from(m3.entries()).sort((a,b)=>b[1]-a[1]).slice(0,6).map(x=>x[0]);
  const targets = Array.from(new Set([...pred3, ...pred2, ...hotTop])).slice(0,10);
  await Promise.all(targets.map(async (u)=>{
    try{ const t0 = now(); const res = await fetch(u, {cache:'no-store'}); const ms = now()-t0; pushFetch(u, ms);
      if(res && res.ok){ await cache.put(u, res.clone()); } }catch(e){}
  }));
}

// HUD endpoint
self.addEventListener('fetch', (event)=>{
  const req = event.request;
  if(req.method === 'GET'){
    const url = new URL(req.url);
    if(url.pathname.endsWith('/__hud.json')){
      event.respondWith((async()=>{
        const cache = await caches.open(CACHE);
        const keys = await cache.keys();
        const avg = latencyCount ? (latencySum/latencyCount) : 0;
        return new Response(JSON.stringify({
          arch: ARCH, version: VERSION, cacheSize: keys.length,
          hotTop: Array.from(HOT.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10),
          seq2Top: Array.from(SEQ2.entries()).slice(0,5).map(([a,b])=>[a, Array.from(b.entries()).sort((x,y)=>y[1]-x[1]).slice(0,5)]),
          seq3Top: Array.from(SEQ3.entries()).slice(0,5).map(([p,b])=>[p, Array.from(b.entries()).sort((x,y)=>y[1]-x[1]).slice(0,5)]),
          lastFetches, avgLatencyMs: Math.round(avg)
        }, null, 2), {headers:{'content-type':'application/json'}});
      })());
      return;
    }
  }
  // measure latency for normal fetches
  if(req.method === 'GET'){
    event.respondWith((async()=>{
      const t0 = now();
      try{
        const res = await fetch(req);
        const ms = now()-t0; pushFetch(req.url, ms);
        const copy = res.clone(); caches.open(CACHE).then(c=>c.put(req, copy));
        return res;
      }catch(_){
        const cached = await caches.match(req);
        return cached || Response.error();
      }finally{
        saveState();
      }
    })());
  }
});
