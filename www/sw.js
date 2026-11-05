var C='gpapp-v11';self.addEventListener('install',function(e){self.skipWaiting();e.waitUntil(caches.open(C).then(function(c){return c.addAll(['./','index.html','manifest.json','icon.svg','directory-index.json','config.js','certpdf.js','qrcode.bundle.js','html2canvas.bundle.js']);}));});
self.addEventListener('activate',function(e){e.waitUntil(clients.claim());});
self.addEventListener('fetch',function(e){var u=new URL(e.request.url);if(u.origin!==location.origin||e.request.method!=='GET')return;
 if(/directory\.json/.test(u.pathname)){e.respondWith(fetch(e.request).catch(function(){return caches.match(e.request);}));return;}
 e.respondWith(fetch(e.request).then(function(r){var x=r.clone();caches.open(C).then(function(c){c.put(e.request,x);});return r;}).catch(function(){return caches.match(e.request);}));});
