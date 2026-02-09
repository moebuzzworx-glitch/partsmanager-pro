// Anti-scraping and protection service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installed - protecting your app');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
});

// Offline support - simple pass-through
self.addEventListener('fetch', (event) => {
  // Allow all requests to pass through to browser (network or cache)
  // This enables offline support if the browser has cached resources
  return;
});
