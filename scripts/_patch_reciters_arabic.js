var fs=require('fs');
var p='C:/TafsirKurd/src/app/app.js';
var c=fs.readFileSync(p,'utf8');

var start=c.indexOf('var RECITERS=[');
var end=c.indexOf('];',start)+2;
if(start===-1){console.log('RECITERS not found');process.exit(1);}

// Arabic names as primary, flag and style kept, no separate ar field needed
var newArr='var RECITERS=[\r\n'+
'  {id:\'Alafasy_128kbps\',              name:\'مشاري العفاسي\',              flag:\'🇰🇼\',style:\'murattal\'},\r\n'+
'  {id:\'Nasser_Alqatami_128kbps\',      name:\'ناصر القطامي\',               flag:\'🇰🇼\',style:\'murattal\'},\r\n'+
'  {id:\'Ahmed_ibn_Ali_al-Ajamy_128kbps-almanar\',name:\'أحمد العجمي\',       flag:\'🇰🇼\',style:\'murattal\'},\r\n'+
'  {id:\'MaherAlMuaiqly128kbps\',        name:\'ماهر المعيقلي\',              flag:\'🇸🇦\',style:\'murattal\'},\r\n'+
'  {id:\'Abdurrahmaan_As-Sudais_192kbps\',name:\'عبد الرحمن السديس\',         flag:\'🇸🇦\',style:\'murattal\'},\r\n'+
'  {id:\'Saood_ash-Shuraym_128kbps\',    name:\'سعود الشريم\',                flag:\'🇸🇦\',style:\'murattal\'},\r\n'+
'  {id:\'Yasser_Ad-Dussary_128kbps\',    name:\'ياسر الدوسري\',               flag:\'🇸🇦\',style:\'murattal\'},\r\n'+
'  {id:\'Hudhaify_128kbps\',             name:\'علي الحذيفي\',                flag:\'🇸🇦\',style:\'murattal\'},\r\n'+
'  {id:\'Abu_Bakr_Ash-Shaatree_128kbps\',name:\'أبو بكر الشاطري\',           flag:\'🇸🇦\',style:\'murattal\'},\r\n'+
'  {id:\'Muhammad_Jibreel_128kbps\',     name:\'محمد جبريل\',                 flag:\'🇸🇦\',style:\'murattal\'},\r\n'+
'  {id:\'Hani_Rifai_192kbps\',           name:\'هاني الرفاعي\',               flag:\'🇸🇦\',style:\'murattal\'},\r\n'+
'  {id:\'Muhammad_Ayyoub_128kbps\',      name:\'محمد أيوب\',                  flag:\'🇸🇦\',style:\'murattal\'},\r\n'+
'  {id:\'Ghamadi_40kbps\',               name:\'سعد الغامدي\',                flag:\'🇸🇦\',style:\'murattal\'},\r\n'+
'  {id:\'Abdullaah_3awwaad_Al-Juhaynee_128kbps\',name:\'عبد الله الجهني\',    flag:\'🇸🇦\',style:\'murattal\'},\r\n'+
'  {id:\'Sahl_Yassin_128kbps\',          name:\'سهل ياسين\',                  flag:\'🇸🇦\',style:\'murattal\'},\r\n'+
'  {id:\'Abdullah_Basfar_192kbps\',      name:\'عبد الله بصفر\',              flag:\'🇸🇦\',style:\'murattal\'},\r\n'+
'  {id:\'Fares_Abbad_64kbps\',           name:\'فارس عباد\',                  flag:\'🇩🇿\',style:\'murattal\'},\r\n'+
'  {id:\'Abdul_Basit_Murattal_192kbps\', name:\'عبد الباسط عبد الصمد\',       flag:\'🇪🇬\',style:\'murattal\'},\r\n'+
'  {id:\'Abdul_Basit_Mujawwad_128kbps\', name:\'عبد الباسط عبد الصمد\',       flag:\'🇪🇬\',style:\'mujawwad\'},\r\n'+
'  {id:\'Minshawy_Murattal_128kbps\',    name:\'محمد المنشاوي\',              flag:\'🇪🇬\',style:\'murattal\'},\r\n'+
'  {id:\'Husary_128kbps\',               name:\'محمود الحصري\',               flag:\'🇪🇬\',style:\'murattal\'},\r\n'+
'  {id:\'Mustafa_Ismail_48kbps\',        name:\'مصطفى إسماعيل\',             flag:\'🇪🇬\',style:\'mujawwad\'},\r\n'+
'  {id:\'Mohammad_al_Tablaway_128kbps\', name:\'محمد الطبلاوي\',              flag:\'🇪🇬\',style:\'murattal\'}\r\n'+
'];';

c=c.slice(0,start)+newArr+c.slice(end);
fs.writeFileSync(p,c,'utf8');
console.log('done');
