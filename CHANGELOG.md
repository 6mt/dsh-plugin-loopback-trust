# Changelog

## 0.1.0 — 2025-09-28

Initial release.

- Mark the page connection as host-owning during boot prefetch so the Settings
  and Models pages keep Host persistence behind reverse-proxy deployments.
- In-order fallback: patch the live `connection.isLoopback` and invalidate the
  cached `$host` snapshot if the plugin materializes after `dsh-client-connection`.
- No-op on loopback pages and when a real desktop transport is present.
