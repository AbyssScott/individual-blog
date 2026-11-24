import test from 'node:test';
import assert from 'node:assert/strict';
import {renderVisual,replaceVisualText,replaceBlock} from '../src/scripts/visual-editor.js';
test('rendered text preserves links, math, footnotes and block ranges',async()=>{
 const src='## Title\n\nA **bold** [link](https://example.org) and $x^2$.[^f]\n\n[^f]: Note\n';
 const html=await renderVisual(src);
 assert.match(html,/data-edit-start="3"/);
 assert.match(html,/data-block-start="0"/);
 assert.match(html,/href="https:\/\/example.org"/);
 assert.match(html,/class="katex"/);
 assert.match(html,/footnote/);
});
test('direct edits preserve untouched Markdown bytes and AST structure',()=>{
 const src='Intro **bold** [label](https://example.org) $x$.\n\n[^f]: Footnote\n';
 const a=src.indexOf('bold');
 assert.equal(replaceVisualText(src,a,a+4,'strong'),src.replace('bold','strong'));
 const b=src.indexOf('label');
 assert.equal(replaceVisualText(src,b,b+5,'new label'),src.replace('label','new label'));
 assert.equal(replaceVisualText(src,b,b+5,'new\nlabel'),null);
});
test('replacing one block retains all other source',()=>{
 assert.equal(replaceBlock('one\n\n$$x$$\n\nlast',0,3,'first'),'first\n\n$$x$$\n\nlast');
});
test('HTML and dangerous link protocols cannot execute',async()=>{
 const html=await renderVisual('a <script>alert(1)</script> [bad](javascript:alert%281%29)');
 assert.doesNotMatch(html,/<script|href="javascript:/i);
});
