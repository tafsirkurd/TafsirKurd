var fs=require('fs');
var p='C:/TafsirKurd/src/dhikr/dhikr.js';
var c=fs.readFileSync(p,'utf8');

var insert=[
'',
'function _getTasbih() {',
'  return (_dbTasbih && _dbTasbih.length) ? _dbTasbih : DHIKR_LIST;',
'}',
'function _getAsmaKuOverride(n) {',
'  if (!_dbAsma99 || !_dbAsma99.length) return null;',
'  var row = _dbAsma99.find(function(r){ return r.n === n; });',
'  return row ? row.ku : null;',
'}',
''
].join('\n');

c=c.replace(
  'function _getHadiths() {\n  return (_dbHadiths && _dbHadiths.length) ? _dbHadiths : [];\n}',
  'function _getHadiths() {\n  return (_dbHadiths && _dbHadiths.length) ? _dbHadiths : [];\n}'+insert
);

// Update tasbih dhikr selector to use _getTasbih()
c=c.replace(
  'DHIKR_LIST.forEach(function(d, i){',
  '_getTasbih().forEach(function(d, i){'
);

// Update asma card to use DB ku override
c=c.replace(
  '        var ku = document.createElement(\'div\');\n        ku.className = \'asma-ku\';\n        ku.textContent = a.ku;',
  '        var ku = document.createElement(\'div\');\n        ku.className = \'asma-ku\';\n        var _kuOverride = _getAsmaKuOverride(a.n);\n        ku.textContent = _kuOverride !== null ? _kuOverride : a.ku;'
);

fs.writeFileSync(p,c,'utf8');
console.log('done');
