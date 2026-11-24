import {Schema} from 'prosemirror-model';
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import {toMarkdown} from 'mdast-util-to-markdown';
import {gfmToMarkdown} from 'mdast-util-gfm';
import {mathToMarkdown} from 'mdast-util-math';
const parser=unified().use(remarkParse).use(remarkGfm).use(remarkMath);
const origin={default:null};
export const richSchema=new Schema({
 nodes:{
  doc:{content:'block+'},
  paragraph:{group:'block',content:'inline*',attrs:{origin},parseDOM:[{tag:'p'}],toDOM:()=>['p',0]},
  heading:{group:'block',content:'inline*',attrs:{origin,level:{default:2}},defining:true,parseDOM:[1,2,3,4,5,6].map(level=>({tag:'h'+level,attrs:{level}})),toDOM:n=>['h'+n.attrs.level,0]},
  protected:{group:'block',atom:true,selectable:true,attrs:{origin,raw:{default:''},kind:{default:'复杂区块'}},toDOM:()=>['div',{'class':'rich-protected'},'Markdown 区块']},
  inlineMath:{group:'inline',inline:true,atom:true,selectable:true,attrs:{value:{default:''}},toDOM:n=>['span',{'class':'rich-inline-math'},n.attrs.value]},
  hardBreak:{group:'inline',inline:true,selectable:false,parseDOM:[{tag:'br'}],toDOM:()=>['br']},
  text:{group:'inline'}
 },
 marks:{
  strong:{parseDOM:[{tag:'strong'},{tag:'b'}],toDOM:()=>['strong',0]},
  em:{parseDOM:[{tag:'em'},{tag:'i'}],toDOM:()=>['em',0]},
  strike:{parseDOM:[{tag:'s'},{tag:'del'}],toDOM:()=>['del',0]},
  link:{attrs:{href:{default:''},title:{default:null}},inclusive:false,toDOM:()=>['span',{'class':'rich-link'},0]},
  code:{code:true,excludes:'_',parseDOM:[{tag:'code'}],toDOM:()=>['code',0]}
 }
});
const S=richSchema;
function inline(nodes,marks=[]){
 const out=[];
 for(const n of nodes||[]){
  if(n.type==='text'){if(n.value)out.push(S.text(n.value,marks));continue;}
  if(n.type==='inlineMath'){out.push(S.nodes.inlineMath.create({value:n.value},null,marks));continue;}
  if(n.type==='break'){out.push(S.nodes.hardBreak.create(null,null,marks));continue;}
  if(n.type==='inlineCode'){if(!n.value||marks.length)throw Error('复杂行内代码');out.push(S.text(n.value,[S.marks.code.create()]));continue;}
  const type={strong:'strong',emphasis:'em',delete:'strike',link:'link'}[n.type];
  if(!type)throw Error('复杂行内元素');
  const mark=S.marks[type].create(type==='link'?{href:n.url,title:n.title??null}:null);
  if(mark.isInSet(marks))throw Error('嵌套重复格式');
  out.push(...inline(n.children,mark.addToSet(marks)));
 }
 return out;
}
function makeBlock(n,raw,id){
 if(n.type==='paragraph'||n.type==='heading'){
  try{return S.nodes[n.type].createChecked(n.type==='heading'?{origin:id,level:n.depth}:{origin:id},inline(n.children));}catch{}
 }
 return S.nodes.protected.create({origin:id,raw,kind:n.type});
}
export function readRich(source){
 const records=[],nodes=[];let prev=0;
 for(const n of parser.parse(source).children){
  const a=n.position.start.offset,b=n.position.end.offset,id=records.length;
  const raw=source.slice(a,b),node=makeBlock(n,raw,id);
  records.push({node,raw,gap:source.slice(prev,a)});nodes.push(node);prev=b;
 }
 if(!nodes.length)nodes.push(S.nodes.paragraph.create());
 return {source,doc:S.nodes.doc.createChecked(null,nodes),records,tail:source.slice(prev)};
}
function toInline(node){
 const root=[],stack=[];
 function append(value){(stack.length?stack[stack.length-1].node.children:root).push(value);}
 node.forEach(child=>{
  const marks=child.marks.filter(m=>m.type.name!=='code');
  let same=0;while(same<marks.length&&same<stack.length&&marks[same].eq(stack[same].mark))same++;
  stack.length=same;
  for(let i=same;i<marks.length;i++){
   const mark=marks[i],type={strong:'strong',em:'emphasis',strike:'delete',link:'link'}[mark.type.name];
   if(!type)throw Error('不支持的格式');
   const n={type,children:[]};if(type==='link'){n.url=mark.attrs.href;n.title=mark.attrs.title;}
   append(n);stack.push({mark,node:n});
  }
  if(child.isText)append({type:child.marks.some(m=>m.type.name==='code')?'inlineCode':'text',value:child.text});
  else if(child.type===S.nodes.inlineMath)append({type:'inlineMath',value:child.attrs.value});
  else if(child.type===S.nodes.hardBreak)append({type:'break'});
  else throw Error('不支持的行内元素');
 });
 return root;
}
function serializeBlock(node){
 if(node.type===S.nodes.protected)return node.attrs.raw;
 const n={type:node.type.name,children:toInline(node)};
 if(n.type==='heading')n.depth=node.attrs.level;
 return toMarkdown({type:'root',children:[n]},{extensions:[gfmToMarkdown(),mathToMarkdown()],bullet:'-',emphasis:'*',strong:'*'}).replace(/\n$/,'');
}
function meaningful(doc){const out=[];doc.forEach(n=>{if(n.type!==S.nodes.paragraph||n.content.size)out.push(n);});return out;}
function signature(doc){
 return JSON.stringify(meaningful(doc).map(n=>{
  // ProseMirror's toJSON() shares the node's attrs object. Clone before
  // removing editor-only metadata, or validation mutates the live document.
  const j=JSON.parse(JSON.stringify(n.toJSON()));
  if(j.attrs){delete j.attrs.origin;if(!Object.keys(j.attrs).length)delete j.attrs;}
  const last=j.content?.at(-1);
  if(last?.type==='text'&&!last.marks?.length){last.text=last.text.replace(/[ \t]+$/,'');if(!last.text)j.content.pop();}
  if(j.content?.length===0)delete j.content;
  return j;
 }).filter(n=>n.type!=='paragraph'||n.content?.length));
}
export function serializeRich(doc,context){
 if(doc.eq(context.doc))return context.source;
 const nodes=meaningful(doc),used=new Set();let result='',prev=null;
 if(!nodes.length)return '';
 for(const n of nodes){
  const id=n.attrs.origin,record=Number.isInteger(id)&&!used.has(id)?context.records[id]:null;
  const unchanged=!!record&&n.eq(record.node);
  const raw=unchanged?record.raw:serializeBlock(n);
  if(!raw)continue;
  if(!prev)result+=record&&id===0?record.gap:'';
  else if(record&&prev.record&&id===prev.id+1&&(unchanged&&prev.unchanged||/\n[ \t\r]*\n/.test(record.gap)))result+=record.gap;
  else result+='\n\n';
  result+=raw;if(record)used.add(id);prev={record,id,unchanged};
 }
 if(prev?.record&&prev.id===context.records.length-1)result+=context.tail;
 else if(result&&!result.endsWith('\n'))result+='\n';
 if(signature(readRich(result).doc)!==signature(doc))throw Error('当前修改不能安全转换为 Markdown，请调整格式或撤销后使用源码模式。');
 return result;
}
export function lostProtected(before,after){
 const counts=doc=>{const out=new Map();doc.forEach(n=>{if(n.type===S.nodes.protected)out.set(n.attrs.raw,(out.get(n.attrs.raw)||0)+1);});return out;};
 const next=counts(after);return [...counts(before)].some(([raw,count])=>(next.get(raw)||0)<count);
}
export function detachedBlocks(source){const nodes=[];readRich(source).doc.forEach(n=>nodes.push(n.type.create({...n.attrs,origin:null},n.content,n.marks)));return nodes;}
