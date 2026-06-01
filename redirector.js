const STORAGE_KEY = 'redirectRules';

function normalizeRule(rule) {
  return {
    from: typeof rule.from === 'string' ? rule.from.trim() : '',
    to: typeof rule.to === 'string' ? rule.to.trim() : '',
    enabled: rule.enabled !== false,
    matchDomain: rule.matchDomain === true
  };
}

chrome.storage.local.get(STORAGE_KEY, (data) => {
  const rawRules = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
  const rules = rawRules.map(normalizeRule);
  const currentUrl = window.location.href;
  const url = new URL(currentUrl);

  for (const rule of rules) {
    if (!rule.enabled) {
      continue;
    }

    try {
      const fromUrl = new URL(rule.from);
      const toUrl = new URL(rule.to);

      if (rule.matchDomain) {
        if (url.origin !== fromUrl.origin) {
          continue;
        }

        const newUrl = `${toUrl.origin}${url.pathname}${url.search}${url.hash}`;

        if (newUrl === currentUrl) {
          continue;
        }

        console.log(`[Redirector] Redirecting to: ${newUrl}`);
        window.location.replace(newUrl);
        break;
      }

      if (url.origin !== fromUrl.origin || !url.pathname.startsWith(fromUrl.pathname)) {
        continue;
      }

      const suffix = url.pathname.slice(fromUrl.pathname.length);
      const basePath = toUrl.pathname.endsWith('/') ? toUrl.pathname.slice(0, -1) : toUrl.pathname;
      const nextPath = `${basePath}${suffix}` || '/';
      const newUrl = `${toUrl.origin}${nextPath}${url.search}${url.hash}`;

      if (newUrl === currentUrl) {
        continue;
      }

      console.log(`[Redirector] Redirecting to: ${newUrl}`);
      window.location.replace(newUrl);
      break;
    } catch {
      // Ignore malformed rules instead of breaking every page load.
    }
  }
});
