const eventFeeds=[{source:'NSF',url:'https://www.nsf.gov/rss/rss_www_events.xml'},{source:'NIST',url:'https://www.nist.gov/news-events/events/rss.xml'}];
const EVENT_FALLBACK_MS=86400000;
export function parseEventFeed(xml,feed){
 return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].flatMap(m=>{
  const get=t=>{const hit=m[1].match(new RegExp('<'+t+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+t+'>','i'));return hit?decode(hit[1].replace(/<(?:br|\/?p)\b[^>]*>/gi,' ')):''};
  const title=get('title'),url=get('link'),description=get('description').replace(/\s+/g,' ').trim();
  if(!title||!/^https:\/\//.test(url)||!/\b(ai|artificial intelligence|machine learning|deepfake\w*|automated decision\w*)\b/i.test(title+' '+description))return [];
  // NSF's feed begins its description with actual start/end dates. pubDate is never used as an event date.
  let start=null,end=null,dateLabel='Event dates unconfirmed — check organizer';
  if(feed.source==='NSF'){
   const match=description.match(/^([A-Z][a-z]{2} \d{1,2} \d{4} \d{1,2}:\d{2}(?:AM|PM))\s+to\s+([A-Z][a-z]{2} \d{1,2} \d{4} \d{1,2}:\d{2}(?:AM|PM))\s+(EDT|EST)\b/);
   if(match){const offset=match[3]==='EDT'?'-0400':'-0500';const parse=x=>Date.parse(x.replace(/(\d)(AM|PM)/,'$1 $2')+' '+offset);const a=parse(match[1]),b=parse(match[2]);if(Number.isFinite(a)&&Number.isFinite(b)&&b>=a){start=new Date(a).toISOString();end=new Date(b).toISOString();dateLabel=match[1]+' – '+match[2]+' '+match[3]}}
  }
  return [{title,url,source:feed.source,start,end,dateLabel}];
 });
}
export async function eventNews(request,ctx){
 const cache=globalThis.caches?.default;
 async function read(key){try{return cache?await cache.match(key):null}catch{return null}}
 function write(key,response){if(cache){const p=cache.put(key,response).catch(()=>{});if(ctx?.waitUntil)ctx.waitUntil(p)}}
 const key=new Request(new URL('/api/events-cache-v1',request.url)),cached=await read(key);
 if(cached){try{const data=await cached.clone().json();if(Date.now()-Date.parse(data.checkedAt)<EVENT_FALLBACK_MS&&data.sources.every(x=>x.status!=='cached'||Date.now()-Date.parse(x.lastSuccessAt)<EVENT_FALLBACK_MS))return cached}catch{}}
 const results=await Promise.all(eventFeeds.map(async feed=>{
  const sourceKey=new Request(new URL('/api/events-source-v1-'+feed.source,request.url));
  try{
   const r=await fetch(feed.url,{headers:{Accept:'application/rss+xml, application/xml, text/xml'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('feed');
   const xml=await r.text();if(xml.length>2000000||!/<rss\b/i.test(xml)||!/<channel\b/i.test(xml)||!/<\/channel\s*>/i.test(xml)||!/<\/rss\s*>/i.test(xml))throw Error('invalid feed');
   const lastSuccessAt=new Date().toISOString(),items=parseEventFeed(xml,feed).filter(x=>!x.end||Date.parse(x.end)>Date.now()).slice(0,12);
   write(sourceKey,Response.json({items,lastSuccessAt},{headers:{'Cache-Control':'public, max-age=86400'}}));return {source:feed.source,status:'ok',lastSuccessAt,items};
  }catch{
   const saved=await read(sourceKey);if(saved){try{const d=await saved.json(),age=Date.now()-Date.parse(d.lastSuccessAt);if(age>=0&&age<EVENT_FALLBACK_MS&&Array.isArray(d.items))return {source:feed.source,status:'cached',lastSuccessAt:d.lastSuccessAt,items:d.items.filter(x=>!x.end||Date.parse(x.end)>Date.now())}}catch{}}
   return {source:feed.source,status:'unavailable',lastSuccessAt:null,items:[]};
  }
 }));
 const checkedAt=new Date().toISOString(),sources=results.map(({items,...x})=>({...x,count:items.length}));
 const items=[...new Map(results.flatMap(x=>x.items.map(y=>({...y,cached:x.status==='cached',sourceCheckedAt:x.lastSuccessAt}))).map(x=>[x.url,x])).values()];
 const response=Response.json({items,sources,checkedAt},{headers:{'Cache-Control':sources.some(x=>x.status!=='ok')?'public, max-age=120':'public, max-age=1800'}});write(key,response.clone());return response;
}
