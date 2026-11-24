// Portable encrypted draft backups. The password is independent of GitHub.
const format='xiang-blog-draft-backup-v1',iterations=600000,enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
export const maxBackupBytes=32*1024*1024;
const pathPattern=/^(zh|en)\/[a-z0-9][a-z0-9-]*\.md$/;
function b64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
function un64(value){if(typeof value!=='string'||value.length>maxBackupBytes*2)throw Error('备份编码无效。');return Uint8Array.from(atob(value),x=>x.charCodeAt(0));}
async function derive(password,salt){
 if(typeof password!=='string'||password.length<10||password.length>1024)throw Error('备份密码至少 10 个字符，最长 1024 个字符。');
 const material=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export function validateBackupEntries(entries){
 if(!Array.isArray(entries)||entries.length>1000)throw Error('备份草稿列表无效。');
 const seen=new Set();
 return entries.map(e=>{
  if(!e||!pathPattern.test(e.path)||seen.has(e.path)||typeof e.text!=='string'||e.text.length>4*1024*1024||!(e.baselineSha===null||(typeof e.baselineSha==='string'&&e.baselineSha.length>0&&e.baselineSha.length<=128)))throw Error('备份包含无效或重复草稿。');
  seen.add(e.path);return {path:e.path,text:e.text,baselineSha:e.baselineSha};
 });
}
export async function encryptBackup(entries,password){
 const bytes=enc.encode(JSON.stringify(validateBackupEntries(entries)));
 if(bytes.length>maxBackupBytes/2)throw Error('备份太大，请分别下载单篇草稿。');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await derive(password,salt);
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(format)},key,bytes);
 return JSON.stringify({format,kdf:'PBKDF2-SHA256',iterations,salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(data))});
}
export async function decryptBackup(raw,password){
 if(typeof raw!=='string'||raw.length>maxBackupBytes)throw Error('备份文件太大。');
 let envelope;
 try{envelope=JSON.parse(raw);}catch{throw Error('不是有效的备份文件。');}
 if(envelope?.format!==format||envelope.kdf!=='PBKDF2-SHA256'||envelope.iterations!==iterations)throw Error('不支持的备份格式。');
 const salt=un64(envelope.salt),iv=un64(envelope.iv),data=un64(envelope.data);
 if(salt.length!==16||iv.length!==12||data.length<16)throw Error('备份参数无效。');
 const key=await derive(password,salt);
 let decrypted;try{decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:enc.encode(format)},key,data);}catch{throw Error('密码错误或备份文件损坏。');}
 return validateBackupEntries(JSON.parse(dec.decode(decrypted)));
}
// No silent overwrite: local records take precedence; a remote version
// mismatch must be recovered separately, never rebase an old draft implicitly.
export function planRestore(entries,existingPaths,remoteVersions){
 const restore=[],skipped=[];
 for(const e of validateBackupEntries(entries)){
  const remote=remoteVersions.get(e.path)??null;
  const reason=existingPaths.has(e.path)?'已有本地草稿':remote!==e.baselineSha?'远程版本不一致':'';
  if(reason)skipped.push({path:e.path,reason});else restore.push(e);
 }
 return {restore,skipped};
}
