import test from 'node:test';
import assert from 'node:assert/strict';
import {field,normalizeLCSD} from '../src/normalize.mjs';
const today='2026-11-02';

test('LCSD records stored as XML attributes are accepted',()=>{
 const feeds={
  programmes:{events:{event:[{'@_id':'E1','@_titlec':'粵語爵士樂','@_titlee':'Cantonese Jazz','@_venueid':'V1','@_urlc':'https://www.lcsd.gov.hk/'}]}},
  dates:{eventDates:{event:[{'@_id':'E1','@_indate':'20261115'}]}},
  venues:{venues:{venue:[{'@_id':'V1','@_venuec':'香港文化中心'}]}}
 };
 const result=normalizeLCSD(feeds,{today});
 assert.equal(result.events.length,1);
 assert.equal(result.events[0].venue,'香港文化中心');
 assert.deepEqual(result.events[0].days,['2026-11-15']);
});
test('Child elements and repeated date fields work',()=>{
 const feeds={
  programmes:{root:{event:[{id:'E2',titlec:'舞蹈工作坊',venueid:'v2',urlc:'https://www.lcsd.gov.hk/'}]}},
  dates:{root:{entry:[{id:'E2',indate:['20261115','20261116']},{id:'E2',indate:'20261120'}]}},
  venues:{root:{place:[{id:'v2',venuec:'香港大會堂'}]}}
 };
 const result=normalizeLCSD(feeds,{today});
 assert.deepEqual(result.events[0].days,['2026-11-15','2026-11-16','2026-11-20']);
});
test('Malformed feeds identify source shape without publishing guessed records',()=>{
 const feeds={programmes:{root:{event:[{id:'E2',titlec:'Title'}]}},dates:{otherroot:{items:[{'@_sample':'oops'}]}},venues:{root:{place:[{id:'v2',venuec:'HK'}]}}};
 assert.throws(()=>normalizeLCSD(feeds,{today}),/programmes=1, dates=0, venues=1; rootKeys/);
});
test('Field lookup handles case and avoids overwriting child values with attributes',()=>{
 assert.equal(field({'@_TITLEC':'Test'},'titlec'),'Test');
 assert.equal(field({'titlec':'Direct','@_titlec':'Attribute'},'titlec'),'Direct');
});
