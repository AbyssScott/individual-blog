import {Fragment,Slice} from 'prosemirror-model';
import {EditorState} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {baseKeymap,toggleMark,setBlockType,splitBlockKeepMarks} from 'prosemirror-commands';
import {keymap} from 'prosemirror-keymap';
import {history,undo,redo} from 'prosemirror-history';
import katex from 'katex';
import {richSchema as S,readRich,serializeRich,lostProtected,detachedBlocks} from './rich-model.js';
import {renderVisual} from './visual-editor.js';
export function createRichEditor({mount,source,base,onChange,onError,onBlockEdit,onState,onValid,editable=true}){
 const context=readRich(source);let view,disposed=false,enabled=editable,last=source,invalid=false;
 const mark=name=>toggleMark(S.marks[name]);
 function command(name){
  if(!enabled||disposed)return;
  const commands={bold:mark('strong'),italic:mark('em'),strike:mark('strike'),code:mark('code'),paragraph:setBlockType(S.nodes.paragraph),h2:setBlockType(S.nodes.heading,{level:2}),h3:setBlockType(S.nodes.heading,{level:3}),undo,redo};
  if(name==='link'){
   const {from,to,empty}=view.state.selection;
   if(empty){onError('请先选中链接文字。');return;}
   const prior=S.marks.link.isInSet(view.state.doc.resolve(from).marks());
   const url=window.prompt('链接地址（留空删除链接）',prior?.attrs.href||'https://');
   if(url===null)return;
   if(url&&!/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(url)){onError('请输入 HTTP(S)、邮件或站内链接。');return;}
   let tr=view.state.tr.removeMark(from,to,S.marks.link);
   if(url)tr=tr.addMark(from,to,S.marks.link.create({href:url,title:prior?.attrs.title??null}));
   view.dispatch(tr);view.focus();return;
  }
  if(name==='math'){
   const latex=window.prompt('输入行内 LaTeX 公式','x^2');if(!latex?.trim())return;
   view.dispatch(view.state.tr.replaceSelectionWith(S.nodes.inlineMath.create({value:latex.trim()}),false));view.focus();return;
  }
  if(commands[name]){commands[name](view.state,view.dispatch,view);view.focus();}
 }
 function notify(){
  const st=view.state,{from,to,empty}=st.selection,marks=st.storedMarks||st.selection.$from.marks();
  const active={};for(const [k,n] of Object.entries({bold:'strong',italic:'em',strike:'strike',code:'code',link:'link'}))active[k]=empty?!!S.marks[n].isInSet(marks):st.doc.rangeHasMark(from,to,S.marks[n]);
  onState?.(active);
 }
 function synchronize(){
  try{const next=serializeRich(view.state.doc,context);invalid=false;if(next!==last){onChange(next);last=next;}onValid?.();return true;}
  catch(e){invalid=true;onError(e.message);return false;}
 }
 function safeFragment(html){
  const t=document.createElement('template');t.innerHTML=html;
  for(const img of t.content.querySelectorAll('img')){
   let url;try{url=new URL(img.getAttribute('src')||'',location.origin+base);}catch{}
   if(!url||url.origin!==location.origin||!url.pathname.startsWith(base+'images/'))img.removeAttribute('src');else img.src=url.href;
  }
  for(const a of t.content.querySelectorAll('a'))a.removeAttribute('href');
  return t.content;
 }
 function protectedView(node,_view,getPos){
  const dom=document.createElement('div');dom.className='rich-protected';dom.contentEditable='false';
  const label=document.createElement('button');label.type='button';label.className='rich-protected-edit';label.textContent='编辑区块';label.title='编辑保留的 Markdown 区块';
  const content=document.createElement('div');content.className='rich-protected-content';dom.append(content,label);
  const fallback=()=>{const pre=document.createElement('pre');pre.textContent=node.attrs.raw;content.replaceChildren(pre);};
  if(['definition','footnoteDefinition'].includes(node.attrs.kind))fallback();
  else renderVisual(node.attrs.raw).then(html=>{if(disposed)return;const frag=safeFragment(html);if(!frag.textContent?.trim()&&!frag.querySelector('img,hr,svg,table'))fallback();else content.replaceChildren(frag);}).catch(fallback);
  function edit(){if(!enabled||disposed)return;const pos=getPos();if(typeof pos==='number')onBlockEdit({pos,raw:node.attrs.raw,kind:node.attrs.kind});}
  label.addEventListener('click',edit);content.addEventListener('dblclick',edit);
  return {dom,ignoreMutation:()=>true,stopEvent:e=>label.contains(e.target)||e.type==='dblclick'};
 }
 function mathView(node,_view,getPos){
  const dom=document.createElement('span');dom.className='rich-inline-math';dom.contentEditable='false';dom.title='双击编辑 LaTeX';
  katex.render(node.attrs.value,dom,{throwOnError:false,trust:false,displayMode:false});
  dom.addEventListener('dblclick',()=>{
   if(!enabled||disposed)return;const pos=getPos();if(typeof pos!=='number')return;
   const value=window.prompt('编辑 LaTeX',node.attrs.value);
   if(value!==null&&value.trim())view.dispatch(view.state.tr.setNodeMarkup(pos,undefined,{value:value.trim()}));
  });
  return {dom,ignoreMutation:()=>true,stopEvent:e=>e.type==='dblclick'};
 }
 const state=EditorState.create({schema:S,doc:context.doc,plugins:[history(),keymap({'Mod-z':undo,'Mod-Shift-z':redo,'Mod-y':redo,'Mod-b':mark('strong'),'Mod-i':mark('em'),Enter:splitBlockKeepMarks}),keymap(baseKeymap)]});
 view=new EditorView(mount,{
  state,editable:()=>enabled,
  attributes:{class:'rich-document',spellcheck:'false','aria-label':'实验性富文本编辑器'},
  nodeViews:{protected:protectedView,inlineMath:mathView},
  dispatchTransaction(tr){
   if(disposed||(!enabled&&tr.docChanged))return;
   const next=view.state.apply(tr);
   if(tr.docChanged&&!tr.getMeta('explicitProtected')&&lostProtected(view.state.doc,next.doc)&&!confirm('此操作将删除复杂 Markdown 区块。继续？'))return;
   view.updateState(next);if(tr.docChanged)synchronize();notify();
  },
  handlePaste(v,event){
   if(!enabled)return true;const text=event.clipboardData?.getData('text/plain')||'';if(!text)return true;
   const blocks=text.replace(/\r\n?/g,'\n').split('\n').map(line=>S.nodes.paragraph.create(null,line?S.text(line):null));
   const slice=blocks.length===1?new Slice(blocks[0].content,0,0):new Slice(Fragment.fromArray(blocks),1,1);
   v.dispatch(v.state.tr.replaceSelection(slice).scrollIntoView());return true;
  },
  handleDrop(){onError('实验模式暂不支持拖放，请使用 Markdown 模式上传图片。');return true;}
 });
 notify();
 return {
  command,flush:()=>!disposed&&synchronize(),hasInvalid:()=>invalid,
  setEditable(value){enabled=value;if(!disposed)view.setProps({editable:()=>enabled});},
  destroy(){disposed=true;view.destroy();mount.replaceChildren();},
  replaceBlock(pos,raw,replacement){
   if(!enabled||disposed)return false;const n=view.state.doc.nodeAt(pos);
   if(n?.type!==S.nodes.protected||n.attrs.raw!==raw){onError('区块已经变化，请重新打开。');return false;}
   const nodes=replacement.trim()?detachedBlocks(replacement):[];
   if(!nodes.length&&!confirm('删除该区块？'))return false;
   const tr=view.state.tr.replaceWith(pos,pos+n.nodeSize,nodes.length?Fragment.fromArray(nodes):Fragment.empty).setMeta('explicitProtected',true);
   view.dispatch(tr);view.focus();return true;
  }
 };
}
