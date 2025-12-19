// Anti-scraping and protection service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installed - protecting your app');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
});

// Prevent offline access
self.addEventListener('fetch', (event) => {
  // Only allow requests to same origin
  const url = new URL(event.request.url);
  
  // Check if request is from allowed domains
  const allowedDomains = [
    'partsmanager-pro.netlify.app',
    'partsmanager-pro.vercel.app',
    'localhost',
    '127.0.0.1',
  ];
  
  const isAllowed = allowedDomains.some(domain => self.location.hostname.includes(domain));
  
  if (!isAllowed) {
    event.respondWith(
      new Response('Access Denied', {
        status: 403,
        statusText: 'Forbidden',
      })
    );
    return;
  }
  
  // Normal fetch
  event.respondWith(fetch(event.request));
});
