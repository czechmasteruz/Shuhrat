/**
 * CzechMaster — Service Worker v4 (NETWORK-FIRST)
 * Yangilanishlar doim tarmoqdan olinadi, kesh faqat oflayn zaxira.
 * Eski v3 keshlari avtomatik o'chiriladi.
 */
'use strict';

const CACHE_NAME = 'czechmaster-v4.0.0';

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    /* AVVAL TARMOQ — yangilanishlar darhol ko'rinadi */
    fetch(event.request).then(function(response) {
      if (response && response.status === 200 && response.type === 'basic') {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      /* Oflayn bo'lsa — keshdan */
      return caches.match(event.request);
    })
  );
});
