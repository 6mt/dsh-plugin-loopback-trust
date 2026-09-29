/** dsh-plugin-loopback-trust — client half.
 *
 *  Problem (dsh 0.1.7): the settings page gates Host persistence on
 *  `ctx.remote.$host.isLoopback`, which dsh-client-connection derives from
 *  `window.location.hostname`. Behind a reverse proxy on a non-loopback
 *  domain the page is classified as unprivileged, settings degrade to
 *  in-memory mode, and the models page reports "settings are unavailable
 *  in this browser".
 *
 *  Fix: dsh-client-connection's client apply() reads
 *  `globalThis.__DSH_TRANSPORT__` before installing the connection service;
 *  a transport with `ownsHost: true` makes `connection.isLoopback === true`
 *  (the same path the desktop shell uses). The immediate tier's bundle
 *  scripts execute during boot prefetch — strictly before ANY client plugin
 *  applies — so a top-level assignment here lands before that read.
 *
 *  Safety of the fake transport: with rpc/fetch/openStream undefined,
 *  createWebConnectionRpc falls back to globalThis.fetch — byte-for-byte the
 *  plain-browser behavior; every streamBaseUrl reader optional-chains to
 *  document.baseURI / window.location.origin. The only semantic change is
 *  isLoopback. We never clobber a real (desktop) transport, and on genuinely
 *  loopback pages we leave everything untouched. */

(function () {
	var globals = globalThis;
	var LOOPBACK = /^(localhost|\[::1\]|127(\.\d{1,3}){3})$/;
	var hostname = typeof location === 'object' && location ? location.hostname : 'localhost';
	var pageIsLoopback = LOOPBACK.test(hostname);
	var desktopTransportPresent = globals.__DSH_TRANSPORT__ !== undefined;

	if (!pageIsLoopback && !desktopTransportPresent) {
		globals.__DSH_TRANSPORT__ = { ownsHost: true };
	}

	window.__ModuleLoader__.load({
		id: 'dsh-plugin-loopback-trust',
		factory() {
			return {
				/** Defensive in-order patch: if this plugin materialized after
				 *  dsh-client-connection already applied (ordering drift, HMR),
				 *  flip the live fact too and drop api-gateway's cached
				 *  $host snapshot so late readers see the trusted value.
				 *  Consumers that already captured `false` (ui-settings'
				 *  one-time persistence choice) still need one page reload. */
				inject: ['connection'],
				apply(ctx) {
					var connection = ctx.get('connection');
					if (connection === undefined || connection.isLoopback === true) return;
					try {
						Object.defineProperty(connection, 'isLoopback', {
							configurable: true,
							get: function () { return true; },
						});
					} catch (error) {
						console.warn('[loopback-trust] could not patch connection.isLoopback:', error);
						return;
					}
					var remote = ctx.get('remote');
					if (remote !== undefined && 'hostFacts' in remote) {
						try { remote.hostFacts = undefined; } catch (error) { /* best effort */ }
					}
					console.info('[loopback-trust] page marked as host-owning; a page reload guarantees settings pick host persistence from the start.');
				},
			};
		},
	});
})();
