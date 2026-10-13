const CACHE_NAME = 'parking-live-arena-v1';

// Ссылки, которые сохраняются в память устройства сразу при первом заходе
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Установка Service Worker и кэширование основных ресурсов
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Очистка старого кэша при обновлении версии
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Перехват запросов: если нет интернета — отдаем всё из памяти телефона
self.addEventListener('fetch', (event) => {
    // Для API погоды: сначала пробуем сеть, если офлайн — берем последний сохраненный прогноз
    if (event.request.url.includes('open-meteo.com')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Для самой страницы, стилей, шрифтов и иконок FontAwesome:
    // мгновенно отдаем из кэша и параллельно обновляем в фоне при наличии сети
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return networkResponse;
                })
                .catch(() => cachedResponse);

            return cachedResponse || fetchPromise;
        })
    );
});