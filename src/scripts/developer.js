import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import { parse as parseYaml, parseDocument } from 'yaml';
import { renderVisual, replaceVisualText, replaceBlock } from './visual-editor.js';
import { normalizePrefs, clampSplit, scrollFraction, scrollTarget } from './studio-preferences.js';
import { createRichEditor } from './rich-editor.js';
import { encryptBackup, decryptBackup, planRestore, maxBackupBytes } from './draft-backup.js';

const $ = id => document.getElementById(id);
const PREF_KEY='blog-developer-ui-v1';
let prefs=normalizePrefs(null);
try{prefs=normalizePrefs(JSON.parse(localStorage.getItem(PREF_KEY)||'null'));}catch{}
function persistPrefs(){try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs));}catch{}}
const repo = 'AbyssScott/individual-blog';
const branch = 'main';
const root = 'src/content/posts/';
const base = document.querySelector('.dev').dataset.base;
const validPost = /^(zh|en)\/[a-z0-9][a-z0-9-]*\.md$/;
let token = '', key = null, current = '', sha = null, original = '', lastCommit = '', busy = false, draftQueue = Promise.resolve();
let library=[], mode='visual', filter='all', revision=0, previewTimer, stateFilter='all';
const drafts=new Map();let draftIndexError=false;
const metaCache=new Map();
let statusTimer;
const status = (message, error = false) => { clearTimeout(statusTimer); $('status').textContent = message; $('status').dataset.error = String(error); if(!error)statusTimer=setTimeout(()=>{$('status').textContent='';},4500); };
const enc = new TextEncoder();
const dec = new TextDecoder('utf-8', { fatal: true });
function to64(bytes) { let s = ''; for (let i=0;i<bytes.length;i+=8192) s += String.fromCharCode(...bytes.subarray(i,i+8192)); return btoa(s); }
function from64(value) { return Uint8Array.from(atob(value.replace(/\s/g,'')), ch => ch.charCodeAt(0)); }
const filePath = p => p.split('/').map(encodeURIComponent).join('/');
async function api(path, method='GET', body) {
  if (!token) throw Error('请先验证管理员身份。');
  const result = await fetch('https://api.github.com' + path, {
    method, headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? {'Content-Type':'application/json'} : {}) },
    body: body ? JSON.stringify(body) : undefined, cache:'no-store', redirect:'error', credentials:'omit', referrerPolicy:'no-referrer'
  });
  if (!result.ok) {
    if (result.status===409 || result.status===422) throw Error('GitHub 返回冲突或验证错误（'+result.status+'）。请先下载草稿，再重新加载最新版本，避免覆盖其他修改。');
    throw Error('GitHub 请求失败（'+result.status+'）。请核对令牌权限、有效期及网络连接。');
  }
  return result.status===204 ? null : result.json();
}
const repoApi = (path, method, body) => api('/repos/'+repo+path,method,body);
async function readPost(path, ref=branch) {
  if (!validPost.test(path)) throw Error('无效文章路径。');
  const f=await repoApi('/contents/'+filePath(root+path)+'?ref='+encodeURIComponent(ref));
  if (f.type!=='file'||f.encoding!=='base64') throw Error('无法读取此 Markdown 文件。');
  return {text:dec.decode(from64(f.content)),sha:f.sha};
}
function showOptions(el, values, label, value) {
  el.replaceChildren(...values.map(x=>{const o=document.createElement('option');o.value=value(x);o.textContent=label(x);return o;}));
}
async function refreshPosts() {
  const paths=(await Promise.all(['zh','en'].map(lang=>repoApi('/contents/'+root+lang+'?ref='+branch)))).flat()
    .filter(f=>f.type==='file'&&validPost.test(f.path.slice(root.length))).map(f=>f.path.slice(root.length)).sort();
  const data=[];
  for(let i=0;i<paths.length;i+=6) data.push(...await Promise.all(paths.slice(i,i+6).map(async path=>{
    try{const f=await readPost(path);const cached=metaCache.get(path);if(cached?.sha===f.sha)return cached;
      const item={path,sha:f.sha,meta:split(f.text).meta||{}};metaCache.set(path,item);return item;
    }catch{return {path,meta:{}};}
  })));
  library=data.sort((a,b)=>String(b.meta.date||'').localeCompare(String(a.meta.date||''))||a.path.localeCompare(b.path));
  showOptions($('posts'),library,p=>p.meta.title||p.path,p=>p.path);renderLibrary();updateCounterpart();
  if(paths.includes(current)) $('posts').value=current;
  return paths;
}
async function refreshImages() {
  const files=await repoApi('/contents/public/images?ref='+branch);
  showOptions($('images'), files.filter(f=>f.type==='file'&&/^[a-zA-Z0-9][a-zA-Z0-9_.-]*\.(png|jpe?g|webp|gif)$/i.test(f.name)), f=>f.name, f=>f.name);
  updateAssetPreview();
}
const storageKey=p=>'blog-developer-encrypted-draft-v1:'+p;
async function storeDraft(p,text,baselineSha,k=key){
 if(!k)throw Error('请先登录。');
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(p)},k,enc.encode(JSON.stringify({text,baselineSha})));
 localStorage.setItem(storageKey(p),JSON.stringify({iv:to64(iv),data:to64(new Uint8Array(ciphertext))}));
 drafts.set(p,{text,baselineSha});
}
function queueDraft() {
  const p=current, text=$('source').value, k=key, baseline=original, baselineSha=sha;
  if(!p||!k)return draftQueue;
  // Serialize every captured snapshot, including reversions while an earlier save is pending.
  draftQueue=draftQueue.catch(()=>{}).then(async()=>{
    try {
      if(text===baseline&&baselineSha){localStorage.removeItem(storageKey(p));drafts.delete(p);}
      else {
        await storeDraft(p,text,baselineSha,k);
      }
      if(current===p&&$('source').value===text) $('draft-state').textContent=text===baseline&&baselineSha?'无未保存修改':'草稿已加密保存在此浏览器，尚未发布。';
      if(key===k){renderLibrary();updateCounterpart();}return true;
    } catch { if(current===p)$('draft-state').textContent='本地草稿保存失败，请使用“下载草稿”。';return false; }
  });
  return draftQueue;
}
async function ensureSaved(){if(await queueDraft()===false)throw Error('当前草稿尚未成功保存，请先下载草稿再切换。');}
async function loadDraft(p) {
  try {
    const raw=localStorage.getItem(storageKey(p));if(!raw)return null;
    const data=JSON.parse(raw);
    return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(data.iv),additionalData:enc.encode(p)},key,from64(data.data))));
  } catch { status('此路径可能存在用其他令牌加密的草稿，无法解密。',true);return null; }
}
function editView() { destroyRich();activeVisual=null;visualUndo=[];syncFields();setMode(prefs.mode); }
async function setArticle(p,text,blob) {
 const draft=await loadDraft(p),raw=localStorage.getItem(storageKey(p));
 if(raw&&!draft)throw Error('此文章有无法解密的本地草稿。为避免覆盖，暂时不能打开。请使用原令牌恢复。');
 if(draft&&draft.baselineSha!==blob&&draft.text!==text){
  if(!confirm('此草稿基于旧版本。是否下载旧草稿、保留加密备份并打开远程最新版？取消将保留原草稿。'))throw Error('已保留旧草稿，未切换文章。');
  const url=URL.createObjectURL(new Blob([draft.text],{type:'text/markdown;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='recovery-'+p.split('/').pop();a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  localStorage.setItem('blog-developer-recovery-v1:'+p+':'+Date.now(),raw);
  localStorage.removeItem(storageKey(p));drafts.delete(p);
 }
 current=p;sha=blob;original=text;if(blob){prefs.lastPost=p;persistPrefs();}$('source').value=(draft&&draft.baselineSha===blob)?draft.text:text;$('path').textContent=root+p;
 $('remove').disabled=false;$('history-button').disabled=!blob;$('history').hidden=true;editView();
 syncFields();scheduleVisual();$('visual-editor').scrollTop=0;$('body-editor').scrollTop=0;$('body-editor').setSelectionRange(0,0);$('source').scrollTop=0;renderLibrary();updateCounterpart();
 $('draft-state').textContent=(!blob||$('source').value!==original)?'本地草稿，尚未发布。':'无未保存修改';
}
async function openPost(p) {
 if(!validPost.test(p))throw Error('无效文章路径。');
 if(p===current)return;
 await ensureSaved();
 const draft=drafts.get(p);
 if(draft&&!library.some(x=>x.path===p)&&!draft.baselineSha){await setArticle(p,draft.text,null);return;}
 const f=await readPost(p);await setArticle(p,f.text,f.sha);
}
function split(text) {
  const m=/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/.exec(text);
  if(!m)throw Error('需要完整的 YAML frontmatter（---）。');
  return {meta:parseYaml(m[1]),body:m[2]};
}
function validate(text,p) {
  const {meta,body}=split(text);
  if(!meta||typeof meta.title!=='string'||!meta.title.trim()||meta.lang!==p.split('/')[0]||
    typeof meta.translationKey!=='string'||!meta.translationKey.trim()||
    typeof meta.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)||
    Number.isNaN(Date.parse(meta.date))||new Date(meta.date).toISOString().slice(0,10)!==meta.date)
    throw Error('请核对 title、lang、translationKey 和 YYYY-MM-DD 格式的有效日期。');
  if(meta.draft!==undefined&&meta.draft!==false)throw Error('公开仓库中的 draft 文件仍然可见。私人草稿仅保存在浏览器；发布时请设置 draft: false。');
  if(meta.tags!==undefined&&(!Array.isArray(meta.tags)||meta.tags.some(t=>typeof t!=='string')))throw Error('tags 必须是字符串数组。');
  if(meta.description!==undefined&&typeof meta.description!=='string')throw Error('description 必须为字符串。');
  return {meta,body};
}
const schema={...defaultSchema,attributes:{...defaultSchema.attributes,code:[...(defaultSchema.attributes.code||[]),['className','math-inline','math-display','language-math']]}};
const renderer=unified().use(remarkParse).use(remarkGfm).use(remarkMath).use(remarkRehype).use(rehypeSanitize,schema).use(rehypeKatex,{trust:false}).use(rehypeStringify);
async function preview() {
  if(!current)return;
  const id=++revision,p=current;
  const {meta,body}=split($('source').value);
  const h=document.createElement('h1');h.textContent=String(meta?.title||'');
  const template=document.createElement('template');template.innerHTML=await renderVisual(body);const content=document.createElement('div');content.append(template.content);
  // Do not load third-party images or permit navigation from a preview.
  for(const img of content.querySelectorAll('img')) {
    const src=img.getAttribute('src')||'';
    let url;try{url=new URL(src,location.origin+base);}catch{}
    if(!url||url.origin!==location.origin||!url.pathname.startsWith(base+'images/'))img.removeAttribute('src');
    else img.src=url.href;
  }
  for(const link of content.querySelectorAll('a')) link.removeAttribute('href');
  if(id===revision&&p===current&&mode==='split')$('preview').replaceChildren(h,content);
}
async function publish() {
  if(!current)throw Error('请先打开或新建文章。');
  const p=current,text=$('source').value;
  const {meta}=validate(text,p);
  if(text===original&&sha)throw Error('没有需要发布的修改。');
  if(!confirm('将文章公开发布到博客，并自动触发 GitHub Pages 构建？'))return;
  const others=(await refreshPosts()).filter(x=>x!==p&&x.split('/')[0]===meta.lang);
  for(const other of others) {
    const f=await readPost(other);
    if(split(f.text).meta.translationKey===meta.translationKey)throw Error('同一语言中 translationKey 已被 '+other+' 使用。');
  }
  const result=await repoApi('/contents/'+filePath(root+p),'PUT',{message:'Update blog post: '+p,content:to64(enc.encode(text)),branch,...(sha?{sha}:{})});
  sha=result.content.sha;original=text;lastCommit=result.commit.sha;prefs.lastPost=p;persistPrefs();trackDeployment(lastCommit);
  await queueDraft();$('remove').disabled=false;$('history-button').disabled=false;$('check').disabled=false;
  status('文章已提交，GitHub Pages 尚需完成构建。Commit: '+lastCommit.slice(0,7));
  await refreshPosts();updateCounterpart();
}
async function newPost() {
 await ensureSaved();
 openNewDialog();
}
async function removePost() {
  if(!current)return;const p=current;
  if(!sha){if(!confirm('永久删除这篇本地草稿？'))return;await draftQueue;localStorage.removeItem(storageKey(p));drafts.delete(p);current='';original='';$('source').value='';$('path').textContent='';editView();renderLibrary();status('本地草稿已删除。');return;}
  if(prompt('删除会从博客移除文章，但历史记录仍公开。请输入完整路径 '+p+' 确认。')!==p)return;
  const result=await repoApi('/contents/'+filePath(root+p),'DELETE',{message:'Remove blog post: '+p,sha,branch});
  lastCommit=result.commit.sha;$('check').disabled=false;trackDeployment(lastCommit);
  await draftQueue;try{localStorage.removeItem(storageKey(p));}catch{}drafts.delete(p);current='';sha=null;original='';$('source').value='';$('path').textContent='';$('history').hidden=true;editView();$('remove').disabled=true;$('history-button').disabled=true;
  syncFields();status('删除已提交，等待网站构建。');await refreshPosts();
}
async function history() {
  if(!sha||!current)return;
  const commits=await repoApi('/commits?sha='+branch+'&per_page=30&path='+encodeURIComponent(root+current));
  showOptions($('versions'),commits,c=>c.sha.slice(0,7)+' · '+c.commit.author.date.slice(0,10)+' · '+c.commit.message.split('\n')[0],c=>c.sha);
  $('history').hidden=false;
}
async function restore() {
  const ref=$('versions').value;if(!ref||!current)return;
  if(!confirm('将所选历史版本载入编辑器？当前版本会被替换，但不会立即发布。'))return;
  const f=await readPost(current,ref);$('source').value=f.text;editView();await queueDraft();status('已载入历史版本，请检查后手动发布。');
}
function insertImage(name) {
  if(!current)throw Error('请先打开一篇文章。');
  if(!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*\.(png|jpe?g|webp|gif)$/i.test(name))throw Error('图片名称无效。');
  if(mode==='rich'&&rich){if(!rich.insertImage(base+'images/'+encodeURIComponent(name)))throw Error('图片已存在于编辑器，但 Markdown 转换尚未完成。');return;}
  setMode('body');const source=$('body-editor');
  source.setRangeText('\n![图片]('+base+'images/'+encodeURIComponent(name)+')\n',source.selectionStart,source.selectionEnd,'end');
  source.focus();bodyChanged();
}
async function upload(selectedFile) {
  if(!current)throw Error('请先打开文章。');
  const file=selectedFile||$('image-file').files[0];
  if(!file||!/^image\/(png|jpeg|webp|gif)$/.test(file.type)||file.size>5*1024*1024)throw Error('请选择不超过 5 MB 的 PNG、JPEG、WebP 或 GIF 文件。');
  const ext={ 'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'}[file.type];
  const bytes=new Uint8Array(await file.arrayBuffer());
  const signatures={png:[137,80,78,71,13,10,26,10],jpg:[255,216,255],gif:[71,73,70,56],webp:[82,73,70,70]};
  if(!signatures[ext].every((b,i)=>bytes[i]===b)||(ext==='webp'&&String.fromCharCode(...bytes.slice(8,12))!=='WEBP'))throw Error('文件签名与图片类型不符。');
  if(!confirm('图片将立即进入公开 GitHub 仓库，是否继续？'))return;
  const name=crypto.randomUUID()+'.'+ext;
  await repoApi('/contents/public/images/'+name,'PUT',{message:'Upload blog image '+name,content:to64(bytes),branch});
  insertImage(name);await refreshImages();$('image-file').value='';status('图片已提交，网站构建后可见。');
}
let deployTimer,deployGeneration=0;
function setDeployment(text,state='pending'){const el=$('deploy-state');el.hidden=!text;el.textContent=text;el.dataset.state=state;}
function stopDeployment(){clearTimeout(deployTimer);deployGeneration++;setDeployment('');}
async function deploymentResult(commit){
 const data=await repoApi('/actions/workflows/deploy.yml/runs?head_sha='+encodeURIComponent(commit)+'&per_page=5');
 const run=data.workflow_runs?.[0];
 if(!run)return {text:'等待部署任务',state:'pending'};
 if(run.status!=='completed')return {text:'网站部署中…',state:'pending'};
 return run.conclusion==='success'?{text:'发布完成',state:'success'}:{text:'部署未成功：'+String(run.conclusion||'未知结果'),state:'error'};
}
function trackDeployment(commit){
 stopDeployment();const generation=deployGeneration;let attempts=0;
 setDeployment('已提交 · 等待部署');
 async function poll(){
  if(!token||generation!==deployGeneration||lastCommit!==commit)return;
  let result;
  try{result=await deploymentResult(commit);}catch{result={text:'暂时无法查询部署，可手动检查',state:'error'};}
  if(!token||generation!==deployGeneration||lastCommit!==commit)return;
  setDeployment(result.text,result.state);
  if(result.state==='pending'&&++attempts<36)deployTimer=setTimeout(poll,10000);
  else if(result.state==='pending')setDeployment('尚未确认部署 · 请手动检查');
 }
 deployTimer=setTimeout(poll,2500);
}
async function checkStatus(){
 if(!lastCommit)return;
 const commit=lastCommit,result=await deploymentResult(commit);
 if(commit===lastCommit)setDeployment(result.text,result.state);
 status(result.text,result.state==='error');
}
async function login() {
  token=$('token').value.trim();$('token').value='';
  if(!token.startsWith('github_pat_')){token='';throw Error('请使用 fine-grained personal access token。');}
  try {
    const account=await api('/user');
    if(account.id!==203394363||account.login.toLowerCase()!=='abyssscott')throw Error('不是博客所有者账号。');
    const repository=await repoApi('');
    if(repository.full_name.toLowerCase()!==repo.toLowerCase())throw Error('仓库验证失败。');
    key=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',enc.encode(token)),{name:'AES-GCM'},false,['encrypt','decrypt']);
    const posts=await refreshPosts();await refreshImages();await readDraftIndex();
    $('identity').textContent='已验证：'+account.login;
    $('login').hidden=true;$('workspace').hidden=false;
    const initial=new URLSearchParams(location.search).get('post')||prefs.lastPost;
    try {if(initial&&(posts.includes(initial)||drafts.has(initial)))await openPost(initial);
    else if(posts.length)await openPost(posts[0]);
    else if(drafts.size)await openPost(drafts.keys().next().value);
    else { $('remove').disabled=true;$('history-button').disabled=true; }}catch(e){status(e.message,true);return;}
    if(!draftIndexError)status('已连接 GitHub。保存时由 GitHub 强制执行仓库写入权限。');
  } catch(error) {token='';key=null;$('login').hidden=false;$('workspace').hidden=true;throw error;}
}
async function logout() {
  await ensureSaved();destroyRich();stopDeployment();drafts.clear();$('post-list').replaceChildren();$('posts').replaceChildren();$('body-editor').value='';for(const id of metaIds)$(id).value='';$('tag-chips').replaceChildren();activeVisual=null;visualUndo=[];clearTimeout(visualTimer);$('visual-editor').replaceChildren();token='';key=null;current='';sha=null;original='';lastCommit='';$('source').value='';$('token').value='';$('preview').replaceChildren();$('path').textContent='';$('history').hidden=true;$('check').disabled=true;$('workspace').hidden=true;$('login').hidden=false;status('已退出，令牌已从页面内存清除。');
}
function action(id,fn) {
  $(id).addEventListener('click',async()=>{
    if(busy||!finishVisual()||!finishRich())return;busy=true;const control=$(id);control.disabled=true;lockFields(true);
    try{await fn();}catch(e){status(e instanceof Error?e.message:'操作失败。',true);}
    finally{busy=false;lockFields(false);control.disabled=id==='check'?!lastCommit:id==='remove'?!current:id==='history-button'?!sha:false;}
  });
}
action('connect',login);action('logout',logout);action('open',()=>openPost($('posts').value));action('new',newPost);
action('rich-mode',()=>chooseMode('rich'));action('visual-mode',()=>chooseMode('visual'));action('edit',()=>chooseMode('body'));action('split-mode',()=>chooseMode('split'));action('raw-mode',()=>chooseMode('raw'));action('publish',publish);action('remove',removePost);action('history-button',history);action('restore',restore);
action('upload',upload);action('insert-image',()=>insertImage($('images').value));action('check',checkStatus);
action('backup-open',async()=>{await ensureSaved();openBackup();});
action('save-draft',async()=>{if(!current)throw Error('请先打开或新建文章。');if(await queueDraft()===false)throw Error('草稿保存失败，请下载草稿。');status('本地草稿已保存，未公开发布。');});
action('download',()=>{
  if(!current)throw Error('请先打开文章。');
  const url=URL.createObjectURL(new Blob([$('source').value],{type:'text/markdown;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=current.split('/').pop();a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('source').addEventListener('input',()=>{syncFields();queueDraft();schedulePreview();});
window.addEventListener('pagehide',()=>{stopDeployment();token='';key=null;});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});

const metaIds=['meta-title','meta-description','meta-date','meta-tags','meta-key'];
const keys=['title','description','date','tags','translationKey'];
function lockFields(value){for(const id of ['source','body-editor',...metaIds,'tag-input'])$(id).readOnly=value;rich?.setEditable(!value);}
function parts(){const m=/^(---[ \t]*\r?\n)([\s\S]*?)(\r?\n---[ \t]*(?:\r?\n|$))([\s\S]*)$/.exec($('source').value);if(!m)throw Error('完整源码中的 YAML 格式无效。');return m;}
function visibleEntries(){
 const all=new Map(library.map(item=>[item.path,{...item,published:true}]));
 for(const [path,draft] of drafts){let meta={};try{meta=split(draft.text).meta||{};}catch{}
 const old=all.get(path);all.set(path,{...old,path,meta:{...old?.meta,...meta},published:!!old,draft:true});}
 return [...all.values()].sort((a,b)=>String(b.meta.date||'').localeCompare(String(a.meta.date||''))||a.path.localeCompare(b.path));
}
function renderLibrary(){
 const el=$('post-list'),q=$('search-post').value.trim().toLowerCase();el.replaceChildren();
 const all=visibleEntries();
 const order=$('sort-posts').value;
 if(order==='old')all.sort((a,b)=>String(a.meta.date||'').localeCompare(String(b.meta.date||''))||a.path.localeCompare(b.path));
 if(order==='title')all.sort((a,b)=>String(a.meta.title||a.path).localeCompare(String(b.meta.title||b.path)));
 showOptions($('posts'),all,x=>x.meta.title||x.path,x=>x.path);if(current)$('posts').value=current;
 for(const lang of ['zh','en']){
  if(filter!=='all'&&filter!==lang)continue;
  const rows=all.filter(x=>x.path.startsWith(lang+'/')&&(stateFilter==='all'||(stateFilter==='draft'?x.draft:x.published))&&String((x.meta.title||'')+' '+x.path+' '+(Array.isArray(x.meta.tags)?x.meta.tags.join(' '):'')).toLowerCase().includes(q));
  if(!rows.length)continue;
  const group=document.createElement('span');group.className='group';group.textContent=lang==='zh'?'中文文章':'English articles';el.append(group);
  for(const item of rows){
   const btn=document.createElement('button');btn.type='button';btn.textContent=String(item.meta.title||item.path);btn.setAttribute('aria-current',String(item.path===current));
   const sub=document.createElement('small');const pair=all.find(x=>x.path!==item.path&&x.path.split('/')[0]!==lang&&x.meta.translationKey&&x.meta.translationKey===item.meta.translationKey);
   sub.textContent=[item.meta.date||'',pair?(pair.published?'中 / EN':'译文草稿'):(lang==='zh'?'仅中文':'EN only')].filter(Boolean).join(' · ');
   if(item.draft){const label=document.createElement('span');label.className='draft-indicator';label.textContent=item.published?' · 未发布修改':' · 草稿';sub.append(label);}
   btn.append(sub);btn.addEventListener('click',()=>{if(busy)return;$('posts').value=item.path;$('open').click();});el.append(btn);
  }
 }
 if(!el.children.length){const empty=document.createElement('p');empty.className='empty-list';empty.textContent='没有匹配的文章';el.append(empty);}
}
function updateCounterpart(){
 let match=null,meta=null;try{meta=split($('source').value).meta;match=visibleEntries().find(x=>x.path!==current&&x.path.split('/')[0]!==meta.lang&&x.meta.translationKey===meta.translationKey);}catch{}
 $('counterpart').disabled=!current||!meta;$('counterpart').dataset.path=match?.path||'';
 $('counterpart').textContent=match?(match.published?'打开另一语言版本':'打开译文草稿'):(meta?.lang==='zh'?'新建英文译文':'新建中文译文');
 const view=$('view-post');view.hidden=!current||!sha;if(current&&sha)view.href=base+current.replace(/^([^/]+)\/(.+)\.md$/,'$1/posts/$2/');
}
function updateCount(){const v=$('body-editor').value;$('word-count').textContent=v.length.toLocaleString()+' 字符 · '+(v.trim()?v.trim().split(/\s+/).length:0)+' 空格分词';}
function syncFields(){
 if(!current){$('body-editor').value='';for(const id of metaIds)$(id).value='';$('article-title').textContent='选择文章';$('language').textContent='文章编辑';updateCount();updateCounterpart();return;}
 try{const {meta,body}=split($('source').value);$('body-editor').value=body;
 const values=[meta.title,meta.description,meta.date,Array.isArray(meta.tags)?meta.tags.join(', '):'',meta.translationKey];
 metaIds.forEach((id,i)=>{$(id).value=String(values[i]??'');});
 $('article-title').textContent=String(meta.title||'未命名文章');$('language').textContent=meta.lang==='zh'?'中文文章':'English article';$('meta-notice').textContent='属性修改只影响当前语言版本。';updateCounterpart();updateCount();renderTags();
 }catch{$('meta-notice').textContent='源码中的 YAML 无效，请在完整源码模式修复。';}
}
function schedulePreview(){clearTimeout(previewTimer);revision++;scheduleVisual();if(mode==='split'){previewTimer=setTimeout(()=>preview().catch(e=>status(e.message,true)),200);}}
function chooseMode(next){setMode(next);prefs.mode=mode==='visual'?'rich':mode;persistPrefs();}
function setMode(next){
 if(mode==='rich'&&next!=='rich')destroyRich();
 if(next!=='raw'&&current){try{split($('source').value);}catch(e){status(e.message,true);next='raw';}}
 if(mode==='raw'&&next!=='raw')syncFields();if(mode!==next&&next==='visual')visualUndo=[];mode=next;revision++;
 $('editor-grid').dataset.mode=mode;$('rich-editor').hidden=mode!=='rich';$('rich-tools').hidden=mode!=='rich';$('visual-editor').hidden=mode!=='visual';$('visual-tools').hidden=mode!=='visual';$('source').hidden=mode!=='raw';$('body-editor').hidden=!(mode==='body'||mode==='split');$('preview').hidden=mode!=='split';$('split-divider').hidden=mode!=='split';$('sync-scroll').hidden=mode!=='split';$('format-bar').hidden=mode==='raw'||mode==='visual'||mode==='rich';
 for(const [id,m] of [['visual-mode','visual'],['rich-mode','rich'],['edit','body'],['split-mode','split'],['raw-mode','raw']])$(id).setAttribute('aria-pressed',String(mode===m));
 for(const id of metaIds)$(id).disabled=mode==='raw';$('tag-input').disabled=mode==='raw';$('tag-add').disabled=mode==='raw';renderTags();
 if(mode==='rich')mountRich();
 schedulePreview();
}
function bodyChanged(){
 if(!current)return;
 try{const m=parts();$('source').value=m[1]+m[2]+m[3]+$('body-editor').value;updateCount();queueDraft();schedulePreview();}catch(e){status(e.message,true);setMode('raw');}
}
$('body-editor').addEventListener('input',bodyChanged);
for(let i=0;i<metaIds.length;i++)$(metaIds[i]).addEventListener('change',()=>{
 if(!current||busy||mode==='raw'||!finishRich())return;
 try{const m=parts(),doc=parseDocument(m[2]);if(doc.errors.length)throw Error('YAML 无效。');const v=$(metaIds[i]).value;doc.set(keys[i],i===3?v.split(/[,，]/).map(x=>x.trim()).filter(Boolean):v);
 $('source').value=m[1]+String(doc).replace(/\n$/,'')+m[3]+m[4];syncFields();queueDraft();schedulePreview();
 }catch(e){status(e.message,true);}
});
$('search-post').addEventListener('input',renderLibrary);
for(const b of document.querySelectorAll('[data-filter]'))b.addEventListener('click',()=>{filter=b.dataset.filter;for(const x of document.querySelectorAll('[data-filter]'))x.setAttribute('aria-pressed',String(x===b));renderLibrary();});
$('counterpart').addEventListener('click',()=>{if(busy||!current||!finishVisual()||!finishRich())return;const path=$('counterpart').dataset.path;if(path){$('posts').value=path;$('open').click();}else{const m=split($('source').value).meta;openNewDialog({lang:m.lang==='zh'?'en':'zh',key:m.translationKey,slug:current.split('/')[1].slice(0,-3)});}});
const formats={h2:['\n## ','\n'],h3:['\n### ','\n'],bold:['**','**'],italic:['*','*'],quote:['\n> ','\n'],list:['\n- ','\n'],link:['[','](https://example.com)'],math:['$','$'],blockmath:['\n$$\n','\n$$\n'],code:['\n\`\`\`\n','\n\`\`\`\n'],footnote:['','[^note]\n\n[^note]: 注释内容\n']};
for(const b of document.querySelectorAll('[data-format]'))b.addEventListener('click',()=>{if(busy||!current)return;const [a,z]=formats[b.dataset.format],el=$('body-editor'),s=el.selectionStart,e=el.selectionEnd;el.setRangeText(a+el.value.slice(s,e)+z,s,e,'end');el.focus();bodyChanged();});
$('pick-image').addEventListener('click',()=>{$('image-details').open=true;$('image-file').click();});
async function uploadFromEvent(file){if(busy||!current)return;busy=true;lockFields(true);try{await upload(file);}catch(e){status(e.message,true);}finally{busy=false;lockFields(false);}}
for(const type of ['paste','drop'])$('body-editor').addEventListener(type,e=>{const data=type==='paste'?e.clipboardData:e.dataTransfer;const file=Array.from(data?.files||[]).find(f=>f.type.startsWith('image/'));if(file){e.preventDefault();uploadFromEvent(file);}});
$('body-editor').addEventListener('dragover',e=>{if(Array.from(e.dataTransfer?.types||[]).includes('Files'))e.preventDefault();});
try{document.documentElement.dataset.theme=localStorage.getItem('blog-theme')==='dark'?'dark':'light';}catch{}
$('theme').addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('blog-theme',theme);}catch{}});

const layout=document.querySelector('.studio-layout');
function togglePanel(panel,hide){layout.classList.toggle('hide-'+panel,hide);prefs[panel==='details'?'hideDetails':'hideLibrary']=hide;persistPrefs();if(panel==='details')$('toggle-details').setAttribute('aria-pressed',String(!hide));if(panel==='library')$('toggle-library').setAttribute('aria-pressed',String(!hide));}
$('toggle-details').addEventListener('click',()=>togglePanel('details',!layout.classList.contains('hide-details')));
$('close-details').addEventListener('click',()=>togglePanel('details',true));
$('toggle-library').addEventListener('click',()=>togglePanel('library',!layout.classList.contains('hide-library')));
togglePanel('details',prefs.hideDetails);togglePanel('library',prefs.hideLibrary);

let activeVisual=null,visualUndo=[],visualTimer,visualRevision=0,blockContext=null,renderedBody=null,renderedPath=null;
function scheduleVisual(){
 clearTimeout(visualTimer);visualRevision++;
 if(mode==='visual'&&!activeVisual)visualTimer=setTimeout(()=>drawVisual().catch(e=>status(e.message,true)),60);
}
function applyVisualBody(next,record=true){
 const previous=$('body-editor').value;
 if(next===previous)return;
 if(record){visualUndo.push(previous);if(visualUndo.length>50)visualUndo.shift();}
 $('body-editor').value=next;bodyChanged();$('visual-undo').disabled=!visualUndo.length;
}
async function drawVisual(){
 if(mode!=='visual'||activeVisual)return;
 const id=++visualRevision,p=current,body=$('body-editor').value;
 const output=$('visual-editor');
 if(!p){output.replaceChildren();return;}
 const html=await renderVisual(body);
 if(id!==visualRevision||p!==current||body!==$('body-editor').value||mode!=='visual'||activeVisual)return;
 // Parse in an inert template before attaching. Only allow known same-origin images.
 const template=document.createElement('template');template.innerHTML=html;
 for(const img of template.content.querySelectorAll('img')){
  let url;try{url=new URL(img.getAttribute('src')||'',location.origin+base);}catch{}
  if(!url||url.origin!==location.origin||!url.pathname.startsWith(base+'images/'))img.removeAttribute('src');
 }
 for(const link of template.content.querySelectorAll('a'))link.removeAttribute('href');
 for(const block of template.content.querySelectorAll('[data-block-start][data-block-end]')){
  const b=document.createElement('button');b.type='button';b.className='block-edit';b.textContent='✎';b.title='编辑本段源码';b.setAttribute('aria-label','编辑本段源码');block.append(b);
 }
 const top=output.scrollTop;output.replaceChildren(template.content);output.scrollTop=top;renderedBody=body;renderedPath=p;
 $('visual-undo').disabled=!visualUndo.length;
 if(!body.trim()){const hint=document.createElement('p');hint.className='muted';hint.textContent='点击「＋ 段落」开始写作。';output.append(hint);}
}
function finishVisual(cancel=false){
 if(!activeVisual)return true;
 const {el,start,end,body,originalText}=activeVisual;
 if(!cancel){
  const value=el.textContent||'';
  const next=body===$('body-editor').value?replaceVisualText(body,start,end,value):null;
  if(next===null){status('这次修改会改变 Markdown 结构，尚未保存。可取消后点击段落右侧的铅笔，在局部源码中修改。',true);return false;}
  activeVisual=null;el.contentEditable='false';$('visual-cancel').hidden=true;applyVisualBody(next);
 }else{activeVisual=null;el.textContent=originalText;el.contentEditable='false';$('visual-cancel').hidden=true;}
 scheduleVisual();return true;
}
function beginVisual(el,event){
 if(busy||!current||mode!=='visual'||activeVisual?.el===el)return;
 if(!finishVisual())return;
 if(renderedPath!==current||renderedBody!==$('body-editor').value){scheduleVisual();return;}
 const start=Number(el.dataset.editStart),end=Number(el.dataset.editEnd),body=$('body-editor').value;
 const originalText=el.textContent||'';
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>body.length||end<=start)return;
 const sel=window.getSelection();const offset=sel?.anchorNode===el.firstChild?sel.anchorOffset:originalText.length;
 activeVisual={el,start,end,body,originalText};el.contentEditable='plaintext-only';el.spellcheck=false;el.focus();
 try{const r=document.createRange();r.setStart(el.firstChild,Math.min(offset,originalText.length));r.collapse(true);sel.removeAllRanges();sel.addRange(r);}catch{}
 $('visual-cancel').hidden=false;
 el.addEventListener('blur',()=>{if(activeVisual?.el===el)finishVisual();},{once:true});
}
$('visual-editor').addEventListener('click',event=>{
 if(busy||!current)return;
 const element=event.target instanceof Element?event.target:null;
 const b=element?.closest('.block-edit');
 if(b){if(!finishVisual())return;if(renderedPath!==current||renderedBody!==$('body-editor').value){scheduleVisual();return;}const block=b.closest('[data-block-start]');openBlock(Number(block.dataset.blockStart),Number(block.dataset.blockEnd));return;}
 const el=element?.closest('[data-edit-start][data-edit-end]');
 if(el)beginVisual(el,event);
});
$('visual-editor').addEventListener('keydown',e=>{
 if(!activeVisual)return;
 if(e.key==='Escape'){e.preventDefault();finishVisual(true);}
 if(e.key==='Enter'&&!e.isComposing){e.preventDefault();finishVisual();}
});
$('visual-editor').addEventListener('paste',e=>{
 if(!activeVisual)return;e.preventDefault();
 const text=e.clipboardData?.getData('text/plain')||'';
 if(/[\r\n]/.test(text)){status('多行内容请使用「＋ 段落」或局部源码编辑。',true);return;}
 document.execCommand('insertText',false,text);
});
$('visual-editor').addEventListener('drop',e=>{e.preventDefault();});
$('visual-cancel').addEventListener('mousedown',e=>e.preventDefault());
$('visual-cancel').addEventListener('click',()=>finishVisual(true));
function openBlock(start,end,initial){
 if(!current||busy||!finishVisual())return;
 const body=$('body-editor').value;
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>body.length)return;
 blockContext={start,end,body,path:current};for(const id of ['block-delete','block-before','block-after'])$(id).hidden=start===end;
 $('block-source').value=initial??body.slice(start,end);
 $('block-dialog').showModal();$('block-source').focus();
}
$('visual-add').addEventListener('click',()=>{if(!finishVisual())return;const body=$('body-editor').value;openBlock(body.length,body.length,(body&&!body.endsWith('\n\n')?(body.endsWith('\n')?'\n':'\n\n'):'')+'');});
for(const id of ['block-cancel','block-dismiss'])$(id).addEventListener('click',()=>$('block-dialog').close());
$('block-dialog').addEventListener('close',()=>{blockContext=null;});
$('block-apply').addEventListener('click',()=>{
 if(!blockContext||busy||blockContext.path!==current||blockContext.body!==$('body-editor').value){status('原文已变化，请重新打开段落。',true);return;}
 const {body,start,end}=blockContext;applyVisualBody(replaceBlock(body,start,end,$('block-source').value));$('block-dialog').close();
});
$('visual-undo').addEventListener('click',()=>{if(busy||!finishVisual()||!visualUndo.length)return;applyVisualBody(visualUndo.pop(),false);$('visual-undo').disabled=!visualUndo.length;});
function tagValues(){try{const t=split($('source').value).meta.tags;return Array.isArray(t)?t:[];}catch{return [];}}
function renderTags(){
 const chips=$('tag-chips');chips.replaceChildren();
 for(const tag of tagValues()){const button=document.createElement('button');button.type='button';button.textContent=tag+' ×';button.disabled=mode==='raw';button.setAttribute('aria-label','移除标签 '+tag);button.addEventListener('click',()=>changeTags(tagValues().filter(t=>t!==tag)));chips.append(button);}
}
function changeTags(values){if(busy||!current||mode==='raw'||!finishVisual()||!finishRich())return;$('meta-tags').value=values.join(', ');$('meta-tags').dispatchEvent(new Event('change'));renderTags();}
function addTag(){const t=$('tag-input').value.trim();if(t&&!/[,，]/.test(t)){changeTags([...new Set([...tagValues(),t])]);$('tag-input').value='';}}
$('tag-add').addEventListener('click',addTag);
$('tag-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addTag();}});

window.addEventListener('beforeunload',event=>{if(rich?.hasInvalid()){event.preventDefault();event.returnValue='';return;}if(activeVisual&&activeVisual.el.textContent!==activeVisual.originalText){event.preventDefault();event.returnValue='';return;}if(current&&$('source').value!==original&&drafts.get(current)?.text!==$('source').value){event.preventDefault();event.returnValue='';}});

async function readDraftIndex(){
 drafts.clear();draftIndexError=false;
 try{
 const prefix=storageKey('');
 for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k?.startsWith(prefix))continue;const p=k.slice(prefix.length);if(!validPost.test(p))continue;const d=await loadDraft(p);if(d&&typeof d.text==='string')drafts.set(p,d);else draftIndexError=true;}
 }catch{draftIndexError=true;}
 renderLibrary();if(draftIndexError)status('部分本地草稿无法读取，请检查令牌或浏览器存储。',true);
}
for(const b of document.querySelectorAll('[data-state]'))b.addEventListener('click',()=>{stateFilter=b.dataset.state;for(const x of document.querySelectorAll('[data-state]'))x.setAttribute('aria-pressed',String(x===b));renderLibrary();});
let translationContext=null,slugManual=false;
function makeSlug(title){
 const slug=title.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70).replace(/-$/,'');
 return slug||'post-'+crypto.randomUUID().slice(0,8);
}
function openNewDialog(context=null){
 translationContext=context;slugManual=!!context;$('new-error').textContent='';
 $('new-heading').textContent=context?'新建对应译文':'新建文章';$('new-title').value='';$('new-lang').value=context?.lang||'zh';$('new-lang').disabled=!!context;$('new-slug').value=context?.slug||'';
 $('new-dialog').showModal();$('new-title').focus();
}
$('new-title').addEventListener('input',()=>{if(!slugManual)$('new-slug').value=makeSlug($('new-title').value);});
$('new-slug').addEventListener('input',()=>{slugManual=true;});
for(const id of ['new-close','new-cancel'])$(id).addEventListener('click',()=>$('new-dialog').close());
$('new-confirm').addEventListener('click',async()=>{
 if(busy)return;busy=true;lockFields(true);
 try{
 const title=$('new-title').value.trim(),lang=$('new-lang').value,slug=$('new-slug').value.trim(),p=lang+'/'+slug+'.md';
 if(!title||!validPost.test(p))throw Error('请输入标题和有效的英文网址标识。');
 if(visibleEntries().some(x=>x.path===p)||localStorage.getItem(storageKey(p)))throw Error('此网址已存在或有加密草稿，请更换标识。');
 const translationKey=translationContext?.key||slug;
 if(visibleEntries().some(x=>x.path.startsWith(lang+'/')&&x.meta.translationKey===translationKey))throw Error('该语言已有相同关联键的文章。');
 const now=new Date(),today=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
 const template='---\ntitle: '+JSON.stringify(title)+'\ndate: '+today+'\nlang: '+lang+'\ntranslationKey: '+JSON.stringify(translationKey)+'\ntags: []\ndraft: false\n---\n\n';
 await ensureSaved();await setArticle(p,template,null);if(await queueDraft()===false)throw Error('草稿未能写入浏览器，请先下载草稿。');stateFilter='draft';filter='all';
 for(const b of document.querySelectorAll('[data-state]'))b.setAttribute('aria-pressed',String(b.dataset.state===stateFilter));
 for(const b of document.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b.dataset.filter===filter));
 renderLibrary();$('new-dialog').close();status('已创建本地草稿，尚未公开。');
 }catch(e){$('new-error').textContent=e.message;status(e.message,true);}finally{busy=false;lockFields(false);}
});
$('block-delete').addEventListener('click',()=>{if(!blockContext||busy||blockContext.path!==current||blockContext.body!==$('body-editor').value)return;if(!confirm('删除这一段？可以撤销。'))return;const {body,start,end}=blockContext;applyVisualBody(replaceBlock(body,start,end,''));$('block-dialog').close();});
for(const [id,side] of [['block-before','before'],['block-after','after']])$(id).addEventListener('click',()=>{
 if(!blockContext||busy||blockContext.path!==current||blockContext.body!==$('body-editor').value)return;
 const {body,start,end}=blockContext;if($('block-source').value!==body.slice(start,end)&&!confirm('放弃本段尚未应用的修改？'))return;
 const pos=side==='before'?start:end;
 blockContext={...blockContext,start:pos,end:pos};$('block-source').value=side==='before'?'新段落\n\n':'\n\n新段落';
 for(const id of ['block-delete','block-before','block-after'])$(id).hidden=true;
 $('block-source').focus();$('block-source').select();
});

for(const b of document.querySelectorAll('[data-block-format]'))b.addEventListener('click',()=>{
 const format=formats[b.dataset.blockFormat],el=$('block-source');if(!format||!blockContext)return;
 const [a,z]=format,start=el.selectionStart,end=el.selectionEnd;
 el.setRangeText(a+el.value.slice(start,end)+z,start,end,'end');el.focus();
});

const grid=$('editor-grid'),divider=$('split-divider'),sourcePane=$('body-editor'),previewPane=$('preview');
function updateSplit(value){
 prefs.split=clampSplit(value);
 grid.style.setProperty('--split-left',prefs.split+'%');
 divider.setAttribute('aria-valuenow',String(prefs.split));
}
updateSplit(prefs.split);
divider.addEventListener('pointerdown',event=>{
 if(event.button!==0||mode!=='split')return;
 event.preventDefault();divider.setPointerCapture(event.pointerId);divider.classList.add('dragging');
});
divider.addEventListener('pointermove',event=>{
 if(!divider.hasPointerCapture(event.pointerId))return;
 const rect=grid.getBoundingClientRect();if(rect.width>0)updateSplit(100*(event.clientX-rect.left)/rect.width);
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])divider.addEventListener(type,()=>{divider.classList.remove('dragging');persistPrefs();});
divider.addEventListener('keydown',event=>{
 const shifts={ArrowLeft:-2,ArrowRight:2,Home:25-prefs.split,End:75-prefs.split};
 if(!Object.prototype.hasOwnProperty.call(shifts,event.key))return;
 event.preventDefault();updateSplit(prefs.split+shifts[event.key]);persistPrefs();
});
$('sync-scroll').setAttribute('aria-pressed',String(prefs.syncScroll));
let scrollLock=null,scrollUnlock;
function syncPanes(from,to){
 if(mode!=='split'||!prefs.syncScroll||scrollLock===from||matchMedia('(max-width:820px)').matches)return;
 const y=scrollTarget(scrollFraction(from.scrollTop,from.scrollHeight,from.clientHeight),to.scrollHeight,to.clientHeight);
 if(Math.abs(to.scrollTop-y)<2)return;
 scrollLock=to;clearTimeout(scrollUnlock);to.scrollTop=y;scrollUnlock=setTimeout(()=>{scrollLock=null;},100);
}
sourcePane.addEventListener('scroll',()=>syncPanes(sourcePane,previewPane),{passive:true});
previewPane.addEventListener('scroll',()=>syncPanes(previewPane,sourcePane),{passive:true});
$('sync-scroll').addEventListener('click',()=>{
 prefs.syncScroll=!prefs.syncScroll;$('sync-scroll').setAttribute('aria-pressed',String(prefs.syncScroll));persistPrefs();
 if(prefs.syncScroll)syncPanes(sourcePane,previewPane);
});
window.addEventListener('keydown',event=>{
 if(!token||busy||event.isComposing||document.querySelector('dialog[open]')||!(event.ctrlKey||event.metaKey)||event.altKey)return;
 const k=event.key.toLowerCase();
 if(k==='s'){event.preventDefault();$('save-draft').click();}
 if(k==='z'&&!event.shiftKey&&mode==='visual'&&!activeVisual&&!event.target?.matches?.('input,textarea,[contenteditable=true],[contenteditable=plaintext-only]')&&visualUndo.length){
  event.preventDefault();$('visual-undo').click();
 }
});

let rich=null,richBlock=null;
function richState(text,error=false){$('rich-state').textContent=text;$('rich-state').dataset.error=String(error);}
function finishRich(){
 if(!rich)return true;
 if(rich.flush())return true;
 status('富文本尚有无法转换的修改。请撤销或修正后再切换、保存或发布。',true);return false;
}
function destroyRich(){
 rich?.destroy();rich=null;richBlock=null;
 if($('rich-block-dialog').open)$('rich-block-dialog').close();
 $('rich-editor').replaceChildren();
}
function mountRich(){
 if(rich||!current)return;
 try{
  richState('复杂区块双击编辑');
  rich=createRichEditor({
   mount:$('rich-editor'),source:$('body-editor').value,base,editable:!busy,
   onChange(next){$('body-editor').value=next;bodyChanged();},
   onError(message){richState(message,true);},
   onValid(){richState('复杂区块双击编辑');},
   onState(active){for(const b of document.querySelectorAll('[data-rich]'))if(b.dataset.rich in active)b.setAttribute('aria-pressed',String(active[b.dataset.rich]));},
   onBlockEdit(context){if(!finishRich())return;richBlock={...context,path:current};$('rich-block-source').value=context.raw;$('rich-block-dialog').showModal();$('rich-block-source').focus();}
  });
 }catch(e){destroyRich();status('富文本初始化失败：'+e.message,true);setMode('body');}
}
for(const b of document.querySelectorAll('[data-rich]')){
 b.addEventListener('mousedown',e=>e.preventDefault());
 b.addEventListener('click',()=>{if(!busy&&mode==='rich')rich?.command(b.dataset.rich);});
}
for(const id of ['rich-block-close','rich-block-cancel'])$(id).addEventListener('click',()=>$('rich-block-dialog').close());
$('rich-block-dialog').addEventListener('close',()=>{richBlock=null;});
$('rich-block-apply').addEventListener('click',()=>{
 if(!rich||!richBlock||richBlock.path!==current||busy)return;
 if(rich.replaceBlock(richBlock.pos,richBlock.raw,$('rich-block-source').value))$('rich-block-dialog').close();
});

function openBackup(){
 $('backup-password').value='';$('backup-confirm-password').value='';$('backup-file').value='';$('backup-result').textContent='';
 $('backup-count').textContent='可读取的本地草稿：'+drafts.size+' 篇'+(draftIndexError?'（部分草稿无法解密，不包含在备份内）':'');
 $('backup-dialog').showModal();
}
$('backup-close').addEventListener('click',()=>$('backup-dialog').close());
$('backup-dialog').addEventListener('close',()=>{$('backup-password').value='';$('backup-confirm-password').value='';$('backup-file').value='';});
$('backup-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
async function backupAction(fn){
 if(busy||!key)return;busy=true;lockFields(true);
 for(const id of ['backup-close','backup-export','backup-import','backup-password','backup-confirm-password','backup-file'])$(id).disabled=true;
 try{await fn();}catch(e){$('backup-result').textContent=e.message;}
 finally{busy=false;lockFields(false);for(const id of ['backup-close','backup-export','backup-import','backup-password','backup-confirm-password','backup-file'])$(id).disabled=false;}
}
$('backup-export').addEventListener('click',()=>backupAction(async()=>{
 if(!drafts.size)throw Error('没有可备份的本地草稿。');
 const pass=$('backup-password').value;
 if(pass!==$('backup-confirm-password').value)throw Error('两次输入的密码不一致。');
 const raw=await encryptBackup([...drafts].map(([path,d])=>({path,...d})),pass);
 const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='xiang-blog-drafts-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 $('backup-result').textContent='已导出 '+drafts.size+' 篇加密草稿。请另外保存密码。';
 $('backup-password').value='';$('backup-confirm-password').value='';
}));
$('backup-import').addEventListener('click',()=>backupAction(async()=>{
 const file=$('backup-file').files[0];if(!file||file.size>maxBackupBytes)throw Error('请选择有效的加密备份文件（最大 32 MB）。');
 const entries=await decryptBackup(await file.text(),$('backup-password').value);
 await refreshPosts();
 const existing=new Set(entries.filter(e=>localStorage.getItem(storageKey(e.path))!==null).map(e=>e.path));
 const remote=new Map(library.map(e=>[e.path,e.sha??'unverified']));
 if(current&&remote.get(current)!==sha&&remote.has(current))existing.add(current);
 const plan=planRestore(entries,existing,remote);
 let saved=0,opened=false;const failed=[];
 for(const e of plan.restore){
  try{
   await storeDraft(e.path,e.text,e.baselineSha);
   saved++;if(e.path===current)opened=true;
  }catch{failed.push(e.path+'：本地存储失败');}
 }
 if(opened){await setArticle(current,original,sha);}
 renderLibrary();updateCounterpart();
 $('backup-count').textContent='可读取的本地草稿：'+drafts.size+' 篇';
 $('backup-result').textContent='已恢复 '+saved+' 篇，跳过 '+plan.skipped.length+' 篇，失败 '+failed.length+' 篇。'+[...plan.skipped.map(e=>e.path+'：'+e.reason),...failed].map(x=>'\n'+x).join('')+'\n未发布任何文章。';
 $('backup-password').value='';$('backup-confirm-password').value='';
}));

function updateAssetPreview(){
 const name=$('images').value,img=$('asset-preview');
 img.hidden=true;img.removeAttribute('src');$('asset-name').textContent=name||'暂无图片';
 if(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*\.(png|jpe?g|webp|gif)$/i.test(name)){img.hidden=false;img.src=base+'images/'+encodeURIComponent(name);}
}
$('images').addEventListener('change',updateAssetPreview);
$('asset-preview').addEventListener('error',()=>{$('asset-preview').hidden=true;$('asset-name').textContent=$('images').value+' · 网站尚未生成缩略图';});
$('sort-posts').addEventListener('change',renderLibrary);
$('rich-images').addEventListener('click',()=>{togglePanel('details',false);$('image-details').open=true;$('images').focus();});
