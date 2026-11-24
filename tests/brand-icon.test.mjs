import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('shared favicon references on all site layouts',()=>{
 for(const p of ["src/layouts/BaseLayout.astro","src/pages/index.astro","src/pages/404.astro","src/pages/developer.astro"]){
  const s=readFileSync(p,'utf8');
  for(const name of ['favicon.svg?v=2','favicon-32.png?v=2','apple-touch-icon.png?v=2'])assert.ok(s.includes(name),p+' '+name);
 }
 const svg=readFileSync('public/favicon.svg','utf8');assert.match(svg,/#16253A/);assert.match(svg,/#FFFFFF/);assert.match(svg,/#8DBAFF/);
 for(const [file,n] of [['favicon-32.png',32],['apple-touch-icon.png',180]]){
  const p=readFileSync('public/'+file);assert.deepEqual([...p.subarray(0,8)],[137,80,78,71,13,10,26,10]);assert.equal(p.readUInt32BE(16),n);assert.equal(p.readUInt32BE(20),n);
 }
});
