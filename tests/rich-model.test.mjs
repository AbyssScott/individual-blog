import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {richSchema as S,readRich,serializeRich,lostProtected} from '../src/scripts/rich-model.js';
test('all current article bodies round-trip without byte changes',()=>{
 for(const lang of ['zh','en'])for(const name of readdirSync('src/content/posts/'+lang).filter(x=>x.endsWith('.md'))){
  const full=readFileSync('src/content/posts/'+lang+'/'+name,'utf8');
  const body=full.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/,'');
  const model=readRich(body);assert.equal(serializeRich(model.doc,model),body,lang+'/'+name);
 }
});
test('editing prose leaves protected blocks and untouched paragraphs unchanged',()=>{
 const source='First paragraph.\n\n<figure>\n<img src="/individual-blog/images/example.png" alt="x">\n<figcaption>Caption</figcaption>\n</figure>\n\nSecond **bold** [link](https://example.org) $x^2$.\n\n[^a]: Note\n';
 const m=readRich(source),first=m.doc.firstChild,changed=first.type.create(first.attrs,S.text('Updated paragraph.'));
 const doc=m.doc.copy(m.doc.content.replaceChild(0,changed));
 assert.equal(serializeRich(doc,m),source.replace('First paragraph.','Updated paragraph.'));
 assert.equal(lostProtected(m.doc,doc),false);
});
test('new rich paragraphs, formatting, math, link serialize safely',()=>{
 const m=readRich('Original\n');
 const p=S.nodes.paragraph.create(null,[S.text('New '),S.text('bold',[S.marks.strong.create()]),S.text(' and '),S.text('link',[S.marks.link.create({href:'https://example.org'})]),S.text(' '),S.nodes.inlineMath.create({value:'x^2'})]);
 const doc=S.nodes.doc.create(null,[m.doc.firstChild,p]);
 const out=serializeRich(doc,m);assert.match(out,/\*\*bold\*\*/);assert.match(out,/\[link\]\(https:\/\/example.org\)/);assert.match(out,/\$x\^2\$/);
});
test('protected deletion is detected',()=>{
 const m=readRich('A\n\n$$\nx^2\n$$\n');assert.equal(lostProtected(m.doc,S.nodes.doc.create(null,[m.doc.firstChild])),true);
});
