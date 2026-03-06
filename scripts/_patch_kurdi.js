var fs=require('fs');
var p='C:/TafsirKurd/src/app/app.js';
var c=fs.readFileSync(p,'utf8');

// 1. Add Raad Al-Kurdi to RECITERS (after the closing line)
var anchor="  {id:'Mohammad_al_Tablaway_128kbps', name:'\u0645\u062d\u0645\u062f \u0627\u0644\u0637\u0628\u0644\u0627\u0648\u064a',              flag:'\uD83C\uDDEA\uD83C\uDDEC',style:'murattal'}\r\n];";
var newEntry="  {id:'Mohammad_al_Tablaway_128kbps', name:'\u0645\u062d\u0645\u062f \u0627\u0644\u0637\u0628\u0644\u0627\u0648\u064a',              flag:'\uD83C\uDDEA\uD83C\uDDEC',style:'murattal'},\r\n"+
"  {id:'Raad_Al_Kurdi',                name:'\u0631\u0639\u062f \u0645\u062d\u0645\u062f \u0627\u0644\u06a9\u0631\u062f\u064a',             flag:'\u2600\uFE0F',style:'murattal',surahMode:true,surahBase:'https://server6.mp3quran.net/kurdi/'}\r\n];";

if(c.indexOf(anchor)===-1){
  // try LF version
  var anchorLF="  {id:'Mohammad_al_Tablaway_128kbps', name:'\u0645\u062d\u0645\u062f \u0627\u0644\u0637\u0628\u0644\u0627\u0648\u064a',              flag:'\uD83C\uDDEA\uD83C\uDDEC',style:'murattal'}\n];";
  if(c.indexOf(anchorLF)===-1){console.log('anchor not found');process.exit(1);}
  var newEntryLF="  {id:'Mohammad_al_Tablaway_128kbps', name:'\u0645\u062d\u0645\u062f \u0627\u0644\u0637\u0628\u0644\u0627\u0648\u064a',              flag:'\uD83C\uDDEA\uD83C\uDDEC',style:'murattal'},\n"+
"  {id:'Raad_Al_Kurdi',                name:'\u0631\u0639\u062f \u0645\u062d\u0645\u062f \u0627\u0644\u06a9\u0631\u062f\u064a',             flag:'\u2600\uFE0F',style:'murattal',surahMode:true,surahBase:'https://server6.mp3quran.net/kurdi/'}\n];";
  c=c.replace(anchorLF,newEntryLF);
} else {
  c=c.replace(anchor,newEntry);
}
console.log('1. Raad Al-Kurdi added');

// 2. Update audioUrl() to support surahMode reciters
var oldUrl="function audioUrl(surah,ayah){\n  return 'https://everyayah.com/data/'+RECITER+'/'+String(surah).padStart(3,'0')+String(ayah).padStart(3,'0')+'.mp3';\n}";
var newUrl="function audioUrl(surah,ayah){\n  var r=RECITERS.find(function(x){return x.id===RECITER;});\n  if(r&&r.surahMode)return r.surahBase+String(surah).padStart(3,'0')+'.mp3';\n  return 'https://everyayah.com/data/'+RECITER+'/'+String(surah).padStart(3,'0')+String(ayah).padStart(3,'0')+'.mp3';\n}";
if(c.indexOf(oldUrl)===-1){console.log('audioUrl not found');process.exit(1);}
c=c.replace(oldUrl,newUrl);
console.log('2. audioUrl updated for surahMode');

fs.writeFileSync(p,c,'utf8');
console.log('done');
