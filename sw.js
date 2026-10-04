const CACHE="team-archetype-field-notes-v2";
const FILES=["./","index.html","styles.css?v=2","app.js?v=2","schedule_2026.json","manifest.webmanifest","icon.svg"];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET") return;

  if(req.mode==="navigate"){
    event.respondWith(fetch(req,{cache:"no-store"}).then(resp=>{
      const copy=resp.clone();
      caches.open(CACHE).then(c=>c.put("index.html",copy));
      return resp;
    }).catch(()=>caches.match("index.html")));
    return;
  }

  event.respondWith(fetch(req,{cache:"no-store"}).then(resp=>{
    const copy=resp.clone();
    caches.open(CACHE).then(c=>c.put(req,copy));
    return resp;
  }).catch(()=>caches.match(req)));
});
