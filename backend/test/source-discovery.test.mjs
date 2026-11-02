import test from 'node:test';
import assert from 'node:assert/strict';
import {ORGANIZER_SOURCES,candidateLinks,discoverOrganizerLeads,publicSources} from '../src/source-discovery.mjs';

test('official source registry includes five-plus organizers, no LCSD bulk catalog',()=>{
 assert.ok(ORGANIZER_SOURCES.length>=5);
 assert.equal(ORGANIZER_SOURCES.some(s=>s.id==='lcsd'),false);
 assert.equal(publicSources().every(s=>s.auto_publish===false&&s.listing.startsWith('https://')),true);
});
test('extracts organizer-hosted event URLs and rejects external or script links',()=>{
 const source=ORGANIZER_SOURCES.find(x=>x.id==='hkdc');
 const html=[
  '<a href="/en/whats-on/breathe-with-me/1371">BREATHE WITH ME</a>',
  '<a class="x" href="https://www.hkdesigncentre.org/en/whats-on/breathe-with-me/1371?tracking=1">Duplicate</a>',
  '<a href="https://example.com/en/whats-on/fake/123">Fake event</a>',
  '<a href="javascript:alert(1)">Danger</a>',
  '<a href="/en/whats-on/current-and-upcoming">Listing page</a>',
  '<a href="/en/whats-on/another-show/1399"> Another official show </a>'
 ].join('');
 const list=candidateLinks(html,source);
 assert.equal(list.length,2);
 assert.ok(list[0].url.endsWith('/en/whats-on/breathe-with-me/1371'));
 assert.equal(list[0].title_guess,'BREATHE WITH ME');
 assert.ok(list.every(e=>e.url.startsWith('https://www.hkdesigncentre.org/')));
});
test('PMQ event links are recognized; pageless navigation is excluded',()=>{
 const pmq=ORGANIZER_SOURCES.find(s=>s.id==='pmq');
 const html='<a href="/event/tsultrim-norbu-tibetan-cloisonne-thangka-exhibition/">Exhibition</a><a href="/studios-shops/">Shops</a>';
 assert.equal(candidateLinks(html,pmq).length,1);
});
test('lead discovery only stages unverified private candidates; fetch errors are isolated',async()=>{
 const oldFetch=globalThis.fetch;
 const sqlCalls=[];
 globalThis.fetch=async url=>{
  if(String(url).includes('pmq.org.hk'))throw Error('Simulated downtime');
  return {ok:true,status:200,headers:{get:()=> 'text/html'},text:async()=>'<a href="/en/whats-on/test-event/1101">Official test event</a>'};
 };
 const db={prepare(sql){return{bind(...args){return{async run(){sqlCalls.push({sql,args});return {meta:{changes:1}}}}}}}};
 try{
  const result=await discoverOrganizerLeads(db);
  assert.equal(result.ok,true);
  assert.equal(result.published,0);
  assert.equal(result.source_count,ORGANIZER_SOURCES.length);
  assert.equal(result.results.some(x=>x.source==='pmq'&&x.status==='fetch_failed'),true);
  assert.equal(sqlCalls.length>=1,true);
  assert.ok(sqlCalls.every(x=>x.sql.includes("'pending'")&&x.sql.includes('?,?,?,?,0,')&&x.args[1].startsWith('official:')));
 }finally{globalThis.fetch=oldFetch;}
});
