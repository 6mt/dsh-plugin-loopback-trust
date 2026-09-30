# Changelog

## 0.1.0 — 2025-09-28

Initial release.

- Mark the page connection as host-owning during boot prefetch so the Settings
  and Models pages keep Host persistence behind reverse-proxy deployments.
- In-order fallback: patch the live `connection.isLoopback` and invalidate the
  cached `$host` snapshot if the plugin materializes after `dsh-client-connection`.
- No-op on loopback pages and when a real desktop transport is present.

## 0.1.1 — 2026-09-30

- Verified against dsh 0.2.0-rc.2 (connection code unchanged); widen
  `engines.dsh` to `>=0.1.7 <0.3`.
