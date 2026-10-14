import {feeds} from './feeds.js';
const FALLBACK_MS=24*60*60*1000, ARTICLE_MS=30*24*60*60*1000;
function codePoint(n){return n>=0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'�'}
function decode(s){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,'').replace(/&#x([0-9a-f]+);/gi,(_,n)=>codePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>codePoint(+n)).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim()}
function regionalMatch(text){return /\b(washington,?\s+d\.?c\.?|district of columbia|d\.?c\.?|maryland|virginia|dmv|fairfax|loudoun|montgomery county|prince george.?s county)\b/i.test(text.replace(/\bwest\s+virginia\b/gi,''))}
export function parseFeed(xml,feed){return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(m=>{
 const get=t=>{const hit=m[1].match(new RegExp('<'+t+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+t+'>','i'));return hit?decode(hit[1]):''};
 const title=get('title'),url=get('link'),description=get('description').slice(0,1200),d=Date.parse(get('pubDate'));
 const categories=[...m[1].matchAll(/<category\b[^>]*>([\s\S]*?)<\/category>/gi)].map(x=>decode(x[1]));
 const localMatch=regionalMatch(title)?'title':(!feed.outletRegion&&regionalMatch(description)?'summary':null);
 const relevant=/\b(ai|artificial intelligence|machine learning|algorithm\w*|data cent\w*|automated decision\w*|synthetic media|deepfake\w*)\b/i.test(title+(feed.source==='EFF'||feed.outletRegion?'':' '+description));
 return {title,url,date:Number.isFinite(d)?new Date(d).toISOString():null,source:feed.source,kind:(feed.outletRegion||feed.reporting)&&categories.some(x=>/\b(commentary|opinion)\b/i.test(x))?'Commentary / opinion':feed.kind,outletRegion:feed.outletRegion||null,local:!!localMatch,localMatch,relevant};
 }).filter(x=>x.title&&/^https:\/\//i.test(x.url)&&x.relevant).map(({relevant,...item})=>item)}
function currentItems(items,now){return items.filter(x=>!x.date||(Date.parse(x.date)<=now&&Date.parse(x.date)>=now-ARTICLE_MS))}
async function cacheRead(cache,key){try{return cache?await cache.match(key):null}catch{return null}}
function cacheWrite(cache,key,response,ctx){if(cache){const task=cache.put(key,response).catch(()=>{});if(ctx?.waitUntil)ctx.waitUntil(task)}}
export async function news(request,ctx){
 const cache=globalThis.caches?.default,key=new Request(new URL('/api/news-cache-v5',request.url));
 const cached=await cacheRead(cache,key);
 if(cached){try{const snapshot=await cached.clone().json();if(snapshot.sources.every(x=>x.status!=='cached'||Date.now()-Date.parse(x.lastSuccessAt)<FALLBACK_MS))return cached}catch{}}
 const results=await Promise.all(feeds.map(async(feed,i)=>{
  const sourceKey=new Request(new URL('/api/news-source-v5-'+encodeURIComponent(feed.source),request.url));
  try{
   const r=await fetch(feed.url,{headers:{Accept:'application/rss+xml, application/xml, text/xml'},signal:AbortSignal.timeout(8000)});
   if(!r.ok)throw Error('upstream');const xml=await r.text();
   if(xml.length>2000000||!/<rss\b/i.test(xml)||!/<channel\b/i.test(xml)||!/<\/channel\s*>/i.test(xml)||!/<\/rss\s*>/i.test(xml))throw Error('invalid feed');
   const lastSuccessAt=new Date().toISOString(),items=currentItems(parseFeed(xml,feed),Date.now()).slice(0,12);
   cacheWrite(cache,sourceKey,Response.json({items,lastSuccessAt},{headers:{'Cache-Control':'public, max-age=86400'}}),ctx);
   return {source:feed.source,status:'ok',lastSuccessAt,items};
  }catch{
   const saved=await cacheRead(cache,sourceKey);
   if(saved){try{const data=await saved.json(),age=Date.now()-Date.parse(data.lastSuccessAt);
    if(Number.isFinite(age)&&age>=0&&age<FALLBACK_MS&&Array.isArray(data.items))return {source:feed.source,status:'cached',lastSuccessAt:data.lastSuccessAt,items:currentItems(data.items,Date.now())};
   }catch{}}
   return {source:feed.source,status:'unavailable',lastSuccessAt:null,items:[]};
  }
 }));
 const checkedAt=new Date().toISOString(),failures=results.filter(x=>x.status!=='ok').map(x=>x.source);
 const items=[...new Map(results.flatMap(x=>x.items.map(item=>({...item,sourceCheckedAt:x.lastSuccessAt,cached:x.status==='cached'}))).map(x=>[x.url,x])).values()].sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0)).slice(0,60);
 const sources=results.map(({items,...source})=>({...source,count:items.length}));
 const response=Response.json({items,sources,failures,checkedAt,fetchedAt:checkedAt},{headers:{'Cache-Control':failures.length?'public, max-age=120':'public, max-age=1800'}});
 cacheWrite(cache,key,response.clone(),ctx);return response;
}
export default {async fetch(request,env,ctx){const path=new URL(request.url).pathname;if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});if(path==='/api/news')return news(request,ctx);if(path==='/catalog.json')return Response.json(resources,{headers:{'content-disposition':'attachment; filename="ai-commons-resources.json"'}});if(path==='/api/events')return eventNews(request,ctx);const route=path==='/'?path:path.replace(/\/$/,'');if(!pages[route])return new Response('Not found',{status:404});return new Response(request.method==='HEAD'?null:pages[route],{headers:{'content-type':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com; base-uri 'none'; form-action 'none'"}})}};
