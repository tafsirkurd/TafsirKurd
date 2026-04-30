adminTranslationsAPI('bulk_update_by_key', {
  items: [
    { key_id: 'notif_body_new_episode', fields: { kurdish_text: 'وانێ نوی بەردەستە 🎬', page: 'notifications', category: 'notifications' } },
    { key_id: 'notif_body_new_book',    fields: { kurdish_text: 'کتێبێ نوی بەردەستە 📚', page: 'notifications', category: 'notifications' } },
    { key_id: 'notif_body_new_hadith',  fields: { kurdish_text: 'حەدیسێ نوی بەردەستە 📜', page: 'notifications', category: 'notifications' } },
    { key_id: 'badge_new',              fields: { kurdish_text: 'نوی', page: 'mobile', category: 'ui' } },
    { key_id: 'gencine.hadith',         fields: { kurdish_text: 'حەدیس', page: 'mobile', category: 'gencine' } },
    { key_id: 'gencine.hadith_sub',     fields: { kurdish_text: 'فەرمودێن پێغەمبەرێ ئیسلامێ', page: 'mobile', category: 'gencine' } }
  ]
}).then(r => console.log('✅', r)).catch(e => console.error('❌', e));
