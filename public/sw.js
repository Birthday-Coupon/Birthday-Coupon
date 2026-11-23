/* Birthday Gift IL — notification service worker.
   Displays notifications handed over by the page and opens the relevant link
   when one is clicked. It does not register for push: no push server is used. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  notification.close();
  const target = (notification.data && notification.data.link) || "/";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch {
              /* cross-origin or closed window */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});
