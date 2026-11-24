import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

const parser=unified().use(remarkParse).use(remarkGfm).use(remarkMath);
const parse=source=>parser.parse(source);
const range=node=>[node.position?.start?.offset,node.position?.end?.offset];
const safeRange=(a,b)=>Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b>a;
function walk(node,fn){fn(node);for(const child of node.children||[])walk(child,fn);}
function signature(tree){return JSON.stringify(tree,(key,value)=>key==='position'?undefined:value);}
function escapeText(text){return text.replace(/[!-/:-@[-\x60{-~]/g,'\\$&');}
export function replaceVisualText(source,start,end,value){
 if(!safeRange(start,end)||end>source.length||typeof value!=='string'||/[\r\n]/.test(value))return null;
 const tree=parse(source);let target=null;
 walk(tree,node=>{const [a,b]=range(node);if(node.type==='text'&&a===start&&b===end)target=node;});
 if(!target)return null;
 if(target.value===value)return source;
 // Validate the ENTIRE Markdown syntax tree; only the intended text node may change.
 target.value=value;
 const expected=signature(tree);
 for(const replacement of [...new Set([value,escapeText(value)])]){
  const candidate=source.slice(0,start)+replacement+source.slice(end);
  if(signature(parse(candidate))===expected)return candidate;
 }
 return null;
}
export function replaceBlock(source,start,end,replacement){
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>source.length)throw Error('段落位置无效。');
 return source.slice(0,start)+replacement+source.slice(end);
}
const schema={...defaultSchema,attributes:{...defaultSchema.attributes,
 code:[...(defaultSchema.attributes.code||[]),['className','math-inline','math-display','language-math']],
 span:[...(defaultSchema.attributes.span||[]),'dataEditStart','dataEditEnd'],
 div:[...(defaultSchema.attributes.div||[]),'dataBlockStart','dataBlockEnd',['className','visual-block']]
}};
export async function renderVisual(source){
 const tree=parse(source),blocks=new Map();
 for(const n of tree.children){const [a,b]=range(n);if(safeRange(a,b)&&n.type!=='definition'&&n.type!=='footnoteDefinition')blocks.set(a,b);}
 const wrapBlocks=()=>root=>{
  root.children=root.children.map(n=>{
   const [a,b]=range(n);
   if(n.type!=='element'||blocks.get(a)!==b||!safeRange(a,b))return n;
   return {type:'element',tagName:'div',properties:{className:['visual-block'],dataBlockStart:a,dataBlockEnd:b},children:[n]};
  });
 };
 const processor=unified().use(remarkParse).use(remarkGfm).use(remarkMath)
 .use(remarkRehype,{handlers:{text(state,node){
  const [a,b]=range(node);
  const value=node.value;
  const text={type:'text',value};
  if(!safeRange(a,b)||!value.trim()||/[\r\n]/.test(value)||/[\r\n]/.test(source.slice(a,b))){state.patch(node,text);return text;}
  const span={type:'element',tagName:'span',properties:{dataEditStart:a,dataEditEnd:b},children:[text]};
  state.patch(node,span);return span;
 }}})
 .use(wrapBlocks).use(rehypeSanitize,schema).use(rehypeKatex,{trust:false}).use(rehypeStringify);
 return String(await processor.process(source));
}
