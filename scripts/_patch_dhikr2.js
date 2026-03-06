var fs=require('fs');
var p='C:/TafsirKurd/src/dhikr/dhikr.js';
var c=fs.readFileSync(p,'utf8');

var target='function _getHadiths() {\n  return (_dbHadiths && _dbHadiths.length) ? _dbHadiths : [];\n}';
var replacement=target+'\nfunction _getTasbih() {\n  return (_dbTasbih && _dbTasbih.length) ? _dbTasbih : DHIKR_LIST;\n}\nfunction _getAsmaKuOverride(n) {\n  if (!_dbAsma99 || !_dbAsma99.length) return null;\n  var row = _dbAsma99.find(function(r){ return r.n === n; });\n  return row ? row.ku : null;\n}';

if(c.indexOf(target)===-1){console.log('target not found');process.exit(1);}
c=c.replace(target,replacement);
fs.writeFileSync(p,c,'utf8');
console.log('done');
