import assert from 'node:assert/strict';
import {feeds} from '../worker/feeds.js';
import {news,parseFeed} from '../worker/runtime.js';

const feed={source:'Maryland Matters',kind:'Regional reporting',outletRegion:'Maryland'};
const item=(title,description='',category='',date='')=>`<item><title>${title}</title><link>https://example.test/${encodeURIComponent(title)}</link><description>${description}</description>${category?'<category>'+category+'</category>':''}${date?'<pubDate>'+date+'</pubDate>':''}</item>`;
const xml=items=>'<rss><channel>'+items+'</channel></rss>';
assert.equal(parseFeed(xml(item('Maryland AI rules','an opinion appears here','Policy')),feed)[0].kind,'Regional reporting');
assert.equal(parseFeed(xml(item('Maryland AI rules','','Commentary')),feed)[0].kind,'Commentary / opinion');
assert.equal(parseFeed(xml(item('Washington state AI bill')),feed)[0].local,false);
assert.equal(parseFeed(xml(item('West\nVirginia AI bill')),feed)[0].local,false);
assert.equal(parseFeed(xml(item('D.C. schools examine AI')),feed)[0].local,true);
assert.equal(parseFeed(xml(item('AI tools elsewhere','Maryland roundup')),feed)[0].local,false);
assert.equal(parseFeed(xml(item('Transit roundup','AI in Maryland')),feed).length,0);
assert.equal(parseFeed(xml('<item><title>AI unsafe link</title><link>javascript:alert(1)</link></item>'),feed).length,0);
assert.doesNotThrow(()=>parseFeed(xml(item('AI &#99999999;')),feed));

const original={fetch:globalThis.fetch,caches:globalThis.caches,Date:globalThis.Date};
let now=Date.parse('2026-10-12T02:00:00Z');
globalThis.Date=class extends original.Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}};
const entries=new Map(),pending=[];
const cache={async match(key){const x=entries.get(key.url);return x&&x.expires>now?x.response.clone():undefined},async put(key,response){const seconds=Number(response.headers.get('Cache-Control').match(/max-age=(\d+)/)[1]);entries.set(key.url,{response:response.clone(),expires:now+seconds*1000})}};
const ctx={waitUntil(p){pending.push(p)}};
const request=new Request('https://example.test/api/news');
async function run(){const r=await news(request,ctx);await Promise.all(pending.splice(0));return {r,data:await r.json()}}
try{
 globalThis.caches={default:cache};
 globalThis.fetch=async()=>new Response(xml(item('Maryland AI news','','Policy',new Date(now-60000).toUTCString())+item('AI old story','','',new Date(now-31*86400000).toUTCString())+item('AI future story','','',new Date(now+86400000).toUTCString())+item('AI undated story')));
 let {data}=await run();assert.equal(data.sources.length,feeds.length);assert.equal(data.failures.length,0);assert.equal(data.items.length,2);assert.ok(data.items.some(x=>x.date===null));
 const last=data.sources[0].lastSuccessAt;
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('outage')};
 ({data}=await run());assert.equal(calls,0,'Fresh aggregate response should reuse cache');
 now+=31*60000;
 let partial=0;globalThis.fetch=async()=>{if(partial++===0)throw Error('one publisher down');return new Response(xml(item('AI recovery')))};
 ({data}=await run());assert.equal(data.failures.length,1);assert.equal(data.sources[0].status,'cached');assert.equal(data.sources[0].lastSuccessAt,last);assert.ok(data.items.some(x=>x.cached));
 now+=3*60000;globalThis.fetch=async()=>{throw Error('all down')};
 ({data}=await run());assert.equal(data.failures.length,feeds.length);assert.ok(data.sources.every(x=>x.status==='cached'));assert.ok(data.items.every(x=>x.cached));
 now+=25*60*60000;
 ({data}=await run());assert.equal(data.items.length,0);assert.ok(data.sources.every(x=>x.status==='unavailable'));
 entries.clear();globalThis.fetch=async()=>new Response('<rss><channel><item>AI truncated</rss>');
 ({data}=await run());assert.equal(data.failures.length,feeds.length);assert.equal(data.items.length,0);
 entries.clear();globalThis.fetch=async()=>new Response(xml(''));
 ({data}=await run());assert.equal(data.failures.length,0);assert.ok(data.sources.every(x=>x.status==='ok'&&x.count===0));
 entries.clear();globalThis.caches={default:{async match(){throw Error('cache read')},async put(){throw Error('cache write')}}};
 ({data}=await run());assert.equal(data.failures.length,0,'Cache faults must not turn healthy feeds into failures');
 console.log('News tests passed: matching, labels, safe links, dates, cache reuse, partial/total outages, 24-hour expiry, malformed/empty feeds, and cache faults.');
}finally{globalThis.fetch=original.fetch;globalThis.caches=original.caches;globalThis.Date=original.Date;}
