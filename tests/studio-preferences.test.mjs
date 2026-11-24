import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePrefs,clampSplit,scrollFraction,scrollTarget} from '../src/scripts/studio-preferences.js';
test('default preferences and invalid input',()=>{
 assert.deepEqual(normalizePrefs(null),{mode:'rich',hideDetails:true,hideLibrary:false,syncScroll:true,split:50,lastPost:''});
 const p=normalizePrefs({mode:'preview',split:900,lastPost:'../secret',token:'secret',hideDetails:false});
 assert.equal(p.mode,'rich');assert.equal(p.split,75);assert.equal(p.lastPost,'');assert.equal(p.hideDetails,false);assert.ok(!('token' in p));
});
test('valid preferences persist',()=>{
 const p=normalizePrefs({mode:'split',split:39,hideLibrary:true,hideDetails:false,syncScroll:false,lastPost:'zh/test.md'});
 assert.equal(p.mode,'split');assert.equal(p.split,39);assert.equal(p.lastPost,'zh/test.md');assert.equal(p.syncScroll,false);
});
test('split and scrolling stay within bounds',()=>{
 assert.equal(clampSplit(-1),25);assert.equal(clampSplit('bad'),50);
 assert.equal(scrollFraction(400,1000,200),.5);assert.equal(scrollTarget(.5,1800,200),800);
 assert.equal(scrollFraction(30,100,200),0);assert.equal(scrollTarget(2,1000,200),800);
});

test('old visual preference migrates to rich text',()=>assert.equal(normalizePrefs({mode:'visual'}).mode,'rich'));
