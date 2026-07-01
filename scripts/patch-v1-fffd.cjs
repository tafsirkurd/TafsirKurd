'use strict';
// Repairs the 7 pages in mushaf-v1-pages.json that have U+FFFD (replacement character)
// in their code_v1 data. Re-fetches only those pages from the quran.com API.
const https = require('https');
const fs    = require('path');
const path  = require('path');
const FILE  = path.join(__dirname,'..','src','data','mushaf-v1-pages.json');
const BAD_PAGES = [3, 39, 82, 183, 305, 307, 325];

function fetchJSON(url){
  return new Promise((res,rej)=>{
    const req=https.get(url,{headers:{'User-Agent':'TafsirKurd-Patch/1.0','Accept-Encoding':'identity'}},rs=>{
      // identity encoding prevents gzip mangling of high-plane chars
      let buf=[];
      rs.on('data',c=>buf.push(c));
      rs.on('end',()=>{
        const raw=Buffer.concat(buf).toString('utf8');
        try{res(JSON.parse(raw));}catch(e){rej(new Error('JSON: '+e.message));}
      });
    });
    req.on('error',rej);
    req.on('timeout',()=>{req.destroy();rej(new Error('timeout'));});
  });
}

async function run(){
  console.log('Loading mushaf-v1-pages.json…');
  const pages=JSON.parse(require('fs').readFileSync(FILE,'utf8'));

  for(const pn of BAD_PAGES){
    process.stdout.write('Patching page '+pn+'… ');
    const url='https://api.quran.com/api/v4/verses/by_page/'+pn
      +'?words=true&word_fields=code_v1,char_type_name,line_number&per_page=300&mushaf=1';
    let lastErr;
    for(let i=0;i<4;i++){
      try{
        const json=await fetchJSON(url);
        const verses=(json.verses||[]).map(v=>{
          const words=(v.words||[])
            .filter(w=>w.code_v1&&!w.code_v1.includes('�'))
            .map(w=>({code_v1:w.code_v1,line_number:w.line_number}));
          return {verse_key:v.verse_key,verse_number:v.verse_number,words};
        }).filter(v=>v.words.length>0);
        if(!verses.length)throw new Error('no verses');
        pages[pn-1]={verses};
        console.log('OK ('+verses.length+' verses)');
        lastErr=null;break;
      }catch(e){
        lastErr=e;
        await new Promise(r=>setTimeout(r,1000*(i+1)));
      }
    }
    if(lastErr)console.error('  FAILED: '+lastErr.message);
  }

  require('fs').writeFileSync(FILE,JSON.stringify(pages));
  console.log('\nSaved. Verifying no U+FFFD remain…');
  let remaining=0;
  pages.forEach(p=>(p.verses||[]).forEach(v=>(v.words||[]).forEach(w=>{
    if((w.code_v1||'').includes('�'))remaining++;
  })));
  console.log(remaining===0?'Clean — no U+FFFD remaining.':'WARNING: '+remaining+' U+FFFD still present.');
}
run().catch(e=>{console.error(e);process.exit(1);});
