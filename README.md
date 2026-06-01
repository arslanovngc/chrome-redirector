# Dynamic Redirector

Chrome/Chromium extension for local redirect rules.

Rules are stored locally in the browser and run from a content script at page start.

## Install

1. Clone the repo:

   ```bash
   git clone <repo-url>
   ```

   Or download the repo as a ZIP from GitHub and unzip it.

2. Open Chrome or a Chromium-based browser.
3. Go to `chrome://extensions`.
4. Enable Developer mode.
5. Click Load unpacked.
6. Select the cloned or unzipped project folder.

## Features

- Create URL redirect rules in popup.
- Enable or disable rules.
- Clone, edit, delete rules.
- Redirect by path prefix.
- Redirect any path on a domain to another domain.
- Keep query strings and hash fragments during redirects.
- Show rule status and redirect mode indicators.
- Inputs start with `https://` for faster entry.
- Active rules sort above inactive rules after popup closes.

## Browser Support

Supported directly:

- Google Chrome.
- Chromium-based browsers such as Microsoft Edge, Brave, Opera, and Vivaldi.

Not guaranteed without changes:

- Firefox. It supports many WebExtension APIs, but Manifest V3 behavior and `chrome.*` APIs should be tested.
- Safari. It requires Safari Web Extension conversion tooling.

This extension is not built as a universal browser package.

## Rule Modes

### Path Match

Matches source origin and path prefix. The matched source path is replaced by the target path, then the remaining path suffix, query, and hash are kept.

Example:

- From: `https://example.com/app`
- To: `https://localhost:3000`
- Visit: `https://example.com/app/login`
- Redirects to: `https://localhost:3000/login`

With query/hash:

- Visit: `https://example.com/app/login?tab=1#form`
- Redirects to: `https://localhost:3000/login?tab=1#form`

### Any Path

Matches only source domain and keeps visited path, query, and hash.

Example:

- From: `https://example.com`
- To: `https://new-domain.com`
- Visit: `https://example.com/login?next=/home#top`
- Redirects to: `https://new-domain.com/login?next=/home#top`

When this mode is enabled, saved rules keep only domains, not full paths.

## Rule Display

Each rule card shows:

- `On` or `Off`: whether the rule is enabled.
- `Any path`: redirects all paths from source domain to target domain.
- `Path match`: redirects only matching source URL path prefixes.

Domain-wide rules also show a `Mode` row in the rule body.

## Sorting

Rules do not move immediately when toggled on or off.

When the popup closes, rules are saved with enabled rules first. The next time the popup opens, active rules appear above inactive rules. Relative order inside each group is preserved.

## Storage

Rules are stored in `chrome.storage.local` under:

```text
redirectRules
```

Rule shape:

```json
{
  "id": "rule-id",
  "from": "https://example.com",
  "to": "https://new-domain.com",
  "enabled": true,
  "matchDomain": true
}
```

Fields:

- `id`: unique rule identifier used by the popup UI.
- `from`: source URL or source origin.
- `to`: target URL or target origin.
- `enabled`: `false` disables a rule; missing value counts as enabled.
- `matchDomain`: `true` enables Any Path mode; `false` uses Path Match mode.

## Permissions

`manifest.json` requests:

- `storage`: save redirect rules locally.
- `scripting`: extension scripting permission.
- `tabs`: tab-related extension permission.
- `host_permissions: ["*://*/*"]`: allow redirect checks on all sites.

The content script runs on `<all_urls>` at `document_start`.

## Files

- `manifest.json`: Chrome extension manifest.
- `popup.html`: Popup layout.
- `popup.js`: Rule UI and storage logic.
- `redirector.js`: Content script redirect logic.
- `style.css`: Popup styling.
- `README.md`: Project docs.

## Development

Syntax check:

```bash
node --check popup.js
node --check redirector.js
```

## Git Note

In this workspace, normal `.git/` is mounted read-only, so regular `git init` cannot write metadata there.

A fallback Git metadata directory can be used with:

```bash
git --git-dir=.git-store --work-tree=. status
```

If the read-only `.git/` mount is removed outside this workspace, normal Git commands can be used after running:

```bash
git init
```
