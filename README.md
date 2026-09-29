# dsh-plugin-loopback-trust

English | [中文](README.zh.md)

Restore Host-persisted settings in [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) web when it is reached through a reverse proxy.

## The problem

dsh 0.1.7 deliberately gates the Settings pages (especially the Models page) on a
loopback check: settings persistence is only offered to pages opened on
`127.0.0.1` / `localhost` / `::1`.

```js
// dsh-client-ui-settings
const persistence = ctx.remote.$host.isLoopback ? "host" : "memory";
```

`isLoopback` is derived from the browser hostname. When dsh listens on
`127.0.0.1:3080` behind nginx (or any reverse proxy) and you open the UI through
a domain name, the page is classified as non-privileged: settings silently
degrade to in-memory mode and the Models page reports
*"settings are unavailable in this browser"*.

## What this plugin does

It marks the page's connection as host-owning — the same fact the official
desktop shell asserts — so the settings pages keep Host persistence on
non-loopback origins. Chat and everything else were never affected and stay
byte-identical: the plugin changes exactly one boolean in the client's
connection state.

- Sits in the boot prefetch tier and runs before any client plugin applies
- Never clobbers a real (desktop) transport; does nothing on loopback pages
- Zero dependencies, no host-side code, ~60 lines of client JavaScript
- Requires dsh **0.1.7** (`engines.dsh: ">=0.1.7 <0.2"`)

## Install

```sh
dsh plugin --profile web add 6mt/dsh-plugin-loopback-trust
```

Restart `dsh web` (a new bundle must boot), then hard-refresh the browser page.
The plugin takes effect on every page load; nothing shows up in the UI.

## How it works

`dsh-client-connection`'s client entry reads `globalThis.__DSH_TRANSPORT__` at
plugin start; a transport with `ownsHost: true` makes
`connection.isLoopback === true`. Bundle scripts in the immediate prefetch tier
execute strictly before any plugin applies, so a top-level assignment lands
before that read:

```js
globalThis.__DSH_TRANSPORT__ = { ownsHost: true };
```

The fake transport is inert everywhere else: `rpc`/`fetch`/`openStream`
undefined falls back to `globalThis.fetch` (identical to a plain browser page),
and every `streamBaseUrl` reader optional-chains to `document.baseURI` /
`window.location.origin`. A fallback in the plugin's `apply` also patches the
live `connection.isLoopback` property and invalidates api-gateway's cached
`$host` snapshot if ordering ever drifts.

The server-side `/api` Host fence is **not** touched. See
[Security notes](#security-notes).

## Verify

1. Open Settings → Models through your domain: it loads, no
   "settings are unavailable" banner.
2. Change a setting, reload the page: the change persisted.
3. The browser console shows no `[loopback-trust] could not patch` warning.

## Security notes

The loopback gate is intentional: settings writes (model providers, API keys)
are restricted to pages the host can bind to loopback. Installing this plugin
declares *"this origin is trusted"* for your deployment:

- Make sure your reverse proxy enforces whatever access control you expect in
  front of the domain — dsh's `/api` Host fence still applies its own rules
  unchanged.
- Do not expose the domain to untrusted networks without protection.
- If a future dsh release makes `--trusted-host` cover the client-side
  classification too, prefer that and uninstall this plugin.

This plugin does not exfiltrate anything, has no telemetry, and contains no
host-side code — the entire payload is [client.js](client.js), which you can
audit in one sitting.

## Compatibility

Hook points are dsh-0.1.7 internals (`__DSH_TRANSPORT__.ownsHost` semantics,
prefetch-tier timing, the `$host` cache) with no compatibility promise. The
package declares `engines.dsh: ">=0.1.7 <0.2"` so incompatible hosts refuse to
install rather than break silently. On breakage the symptom is loud (the
settings page returns to its unavailable state) — check
[dsh-client-connection](https://www.npmjs.com/package/@deepseek-ai/dsh-client-connection)
in your installed version and adjust `client.js` accordingly.

## Uninstall

```sh
dsh plugin --profile web remove dsh-plugin-loopback-trust
```

## License

[MIT](LICENSE)
