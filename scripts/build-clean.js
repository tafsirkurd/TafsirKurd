const fs = require("fs");
const results = JSON.parse(fs.readFileSync("C:/TafsirKurd/scripts/scan-results.json", "utf8"));
const kurdishRe = /[\u0600-\u06FF]/;
const valid = results.filter(function(e) {
  return e.kurdish_text && kurdishRe.test(e.kurdish_text) && e.kurdish_text.trim().length >= 2;
});
valid.sort(function(a, b) {
  var aD = a.source === "data-t" ? 0 : 1;
  var bD = b.source === "data-t" ? 0 : 1;
  if (aD !== bD) return aD - bD;
  return (b.kurdish_text || "").length - (a.kurdish_text || "").length;
});
var byKey = {};
for (var i = 0; i < valid.length; i++) {
  var e = valid[i];
  if (!byKey[e.key_id]) byKey[e.key_id] = e;
}
var byText = {};
var toRemove = {};
Object.keys(byKey).forEach(function(key) {
  var e = byKey[key];
  var text = e.kurdish_text.trim();
  if (byText[text]) {
    var ex = byText[text];
    if (ex.source === "data-t" && e.source !== "data-t") {
      toRemove[key] = true;
    } else if (e.source === "data-t" && ex.source !== "data-t") {
      toRemove[ex.key_id] = true;
      byText[text] = e;
    }
  } else {
    byText[text] = e;
  }
});
Object.keys(toRemove).forEach(function(k) { delete byKey[k]; });
var final = Object.values(byKey).sort(function(a, b) {
  if (a.page < b.page) return -1;
  if (a.page > b.page) return 1;
  return a.key_id.localeCompare(b.key_id);
});
console.log("Final entries: " + final.length);
var pageCounts = {};
final.forEach(function(e) { pageCounts[e.page] = (pageCounts[e.page] || 0) + 1; });
Object.entries(pageCounts).sort(function(a,b){return b[1]-a[1];}).forEach(function(p){console.log("  "+p[0]+": "+p[1]);});
var lines = final.map(function(e) {
  var text = e.kurdish_text.trim().replace(/"/g, "'");
  return "    { key_id: \"" + e.key_id + "\", kurdish_text: \"" + text + "\", category: \"" + (e.category || "general") + "\", page: \"" + e.page + "\" }";
});
fs.writeFileSync("C:/TafsirKurd/src/utils/bulk-translations.js", "window.BULK_TRANSLATIONS = [\n" + lines.join(",\n") + "\n];\n");
console.log("bulk-translations.js written");
var insertRows = final.map(function(e) {
  var text = e.kurdish_text.trim().replace(/\'/g, "''");
  var key = e.key_id.replace(/\'/g, "''");
  var page = (e.page || "all").replace(/\'/g, "''");
  var cat = (e.category || "general").replace(/\'/g, "''");
  return "  (\'" + key + "\', \'" + text + "\', \'" + page + "\', \'" + cat + "\')"  ;
});
var sql = "-- Full reset: " + final.length + " entries\nDELETE FROM kurdish_translations;\nINSERT INTO kurdish_translations (key_id, kurdish_text, page, category)\nVALUES\n" + insertRows.join(",\n") + "\nON CONFLICT (key_id) DO UPDATE SET kurdish_text=EXCLUDED.kurdish_text, page=EXCLUDED.page, category=EXCLUDED.category;\n";
fs.writeFileSync("C:/TafsirKurd/scripts/reset-translations.sql", sql);
console.log("reset-translations.sql written");