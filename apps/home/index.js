const projects = [
  { title: 'AI Commons · DMV', address: 'ai.kmdm.org', worker: 'kmdm-ai-commons', category: 'AI & community', description: 'Explore AI learning, policy, events, and civic resources across DC, Maryland, and Virginia.' },
  { title: 'Teacher Resource Exchange', address: 'teachers.kmdm.org', worker: 'kmdm-teachers', category: 'Teaching & learning', description: 'Find classroom resources, student opportunities, state profiles, and educator support.' },
  { title: 'NOVA STEM Leadership Hub', address: 'stem.kmdm.org', worker: 'kmdm-stem', category: 'STEM & leadership', description: 'Discover STEM leadership pathways and opportunities for Northern Virginia Community College students.' },
  { title: 'AC Crane Finder', address: 'cranes.kmdm.org', worker: 'kmdm-cranes', category: 'Tools & planning', description: 'Explore preliminary crane fleet screening and rental estimates for AC Crane & Sign Service.' },
  { title: 'AC Crane Choice Lab', address: 'cranelab.kmdm.org', worker: 'kmdm-cranelab', category: 'Research & feedback', description: 'Compare realistic lift scenarios and contribute expert crane selections.' },
];

function page(preview) {
  const cards = projects.map(p => {
    const href = preview ? `https://${p.worker}.reednomura-kmdm.workers.dev/` : `https://${p.address}/`;
    return `<a class="card" href="${href}"><span class="category">${p.category}</span><h2>${p.title}</h2><p>${p.description}</p><span class="address">${p.address}<span aria-hidden="true">↗</span></span></a>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="KMDM: a collection of learning resources, community projects, and practical tools."><title>KMDM · Projects & Resources</title><style>
  :root{color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#182c2a;background:#f5f6f0}*{box-sizing:border-box}body{margin:0}a{color:inherit}.skip{position:absolute;left:1rem;top:-5rem}.skip:focus{top:1rem;background:white;padding:1rem;z-index:2}header,main,footer{max-width:1120px;margin:auto;padding-inline:32px}header{padding-top:32px;display:flex;justify-content:space-between;align-items:center}.wordmark{font-size:22px;font-weight:800;letter-spacing:-1px;text-decoration:none}.domain{font-size:13px;color:#52635d}main{padding-top:88px;padding-bottom:80px}.eyebrow{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#54715e}h1{font-size:clamp(42px,7vw,76px);line-height:1.04;letter-spacing:-.055em;max-width:780px;margin:20px 0 24px;font-weight:650}.intro{font-size:19px;line-height:1.65;color:#52635d;max-width:580px;margin:0 0 55px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.card{display:flex;flex-direction:column;text-decoration:none;background:#fff;border:1px solid #dce2d7;border-radius:18px;padding:28px;min-height:310px;transition:transform .16s,border-color .16s}.card:hover{transform:translateY(-4px);border-color:#527662}.card:focus-visible{outline:3px solid #35715e;outline-offset:4px}.category{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5d775c}h2{font-size:23px;line-height:1.22;letter-spacing:-.035em;margin:20px 0 14px}.card p{font-size:14px;line-height:1.7;color:#52635d;margin:0 0 30px}.address{display:flex;justify-content:space-between;gap:12px;font-size:12px;font-weight:650;margin-top:auto;padding-top:20px;border-top:1px solid #edf0e9}.address span{font-size:19px;line-height:1}footer{border-top:1px solid #dce2d7;padding-top:25px;padding-bottom:35px;font-size:12px;color:#637169;display:flex;justify-content:space-between;gap:18px}@media(max-width:850px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){header,main,footer{padding-inline:22px}main{padding-top:60px}.grid{grid-template-columns:1fr}.card{min-height:260px}footer{flex-direction:column}}@media(prefers-reduced-motion:reduce){.card{transition:none}}
  </style></head><body><a class="skip" href="#main">Skip to projects</a><header><a class="wordmark" href="/" aria-label="KMDM home">KMDM<span style="color:#638263">.</span></a><span class="domain">kmdm.org</span></header><main id="main"><p class="eyebrow">Projects & resources</p><h1>Ideas to explore.<br>Tools to put to work.</h1><p class="intro">A collection of learning resources, community projects, and practical tools. Pick a project to get started.</p><div class="grid">${cards}</div></main><footer><span>KMDM · Projects & Resources</span><span>Learning. Community. Practical tools.</span></footer></body></html>`;
}

export default {
  fetch(request) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    if (url.pathname === '/robots.txt') return new Response('User-agent: *\nAllow: /\n', { headers: { 'Content-Type': 'text/plain' } });
    if (url.pathname !== '/') return new Response('Not found', { status: 404 });
    return new Response(request.method === 'HEAD' ? null : page(url.hostname.endsWith('.workers.dev')), { headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    } });
  },
};
