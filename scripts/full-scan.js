'use strict';
const fs=require('fs');
const path=require('path');

const SRC_DIR='C:/TafsirKurd/src';
const APP_JS='C:/TafsirKurd/src/app/app.js';
const OUT_FILE='C:/TafsirKurd/scripts/scan-results.json';
const KURDISH_RE=/[؀-ۿ]/g;
const MIN_KURDISH=2;

function countKurdish(x){const m=x.match(KURDISH_RE);return m?m.length:0;}
function hasKurdish(x){return countKurdish(x)>=MIN_KURDISH;}
function isPureNums(x){return /^[٠-٩\s]+$/.test(x);}

function getPage(fp){
  fp=fp.replace(/\\/g,'/');
  if(fp.includes('/app/index.html'))return 'android';
  const b=path.basename(fp,'.html');
  return b==='index'?'index':b;
}

function tokenise(html){
  const tokens=[];let i=0,len=html.length;
  while(i<len){
    if(html[i]!=='<'){
      const end=html.indexOf('<',i);
      const text=end===-1?html.slice(i):html.slice(i,end);
      if(text.trim())tokens.push({type:'text',text});
      i=end===-1?len:end;
    }else if(html.startsWith('<!--',i)){
      const e=html.indexOf('-->',i+4);i=e===-1?len:e+3;
    }else if(html[i+1]==='!'){
      const e=html.indexOf('>',i);i=e===-1?len:e+1;
    }else if(html[i+1]==='/'){
      const e=html.indexOf('>',i);if(e===-1){i=len;break;}
      const tag=html.slice(i+2,e).trim().split(/\s+/)[0].toLowerCase();
      tokens.push({type:'close_tag',tag});i=e+1;
    }else{
      const e=html.indexOf('>',i);if(e===-1){i=len;break;}
      const rawTag=html.slice(i+1,e);
      const selfClose=rawTag.trimEnd().endsWith('/');
      const body=selfClose?rawTag.slice(0,-1):rawTag;
      const sp=body.search(/[\s\/]/);
      const tag=(sp===-1?body:body.slice(0,sp)).toLowerCase();
      const attrStr=sp===-1?'':body.slice(sp);
      const attrs={};
      const ar=/([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*)))?/g;
      let am;
      while((am=ar.exec(attrStr))){
        const v=am[2]!==undefined?am[2]:am[3]!==undefined?am[3]:am[4]!==undefined?am[4]:'';
        attrs[am[1].toLowerCase()]=v;
      }
      tokens.push({type:'open_tag',tag,attrs,selfClose});
      i=e+1;
      if((tag==='script'||tag==='style')&&!selfClose){
        const ct='</'+tag;
        const ci=html.toLowerCase().indexOf(ct,i);
        const content=ci===-1?html.slice(i):html.slice(i,ci);
        tokens.push({type:tag==='script'?'script_block':'style_block',text:content});
        i=ci===-1?len:ci;
      }
    }
  }
  return tokens;
}

function catFromStack(stack){
  const tags=stack.map(t=>t.tag);
  if(tags.includes('nav')||tags.includes('aside'))return 'nav';
  if(tags.includes('main')||tags.includes('article')||tags.includes('section'))return 'content';
  const uiT=['button','label','input','select','textarea','option'];
  if(tags.some(t=>uiT.includes(t)))return 'ui';
  for(const stk of stack){
    const c=((stk.attrs.class||'')+(stk.attrs.id||'')).toLowerCase();
    if(/nav|menu|sidebar|header|footer/.test(c))return 'nav';
    if(/btn|button|chip|tab|badge/.test(c))return 'ui';
    if(/content|article|main|body-text/.test(c))return 'content';
  }
  return 'general';
}

const SKIP=new Set(['script','style','meta','link','head']);

function scanHTML(fp){
  const html=fs.readFileSync(fp,'utf8');
  const page=getPage(fp);
  const tokens=tokenise(html);
  const results=[],stack=[],counters={};
  for(let ti=0;ti<tokens.length;ti++){
    const tok=tokens[ti];
    if(tok.type==='open_tag'){
      if(!tok.selfClose)stack.push(tok);
      const dt=tok.attrs['data-t'];
      if(dt&&dt.trim()){
        let txt='';
        for(let j=ti+1;j<Math.min(ti+25,tokens.length);j++){
          if(tokens[j].type==='text'){
            const t=tokens[j].text.replace(/&[a-z#0-9]+;/gi,' ').trim();
            if(t){txt=t;break;}
          }else if(tokens[j].type==='close_tag')break;
        }
        results.push({key_id:dt.trim(),kurdish_text:txt,page,category:catFromStack(stack),source:'data-t'});
      }
      const attrsToScan=['title','placeholder','aria-label','alt','value'];
      for(const attr of attrsToScan){
        const v=tok.attrs[attr];
        if(v&&hasKurdish(v)&&!isPureNums(v)){
          const k=tok.tag+'_attr_'+attr;
          counters[k]=(counters[k]||0)+1;
          results.push({key_id:page+'_'+k+'_'+counters[k],kurdish_text:v.trim(),page,category:catFromStack(stack),source:'attr:'+attr});
        }
      }
    }else if(tok.type==='close_tag'){
      for(let si=stack.length-1;si>=0;si--){
        if(stack[si].tag===tok.tag){stack.splice(si,1);break;}
      }
    }else if(tok.type==='text'){
      if(stack.some(ss=>SKIP.has(ss.tag)))continue;
      const raw=tok.text.replace(/&[a-z#0-9]+;/gi,' ').trim();
      if(!raw||!hasKurdish(raw)||isPureNums(raw))continue;
      const pt=stack.length>0?stack[stack.length-1].tag:'body';
      if(SKIP.has(pt))continue;
      counters[pt]=(counters[pt]||0)+1;
      results.push({key_id:page+'_'+pt+'_'+counters[pt],kurdish_text:raw,page,category:catFromStack(stack),source:'text_node'});
    }else if(tok.type==='script_block'){
      scanJSStrings(tok.text,page,counters,results);
    }
  }
  return results;
}

function scanJSStrings(js,page,counters,results){
  const re=/(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
  let m;
  while((m=re.exec(js))!==null){
    const v=(m[1]!==undefined?m[1]:m[2]).replace(/\\n/g,' ').replace(/\\t/g,' ').trim();
    if(!v||!hasKurdish(v)||isPureNums(v)||v.length<2)continue;
    counters['js_str']=(counters['js_str']||0)+1;
    results.push({key_id:page+'_js_'+counters['js_str'],kurdish_text:v,page,category:'ui',source:'js_string'});
  }
}

function scanJSFile(fp){
  const js=fs.readFileSync(fp,'utf8');
  const results=[],counters={};
  scanJSStrings(js,'android',counters,results);
  return results;
}

function dedup(arr){
  const map=new Map();
  for(const r of arr){
    if(!r.key_id)continue;
    const ex=map.get(r.key_id);
    if(!ex||countKurdish(r.kurdish_text)>countKurdish(ex.kurdish_text))map.set(r.key_id,r);
  }
  return Array.from(map.values());
}

function walk(dir,out){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,e.name).replace(/\\/g,'/');
    if(e.isDirectory())walk(full,out);
    else if(e.name.endsWith('.html'))out.push(full);
  }
}

function main(){
  const htmlFiles=[];
  walk(SRC_DIR,htmlFiles);
  console.log('Found '+htmlFiles.length+' HTML files:');
  htmlFiles.forEach(f=>console.log('  '+f));
  console.log('');
  let all=[];
  for(const f of htmlFiles){
    try{
      const r=scanHTML(f);
      console.log('  '+path.basename(f)+': '+r.length+' items');
      all=all.concat(r);
    }catch(e2){console.error('  ERROR '+f+': '+e2.message);}
  }
  if(fs.existsSync(APP_JS)){
    try{
      const r=scanJSFile(APP_JS);
      console.log('  app.js: '+r.length+' JS strings');
      all=all.concat(r);
    }catch(e2){console.error('  ERROR app.js: '+e2.message);}
  }
  console.log('');
  console.log('Total raw: '+all.length);
  const deduped=dedup(all);
  console.log('Total unique: '+deduped.length);
  const byPage={},byCat={};
  for(const r of deduped){
    byPage[r.page]=(byPage[r.page]||0)+1;
    byCat[r.category]=(byCat[r.category]||0)+1;
  }
  console.log('');
  console.log('By page:');
  Object.entries(byPage).sort((a,b)=>b[1]-a[1]).forEach(([pg,cnt])=>console.log('  '+pg.padEnd(40)+cnt));
  console.log('');
  console.log('By category:');
  Object.entries(byCat).sort((a,b)=>b[1]-a[1]).forEach(([cat,cnt])=>console.log('  '+cat.padEnd(20)+cnt));
  fs.writeFileSync(OUT_FILE,JSON.stringify(deduped,null,2),'utf8');
  console.log('');
  console.log('Written to: '+OUT_FILE);
  console.log('Total entries: '+deduped.length);
}

main();
