/** Host half of dsh-plugin-loopback-trust.
 *
 *  No host-side work: the entire fix lives in client.js, which must execute
 *  during the immediate-tier prefetch (before any client plugin applies) to
 *  mark the page's connection as host-owning. See README.md. */

export function apply() {}
