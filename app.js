// Volley: gedeelde code voor bewaren, kiezen en afspelen.
// Het geheugen is een Google-blad achter een Apps Script (zie apps-script/Code.gs).
// Met de koppeling "demo" werkt alles met voorbeeldfilmpjes in deze browser.

const V = (() => {
  const opslag = (k, v) => {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch (e) { /* privévenster of geblokkeerd: dan maar zonder */ }
    return null;
  };
  const leesJson = (k, standaard) => { try { return JSON.parse(opslag(k)) ?? standaard; } catch (e) { return standaard; } };

  const instelling = () => ({ api: opslag('volley.api'), k: opslag('volley.k') });
  const gekoppeld = () => !!instelling().api;
  const isDemo = () => instelling().api === 'demo';

  function koppel(api, k) { opslag('volley.api', api); opslag('volley.k', k || ''); }

  // ---- links herkennen (zelfde regels als in het script) ----

  function zoekLink(s) {
    const m = String(s || '').match(/https?:\/\/[^\s"'<>]+/);
    return m ? m[0].replace(/[).,!?]+$/, '') : '';
  }

  function herken(link) {
    let m;
    if (/instagram\.com/i.test(link)) {
      m = link.match(/instagram\.com\/(?:[A-Za-z0-9._]+\/)?(reels?|p|tv)\/([A-Za-z0-9_-]+)/i);
      if (m) {
        const soort = m[1].toLowerCase() === 'p' ? 'p' : 'reel';
        return { bron: 'instagram', embed: soort + '/' + m[2], link: `https://www.instagram.com/${soort}/${m[2]}/` };
      }
      return { bron: 'instagram', embed: '', link };
    }
    if (/tiktok\.com/i.test(link)) {
      m = link.match(/\/video\/(\d+)/);
      const maker = (link.match(/tiktok\.com\/@([A-Za-z0-9._]+)/) || [])[1];
      return { bron: 'tiktok', embed: m ? m[1] : '', link: link.split('?')[0], maker: maker ? '@' + maker : '' };
    }
    m = link.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
    if (m) return { bron: 'youtube', embed: m[1], link: 'https://youtu.be/' + m[1], beeld: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` };
    return { bron: 'link', embed: '', link };
  }

  // Het adres van de speler die het filmpje rechtstreeks van Instagram, TikTok of YouTube toont.
  function speler(f, { auto = true } = {}) {
    if (!f || !f.embed) return null;
    if (f.bron === 'tiktok') {
      return `https://www.tiktok.com/player/v1/${f.embed}?loop=1&autoplay=${auto ? 1 : 0}&muted=1&music_info=0&description=0&rel=0&native_context_menu=0&closed_caption=0`;
    }
    if (f.bron === 'instagram') return `https://www.instagram.com/${f.embed}/embed/`;
    if (f.bron === 'youtube') {
      return `https://www.youtube-nocookie.com/embed/${f.embed}?autoplay=${auto ? 1 : 0}&mute=1&loop=1&playlist=${f.embed}&playsinline=1&rel=0&modestbranding=1`;
    }
    return null;
  }

  const bronNaam = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', link: 'Link' };

  function naamVan(f) {
    if (f.naam) return f.naam;
    return `${bronNaam[f.bron] || 'Filmpje'} van ${datum(f.bewaard)}`;
  }

  const dagen = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  function datum(iso, metDag = false) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return (metDag ? dagen[d.getDay()] + ' ' : '') + d.getDate() + '/' + (d.getMonth() + 1);
  }

  // ---- praten met het geheugen ----

  async function vraag(a, data = {}) {
    const { api, k } = instelling();
    if (!api) throw new Error('niet-gekoppeld');
    if (api === 'demo') return Demo.vraag(a, data);
    const r = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // zo vraagt de browser geen voorafgaande toestemming
      body: JSON.stringify({ ...data, a, k })
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.fout || 'fout');
    return j;
  }

  async function lijst() {
    const j = await vraag('lijst');
    opslag('volley.laatste', JSON.stringify({ filmpjes: j.filmpjes, training: j.training }));
    return j;
  }
  const laatsteLijst = () => leesJson('volley.laatste', null);

  const bewaar = (tekst, link) => vraag('bewaar', { tekst, link });
  const wijzig = (id, velden) => vraag('wijzig', { id, velden });
  const training = (naam, filmpjes) => vraag('training', { naam, filmpjes });

  // Wat niet doorging (geen internet), blijft op het toestel tot de volgende keer.
  const wachtrij = {
    lees: () => leesJson('volley.wachtrij', []),
    voegToe(item) { const w = wachtrij.lees(); w.push(item); opslag('volley.wachtrij', JSON.stringify(w)); },
    async verstuur() {
      const w = wachtrij.lees();
      if (!w.length || !gekoppeld()) return 0;
      const over = [];
      let gelukt = 0;
      for (const item of w) {
        try { await bewaar(item.tekst, item.link); gelukt++; } catch (e) { over.push(item); }
      }
      opslag('volley.wachtrij', JSON.stringify(over));
      return gelukt;
    }
  };

  // ---- voorbeeldfilmpjes, voor de demo ----

  const Demo = {
    beginstand() {
      const nu = Date.now();
      const dag = 864e5;
      const f = (id, maker, naam, dagenGeleden) => ({
        id: 'd' + id.slice(-6), bewaard: new Date(nu - dagenGeleden * dag).toISOString(), bron: 'tiktok',
        link: `https://www.tiktok.com/${maker}/video/${id}`, embed: id, naam, maker, beeld: '', verborgen: false
      });
      const filmpjes = [
        f('7455320130151828782', '@kivavb', 'Hoek van de arm bij het passen', 1),
        f('7450478065806773550', '@coachchijo', 'Opslag en receptie in golven', 2),
        f('7285060374452358406', '@ace.volleyball', 'Opwarming met drie, 15 op rij', 3),
        f('7296919673461902597', '@cameronperformance', '', 5),
        f('7173907357863316779', '@the_jumpstar', '', 12)
      ];
      return { filmpjes, trainingen: [] };
    },
    stand() {
      let s = leesJson('volley.demo', null);
      if (!s) { s = Demo.beginstand(); Demo.bewaarStand(s); }
      return s;
    },
    bewaarStand(s) { opslag('volley.demo', JSON.stringify(s)); },
    async vraag(a, data) {
      await new Promise(r => setTimeout(r, 250));
      const s = Demo.stand();
      if (a === 'lijst') return { ok: true, filmpjes: s.filmpjes, training: s.trainingen[s.trainingen.length - 1] || null };
      if (a === 'bewaar') {
        const link = zoekLink(data.link) || zoekLink(data.tekst);
        if (!link) throw new Error('geen-link');
        const info = herken(link);
        const dubbel = s.filmpjes.find(x => (info.embed && x.bron === info.bron && x.embed === info.embed) || x.link === info.link);
        if (dubbel) { dubbel.verborgen = false; Demo.bewaarStand(s); return { ok: true, filmpje: { ...dubbel, dubbel: true } }; }
        const nieuw = { id: Math.random().toString(16).slice(2, 10), bewaard: new Date().toISOString(), naam: '', maker: '', beeld: '', verborgen: false, ...info };
        s.filmpjes.unshift(nieuw);
        Demo.bewaarStand(s);
        return { ok: true, filmpje: nieuw };
      }
      if (a === 'wijzig') {
        const x = s.filmpjes.find(y => y.id === data.id);
        if (!x) throw new Error('niet-gevonden');
        Object.assign(x, data.velden);
        Demo.bewaarStand(s);
        return { ok: true, filmpje: x };
      }
      if (a === 'training') {
        const t = { id: Math.random().toString(16).slice(2, 10), gemaakt: new Date().toISOString(), naam: data.naam, filmpjes: data.filmpjes };
        s.trainingen.push(t);
        Demo.bewaarStand(s);
        return { ok: true, training: t };
      }
      throw new Error('onbekend');
    }
  };

  // ---- kleine hulpjes voor de pagina's ----

  function el(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null) e.append(kid.nodeType ? kid : document.createTextNode(kid));
    return e;
  }

  function registreer() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  return {
    opslag, instelling, gekoppeld, isDemo, koppel, zoekLink, herken, speler, bronNaam, naamVan, datum,
    lijst, laatsteLijst, bewaar, wijzig, training, wachtrij, el, registreer
  };
})();
