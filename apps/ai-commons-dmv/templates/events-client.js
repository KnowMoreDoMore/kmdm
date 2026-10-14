let liveEventData=null;
function eventFeedTime(value){return new Date(value).toLocaleString('en-US',{timeZone:'America/New_York'})+' Eastern'}
function showEventFeeds(data,failed=false){
 const age=Date.now()-Date.parse(data?.checkedAt);
 if(!data||!Array.isArray(data.items)||!Array.isArray(data.sources)||!Number.isFinite(age)||age<0||age>=86400000)throw Error('invalid event results');
 const items=data.items.filter(x=>/^https:\/\//.test(x.url)&&['NSF','NIST'].includes(x.source)&&Date.now()-Date.parse(x.sourceCheckedAt)<86400000&&(!x.end||Date.parse(x.end)>Date.now()));
 $('#event-feed-grid').innerHTML=items.length?items.map(x=>'<article class="card"><span class="pill">'+escapeHTML(x.source)+' · Automatic event notice</span><h3>'+escapeHTML(x.title)+'</h3><p>'+escapeHTML(x.dateLabel)+'</p><p class="fine">'+(x.cached||failed?'Saved notice · ':'')+'Source checked '+escapeHTML(eventFeedTime(x.sourceCheckedAt))+'<br>Confirm location, attendance rules, fees, and registration with organizer.</p><a class="more" href="'+escapeHTML(x.url)+'" target="_blank" rel="noopener noreferrer">Read organizer notice ↗</a></article>').join(''):'<div class="empty">No upcoming AI-related notices in the available feed results. Browse the reviewed events above and organizer calendars below.</div>';
 $('#event-feed-sources').innerHTML=data.sources.map(x=>'<li>'+escapeHTML(x.source)+': '+(x.status==='ok'?'Available':x.status==='cached'?'Unavailable; saved results':'Unavailable; no recent saved results')+' · '+escapeHTML(x.count)+' matching notices'+(x.lastSuccessAt?' · Last successful check '+escapeHTML(eventFeedTime(x.lastSuccessAt)):'')+'</li>').join('');
 $('#event-feed-status').textContent=(failed?'Latest request failed; showing recent saved results. ':'')+'Feed check: '+eventFeedTime(data.checkedAt)+'. Source availability is shown below.';
}
async function loadEventFeeds(){
 const button=$('#refresh-events');button.disabled=true;$('#event-feed-status').textContent='Checking organizer feeds…';
 try{const r=await fetch('/api/events',{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('request');const data=await r.json();showEventFeeds(data);liveEventData=data;}
 catch{try{showEventFeeds(liveEventData,true)}catch{$('#event-feed-status').textContent='Automatic event feeds are temporarily unavailable. The reviewed listings and calendar links are still available.';$('#event-feed-grid').innerHTML='';$('#event-feed-sources').textContent='NSF and NIST feeds could not be checked.'}}
 finally{button.disabled=false}
}
$('#refresh-events').addEventListener('click',loadEventFeeds);loadEventFeeds();
