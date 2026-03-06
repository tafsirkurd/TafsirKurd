var fs=require('fs');

/* ── 1. dhikr.js ── remove zakat from _sections(), _draw(), and _renderZakat() */
var dp='C:/TafsirKurd/src/dhikr/dhikr.js';
var dc=fs.readFileSync(dp,'utf8');

// Remove zakat from _sections() (the line we added: ",\r\n    { name:'zakat'...}")
dc=dc.replace(/,\r\n    \{ name:'zakat'[^\}]+\}/,'');
dc=dc.replace(/,\n    \{ name:'zakat'[^\}]+\}/,''); // LF fallback

// Remove zakat route from _draw()
dc=dc.replace("    else if(this._view === 'zakat') this._renderZakat(el);\r\n",'');
dc=dc.replace("    else if(this._view === 'zakat') this._renderZakat(el);\n",'');

// Remove _renderZakat function — find it and remove until the closing "},\r\n\r\n" or "},\n\n"
var rzStart=dc.indexOf('  _renderZakat: function(container) {');
if(rzStart!==-1){
  // find the end: next top-level method starting with "  _scoreHadith"
  var rzEnd=dc.indexOf('  _scoreHadith: function(h, q) {',rzStart);
  if(rzEnd!==-1){
    dc=dc.slice(0,rzStart)+dc.slice(rzEnd);
    console.log('_renderZakat removed');
  }else{console.log('_renderZakat end not found');}
}else{console.log('_renderZakat not found');}

fs.writeFileSync(dp,dc,'utf8');
console.log('dhikr.js done');

/* ── 2. app.js ── remove Raad Al-Kurdi from RECITERS + clean audioUrl() */
var ap='C:/TafsirKurd/src/app/app.js';
var ac=fs.readFileSync(ap,'utf8');

// Remove Raad Al-Kurdi entry (first line of RECITERS now)
ac=ac.replace(/  \{id:'Raad_Al_Kurdi'[^\}]+\},\r\n/,'');
ac=ac.replace(/  \{id:'Raad_Al_Kurdi'[^\}]+\},\n/,'');

// Revert audioUrl() to simple everyayah.com form
var oldUrl="function audioUrl(surah,ayah){\n  var r=RECITERS.find(function(x){return x.id===RECITER;});\n  if(r&&r.surahMode)return r.surahBase+String(surah).padStart(3,'0')+'.mp3';\n  return 'https://everyayah.com/data/'+RECITER+'/'+String(surah).padStart(3,'0')+String(ayah).padStart(3,'0')+'.mp3';\n}";
var newUrl="function audioUrl(surah,ayah){\n  return 'https://everyayah.com/data/'+RECITER+'/'+String(surah).padStart(3,'0')+String(ayah).padStart(3,'0')+'.mp3';\n}";
if(ac.indexOf(oldUrl)!==-1){
  ac=ac.replace(oldUrl,newUrl);
  console.log('audioUrl reverted');
}else{console.log('audioUrl not matched - skipping');}

fs.writeFileSync(ap,ac,'utf8');
console.log('app.js done');

/* ── 3. kmr.json ── remove zakat keys */
var kp='C:/TafsirKurd/src/i18n/kmr.json';
var kc=fs.readFileSync(kp,'utf8');
// Remove the zakat block we added
kc=kc.replace(/,\s*\n\s*"gencine\.zakat"[\s\S]*?"zakat\.not_eligible"[^\n]*\n\}/,'\n}');
fs.writeFileSync(kp,kc,'utf8');
console.log('kmr.json done');
