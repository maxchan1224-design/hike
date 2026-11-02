import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLCSD,hkToday,toIsoDay,addDays} from '../src/normalize.mjs';
const sample={
  programmes:{events:{event:[{id:'AA',titlec:'香港爵士表演',titlee:'Jazz Concert',venueid:'V1',cat1:'Music',presenterorgc:'康文署',urlc:'https://www.lcsd.gov.hk/test/',pricec:'免費',progtimec:'一小時'},{id:'BB',titlec:'已完結的活動',venueid:'V1'}]}},
  dates:{eventDates:{event:[{id:'AA',indate:['20261114','20261115']},{id:'BB',indate:'20261001'}]}},
  venues:{venues:{venue:{id:'V1',venuec:'香港大會堂',venue:'Hong Kong City Hall'}}}
};
test('valid Hong Kong calendar conversion',()=>{assert.equal(hkToday(new Date('2026-11-01T23:30:00Z')),'2026-11-02');assert.equal(toIsoDay('20261115'),'2026-11-15');assert.equal(toIsoDay('20260230'),null);assert.equal(addDays('2026-11-14',2),'2026-11-16')});
test('join official programme, dates, venue; exclude past events',()=>{
 const r=normalizeLCSD(sample,{today:'2026-11-02',horizon:45});
 assert.equal(r.programmes,2);assert.equal(r.events.length,1);assert.deepEqual(r.events[0].days,['2026-11-14','2026-11-15']);assert.equal(r.events[0].venue,'香港大會堂');assert.equal(r.events[0].timeText,'一小時');assert.equal(r.events[0].title,'香港爵士表演');
});
test('invalid event urls fall back to the official dataset, not untrusted redirects',()=>{
 const r=normalizeLCSD({...sample,programmes:{events:{event:[{...sample.programmes.events.event[0],urlc:'javascript:alert(1)'}]}}},{today:'2026-11-02'});
 assert.ok(r.events[0].eventUrl.startsWith('https://data.gov.hk/'));
});
test('incomplete official feed is rejected',()=>assert.throws(()=>normalizeLCSD({programmes:{},dates:{},venues:{}}),/shape mismatch/));
