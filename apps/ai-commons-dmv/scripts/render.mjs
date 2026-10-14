import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {feeds} from '../worker/feeds.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const get=name=>JSON.parse(readFileSync(root+'data/'+name+'.json','utf8'));
const resources=get('resources'),bills=get('bills'),events=get('events'),jobs=get('jobs'),contact=get('contact'),eventSources=get('event-sources');
if(contact.email!==null&&!/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(contact.email))throw Error('Invalid contact email');
for(const [name,rows] of Object.entries({resources,bills,events,jobs,eventSources})){
 if(new Set(rows.map(x=>x.id)).size!==rows.length)throw Error('Duplicate ID in '+name);
 for(const row of rows){if(!/^https:\/\//.test(row.url))throw Error('Non-HTTPS source: '+row.id);}
}
const template=readFileSync(root+'templates/page.html','utf8');
const sections=Object.fromEntries([...template.matchAll(/<section id="([^"]+)"[^>]*>[\s\S]*?<\/section>/g)].map(m=>[m[1],m[0]]));
const originalScript=template.match(/<script>([\s\S]*?)<\/script>/)[1];
const markers=['const contact=','const menuButton=','function learningDetails','const learningRows=','const categories=','const stages=','const guideScenarios=','function weightEstimate','const bills=','const activeJobs=','function renderPolicies','const easternParts=','let newsData='];
const parts={};let start=0;
for(const marker of markers){const end=originalScript.indexOf(marker,start);if(end<0)throw Error('Script marker missing: '+marker);parts[marker]=originalScript.slice(start,end);start=end;}
// Page modules contain only the controls rendered on that page.
const common=parts['const contact=']+parts['function learningDetails']+parts['const learningRows=']+parts['const activeJobs='];
const scripts={suggest:parts['const menuButton='],learning:parts['const categories='],resources:parts['const stages='],learn:parts['const guideScenarios='],evaluate:parts['function weightEstimate'],models:parts['const bills='],jobs:parts['function renderPolicies'],policy:parts['const easternParts='],events:parts['let newsData='],news:originalScript.slice(start)};
const opportunity=sections.opportunities;
const eventEnd=opportunity.indexOf('<h3 style="margin-top:30px">Local AI jobs');
const learningStart=opportunity.indexOf('<h3 style="margin-top:30px">Find a learning');
sections.events=opportunity.slice(0,eventEnd).replace('id="opportunities"','id="events"').replace('Learn, meet, and explore locally','AI events near you and online').replace('Organizer-confirmed details and regional learning pathways. An available program page does not guarantee an open class section.','Reviewed organizer listings, public feeds, and calendars across the DMV. Check the organizer before making plans.')+'</section>';
sections.jobs='<section id="jobs"><div class="section-head"><div><p class="eyebrow">Explore the work</p><h2>AI jobs and career pathways</h2><p>Local employer listings and ongoing job boards. Confirm vacancies and requirements with the employer.</p></div></div>'+opportunity.slice(eventEnd,learningStart).replace('<h3 style="margin-top:30px">Local AI jobs to explore</h3>','')+'<p><a href="/resources?category=Jobs">Browse job boards →</a></p></section>';
sections.learning='<section id="learning"><div class="section-head"><div><p class="eyebrow">Find your next step</p><h2>Classes and programs</h2></div></div>'+opportunity.slice(learningStart).replace('<h3 style="margin-top:30px">Find a learning option that fits</h3>','');
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
sections.events=sections.events.replace('</section>',`<div class="section-head" style="margin-top:36px"><div><h2>From public event feeds</h2><p>AI-related event notices from NSF and NIST, checked when this page is visited. Feed items link to organizers; their publication dates are not assumed to be event dates.</p></div><button class="plain" id="refresh-events">Refresh event feeds ↻</button></div><p id="event-feed-status" class="status" role="status">Checking organizer feeds…</p><div class="grid" id="event-feed-grid"></div><details style="margin-top:18px"><summary>Event feed status and coverage</summary><ul id="event-feed-sources"></ul><p class="fine">Checks are cached for 30 minutes, with shorter retries during errors. Saved results are labeled and expire after 24 hours. Events with a confirmed end date are removed after ending. Entries without confirmed dates appear as notices to verify. These feeds cover only part of the event landscape.</p></details><h2 style="margin-top:40px">Find more events</h2><p>Open these calendars for the latest listings. Only NSF and NIST have automatic feed connections here; other calendars are discovery links, with selected events reviewed separately. Closed committee meetings are not public attendance opportunities.</p><div class="grid">${eventSources.map(x=>`<article class="card"><span class="pill">${esc(x.region)} · ${esc(x.mode)}</span><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p><a class="more" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">Open calendar ↗</a><div class="meta">Source reviewed ${esc(x.checked)}</div></article>`).join('')}</div></section>`);
const eventScript=readFileSync(root+'templates/events-client.js','utf8');
const routes={
 '/':{title:'AI Commons · DMV',sections:[],modules:['news','events'],home:true},
 '/news':{title:'AI news',sections:['news'],modules:['news']},
 '/events':{title:'Events',sections:['events'],modules:['events'],extra:eventScript},
 '/resources':{title:'Resource library',sections:['resources'],modules:['resources']},
 '/learn':{title:'AI basics',sections:['learn'],modules:['learn'],group:'learn'},
 '/models':{title:'Models and tools',sections:['models'],modules:['models'],group:'learn'},
 '/education':{title:'AI in education',sections:['classroom'],modules:[],group:'learn'},
 '/learning':{title:'Classes and programs',sections:['learning'],modules:['learning'],group:'learn'},
 '/jobs':{title:'Jobs and careers',sections:['jobs'],modules:['jobs'],group:'learn'},
 '/risks':{title:'Risks and debate',sections:['risks'],modules:[]},
 '/evaluate':{title:'Check a claim',sections:['evaluate'],modules:['evaluate'],group:'learn'},
 '/policy':{title:'Policy and legislation',sections:['policy'],modules:['policy']},
 '/participate':{title:'Get involved',sections:['participate'],modules:[]},
 '/suggest':{title:'Suggestions and corrections',sections:['suggest'],modules:['suggest']},
 '/about':{title:'About the hub',sections:['roadmap'],modules:[]}
};
const sectionRoutes={news:'/news',opportunities:'/events',events:'/events',resources:'/resources',learn:'/learn',models:'/models',classroom:'/education',risks:'/risks',evaluate:'/evaluate',policy:'/policy',participate:'/participate',suggest:'/suggest',roadmap:'/about',learning:'/learning',jobs:'/jobs'};
const primary=[['/','Home'],['/news','News'],['/events','Events'],['/resources','Library'],['/learn','Learn'],['/risks','Risks & debate'],['/policy','Policy'],['/about','About']];
const learningNav=[['/learn','AI basics'],['/models','Models & tools'],['/education','Education'],['/learning','Classes'],['/jobs','Jobs'],['/evaluate','Check a claim']];
const links=(items,path)=>items.map(([href,label])=>`<a href="${href}"${href===path?' aria-current="page"':''}>${label}</a>`).join('');
const header=template.slice(0,template.indexOf('<main id="main"'));
const footer=template.slice(template.indexOf('</main>'),template.indexOf('<script>')).replace('<a href="#suggest">Suggestions & corrections</a> · ','');
const hero=template.slice(template.indexOf('<div class="hero">'),template.indexOf('<div class="principle">'));
const extraCSS=`<style>.bar{gap:22px}nav{gap:20px}nav a[aria-current=page],.page-links a[aria-current=page]{color:var(--teal);font-weight:700;text-decoration:underline;text-underline-offset:7px}.page-links{display:flex;flex-wrap:wrap;gap:14px 24px;padding:20px 0;border-bottom:1px solid var(--line)}.breadcrumb{margin:30px 0 0;font-size:14px}.section-head h1{font-size:clamp(32px,5vw,48px);line-height:1.15;margin:12px 0 18px}.home-paths{padding:26px 0 38px}.home-paths .card{text-decoration:none;transition:transform .15s}.home-paths .card:hover{transform:translateY(-3px)}.home-paths .card h3{margin-top:6px}.home-paths .card p{margin-bottom:0}.home-news>p.fine,.home-news>details{display:none}.home-news{padding-bottom:32px}.home-events{padding-top:24px}.home-events .card{padding:20px}.home-events .card .fine{display:none}.all-link{display:inline-block;margin-top:20px;font-weight:700}footer .contact{margin-top:0;overflow-wrap:anywhere}@media print{.page-links,.breadcrumb{display:none}}@media(max-width:900px){nav{gap:12px}.page-links{gap:12px 18px}.hero{padding-top:32px;padding-bottom:28px}}@media(max-width:560px){.home-paths{padding-top:12px}.page-links a{font-size:14px}.breadcrumb{margin-top:22px}}@media(prefers-reduced-motion:reduce){.home-paths .card{transition:none}}</style>`;
const tiles=[['/learn','Understand the basics','Explore how AI works, its history, and models.'],['/risks','Consider the risks','Privacy, bias, labor, environment, and critical voices.'],['/resources','Explore the library','Find reliable resources by topic and location.'],['/events','Meet and learn','Upcoming DMV events and organizer calendars.'],['/policy','Follow the decisions','Legislation, public comment, and participation.'],['/education','Think about education','Learning goals, classroom choices, and oversight.']];
const home=`${hero}<div class="home-paths"><p class="eyebrow">Choose a starting point</p><div class="grid">${tiles.map(([href,title,desc])=>`<a class="card" href="${href}"><h3>${title} →</h3><p>${desc}</p></a>`).join('')}</div><p class="fine" style="margin-top:18px">Independent inquiry · Benefits, harms, and uncertainty · No product endorsements</p></div>${sections.news.replace('id="news"','id="news" class="home-news"').replace('id="news-grid"','id="news-grid" data-limit="3"').replace('</section>','<a class="all-link" href="/news">All headlines and source details →</a></section>')}<section id="events" class="home-events"><div class="section-head"><div><p class="eyebrow">Close to home</p><h2>Coming up in the DMV</h2><p>A few reviewed events. Find more on the events page.</p></div></div><div id="event-grid" class="grid" data-limit="2"></div><a class="all-link" href="/events">All events and calendars →</a></section>`;
const data={RESOURCES:resources,BILLS:bills,EVENTS:events,JOBS:jobs,CONTACT:contact,NEWS_FEEDS:feeds};
const pages={};
for(const [path,config] of Object.entries(routes)){
 let top=header.replace(/<title>[\s\S]*?<\/title>/,`<title>${esc(config.home?config.title:config.title+' · AI Commons · DMV')}</title>`).replace('href="#"','href="/"').replace(/<nav id="site-nav"[^>]*>[\s\S]*?<\/nav>/,`<nav id="site-nav" aria-label="Main navigation">${links(primary,path==='/models'||config.group==='learn'?'/learn':path)}</nav>`).replace('</head>',extraCSS+'</head>');
 let body=config.home?home:config.sections.map(id=>sections[id]).join('');
 if(!config.home){body=body.replace('<h2>','<h1>').replace('</h2>','</h1>');body='<p class="breadcrumb"><a href="/">Home</a> / '+esc(config.title)+'</p>'+(config.group==='learn'?`<nav class="page-links" aria-label="Learning topics">${links(learningNav,path)}</nav>`:'')+body;}
 let bottom=footer.replace('</footer>',`<p class="contact"><a href="/participate">Get involved</a> · <a href="/suggest">Suggest a resource or correction</a> · <a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a></p></footer>`);
 let script=common+config.modules.map(k=>scripts[k]).join('\n')+(config.extra||'');
 // Preserve old shared anchor links, including those in generated cards.
 const legacy=config.home?`const legacy=${JSON.stringify(sectionRoutes)};if(legacy[location.hash.slice(1)])location.replace(legacy[location.hash.slice(1)]+location.hash);`:'';
 let page=top+'<main id="main" tabindex="-1">'+body+bottom+'<script>'+legacy+script+'</script></body></html>';
 for(const [name,value] of Object.entries(data))page=page.replaceAll('__'+name+'__',JSON.stringify(value).replace(/<\//g,'<\\/'));
 page=page.replace(/href="#([^"]+)"/g,(match,id)=>sectionRoutes[id]&&sectionRoutes[id]!==path?'href="'+sectionRoutes[id]+'#'+id+'"':match);
 page=page.replace('href="/resources#resources" id="local-link"','href="/resources?region=DMV" id="local-link"');
 if(/__(RESOURCES|BILLS|EVENTS|JOBS|CONTACT|NEWS_FEEDS)__/.test(page))throw Error('Missing data substitution');
 pages[path]=page;
}
const runtime=readFileSync(root+'worker/runtime.js','utf8').replace("import {feeds} from './feeds.js';",'');
const eventRuntime=readFileSync(root+'worker/events.js','utf8');
writeFileSync(root+'worker/index.js','const resources = '+JSON.stringify(resources)+';\nconst pages = '+JSON.stringify(pages)+';\n'+readFileSync(root+'worker/feeds.js','utf8')+'\n'+eventRuntime+'\n'+runtime);
console.log(`Rendered ${Object.keys(pages).length} pages, ${resources.length} resources, ${events.length} reviewed events, ${feeds.length} news feeds.`);
