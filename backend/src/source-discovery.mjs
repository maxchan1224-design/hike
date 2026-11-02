// DAYCATION HK official-organizer discovery, NOT automatic publication.
// We only fetch approved organizer listing pages. A found link is an unreviewed lead.
// Social media links never become events through this route.
export const ORGANIZER_SOURCES=Object.freeze([
 {id:'hkdc',name:'Hong Kong Design Centre',listing:'https://www.hkdesigncentre.org/en/whats-on/current-and-upcoming',hosts:['www.hkdesigncentre.org','hkdesigncentre.org'],path:/^\/en\/whats-on\/[a-z0-9-]+\/\d+\/?$/i},
 {id:'taikwun',name:'Tai Kwun',listing:'https://www.taikwun.hk/en/whats-on',hosts:['www.taikwun.hk','taikwun.hk'],path:/^\/en\/whats-on\/detail\/[a-z0-9-]+\/\d+\/?$/i},
 {id:'pmq',name:'PMQ',listing:'https://www.pmq.org.hk/',hosts:['www.pmq.org.hk','pmq.org.hk'],path:/^\/event\/[a-z0-9-]+\/?$/i},
 {id:'hkac',name:'Hong Kong Arts Centre',listing:'https://www.hkac.org.hk/en/calendar/',hosts:['www.hkac.org.hk','hkac.org.hk'],path:/^\/(en\/)?(?:calendar|event|programme|programmes)\/[a-z0-9-\/]*$/i},
 {id:'designathkg',name:'DESIGN@HKG',listing:'https://designathkg.com/programme---whats-on',hosts:['designathkg.com','www.designathkg.com'],path:/^\/(?:programme|event|whats-on|activities)(?:[\/-][a-z0-9-]+)*\/?$/i},
 {id:'hkyaf',name:'Hong Kong Youth Arts Foundation',listing:'https://www.hkyaf.com/events',hosts:['www.hkyaf.com','hkyaf.com'],path:/^\/events\/\d+\/[a-z0-9%+._~-]+\/?$/i}
]);
const trimText=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/&(?:amp|#38);/gi,'&').replace(/\s+/g,' ').trim().slice(0,160);
export function candidateLinks(html,source,limit=25){
  if(typeof html!=='string')return [];
  const out=new Map();const tags=html.matchAll(/<a\b([^>]*\bhref\s*=\s*(["'])(.*?)\2[^>]*)>([\s\S]*?)<\/a>/gi);
  for(const match of tags){
    const raw=match[3].replace(/&amp;/gi,'&').trim();
    if(!raw||raw.startsWith('#'))continue;
    let u;try{u=new URL(raw,source.listing)}catch{continue}
    if(u.protocol!=='https:'||!source.hosts.includes(u.hostname.toLowerCase()))continue;
    u.hash='';u.search='';
    if(!source.path.test(u.pathname)||out.has(u.href))continue;
    out.set(u.href,{url:u.href,source_id:source.id,provider:source.name,title_guess:trimText(match[4])});
    if(out.size>=limit)break;
  }
  return [...out.values()];
}
async function digestUrl(url){
 const bytes=new TextEncoder().encode(url);
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return 'official-'+[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,34);
}
async function scanOne(source,db){
 const ac=new AbortController();const timeout=setTimeout(()=>ac.abort(),12000);
 try{
  const response=await fetch(source.listing,{signal:ac.signal,headers:{accept:'text/html'}});
  if(!response.ok)throw Error('HTTP '+response.status);
  const type=response.headers.get('content-type')||'';
  if(type&&!/html|text/i.test(type))throw Error('Expected HTML');
  const html=await response.text();
  if(html.length>1500000)throw Error('Document too large');
  const candidates=candidateLinks(html,source,25);
  let newCount=0;
  for(const candidate of candidates){
   const id=await digestUrl(candidate.url);
   const result=await db.prepare(
    "INSERT INTO activity_leads(id,source_platform,post_url,organizer_official_url,organizer_verified,review_status,collected_at) VALUES(?,?,?,?,0,'pending',?) ON CONFLICT(post_url) DO NOTHING"
   ).bind(id,'official:'+source.id,candidate.url,candidate.url,new Date().toISOString()).run();
   newCount+=Number(result?.meta?.changes||0);
  }
  return {source:source.id,found:candidates.length,new_leads:newCount,status:'ok'};
 } catch(err){
  return {source:source.id,status:'fetch_failed',message:String(err?.message||err).slice(0,140)};
 }finally{clearTimeout(timeout)}
}
export async function discoverOrganizerLeads(db){
 // Sequential and bounded: no burst crawling, no following external links, no auto-publish.
 const outcomes=[];for(const source of ORGANIZER_SOURCES)outcomes.push(await scanOne(source,db));
 return {ok:true,discovered:outcomes.reduce((s,r)=>s+(r.found||0),0),new_leads:outcomes.reduce((s,r)=>s+(r.new_leads||0),0),published:0,source_count:ORGANIZER_SOURCES.length,results:outcomes,notice:'Leads require review of official dates, venue, prices, and organizer identity before publication.'};
}
export const publicSources=()=>ORGANIZER_SOURCES.map(s=>({id:s.id,name:s.name,listing:s.listing,mode:'official_site_discovery',auto_publish:false}));
