/* OPC arbitrage push service worker. Pushes carry NO payload: we always show the same notice. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
const MSG = {
  fr: ["Arbitrage en attente", "Un dossier d’arbitrage t’attend sur Open Community."],
  en: ["Arbitration pending", "An arbitration case is waiting for you on Open Community."],
  es: ["Arbitraje pendiente", "Un caso de arbitraje te espera en Open Community."],
};
self.addEventListener("push", (event) => {
  const lang = (self.navigator.language || "fr").slice(0, 2);
  const [title, body] = MSG[lang] || MSG.fr;
  const scope = self.registration.scope;
  event.waitUntil(self.registration.showNotification(title, {
    body, tag: "opc-arbitrage", renotify: true, requireInteraction: true,
    icon: scope + "icon.png", badge: scope + "icon.png", data: { url: scope + "arbitrage/" },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.startsWith(url) && "focus" in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
