// DAYCATION HK website and official activity API run on the SAME Cloudflare Worker.
// No second Worker, no guessed URL and no cross-origin access are required.
// For static GitHub previews, the missing API produces an explicit offline status.
window.DAYCATION_DATA_API = /^https?:$/.test(location.protocol) ? location.origin : '';
