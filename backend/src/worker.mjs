import { XMLParser } from 'fast-xml-parser';
import { OFFICIAL, normalizeLCSD, hkToday, addDays } from './normalize.mjs';

const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*','x-content-type-options':'nosniff'}});
const fail=(reason,status)=>json({ok:false,error:reason},status);
const matchDay=x=>typeof x==='string'&&/^20\d\d-\d\d-\d\d$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'));
const xmlParser=new XMLParser({ignoreAttributes:false,parseTagValue:false,parseAttributeValue:false,trimValues:true,removeNSPrefix:true,processEntities:true});
const SOURCE='lcsd-cultural';

async function getXml(url) {
  // Only hard-coded LCSD official URLs; no arbitrary URL fetch or social scraping.
  const res=await fetch(url,{headers:{accept:'application/xml,text/xml,application/xhtml+xml'},signal:AbortSignal.timeout(25000)});
  if(!res.ok) throw Error(`Official feed HTTP ${res.status} (${new URL(url).pathname})`);
  const body=await res.text();
  if(body.length<100 || !body.trimStart().startsWith('<')) throw Error('Empty or invalid official XML feed');
  if(body.length>25000000) throw Error('Official feed too large');
  return xmlParser.parse(body);
}
const parts=(arr,n=60)=>Array.from({length:Math.ceil(arr.length/n)},(_,i)=>arr.slice(i*n,(i+1)*n));
async function syncLCSD(env,now=new Date()) {
  if(!env.DB) throw Error('D1 binding DB not configured');
  const started=now.toISOString();
  const startedRow=await env.DB.prepare(`INSERT INTO sync_runs(source,started_at,status) VALUES(?,?,'running') RETURNING id`).bind(SOURCE,started).first();
  const runId=startedRow?.id;
  if (!runId) throw Error('Unable to create sync run');
  try {
    const [programmes,dates,venues]=await Promise.all([getXml(OFFICIAL.programmes),getXml(OFFICIAL.dates),getXml(OFFICIAL.venues)]);
    const data=normalizeLCSD({programmes,dates,venues},{today:hkToday(now),horizon:60});
    const previously=(await env.DB.prepare('SELECT COUNT(*) AS n FROM events WHERE source=? AND visibility=?').bind(SOURCE,'verified').first())?.n || 0;
    // Fail closed on suspiciously small or truncated official responses.
    if(data.programmes<10 || data.dates<10 || data.events.length<5 || (previously>=30 && data.events.length<previously*.25)) {
      throw Error(`Abnormal source size; refusing sync (${data.programmes} programmes, ${data.events.length} future events, ${previously} previous)`);
    }
    const dateRows=[]; let saved=0;
    for (const chunk of parts(data.events,45)) {
      const stmts=[];
      for (const e of chunk) {
        stmts.push(env.DB.prepare(`INSERT INTO events(id,source,source_event_id,title,title_en,description,category,venue,organizer,price,date_text,time_text,event_url,image_url,verification,visibility,last_seen_run,missed_count,updated_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'verified',?,0,?)
          ON CONFLICT(id) DO UPDATE SET title=excluded.title,title_en=excluded.title_en,description=excluded.description,category=excluded.category,venue=excluded.venue,organizer=excluded.organizer,price=excluded.price,date_text=excluded.date_text,time_text=excluded.time_text,event_url=excluded.event_url,image_url=excluded.image_url,verification='official_feed',visibility='verified',last_seen_run=excluded.last_seen_run,missed_count=0,updated_at=excluded.updated_at`)
          .bind(e.id,SOURCE,e.sourceEventId,e.title,e.titleEn,e.description,e.category,e.venue,e.organizer,e.price,e.dateText,e.timeText,e.eventUrl,e.imageUrl,'official_feed',started,started));
        for (const day of e.days) dateRows.push({id:e.id,day});
      }
      await env.DB.batch(stmts);saved+=chunk.length;
    }
    for (const chunk of parts(dateRows,80)) {
      await env.DB.batch(chunk.map(x=>env.DB.prepare(`INSERT INTO event_dates(event_id,day,last_seen_run) VALUES(?,?,?) ON CONFLICT(event_id,day) DO UPDATE SET last_seen_run=excluded.last_seen_run`).bind(x.id,x.day,started)));
    }
    // Only prune after every upstream request and all writes have succeeded.
    await env.DB.prepare(`DELETE FROM event_dates WHERE event_id IN (SELECT id FROM events WHERE source=? AND last_seen_run=?) AND last_seen_run<>?`).bind(SOURCE,started,started).run();
    await env.DB.prepare(`UPDATE events SET missed_count=missed_count+1 WHERE source=? AND visibility='verified' AND last_seen_run<>?`).bind(SOURCE,started).run();
    await env.DB.prepare(`UPDATE events SET visibility='missing_official_feed' WHERE source=? AND missed_count>=2`).bind(SOURCE).run();
    await env.DB.prepare(`DELETE FROM event_dates WHERE day<?`).bind(hkToday(now)).run();
    await env.DB.prepare(`UPDATE sync_runs SET status='success',finished_at=?,parsed_events=?,published_events=? WHERE id=?`).bind(new Date().toISOString(),data.programmes,saved,runId).run();
    return {ok:true,source:SOURCE,parsed:data.programmes,published:saved,occurrences:dateRows.length,run_id:runId};
  } catch(err) {
    await env.DB.prepare(`UPDATE sync_runs SET status='failed',finished_at=?,error=? WHERE id=?`).bind(new Date().toISOString(),String(err?.message||err).slice(0,500),runId).run();
    throw err;
  }
}
async function listEvents(url,db) {
  const today=hkToday(); const from=url.searchParams.get('from')||today;
  const to=url.searchParams.get('to')||addDays(today,30);
  if(!matchDay(from)||!matchDay(to)||to<from||to>addDays(from,90)) return fail('Date range must be valid and at most 90 days',400);
  const limit=Math.max(1,Math.min(100,Number.parseInt(url.searchParams.get('limit')||'40',10)||40));
  const offset=Math.max(0,Math.min(20000,Number.parseInt(url.searchParams.get('offset')||'0',10)||0));
  const search=(url.searchParams.get('q')||'').trim().slice(0,80);
  const keyword=search?'%'+search.replace(/[\\%_]/g,'\\$&')+'%':'';
  const sql=`SELECT e.id,e.title,e.title_en,e.description,e.category,e.venue,e.organizer,e.price,e.date_text,e.time_text,e.event_url,e.image_url,e.source,e.verification,e.updated_at,d.day
    FROM event_dates d JOIN events e ON d.event_id=e.id
    WHERE e.visibility='verified' AND e.verification='official_feed' AND d.day>=? AND d.day<=?
    ${search?"AND (e.title LIKE ? ESCAPE '\\' OR e.venue LIKE ? ESCAPE '\\' OR e.description LIKE ? ESCAPE '\\')":''}
    ORDER BY d.day ASC,e.title ASC,e.id ASC LIMIT ? OFFSET ?`;
  const values=search?[from,to,keyword,keyword,keyword,limit,offset]:[from,to,limit,offset];
  const rows=(await db.prepare(sql).bind(...values).all()).results||[];
  return json({ok:true,events:rows,count:rows.length,offset,next_offset:rows.length===limit?offset+limit:null,from,to,source:'LCSD official programme feed',scope:'This is not yet all Hong Kong activities.'});
}
async function health(db) {
  const latest=await db.prepare('SELECT source,started_at,finished_at,status,parsed_events,published_events,error FROM sync_runs ORDER BY id DESC LIMIT 1').first();
  const lastSuccess=await db.prepare("SELECT finished_at,published_events FROM sync_runs WHERE status='success' ORDER BY id DESC LIMIT 1").first();
  const rows=await db.prepare("SELECT COUNT(*) AS n FROM events WHERE visibility='verified' AND verification='official_feed'").first();
  const age=lastSuccess?.finished_at?Date.now()-Date.parse(lastSuccess.finished_at):Infinity;
  // "live" only when a successful update was recent and the latest attempt is not failing.
  const fresh=latest?.status==='success'&&Number.isFinite(age)&&age>=0&&age<48*3600*1000;
  return json({ok:true,live:Boolean(fresh),last_sync:latest||null,last_success:lastSuccess||null,verified_events:rows?.n||0,
    notice:fresh?'Official LCSD data synchronized. This does not indicate real-time ticket availability.':'Official data may be missing or stale; check status before relying on it.'});
}

export default {
  async fetch(req,env) {
    if(!env.DB)return fail('Database not configured',503);
    const url=new URL(req.url);
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type'}});
    try {
      if(req.method==='GET'&&url.pathname==='/api/events')return await listEvents(url,env.DB);
      if(req.method==='GET'&&url.pathname==='/api/health')return await health(env.DB);
      if(req.method==='POST'&&url.pathname==='/admin/sync') {
        if(!env.ADMIN_TOKEN||req.headers.get('authorization')!==`Bearer ${env.ADMIN_TOKEN}`)return fail('Unauthorized',401);
        return json(await syncLCSD(env));
      }
      return fail('Not found',404);
    }catch(e){console.error('API error',String(e));return fail('Temporary service error',503)}
  },
  async scheduled(controller,env,ctx) { await syncLCSD(env,new Date(controller.scheduledTime||Date.now())); }
};
export {syncLCSD};