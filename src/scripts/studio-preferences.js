export function clampSplit(value){
 const n=Number(value);return Number.isFinite(n)?Math.min(75,Math.max(25,Math.round(n))):50;
}
export function normalizePrefs(value){
 const p=value&&typeof value==='object'?value:{};
 return {mode:['visual','rich','body','split','raw'].includes(p.mode)?p.mode:'visual',
 hideDetails:typeof p.hideDetails==='boolean'?p.hideDetails:true,
 hideLibrary:typeof p.hideLibrary==='boolean'?p.hideLibrary:false,
 syncScroll:typeof p.syncScroll==='boolean'?p.syncScroll:true,
 split:p.split==null?50:clampSplit(p.split),
 lastPost:typeof p.lastPost==='string'&&/^(zh|en)\/[a-z0-9][a-z0-9-]*\.md$/.test(p.lastPost)?p.lastPost:''};
}
export function scrollFraction(top,height,viewport){
 const max=Math.max(0,height-viewport);return max?Math.max(0,Math.min(1,top/max)):0;
}
export function scrollTarget(fraction,height,viewport){return Math.max(0,height-viewport)*Math.max(0,Math.min(1,fraction));}
