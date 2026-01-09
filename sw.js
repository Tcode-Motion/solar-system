importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

// Define cache names
const CACHE_NAME = 'solar-system-cache-v1';
const STATIC_ASSETS = [
    './main.js',
    './src/Planets.js',
    './src/HandInput.js',
    './src/BlackHole.js',
    './textures/stars/circle.png',
    // We can't easily list all textures dynamically without a build step,
    // but the SW can cache them at runtime.
];

// Precache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Runtime caching for textures
workbox.routing.registerRoute(
    ({request}) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
        cacheName: 'texture-cache',
        plugins: [
            new workbox.expiration.ExpirationPlugin({
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
            }),
        ],
    })
);

// Cache JS modules
workbox.routing.registerRoute(
    ({request}) => request.destination === 'script',
    new workbox.strategies.StaleWhileRevalidate({
        cacheName: 'script-cache',
    })
);
