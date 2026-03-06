var fs=require('fs');
var p='C:/TafsirKurd/src/app/app.js';
var c=fs.readFileSync(p,'utf8');

// Remove Raad Al-Kurdi from end of array (wherever it is now)
// and add it as first entry
var kurdiLine=",\r\n  {id:'Raad_Al_Kurdi',                name:'\u0631\u0639\u062f \u0645\u062d\u0645\u062f \u0627\u0644\u06a9\u0631\u062f\u064a',             flag:'\u2600\uFE0F',style:'murattal',surahMode:true,surahBase:'https://server6.mp3quran.net/kurdi/'}";
var kurdiLineLF=",\n  {id:'Raad_Al_Kurdi',                name:'\u0631\u0639\u062f \u0645\u062d\u0645\u062f \u0627\u0644\u06a9\u0631\u062f\u064a',             flag:'\u2600\uFE0F',style:'murattal',surahMode:true,surahBase:'https://server6.mp3quran.net/kurdi/'}";

// Remove existing Raad entry
if(c.indexOf(kurdiLine)!==-1){
  c=c.replace(kurdiLine,'');
  console.log('removed CRLF version');
} else if(c.indexOf(kurdiLineLF)!==-1){
  c=c.replace(kurdiLineLF,'');
  console.log('removed LF version');
} else {
  // Try without comma prefix
  var re=/,?\s*\{id:'Raad_Al_Kurdi'[^}]+\}/;
  if(re.test(c)){
    c=c.replace(re,'');
    console.log('removed via regex');
  } else {
    console.log('Raad entry not found to remove - will just add at top');
  }
}

// Insert as first entry with SVG flag
var firstAnchor="var RECITERS=[\r\n";
var firstAnchorLF="var RECITERS=[\n";
var kurdiFirst="  {id:'Raad_Al_Kurdi',                name:'\u0631\u0639\u062f \u0645\u062d\u0645\u062f \u0627\u0644\u06a9\u0631\u062f\u064a',             flag:'/assets/icons/flag-krd.svg',style:'murattal',surahMode:true,surahBase:'https://server6.mp3quran.net/kurdi/'},\r\n";
var kurdiFirstLF="  {id:'Raad_Al_Kurdi',                name:'\u0631\u0639\u062f \u0645\u062d\u0645\u062f \u0627\u0644\u06a9\u0631\u062f\u064a',             flag:'/assets/icons/flag-krd.svg',style:'murattal',surahMode:true,surahBase:'https://server6.mp3quran.net/kurdi/'},\n";

if(c.indexOf(firstAnchor)!==-1){
  c=c.replace(firstAnchor, firstAnchor+kurdiFirst);
  console.log('inserted as first (CRLF)');
} else if(c.indexOf(firstAnchorLF)!==-1){
  c=c.replace(firstAnchorLF, firstAnchorLF+kurdiFirstLF);
  console.log('inserted as first (LF)');
} else {
  console.log('RECITERS open bracket not found');
  process.exit(1);
}

fs.writeFileSync(p,c,'utf8');
console.log('done');
