import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
const base='/individual-blog/',root=resolve('dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.woff2':'font/woff2','.woff':'font/woff','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!pathname.startsWith(base)){res.writeHead(404).end();return;}
  let file=resolve(root,pathname.slice(base.length));
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(404).end();return;}
  if((await stat(file)).isDirectory())file=resolve(file,'index.html');
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(await readFile(file));
 }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const markdown='---\ntitle: "Browser test"\ndate: 2026-11-24\nlang: zh\ntranslationKey: browser-test\ntags: []\ndraft: false\n---\n\nFirst paragraph.\n\n$$\nx^2\n$$\n\nLast paragraph.\n';
 const file={name:'browser-test.md',path:'src/content/posts/zh/browser-test.md',type:'file',sha:'fake-blob',encoding:'base64',content:Buffer.from(markdown).toString('base64')};
 const prefix='/repos/AbyssScott/individual-blog';
 await page.route('https://api.github.com/**',async route=>{
  const u=new URL(route.request().url()),path=u.pathname,method=route.request().method();
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'authorization, accept, x-github-api-version, content-type','Content-Type':'application/json'};
  if(method==='OPTIONS'){await route.fulfill({status:204,headers});return;}
  if(method!=='GET'){await route.fulfill({status:403,headers,body:'{}'});return;}
  let body;
  if(path==='/user')body={id:203394363,login:'AbyssScott'};
  else if(path===prefix)body={full_name:'AbyssScott/individual-blog'};
  else if(path===prefix+'/contents/src/content/posts/zh')body=[file];
  else if(path===prefix+'/contents/src/content/posts/en'||path===prefix+'/contents/public/images')body=[];
  else if(path===prefix+'/contents/'+file.path)body=file;
  else{await route.fulfill({status:404,headers,body:'{}'});return;}
  await route.fulfill({status:200,headers,body:JSON.stringify(body)});
 });
 await page.goto('http://127.0.0.1:'+server.address().port+base+'developer/');
 async function login(){await page.locator('#token').fill('github_pat_TEST_ONLY_NOT_REAL');await page.locator('#connect').click();await page.locator('#workspace').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#source').value.includes('First paragraph.'));}
 await login();
 await page.locator('#rich-mode').click();
 const prose=page.locator('#rich-editor .ProseMirror');
 await prose.waitFor({state:'visible'});
 assert.equal(await page.locator('#source').inputValue(),markdown);
 const first=prose.locator(':scope > p').first();
 await first.click();await page.keyboard.press('End');await page.keyboard.type('!');
 await page.keyboard.press('Enter');await page.keyboard.type('New paragraph');
 await page.waitForFunction(()=>document.querySelector('#source').value.includes('First paragraph.!\n\nNew paragraph'));
 await page.keyboard.press('Shift+Home');await page.locator('[data-rich=bold]').click();
 await page.waitForFunction(()=>document.querySelector('#source').value.includes('**New paragraph**'));
 assert.ok((await page.locator('#source').inputValue()).includes('$$\nx^2\n$$'));
 await page.locator('[data-rich=undo]').click();
 await page.waitForFunction(()=>!document.querySelector('#source').value.includes('**New paragraph**'));
 await page.locator('[data-rich=redo]').click();
 await page.waitForFunction(()=>document.querySelector('#source').value.includes('**New paragraph**'));
 await page.locator('#save-draft').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('已保存'));
 const edited=await page.locator('#source').inputValue();
 await page.locator('#edit').click();
 assert.equal(await page.locator('#source').inputValue(),edited);
 await page.locator('#rich-mode').click();
 await page.locator('#logout').click();
 await page.locator('#login').waitFor({state:'visible'});
 await login();
 assert.equal(await page.locator('#source').inputValue(),edited);
 assert.deepEqual(errors,[]);
 console.log('Rich editor browser smoke test passed (mock API; no real writes).');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
