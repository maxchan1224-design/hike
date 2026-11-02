import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const page=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf-8');
const script=page.slice(page.indexOf('function validOfficialRow'),page.indexOf('function officialDetail'));
const {validOfficialRow,toOfficialEvents} = vm.runInNewContext(script+'\n({validOfficialRow,toOfficialEvents})',{Date,Intl,URL,Map,Set,String,Number});
const day=(()=>{const d=new Date();d.setUTCDate(d.getUTCDate()+16);return d.toISOString().slice(0,10)})();
const base={id:'lcsd:1234',title:'官方文化節目',title_en:'Cultural show',description:'LCSD programme',category:'INC4',venue:'香港文化中心',organizer:'LCSD',price:'免費',event_url:'https://www.lcsd.gov.hk/event/1234',source:'lcsd-cultural',verification:'official_feed',updated_at:'2026-11-02T00:00:00Z',day};
test('accept official LCSD row with valid source and future day',()=>assert.equal(validOfficialRow(base),true));
test('reject unverified, nonofficial or unsafe URL rows',()=>{
 assert.equal(validOfficialRow({...base,verification:'pending'}),false);
 assert.equal(validOfficialRow({...base,source:'Threads'}),false);
 assert.equal(validOfficialRow({...base,event_url:'javascript:alert(1)'}),false);
 assert.equal(validOfficialRow({...base,id:"lcsd:bad');alert('hi"}),false);
});
test('combine multiple occurrences by source id and keep date sorted',()=>{
 const later=new Date(day+'T00:00:00Z');later.setUTCDate(later.getUTCDate()+2);
 const other=later.toISOString().slice(0,10);
 const out=toOfficialEvents([{...base,day:other},base,base]);
 assert.equal(out.length,1);assert.deepEqual(Array.from(out[0].date),[day,other]);
 assert.equal(out[0].start,'');assert.equal(out[0].officialFeed,true);
});
test('map verified organizer categories to nonfabricated UI categories',()=>{
 const arr=toOfficialEvents([{...base,category:'INC9',price:'$250'}]);
 assert.equal(arr[0].category,'節慶');assert.equal(arr[0].priceN,-1);
});