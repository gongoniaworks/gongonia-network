
'use strict';
const CACHE_NAME = 'gng-pwa-v3-5-vardamar-lore';
const APP_SHELL = [
  './', './index.html', './styles.css', './app.js', './supabase-config.js', './manifest.webmanifest',
  './gng-coin.webp', './gng-mining-logo.png', './gng-ambient-loop.mp3', './gng-192.png', './gng-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('gng-pwa-') && key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  // Never cache Supabase API requests; authentication responses must stay fresh.
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => {
    if (cached) return cached;
    return fetch(event.request).then(response => {
      if (response && response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match('./index.html'));
  }));
});
