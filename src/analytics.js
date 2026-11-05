// No tracker is loaded at the moment, so this does nothing. It stays so that
// visit counting can be added later, after the privacy text is updated.
// Never send map coordinates, search queries, labels, titles, or error messages.
export function trackEvent(name, data = {}) {
  if (typeof window === "undefined") return;
  try {
    const result = window.umami?.track(name, data);
    // Some tracker versions return a promise; rejection must also be harmless.
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch {
    // Analytics must never break the app.
  }
}
