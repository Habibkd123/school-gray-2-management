// Service worker stub to prevent browser extension / cached registration 404
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());
