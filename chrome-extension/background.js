// background.js — Service Worker (Manifest V3)
// Handles extension lifecycle events

self.addEventListener('install', (event) => {
  console.log('Recipe De-Bloater extension installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Recipe De-Bloater extension activated');
  event.waitUntil(self.clients.claim());
});

// Handle messages from popup/content scripts
self.addEventListener('message', async (event) => {
  const { type, data } = event.data || {};

  if (type === 'PING') {
    event.source?.postMessage({ type: 'PONG' });
  }
});
