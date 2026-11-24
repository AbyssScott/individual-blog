import test from 'node:test';
import assert from 'node:assert/strict';
import {encryptBackup,decryptBackup,validateBackupEntries,planRestore} from '../src/scripts/draft-backup.js';
const password='a separate password',entries=[{path:'zh/private.md',text:'中文私人草稿\n**内容**',baselineSha:null},{path:'en/post.md',text:'English revision',baselineSha:'abc'}];
test('portable backup encrypts draft content and restores with a separate password',async()=>{
 const raw=await encryptBackup(entries,password);
 assert.ok(!raw.includes('私人草稿'));assert.ok(!raw.includes('zh/private.md'));
 assert.deepEqual(await decryptBackup(raw,password),entries);
 await assert.rejects(decryptBackup(raw,'wrong password'),/密码错误/);
 const changed=JSON.parse(raw);changed.data=(changed.data[0]==='A'?'B':'A')+changed.data.slice(1);
 await assert.rejects(decryptBackup(JSON.stringify(changed),password),/密码错误/);
});
test('reject duplicate paths and path traversal',()=>{
 assert.throws(()=>validateBackupEntries([entries[0],entries[0]]));
 assert.throws(()=>validateBackupEntries([{...entries[0],path:'../secret'}]));
});
test('restore never overwrites local drafts or rebases changed remote files',()=>{
 assert.deepEqual(planRestore(entries,new Set(['zh/private.md']),new Map([['en/post.md','new-sha']])).restore,[]);
 assert.equal(planRestore(entries,new Set(),new Map([['en/post.md','abc']])).restore.length,2);
});
