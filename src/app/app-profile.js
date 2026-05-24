'use strict';

/* ===== PROFILE PAGE ===== */
App.openProfile=function(){
  if(!S.user)return;
  var panel=$('profilePanel');
  clear(panel);
  renderProfile(panel);
  panel.classList.add('on');
  if(!panel._dragInited){panel._dragInited=true;if(typeof _attachSheetDrag==='function')_attachSheetDrag(panel,null,App.closeProfile,panel,'on');}
};

App.closeProfile=function(){
  var panel=$('profilePanel');
  if(panel)panel.classList.remove('on');
};

function renderProfile(panel){
  var rawProv=S.user.provider||(S.user.avatar&&S.user.avatar.indexOf('google')!==-1?'google':'email');
  var providerLabel=rawProv==='google'?'Google':rawProv==='apple'?'Apple':'Email';
  var isOAuth=(rawProv==='google'||rawProv==='apple');
  var log=getReadLog();var bms=getBookmarks();
  // Field-level message helpers
  function sfm(el,text,type){el.textContent=text;el.className='pp-field-msg '+type;}
  function cfm(el){el.className='pp-field-msg';el.textContent='';}
  var totalRead=calcTotalRead(log);var streak=calcStreak(log);

  panel.appendChild(el('div','profile-pull'));

  // ── Header ────────────────────────────────────
  var hdr=el('div','pp-hdr');
  var backBtn=el('button','hdr-btn');
  backBtn.appendChild(icon('fas fa-arrow-right'));
  on(backBtn,'click',function(){App.closeProfile()});
  hdr.appendChild(backBtn);
  hdr.appendChild(el('div','pp-title',t('profile.title')));
  panel.appendChild(hdr);

  var body=el('div','pp-body');

  // ── Hero section ──────────────────────────────
  var hero=el('div','pp-hero');
  var avatar=el('div','pp-avatar');
  if(S.user.avatar){
    var img=document.createElement('img');
    img.src=S.user.avatar;img.alt='';img.referrerPolicy='no-referrer';img.crossOrigin='anonymous';
    avatar.appendChild(img);
  }else{
    // Initials fallback
    var initials=(S.user.name||'?').charAt(0).toUpperCase();
    avatar.textContent=initials;
  }
  hero.appendChild(avatar);
  hero.appendChild(el('div','pp-name-display',S.user.name||''));
  hero.appendChild(el('div','pp-email-display',S.user.email||''));
  var heroSync=el('div','pp-hero-sync');
  var _hsi=_syncStatusInfo();
  if(_hsi){heroSync.style.color=_hsi.col;heroSync.textContent=_hsi.dot+' '+_hsi.txt;}
  else{heroSync.appendChild(icon('fas fa-cloud-upload-alt'));heroSync.appendChild(document.createTextNode(' '+t('profile.synced')));}
  hero.appendChild(heroSync);
  // Stats row
  var statsRow=el('div','pp-stats');
  [[totalRead,t('settings.stats_ayahs'),'fas fa-quran'],
   [streak,t('settings.stats_streak'),'fas fa-fire'],
   [bms.length,t('settings.stats_bookmarks'),'fas fa-bookmark']
  ].forEach(function(s){
    var col=el('div','pp-stat');
    col.appendChild(el('div','pp-stat-num',String(s[0])));
    col.appendChild(el('div','pp-stat-lbl',s[1]));
    statsRow.appendChild(col);
  });
  hero.appendChild(statsRow);
  body.appendChild(hero);

  // Shared message area
  var msg=el('div','pp-msg');msg.id='ppMsg';
  body.appendChild(msg);
  function showPPMsg(text,type){msg.textContent=text;msg.className='pp-msg '+type;msg.scrollIntoView({block:'nearest'})}
  function clearPPMsg(){msg.className='pp-msg';msg.textContent=''}

  // ── Info card ─────────────────────────────────
  var infoSec=el('div','pp-section');
  infoSec.appendChild(el('div','pp-section-title',t('profile.info')));
  var infoCard=el('div','pp-card');
  var provRow=el('div','pp-row');
  provRow.appendChild(el('div','pp-row-label',t('profile.login_method')));
  provRow.appendChild(el('div','pp-row-value',providerLabel));
  infoCard.appendChild(provRow);
  // Member since (async)
  if(S.supabase){
    var sinceRow=el('div','pp-row');
    sinceRow.appendChild(el('div','pp-row-label',t('profile.member_since')));
    var sinceVal=el('div','pp-row-value','…');
    sinceRow.appendChild(sinceVal);
    infoCard.appendChild(sinceRow);
    S.supabase.auth.getUser().then(function(resp){
      if(resp.data&&resp.data.user&&resp.data.user.created_at){
        var d=new Date(resp.data.user.created_at);
        sinceVal.textContent=d.getFullYear()+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0');
      }else{sinceRow.remove();}
    });
  }
  infoSec.appendChild(infoCard);
  body.appendChild(infoSec);

  // ── Edit name ─────────────────────────────────
  var nameSec=el('div','pp-section');
  nameSec.appendChild(el('div','pp-section-title',t('profile.change_name')));
  var nameGroup=el('div','pp-edit-group');
  var nameInput=document.createElement('input');
  nameInput.type='text';nameInput.className='pp-edit-input';nameInput.value=S.user.name||'';nameInput.placeholder=t('profile.name_placeholder');
  nameGroup.appendChild(nameInput);
  var nameMsg=el('div','pp-field-msg');nameGroup.appendChild(nameMsg);
  var nameBtn=el('button','pp-save-btn',t('profile.save'));
  on(nameBtn,'click',function(){
    var v=nameInput.value.trim();
    if(!v){sfm(nameMsg,t('profile.name_placeholder'),'error');return}
    nameBtn.disabled=true;cfm(nameMsg);
    S.supabase.auth.updateUser({data:{full_name:v}}).then(function(resp){
      nameBtn.disabled=false;
      if(resp.error){sfm(nameMsg,resp.error.message,'error');return}
      S.user.name=v;
      S.supabase.from('profiles').update({full_name:v,display_name:v}).eq('id',S.user.id).then(function(){});
      var nd=panel.querySelector('.pp-name-display');if(nd)nd.textContent=v;
      sfm(nameMsg,t('profile.name_changed'),'success');
    }).catch(function(e){nameBtn.disabled=false;sfm(nameMsg,e.message||t('error.generic'),'error')});
  });
  nameGroup.appendChild(nameBtn);
  nameSec.appendChild(nameGroup);
  body.appendChild(nameSec);

  // ── Edit email (email-auth users only) ───────
  if(!isOAuth){
    var emailSec=el('div','pp-section');
    emailSec.appendChild(el('div','pp-section-title',t('profile.change_email')));
    var emailGroup=el('div','pp-edit-group');
    var emailInput=document.createElement('input');
    emailInput.type='email';emailInput.className='pp-edit-input';emailInput.value=S.user.email||'';emailInput.placeholder=t('profile.email_placeholder');
    emailGroup.appendChild(emailInput);
    var emailMsg=el('div','pp-field-msg');emailGroup.appendChild(emailMsg);
    var emailBtn=el('button','pp-save-btn',t('profile.change_email'));
    on(emailBtn,'click',function(){
      var v=emailInput.value.trim();
      if(!v){sfm(emailMsg,t('profile.email_placeholder'),'error');return}
      if(v===S.user.email){sfm(emailMsg,t('profile.new_email'),'error');return}
      emailBtn.disabled=true;cfm(emailMsg);
      S.supabase.auth.updateUser({email:v}).then(function(resp){
        emailBtn.disabled=false;
        if(resp.error){sfm(emailMsg,resp.error.message,'error');return}
        sfm(emailMsg,t('profile.email_sent'),'success');
      }).catch(function(e){emailBtn.disabled=false;sfm(emailMsg,e.message||t('error.generic'),'error')});
    });
    emailGroup.appendChild(emailBtn);
    emailSec.appendChild(emailGroup);
    body.appendChild(emailSec);
  }

  // ── Change password (email users only) ────────
  if(!isOAuth){
    var passSec=el('div','pp-section');
    passSec.appendChild(el('div','pp-section-title',t('profile.change_pass')));
    var passGroup=el('div','pp-edit-group');
    var passInput=document.createElement('input');
    passInput.type='password';passInput.className='pp-edit-input';passInput.placeholder=t('profile.new_pass');
    var passConfirm=document.createElement('input');
    passConfirm.type='password';passConfirm.className='pp-edit-input';passConfirm.placeholder=t('profile.confirm_pass');
    passGroup.appendChild(passInput);passGroup.appendChild(passConfirm);
    var passMsg=el('div','pp-field-msg');passGroup.appendChild(passMsg);
    var passBtn=el('button','pp-save-btn',t('profile.change_pass_btn'));
    on(passBtn,'click',function(){
      var p1=passInput.value,p2=passConfirm.value;
      if(!p1||p1.length<6){sfm(passMsg,t('profile.pass_min'),'error');return}
      if(p1!==p2){sfm(passMsg,t('profile.pass_mismatch'),'error');return}
      passBtn.disabled=true;cfm(passMsg);
      S.supabase.auth.updateUser({password:p1}).then(function(resp){
        passBtn.disabled=false;
        if(resp.error){sfm(passMsg,resp.error.message,'error');return}
        passInput.value='';passConfirm.value='';
        sfm(passMsg,t('profile.pass_changed'),'success');
      }).catch(function(e){passBtn.disabled=false;sfm(passMsg,e.message||t('error.generic'),'error')});
    });
    passGroup.appendChild(passBtn);
    passSec.appendChild(passGroup);
    body.appendChild(passSec);
  }

  // ── Your Devices ──────────────────────────────
  var devSec=el('div','pp-section');
  // Title row with refresh button
  var devTitleRow=el('div','pp-section-title-row');
  devTitleRow.appendChild(el('span',null,t('profile.devices_title')));
  var devRefreshBtn=el('button','pp-devices-refresh');
  devRefreshBtn.title=t('profile.devices_refresh')||'نوێکردنەوە';
  devRefreshBtn.appendChild(icon('fas fa-rotate-right'));
  devTitleRow.appendChild(devRefreshBtn);
  devSec.appendChild(devTitleRow);
  var devList=el('div','pp-devices-list');
  devSec.appendChild(devList);
  // "Log out all others" button lives below devList; keep a ref so loadDevices can update it
  var _devAllOutHolder=el('div',null);
  devSec.appendChild(_devAllOutHolder);
  // Note: devices only appear after they open this version of the app
  var devNote=el('div','pp-devices-note');
  devNote.appendChild(icon('fas fa-circle-info'));
  devNote.appendChild(document.createTextNode(' '+(t('profile.devices_note')||'ئامێرەکان دەکەونە لیستەکە کاتێک نوێترین وەشانی ئەپ کردنەوە')));
  devSec.appendChild(devNote);
  body.appendChild(devSec);

  var STALE_MS=14*24*60*60*1000; // 14 days
  var ONLINE_MS=10*60*1000;       // 10 min = "active now"

  function _loadDevices(){
    clear(devList);
    var devLoading=el('div','pp-devices-loading');
    devLoading.appendChild(icon('fas fa-circle-notch fa-spin'));
    devLoading.appendChild(document.createTextNode(' '+t('profile.devices_loading')));
    devList.appendChild(devLoading);
    devRefreshBtn.disabled=true;

    S.supabase.from('user_sessions')
      .select('id,device_id,platform,device_label,last_active_at,created_at')
      .eq('user_id',S.user.id)
      .order('last_active_at',{ascending:false})
      .then(function(resp){
        devRefreshBtn.disabled=false;
        clear(devList);
        clear(_devAllOutHolder);
        if(resp.error||!resp.data||!resp.data.length){
          devList.appendChild(el('div','pp-devices-empty',t('profile.devices_none')));
          return;
        }
        var myId=_getDeviceId();
        resp.data.forEach(function(sess){
          var isThis=sess.device_id===myId;
          var lastActive=new Date(sess.last_active_at);
          var age=Date.now()-lastActive.getTime();
          var isOnline=age<ONLINE_MS;
          var isStale=!isThis&&age>STALE_MS;
          var rowCls='pp-device-row'+(isThis?' pp-device-row--current':'')+(isStale?' pp-device-row--stale':'');
          var row=el('div',rowCls);
          var dLeft=el('div','pp-device-left');
          var dIco=el('div','pp-device-icon');
          dIco.appendChild(icon(
            sess.platform==='android'?'fas fa-mobile-screen-button':
            sess.platform==='ios'?'fab fa-apple':'fas fa-desktop'));
          dLeft.appendChild(dIco);
          var dInfo=el('div','pp-device-info');
          var dName=el('div','pp-device-name',sess.device_label||sess.platform||'Web');
          if(isThis){dName.appendChild(el('span','pp-device-badge',t('profile.this_device')));}
          else if(isOnline){dName.appendChild(el('span','pp-device-badge pp-device-badge--online',t('profile.device_online')||'چالاک'));}
          dInfo.appendChild(dName);
          // Time row: relative + absolute date for older entries
          var timeEl=el('div','pp-device-time');
          if(isThis){
            timeEl.textContent=t('profile.time_now')||'ئێستا';
          }else if(isOnline){
            var dot=el('span','pp-device-online-dot');
            timeEl.appendChild(dot);
            timeEl.appendChild(document.createTextNode(t('profile.device_active_now')||'ئێستا چالاکە'));
          }else{
            var rel=_timeAgo(lastActive);
            var abs=lastActive.toLocaleDateString()+' '+lastActive.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
            if(isStale){
              timeEl.textContent=rel+' — '+(t('profile.device_stale')||'(inactive)');
            }else{
              timeEl.textContent=rel+' · '+abs;
            }
          }
          dInfo.appendChild(timeEl);
          dLeft.appendChild(dInfo);
          row.appendChild(dLeft);
          if(!isThis){
            var rmBtn=el('button','pp-device-remove');
            rmBtn.title=t('profile.device_remove')||'دەرکردن';
            rmBtn.appendChild(icon('fas fa-right-from-bracket'));
            (function(sid,rowEl,btn){
              var confirmed=false,timer=null;
              function reset(){
                confirmed=false;clearTimeout(timer);
                btn.className='pp-device-remove';
                clear(btn);btn.appendChild(icon('fas fa-right-from-bracket'));
              }
              on(btn,'click',function(){
                if(!confirmed){
                  confirmed=true;
                  btn.className='pp-device-remove pp-device-remove--confirm';
                  clear(btn);btn.appendChild(icon('fas fa-check'));
                  timer=setTimeout(reset,3000);
                }else{
                  clearTimeout(timer);btn.disabled=true;
                  S.supabase.from('user_sessions').delete()
                    .eq('id',sid).eq('user_id',S.user.id)
                    .then(function(r){
                      if(r.error){btn.disabled=false;reset();return;}
                      rowEl.classList.add('pp-device-row--gone');
                      setTimeout(function(){if(rowEl.parentNode)rowEl.parentNode.removeChild(rowEl);},280);
                    });
                }
              });
            })(sess.id,row,rmBtn);
            row.appendChild(rmBtn);
          }
          devList.appendChild(row);
        });
        var otherCount=resp.data.filter(function(s){return s.device_id!==myId;}).length;
        if(otherCount>0){
          var allOutBtn=el('button','pp-device-all-out');
          allOutBtn.appendChild(icon('fas fa-circle-xmark'));
          allOutBtn.appendChild(document.createTextNode(' '+t('profile.logout_all_others')));
          (function(btn){
            var confirmed=false,timer=null;
            function reset(){
              confirmed=false;clearTimeout(timer);
              btn.className='pp-device-all-out';
              clear(btn);
              btn.appendChild(icon('fas fa-circle-xmark'));
              btn.appendChild(document.createTextNode(' '+t('profile.logout_all_others')));
            }
            on(btn,'click',function(){
              if(!confirmed){
                confirmed=true;
                btn.className='pp-device-all-out pp-device-all-out--confirm';
                clear(btn);
                btn.appendChild(icon('fas fa-check'));
                btn.appendChild(document.createTextNode(' '+t('profile.logout_all_confirm')));
                timer=setTimeout(reset,3000);
              }else{
                clearTimeout(timer);btn.disabled=true;
                S.supabase.from('user_sessions').delete()
                  .eq('user_id',S.user.id).neq('device_id',myId)
                  .then(function(r){
                    if(r.error){btn.disabled=false;reset();return;}
                    Array.from(devList.querySelectorAll('.pp-device-row:not(.pp-device-row--current)')).forEach(function(rw){
                      if(rw.parentNode)rw.parentNode.removeChild(rw);
                    });
                    btn.style.display='none';
                    toast(t('profile.logout_all_done'));
                  });
              }
            });
          })(allOutBtn);
          _devAllOutHolder.appendChild(allOutBtn);
        }
      }).catch(function(){
        devRefreshBtn.disabled=false;
        clear(devList);
        devList.appendChild(el('div','pp-devices-empty',t('profile.devices_error')));
      });
  }

  on(devRefreshBtn,'click',_loadDevices);
  _loadDevices();

  // ── Actions ───────────────────────────────────
  var actSec=el('div','pp-section');
  actSec.appendChild(el('div','pp-section-title',t('profile.actions')));
  var actWrap=el('div','pp-actions');

  var syncBtn=el('button','pp-action-btn');
  syncBtn.appendChild(icon('fas fa-sync'));
  syncBtn.appendChild(document.createTextNode(' '+t('profile.sync')));
  on(syncBtn,'click',function(){App.forceSync()});
  actWrap.appendChild(syncBtn);

  var logoutBtn=el('button','pp-action-btn pp-logout');
  logoutBtn.appendChild(icon('fas fa-sign-out-alt'));
  logoutBtn.appendChild(document.createTextNode(' '+t('profile.logout')));
  on(logoutBtn,'click',function(){App.logout();});
  actWrap.appendChild(logoutBtn);

  // ── Downloads / Storage ─────────────────────────────────
  if(window.AudioDownloads){
    var dlStats=AudioDownloads.getAllStats();
    var dlSec=el('div','pp-section');
    dlSec.appendChild(el('div','pp-section-title',t('dl.section')));
    var dlCard=el('div','pp-card');
    if(!dlStats.length){
      var emptyRow=el('div','pp-row');
      emptyRow.appendChild(el('div','pp-row-label',t('dl.no_reciters')));
      dlCard.appendChild(emptyRow);
    } else {
      var totalBytes=dlStats.reduce(function(s,r){return s+r.bytes;},0);
      var totalRow=el('div','pp-row');
      totalRow.appendChild(el('div','pp-row-label',t('dl.storage_used')));
      totalRow.appendChild(el('div','pp-row-value',AudioDownloads.fmtBytes(totalBytes)));
      dlCard.appendChild(totalRow);
      dlStats.forEach(function(r){
        var row=el('div','pp-dl-row');
        var info=el('div','pp-dl-info');
        info.appendChild(el('div','pp-dl-name',(r.flag?r.flag+' ':'')+r.name));
        info.appendChild(el('div','pp-dl-size',AudioDownloads.fmtBytes(r.bytes)+(r.full?' · '+t('dl.full_quran'):' · '+r.surahs+' '+t('dl.surahs'))));
        row.appendChild(info);
        var ppDlMgr=el('button','pp-dl-mgr');
        ppDlMgr.appendChild(icon('fas fa-sliders'));
        ppDlMgr.title=t('dl.manage');
        (function(rid){on(ppDlMgr,'click',function(){App.closeProfile();openDlSheet(rid);});})(r.id);
        row.appendChild(ppDlMgr);
        var delBtn=el('button','pp-dl-del');
        delBtn.appendChild(icon('fas fa-trash'));
        delBtn.title=t('dl.remove');
        (function(rid){
          on(delBtn,'click',function(){
            AudioDownloads.deleteReciter(rid).then(function(){
              renderProfile(panel);
              toast(t('toast.dl_removed'));
            });
          });
        })(r.id);
        row.appendChild(delBtn);
        dlCard.appendChild(row);
      });
    }
    dlSec.appendChild(dlCard);
    body.appendChild(dlSec);
  }

  // Separator before destructive action
  actWrap.appendChild(el('div','pp-actions-sep'));

  // ── Delete account — custom inline confirm (iOS WKWebView blocks confirm()) ──
  var deleteWrap=el('div','pp-delete-wrap');

  var deleteBtn=el('button','pp-action-btn pp-delete');
  deleteBtn.addEventListener('click',function(){
    console.log('[deleteAccount] button clicked — showing confirm step 1');
    deleteBtn.style.display='none';
    confirmStep1.style.display='';
  });
  deleteBtn.appendChild(icon('fas fa-trash-alt'));
  deleteBtn.appendChild(document.createTextNode(' '+t('profile.delete_account')));

  // Step 1 — first confirmation
  var confirmStep1=el('div','pp-delete-confirm');
  confirmStep1.style.display='none';
  var step1Txt=el('p','pp-delete-confirm-txt',t('profile.confirm_delete1'));
  var step1Yes=el('button','pp-delete-confirm-yes',t('profile.confirm_delete1_yes')||t('profile.confirm_delete_yes')||'بەلێ، بەردەوام بە');
  var step1No =el('button','pp-delete-confirm-no', t('profile.confirm_no')||'نەخێر');
  step1Yes.addEventListener('click',function(){
    console.log('[deleteAccount] step 1 confirmed — showing step 2');
    confirmStep1.style.display='none';
    confirmStep2.style.display='';
  });
  step1No.addEventListener('click',function(){
    console.log('[deleteAccount] step 1 cancelled');
    confirmStep1.style.display='none';
    deleteBtn.style.display='';
  });
  confirmStep1.appendChild(step1Txt);
  confirmStep1.appendChild(step1Yes);
  confirmStep1.appendChild(step1No);

  // Step 2 — final confirmation before irreversible action
  var confirmStep2=el('div','pp-delete-confirm');
  confirmStep2.style.display='none';
  var step2Txt=el('p','pp-delete-confirm-txt',t('profile.confirm_delete2'));
  var step2Yes=el('button','pp-delete-confirm-yes pp-delete-confirm-final',t('profile.confirm_delete_yes')||'سڕینەوەی ئەکاونت');
  var step2No =el('button','pp-delete-confirm-no', t('profile.confirm_no')||'نەخێر');
  step2No.addEventListener('click',function(){
    console.log('[deleteAccount] step 2 cancelled');
    confirmStep2.style.display='none';
    deleteBtn.style.display='';
  });
  step2Yes.addEventListener('click',function(){
    console.log('[deleteAccount] step 2 confirmed — sending delete request');
    confirmStep2.style.display='none';
    step2Yes.disabled=true;
    msg.className='pp-msg';
    msg.textContent=t('profile.deleting')||'...';

    S.supabase.auth.getSession().then(function(resp){
      var accessToken=resp&&resp.data&&resp.data.session&&resp.data.session.access_token;
      if(!accessToken){
        console.error('[deleteAccount] no access token');
        deleteBtn.style.display='';
        msg.textContent=t('error.generic');msg.className='pp-msg error';
        return;
      }
      console.log('[deleteAccount] sending request to Edge Function');
      return fetch('https://gijupzejtbpifjzwadee.supabase.co/functions/v1/delete-account',{
        method:'POST',
        headers:{'Authorization':'Bearer '+accessToken,'Content-Type':'application/json'}
      }).then(function(r){
        console.log('[deleteAccount] response received, status:',r.status);
        if(!r.ok)return r.json().then(function(d){throw new Error(d.error||('HTTP '+r.status));});
        return r.json();
      }).then(function(result){
        if(!result.success)throw new Error(result.error||t('error.generic'));
        return S.supabase.auth.signOut().catch(function(){});
      }).then(function(){
        console.log('[deleteAccount] success — closing profile');
        S.user=null;stopCloudSync();App.closeProfile();
        toast(t('toast.account_deleted'));renderSettings();
      });
    }).catch(function(e){
      console.error('[deleteAccount] error:',e);
      deleteBtn.style.display='';
      msg.textContent=e.message||t('error.generic');msg.className='pp-msg error';
    });
  });
  confirmStep2.appendChild(step2Txt);
  confirmStep2.appendChild(step2Yes);
  confirmStep2.appendChild(step2No);

  deleteWrap.appendChild(deleteBtn);
  deleteWrap.appendChild(confirmStep1);
  deleteWrap.appendChild(confirmStep2);
  actWrap.appendChild(deleteWrap);
  actSec.appendChild(actWrap);
  body.appendChild(actSec);

  panel.appendChild(body);
}
