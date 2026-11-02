// LCSD Cultural Programmes feed normalisation. No AI-created events are admitted.
export const OFFICIAL = Object.freeze({
  programmes: 'https://www.lcsd.gov.hk/datagovhk/event/events.xml',
  dates: 'https://www.lcsd.gov.hk/datagovhk/event/eventDates.xml',
  venues: 'https://www.lcsd.gov.hk/datagovhk/event/venues.xml',
  dictionary: 'https://www.lcsd.gov.hk/datagovhk/event/data_dictionary.pdf',
  dataset: 'https://data.gov.hk/en-data/dataset/hk-lcsd-event-event-cultural',
});
const scalar = value => {
  if (Array.isArray(value)) return scalar(value[0]);
  if (value && typeof value === 'object') return scalar(value['#text'] ?? '');
  return value == null ? '' : String(value).trim();
};
export function field(obj, ...names) {
  if (!obj || typeof obj !== 'object') return '';
  const indexed = Object.fromEntries(Object.entries(obj).map(([k,v])=>[k.replace(/^.*:/,'').toLowerCase(),v]));
  for (const name of names) {
    const s = scalar(indexed[name.toLowerCase()]);
    if (s) return s;
  }
  return '';
}
// Source XML root/tag names can vary. Require expected fields rather than guessing them.
export function rowsOf(tree, predicate) {
  const result = [];
  function walk(x, depth=0) {
    if (depth > 16 || x == null || typeof x !== 'object') return;
    if (Array.isArray(x)) { for (const item of x) walk(item, depth+1); return; }
    if (predicate(x)) { result.push(x); return; }
    for (const [k,v] of Object.entries(x)) if (!k.startsWith('@_')) walk(v,depth+1);
  }
  walk(tree);
  return result;
}
export function hkToday(now=new Date()) {
  // UTC date must not be used near midnight in Hong Kong.
  return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Hong_Kong', year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function addDays(day, n) {
  const t = new Date(day+'T00:00:00.000Z');
  if (Number.isNaN(+t)) throw new Error('Invalid day');
  t.setUTCDate(t.getUTCDate()+n);
  return t.toISOString().slice(0,10);
}
export function toIsoDay(raw) {
  const s=String(raw||'').trim();
  let m=s.match(/^(20\d\d)[-\/.]?(0[1-9]|1[0-2])[-\/.]?([0-2]\d|3[01])(?:T|\s|$)/);
  if (!m) return null;
  const yyyy=+m[1], mm=+m[2], dd=+m[3];
  const d=`${m[1]}-${m[2]}-${m[3]}`;
  return new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d ? d : null;
}
function approvedUrl(raw) {
  try { const u=new URL(raw); return u.protocol==='https:' && u.hostname ? u.toString():null; } catch {return null}
}
const clean = (s, length=3000) => String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,length);
export function normalizeLCSD({programmes, dates, venues}, {today=hkToday(), horizon=60}={}) {
  const rawProgrammes=rowsOf(programmes,x=>field(x,'id') && (field(x,'titlec')||field(x,'titlee')));
  const rawDates=rowsOf(dates,x=>field(x,'id') && field(x,'indate'));
  const rawVenues=rowsOf(venues,x=>field(x,'id') && (field(x,'venuec')||field(x,'venue')));
  if (!rawProgrammes.length || !rawDates.length || !rawVenues.length) throw Error('Source shape mismatch: missing programme/date/venue rows');
  const venuesById=new Map(rawVenues.map(x=>[field(x,'id'),x]));
  const datesById=new Map();
  for (const row of rawDates) {
    const id=field(row,'id');
    if (!datesById.has(id)) datesById.set(id,new Set());
    const raw = row.indate ?? row.INDATE;
    for (const value of Array.isArray(raw)?raw:[raw]) {
      const day=toIsoDay(scalar(value));
      if (day) datesById.get(id).add(day);
    }
  }
  const maxDay=addDays(today,horizon);
  const result=[];
  for (const p of rawProgrammes) {
    const sourceId=field(p,'id');
    const schedule=[...(datesById.get(sourceId)||[])].filter(d=>d>=today&&d<=maxDay).sort();
    if (!schedule.length) continue;
    const venueId=field(p,'venueid'); const venue=venuesById.get(venueId);
    // Date-only is still valid; never infer a clock time from programme duration.
    const url=approvedUrl(field(p,'urlc','urle')) || OFFICIAL.dataset;
    const organizer=clean(field(p,'presenterorgc','presenterorge') || '康樂及文化事務署',180);
    result.push({
      id:'lcsd:'+sourceId,sourceEventId:sourceId,
      title:clean(field(p,'titlec','titlee'),300),
      titleEn:clean(field(p,'titlee'),300),
      description:clean(field(p,'descc','desce'),2400),
      category:clean(field(p,'cat1'),60)||'文化節目',
      venue:clean(field(venue,'venuec','venue')||'',220),
      organizer, price:clean(field(p,'pricec','pricee'),200),
      dateText:clean(field(p,'predatec','predatee'),240),
      timeText:clean(field(p,'progtimec','progtimee'),180),
      eventUrl:url,
      imageUrl:approvedUrl(field(p,'prog_image')),
      days:schedule
    });
  }
  return {programmes:rawProgrammes.length,dates:rawDates.length,venues:rawVenues.length,events:result};
}
