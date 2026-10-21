/* CardioLog service worker. Change VERSION with each deployment. */
const VERSION='1.0.3';
const CACHE='cardiolog-'+VERSION;
const CORE=['./','./index.html','./styles.css','./app.js','./version.json','./manifest.webmanifest','./icon.svg','./apple-icon.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const names=await caches.keys();await Promise.all(names.filter(n=>n.startsWith('cardiolog-')&&n!==CACHE).map(n=>caches.delete(n)));await self.clients.claim()})()));
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;const path=new URL(req.url).pathname;if(path.endsWith('/version.json'))return;event.respondWith((async()=>{try{const response=await fetch(req);if(response&&response.ok){const cache=await caches.open(CACHE);cache.put(req,response.clone());}return response}catch(_){return await caches.match(req)||await caches.match('./index.html')||Response.error()}})())});
self.addEventListener('message',event=>{if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting()});
