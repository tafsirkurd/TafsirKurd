(function(){
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:9001;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center;padding:0 0 20px';
  var card=document.createElement('div');
  card.style.cssText='width:100%;max-width:480px;background:var(--surface,#fff);border-radius:20px 20px 0 0;padding:24px 20px 20px;text-align:center';
  var icon=document.createElement('div');
  icon.style.cssText='font-size:2rem;margin-bottom:8px';
  icon.textContent='⚠️';
  var title=document.createElement('div');
  title.style.cssText='font-size:1.05rem;font-weight:700;margin-bottom:10px;color:#b45309';
  title.textContent=window.t('notif.setup.athan_disabled_title','بانگ نادێت — مەرج هەیە');
  var msg=document.createElement('div');
  msg.style.cssText='font-size:.87rem;color:var(--text2,#666);line-height:1.9;direction:rtl;margin-bottom:18px;white-space:pre-line;text-align:right';
  msg.textContent='مەرجا "Alarms & Reminders" هاتیە لەناوبردن.\n\nبۆ چارەسەرکرنێ:\nڕێکخستن ← مەرجا تایبەت ← Alarms & Reminders\n← ئەپێ TafsirKurd فەرمان بکە';
  var btn=document.createElement('button');
  btn.style.cssText='width:100%;padding:13px;background:#b45309;color:#fff;border:none;border-radius:12px;font-size:.95rem;font-weight:700;cursor:pointer';
  btn.textContent=window.t('notif.setup.go_settings','هەرە ڕێکخستن');
  btn.onclick=function(){overlay.remove();};
  var dismissBtn=document.createElement('button');
  dismissBtn.style.cssText='width:100%;padding:10px;background:none;border:none;color:var(--text3,#999);font-size:.85rem;cursor:pointer;margin-top:6px';
  dismissBtn.textContent=window.t('notif.setup.dismiss','دواتر');
  dismissBtn.onclick=function(){overlay.remove();};
  card.appendChild(icon);card.appendChild(title);card.appendChild(msg);
  card.appendChild(btn);card.appendChild(dismissBtn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
})()
