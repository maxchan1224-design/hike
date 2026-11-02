// One existing Cloudflare Worker: 'hike' serves both the iPhone app and official activity API.
// We intentionally do NOT create a 'daycation-hk-events' Worker.
import eventsApi from '../backend/src/worker.mjs';

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/') || path.startsWith('/admin/')) {
      return eventsApi.fetch(request, env, ctx);
    }
    // Static assets normally bypass this script via assets.run_worker_first rules.
    // Explicit fallback makes direct fetch tests and future route changes safe.
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Website assets unavailable', { status: 503 });
  },
  async scheduled(controller, env, ctx) {
    return eventsApi.scheduled(controller, env, ctx);
  }
};
