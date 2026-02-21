const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const SRC = "C:/TafsirKurd/src";
const KURDISH = /[\u0600-\u06FF]/;

const htmlFiles = fs.readdirSync(SRC)
  .filter(function(f) { return f.endsWith(".html") && f.indexOf("admin-") !== 0; })
  .map(function(f) { return { file: path.join(SRC, f), page: f.replace(".html","") }; });
htmlFiles.push({ file: path.join(SRC, "app/index.html"), page: "android" });

var totalAdded = 0, totalSkipped = 0;

function escapeRegex(s) {
  return s.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&");
}

for (var fi = 0; fi < htmlFiles.length; fi++) {
  var fileObj = htmlFiles[fi];
  var file = fileObj.file, page = fileObj.page;
  if (!fs.existsSync(file)) continue;
  var html = fs.readFileSync(file, "utf8");
  var dom = new JSDOM(html);
  var doc = dom.window.document;
  doc.querySelectorAll("script, style, noscript").forEach(function(el) { el.remove(); });

  var counter = 0, fileModified = false;
  var skip = { script:1, style:1, noscript:1, meta:1, link:1, head:1, html:1, body:1 };

  var elements = doc.querySelectorAll("*");
  elements.forEach(function(el) {
    var tag = el.tagName.toLowerCase();
    if (skip[tag] || el.getAttribute("data-t")) return;

    var directText = Array.from(el.childNodes)
      .filter(function(n) { return n.nodeType === 3; })
      .map(function(n) { return n.textContent.trim(); })
      .filter(function(t) { return t.length >= 2 && KURDISH.test(t); })
      .join(" ").trim();

    if (!directText) return;

    counter++;
    var key = page + "_" + tag + "_" + counter;
    var escapedText = escapeRegex(directText);

    // Match opening tag that has no data-t, followed immediately by the exact text
    var reStr = "(<" + tag + "(?![^>]*\\bdata-t\\b)[^>]*)";
    reStr += "(>[  \\t\\n\\r]*" + escapedText + ")";
    var re;
    try { re = new RegExp(reStr, "u"); } catch(e) { totalSkipped++; return; }

    if (re.test(html)) {
      html = html.replace(re, "$1 data-t=\"" + key + "\"$2");
      fileModified = true;
      totalAdded++;
    } else {
      totalSkipped++;
    }
  });

  if (fileModified) {
    fs.writeFileSync(file, html, "utf8");
    console.log("  " + path.basename(file) + ": modified");
  }
}
console.log("Done. Added: " + totalAdded + ", Skipped: " + totalSkipped);
