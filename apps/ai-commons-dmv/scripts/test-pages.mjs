import assert from 'node:assert/strict';
import worker,{parseEventFeed,eventNews} from '../worker/index.js';
const routes=['/','/news','/events','/resources','/learn','/models','/education','/learning','/jobs','/risks','/evaluate','/policy','/participate','/suggest','/about'];
const htmls=new Map();
for(const route of routes){const r=await worker.fetch(new Request('https://example.test'+route));assert.equal(r.status,200,route);const html=await r.text();htmls.set(route,html);assert.equal((html.match(/<main\b/g)||[]).length,1,route);assert.equal((html.match(/<h1\b/g)||[]).length,1,route);const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];assert.doesNotThrow(()=>new Function(script),route);assert.match(html,/mrknowmore.contact@gmail.com/);}
const home=htmls.get('/');assert.doesNotMatch(home,/<section id="(?:resources|policy|risks|models|classroom)"/);assert.match(home,/data-limit="3"/);assert.match(home,/data-limit="2"/);
for(const [route,html] of htmls){const markup=html.split('<script>')[0];for(const [,href] of markup.matchAll(/href="(\/[^"?]*|#[^"]+)"/g)){if(href==='/catalog.json'||href==='#')continue;const [path,fragment]=href.split('#');const target=path?htmls.get(path):html;if(!target)throw Error('Broken page link '+route+' → '+href);if(fragment)assert.ok(target.includes('id="'+fragment+'"'),'Broken anchor '+route+' → '+href)}}
assert.equal((await worker.fetch(new Request('https://example.test/missing'))).status,404);
assert.equal((await worker.fetch(new Request('https://example.test/events',{method:'POST'}))).status,405);
assert.equal((await worker.fetch(new Request('https://example.test/news',{method:'HEAD'}))).status,200);
const xml=body=>'<rss><channel>'+body+'</channel></rss>';
const item=(desc,url='https://www.nsf.gov/events/ai/2026-10-26',date='Tue, 01 Sep 2026 00:00:00 GMT')=>'<item><title>AI research webinar</title><link>'+url+'</link><description><![CDATA['+desc+']]></description><pubDate>'+date+'</pubDate></item>';
const dated=xml(item('<p>Oct 26 2026 3:00PM to<br>Oct 26 2026 4:00PM EDT</p>'));
assert.equal(parseEventFeed(dated,{source:'NSF'})[0].start,'2026-10-26T19:00:00.000Z');
assert.equal(parseEventFeed(dated,{source:'NSF'})[0].end,'2026-10-26T20:00:00.000Z');
assert.equal(parseEventFeed(dated,{source:'NIST'})[0].start,null,'Publication dates must not become event dates');
assert.equal(parseEventFeed(xml(item('AI event','javascript:alert(1)')),{source:'NSF'}).length,0);
assert.equal(parseEventFeed(xml(item('Dates not provided')),{source:'NSF'})[0].end,null);
const original=globalThis.fetch,oldCaches=globalThis.caches,entries=new Map(),tasks=[];
globalThis.caches={default:{async match(k){return entries.get(k.url)?.clone()},async put(k,r){entries.set(k.url,r.clone())}}};
const request=new Request('https://example.test/api/events'),ctx={waitUntil:p=>tasks.push(p)};
async function run(){const r=await eventNews(request,ctx);await Promise.all(tasks.splice(0));return r.json()}
try{
 globalThis.fetch=async()=>new Response(dated);let d=await run();assert.equal(d.sources.length,2);assert.equal(d.items.length,1);assert.ok(d.sources.every(x=>x.status==='ok'));
 entries.delete('https://example.test/api/events-cache-v1');globalThis.fetch=async()=>{throw Error('outage')};d=await run();assert.ok(d.sources.every(x=>x.status==='cached'));assert.ok(d.items.every(x=>x.cached));
 entries.clear();d=await run();assert.equal(d.items.length,0);assert.ok(d.sources.every(x=>x.status==='unavailable'));
 entries.clear();globalThis.fetch=async()=>new Response('<rss><channel>truncated</rss>');d=await run();assert.ok(d.sources.every(x=>x.status==='unavailable'));
}finally{globalThis.fetch=original;globalThis.caches=oldCaches}
console.log('Passed: 15 real routes, page isolation, headings, script syntax, internal links, contact, HTTP behavior, event-date semantics, safe links, event outage fallback and invalid-feed handling.');
