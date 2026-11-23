/**
 * Volley: het geheugen achter de app van Bart.
 *
 * Wat het doet: bewaart elk filmpje dat Bart deelt (Instagram, TikTok, YouTube)
 * in een Google-blad, en de training die hij op zijn computer kiest.
 * De app (https://bartclaessens10-sketch.github.io/volley/) praat met dit script.
 *
 * Eenmalig instellen:
 * 1. Voer instellen() uit (maakt het blad en een geheime sleutel).
 * 2. Implementeren > Nieuwe implementatie > Web-app.
 *    Uitvoeren als: ik. Wie heeft toegang: iedereen.
 * 3. Voer koppellink() uit en open de link uit het logboek op je gsm en je computer.
 *
 * Zonder de sleutel geeft het script niets prijs en bewaart het niets.
 */

const APP_ADRES = 'https://bartclaessens10-sketch.github.io/volley/';
// Het adres van de web-app (Implementeren > Implementaties beheren > URL).
// ScriptApp.getService().getUrl() geeft een intern adres dat niet werkt, daarom staat het hier.
const WEBAPP_ADRES = 'https://script.google.com/macros/s/AKfycbwX2mFU0drX2cAXcvZ_Di-Bcq36wQt1z_epR2VRhzYMWFAg30hbbE3CP4bOlMK2aaAirQ/exec';
const KOP_F = ['id', 'bewaard', 'bron', 'link', 'embed', 'naam', 'maker', 'beeld', 'verborgen'];
const KOP_T = ['id', 'gemaakt', 'naam', 'filmpjes'];

function instellen() {
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('SLEUTEL')) p.setProperty('SLEUTEL', Utilities.getUuid().replace(/-/g, ''));
  Logger.log('Blad: ' + blad_().getUrl());
}

function koppellink() {
  const p = PropertiesService.getScriptProperties();
  Logger.log(APP_ADRES + 'instellen.html#api=' + encodeURIComponent(WEBAPP_ADRES) + '&k=' + p.getProperty('SLEUTEL'));
}

// ---- ingang ----

function doGet() {
  return json_({ ok: true, wat: 'Volley. Dit adres werkt alleen via de app.' });
}

function doPost(e) {
  let p = {};
  try { p = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { p = {}; }
  const sleutel = PropertiesService.getScriptProperties().getProperty('SLEUTEL');
  if (!sleutel || p.k !== sleutel) return json_({ ok: false, fout: 'sleutel' });

  const slot = LockService.getScriptLock();
  slot.waitLock(20000);
  try {
    switch (p.a) {
      case 'lijst':
        return json_({ ok: true, filmpjes: filmpjes_(), training: laatsteTraining_() });
      case 'bewaar':
        return json_({ ok: true, filmpje: bewaar_(p.tekst, p.link) });
      case 'wijzig':
        return json_({ ok: true, filmpje: wijzig_(p.id, p.velden || {}) });
      case 'training':
        return json_({ ok: true, training: training_(p.naam, p.filmpjes || []) });
      default:
        return json_({ ok: false, fout: 'onbekend' });
    }
  } catch (err) {
    return json_({ ok: false, fout: String(err && err.message || err) });
  } finally {
    slot.releaseLock();
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// ---- het blad ----

function blad_() {
  const p = PropertiesService.getScriptProperties();
  const id = p.getProperty('BLAD_ID');
  let ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (err) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('Volley · filmpjes en trainingen');
    p.setProperty('BLAD_ID', ss.getId());
    const f = ss.getSheets()[0];
    f.setName('Filmpjes');
    f.getRange('A:I').setNumberFormat('@'); // alles als tekst, anders verminkt Sheets de lange TikTok-nummers
    f.appendRow(KOP_F);
    f.setFrozenRows(1);
    const t = ss.insertSheet('Trainingen');
    t.getRange('A:D').setNumberFormat('@');
    t.appendRow(KOP_T);
    t.setFrozenRows(1);
  }
  return ss;
}

function rijen_(naam, kop) {
  const sh = blad_().getSheetByName(naam);
  const w = sh.getDataRange().getValues();
  return w.slice(1).map((r, i) => {
    const o = { _rij: i + 2 };
    kop.forEach((k, j) => { o[k] = r[j] instanceof Date ? r[j].toISOString() : String(r[j]); });
    return o;
  });
}

function isWaar_(v) { return String(v).toUpperCase() === 'TRUE'; }

function netjes_(r) {
  return {
    id: r.id, bewaard: r.bewaard, bron: r.bron, link: r.link, embed: r.embed,
    naam: r.naam, maker: r.maker, beeld: r.beeld, verborgen: isWaar_(r.verborgen)
  };
}

function filmpjes_() {
  return rijen_('Filmpjes', KOP_F).map(netjes_).reverse(); // nieuwste eerst
}

function laatsteTraining_() {
  const t = rijen_('Trainingen', KOP_T);
  if (!t.length) return null;
  const r = t[t.length - 1];
  return { id: r.id, gemaakt: r.gemaakt, naam: r.naam, filmpjes: r.filmpjes ? r.filmpjes.split(',') : [] };
}

// ---- bewaren ----

function bewaar_(tekst, link) {
  const gevonden = zoekLink_(link) || zoekLink_(tekst);
  if (!gevonden) throw new Error('geen-link');
  const info = herken_(gevonden);
  const sh = blad_().getSheetByName('Filmpjes');
  const alle = rijen_('Filmpjes', KOP_F);
  const dubbel = alle.find(r => (info.embed && r.bron === info.bron && r.embed === info.embed) || r.link === info.link);
  if (dubbel) {
    if (isWaar_(dubbel.verborgen)) {
      sh.getRange(dubbel._rij, KOP_F.indexOf('verborgen') + 1).setValue('FALSE');
      dubbel.verborgen = 'FALSE';
    }
    const uit = netjes_(dubbel);
    uit.dubbel = true;
    return uit;
  }
  const rij = {
    id: Utilities.getUuid().slice(0, 8),
    bewaard: new Date().toISOString(),
    bron: info.bron, link: info.link, embed: info.embed || '',
    naam: info.naam || '', maker: info.maker || '', beeld: info.beeld || '',
    verborgen: 'FALSE'
  };
  sh.appendRow(KOP_F.map(k => rij[k]));
  return netjes_(rij);
}

function zoekLink_(s) {
  const m = String(s || '').match(/https?:\/\/[^\s"'<>]+/);
  return m ? m[0].replace(/[).,!?]+$/, '') : '';
}

function zonderVraag_(u) { return String(u).split('?')[0].split('#')[0]; }

function herken_(link) {
  let m;
  if (/instagram\.com/i.test(link)) {
    m = link.match(/instagram\.com\/(?:[A-Za-z0-9._]+\/)?(reels?|p|tv)\/([A-Za-z0-9_-]+)/i);
    if (m) {
      const soort = m[1].toLowerCase() === 'p' ? 'p' : 'reel';
      return { bron: 'instagram', embed: soort + '/' + m[2], link: 'https://www.instagram.com/' + soort + '/' + m[2] + '/' };
    }
    return { bron: 'instagram', embed: '', link: zonderVraag_(link) };
  }
  if (/tiktok\.com/i.test(link)) {
    let volledig = link;
    let id = '';
    m = link.match(/\/video\/(\d+)/);
    if (m) id = m[1];
    if (!id) {
      try {
        const r = UrlFetchApp.fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(link), { muteHttpExceptions: true });
        if (r.getResponseCode() === 200) id = JSON.parse(r.getContentText()).embed_product_id || '';
      } catch (err) { /* verder met de omleiding */ }
    }
    if (!id) {
      volledig = volg_(link);
      m = volledig.match(/\/video\/(\d+)/);
      if (m) id = m[1];
    }
    const maker = (volledig.match(/tiktok\.com\/@([A-Za-z0-9._]+)/) || [])[1] || '';
    return { bron: 'tiktok', embed: id, link: zonderVraag_(volledig), maker: maker ? '@' + maker : '' };
  }
  m = link.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  if (m) {
    const uit = { bron: 'youtube', embed: m[1], link: 'https://youtu.be/' + m[1], beeld: 'https://i.ytimg.com/vi/' + m[1] + '/hqdefault.jpg' };
    try {
      const r = UrlFetchApp.fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(uit.link), { muteHttpExceptions: true });
      if (r.getResponseCode() === 200) {
        const j = JSON.parse(r.getContentText());
        uit.naam = kort_(j.title);
        uit.maker = j.author_name || '';
      }
    } catch (err) { /* zonder titel */ }
    return uit;
  }
  return { bron: 'link', embed: '', link: link };
}

function volg_(url) {
  let u = url;
  for (let i = 0; i < 5; i++) {
    let r;
    try {
      r = UrlFetchApp.fetch(u, { followRedirects: false, muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14)' } });
    } catch (err) { break; }
    const h = r.getHeaders();
    const naar = h.Location || h.location;
    if (!naar) break;
    u = /^https?:/.test(naar) ? naar : 'https://www.tiktok.com' + naar;
    if (/\/video\/\d+/.test(u)) break;
  }
  return u;
}

function kort_(t) {
  t = String(t || '').replace(/#[^\s#]+/g, '').replace(/\s+/g, ' ').trim();
  if (t.length <= 70) return t;
  return t.slice(0, 70).replace(/\s+\S*$/, '') + '…';
}

// ---- wijzigen en trainingen ----

function wijzig_(id, velden) {
  const sh = blad_().getSheetByName('Filmpjes');
  const r = rijen_('Filmpjes', KOP_F).find(x => x.id === id);
  if (!r) throw new Error('niet-gevonden');
  if ('naam' in velden) {
    r.naam = String(velden.naam).slice(0, 120);
    sh.getRange(r._rij, KOP_F.indexOf('naam') + 1).setValue(r.naam);
  }
  if ('verborgen' in velden) {
    r.verborgen = velden.verborgen ? 'TRUE' : 'FALSE';
    sh.getRange(r._rij, KOP_F.indexOf('verborgen') + 1).setValue(r.verborgen);
  }
  return netjes_(r);
}

function training_(naam, ids) {
  const sh = blad_().getSheetByName('Trainingen');
  const rij = {
    id: Utilities.getUuid().slice(0, 8),
    gemaakt: new Date().toISOString(),
    naam: String(naam || 'Training').slice(0, 80),
    filmpjes: ids.map(String).join(',')
  };
  sh.appendRow(KOP_T.map(k => rij[k]));
  return { id: rij.id, gemaakt: rij.gemaakt, naam: rij.naam, filmpjes: ids.map(String) };
}
