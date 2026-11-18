/* ============================================================
   Speed Queen Palermo — Logica app
   ============================================================ */
const CONFIG = {
  deliveryDay: 0,            // 0=Domenica
  deliveryDayName: 'domenica mattina',
  weeksAhead: 6,
  maxDeliveries: 4,          // max consegne per domenica
  pickupWindow: '09:30 - 10:00',    // orario ritiri
  deliveryWindow: '12:00 - 12:30',  // orario consegne
  maxDistanceKm: 2,          // raggio massimo dalla lavanderia
  // Coordinate lavanderia (Via Sebastiano La Franca 16, Palermo) — DA AFFINARE se serve
  shop: { lat: 38.10890, lon: 13.36100 },             // quante settimane di prenotazione mostrare
  slogans: [
    'Il tuo bucato. Una cosa in meno.',
    'Lava, asciuga, e torna a vivere.',
    'Una lavatrice piena, una giornata libera.',
    'Piumoni, coperte e tende: tutto come nuovo.',
    'Freschezza all’ozono, pulito che si sente.',
    'Il tempo è tuo. Al bucato pensiamo noi.'
  ],
  promos: [
    { t: 'Fidelity Card', d: 'Ogni ciclo costa meno. Chiedila in sede.', em: '💳', c: 'linear-gradient(135deg,#E5322A,#b91f18)' },
    { t: 'Martedì leggero', d: 'Asciugatura scontata nelle ore tranquille.', em: '🔥', c: 'linear-gradient(135deg,#E58A1F,#c26a08)' },
    { t: 'Porta un amico', d: 'Nuovo iscritto con te? Vantaggio per entrambi.', em: '🤝', c: 'linear-gradient(135deg,#1f9d57,#157a41)' },
    { t: 'Pet Corner', d: 'Macchine dedicate ai tuoi amici a 4 zampe.', em: '🐾', c: 'linear-gradient(135deg,#5b57d6,#403cb0)' }
  ]
};

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------------- BOOT ---------------- */
window.addEventListener('load', async () => {
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('sw.js'); } catch (_) {}
  }
  const user = await DB.getUser();
  if (user) startApp(user); else showGate();
});

/* ---------------- GATE / REGISTRAZIONE ---------------- */
function showGate() {
  $('#gate').hidden = false;
  $('#app').hidden = true;

  $('#reg-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const err = $('#reg-err');
    err.hidden = true;

    const data = {
      nome: f.nome.value, cognome: f.cognome.value,
      email: f.email.value, telefono: f.telefono.value,
      data_nascita: f.data_nascita.value, luogo_nascita: f.luogo_nascita.value,
      consenso_privacy: f.consenso_privacy.checked,
      consenso_marketing: f.consenso_marketing.checked
    };

    const problem = validateUser(data);
    if (problem) { err.textContent = problem; err.hidden = false; return; }

    const saved = await DB.saveUser(data);
    startApp(saved);
    toast('Benvenuto, ' + saved.nome + '! 👋', 'Profilo creato. Ora hai la tua Fidelity Card.');
  });

  $('#open-privacy').addEventListener('click', openPrivacy);
  $('#privacy-close').addEventListener('click', closePrivacy);
  $('#privacy-bg').addEventListener('click', (e) => { if (e.target.id === 'privacy-bg') closePrivacy(); });
}

function validateUser(d) {
  if (!d.nome || !d.cognome) return 'Inserisci nome e cognome.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return 'Inserisci un indirizzo email valido.';
  if ((d.telefono || '').replace(/\D/g, '').length < 7) return 'Inserisci un numero di telefono valido.';
  if (!d.data_nascita) return 'Inserisci la data di nascita.';
  const age = (Date.now() - new Date(d.data_nascita)) / 31557600000;
  if (age < 16 || age > 120) return 'Controlla la data di nascita.';
  if (!d.luogo_nascita) return 'Inserisci il luogo di nascita.';
  if (!d.consenso_privacy) return 'Per registrarti devi accettare l’informativa privacy.';
  return null;
}

/* ---------------- AVVIO APP ---------------- */
let CURRENT = null;
function startApp(user) {
  CURRENT = user;
  $('#gate').hidden = true;
  $('#app').hidden = false;

  // testi dinamici
  $('#hello').textContent = 'Ciao ' + user.nome + ' 👋';
  $('#card-name').textContent = (user.nome + ' ' + user.cognome).toUpperCase();
  $('#profile-name').textContent = user.nome + ' ' + user.cognome;
  $$('#delivery-day-txt, #delivery-day-txt2').forEach(el => el.textContent = 'ogni ' + CONFIG.deliveryDayName);
  $$('.dd-name').forEach(el => el.textContent = CONFIG.deliveryDayName);

  rotateSlogan();
  renderPromos();
  initMachines();
  initNav();
  initPrenota();
  initCard();
  initProfilo();
  initMisc();
  clockLoop();
}

/* ---------------- SLOGAN ---------------- */
function rotateSlogan() {
  let i = 0;
  const el = $('#slogan');
  el.textContent = CONFIG.slogans[0];
  setInterval(() => {
    i = (i + 1) % CONFIG.slogans.length;
    el.style.opacity = 0;
    setTimeout(() => { el.textContent = CONFIG.slogans[i]; el.style.opacity = 1; }, 250);
  }, 4200);
  el.style.transition = 'opacity .25s';
}

/* ---------------- PROMO ---------------- */
function renderPromos() {
  $('#promo-rail').innerHTML = CONFIG.promos.map(p =>
    `<div class="pcard" style="background:${p.c}"><span class="pc-em">${p.em}</span><h4>${p.t}</h4><p>${p.d}</p></div>`
  ).join('');
}

/* ---------------- MACCHINE ---------------- */
const MAC = [
  { id: 3, type: 'wash', cap: '8 kg', st: 'free' },
  { id: 1, type: 'wash', cap: '15 kg', st: 'busy', left: 720, tot: 1920 },
  { id: 2, type: 'wash', cap: '8 kg', st: 'free' },
  { id: 4, type: 'wash', cap: '18 kg', st: 'busy', left: 1500, tot: 2400 },
  { id: 5, type: 'wash', cap: '8 kg', st: 'free' },
  { id: 6, type: 'wash', cap: '15 kg', st: 'free' },
  { id: 7, type: 'wash', cap: '8 kg', st: 'busy', left: 95, tot: 1800 },
  { id: 8, type: 'wash', cap: '18 kg', st: 'off' },
  { id: 9, type: 'wash', cap: '8 kg', st: 'free' },
  { id: 11, type: 'dry', cap: '15 kg', st: 'free' },
  { id: 12, type: 'dry', cap: '15 kg', st: 'busy', left: 360, tot: 600 },
  { id: 13, type: 'dry', cap: '15 kg', st: 'free' },
  { id: 14, type: 'dry', cap: '15 kg', st: 'busy', left: 210, tot: 600 },
  { id: 15, type: 'dry', cap: '15 kg', st: 'free' }
];
let macFilter = 'all';
const notified = {};

function fmt(s) { const m = Math.floor(s / 60), x = s % 60; return m + ':' + String(x).padStart(2, '0'); }
function macIcon(t) {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="2.5" width="16" height="19" rx="2.5"/><circle cx="12" cy="13" r="5"/>${t === 'wash' ? '<circle cx="12" cy="13" r="2"/>' : '<path d="M9 13c1-1.5 2-1.5 3 0s2 1.5 3 0"/>'}<path d="M7 5.5h2"/></svg>`;
}

function initMachines() {
  $('#filter').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    macFilter = b.dataset.f;
    $$('#filter button').forEach(c => c.classList.toggle('on', c === b));
    renderMachines();
  });
  const bg = $('#sheetbg'), sheet = $('#sheet');
  $('#sh-cancel').addEventListener('click', closeSheet);
  bg.addEventListener('click', closeSheet);

  renderMachines();
  setInterval(() => {
    let changed = false;
    MAC.forEach(m => {
      if (m.st === 'busy') {
        m.left -= 1;
        if (m.left <= 0) {
          m.st = 'free';
          if (!notified[m.id]) { notified[m.id] = 1; toast('Bucato pronto! ✅', (m.type === 'wash' ? 'Lavatrice' : 'Asciugatrice') + ' ' + m.id + ' ha finito.'); }
        }
        changed = true;
      }
    });
    if (changed) renderMachines();
  }, 1000);
}

function renderMachines() {
  const free = MAC.filter(m => m.st === 'free');
  $('#free-wash').textContent = free.filter(m => m.type === 'wash').length;
  $('#free-dry').textContent = free.filter(m => m.type === 'dry').length;

  const list = MAC.filter(m => macFilter === 'all' || m.type === macFilter);
  $('#machines').innerHTML = list.map(m => {
    const label = m.type === 'wash' ? 'Lavatrice' : 'Asciugatrice';
    if (m.st === 'free')
      return `<div class="mac isfree" data-id="${m.id}"><div class="top"><div class="ico">${macIcon(m.type)}</div><span class="pill free">Libera</span></div><div class="num">${label} · ${m.id}</div><div class="cap">${m.cap}</div><div class="go">Avvia ora →</div></div>`;
    if (m.st === 'off')
      return `<div class="mac"><div class="top"><div class="ico" style="opacity:.5">${macIcon(m.type)}</div><span class="pill off">Manutenz.</span></div><div class="num">${label} · ${m.id}</div><div class="cap">${m.cap}</div><div class="go" style="color:var(--off)">Non disponibile</div></div>`;
    const pct = Math.max(2, 100 - (m.left / m.tot * 100));
    return `<div class="mac"><div class="top"><div class="ico">${macIcon(m.type)}</div><span class="pill busy">In uso</span></div><div class="num">${label} · ${m.id}</div><div class="cap">${m.cap}</div><div class="timer">${fmt(m.left)} <small>min</small></div><div class="bar"><i style="width:${pct}%"></i></div></div>`;
  }).join('');

  $$('#machines .mac.isfree').forEach(el => el.addEventListener('click', () => openSheet(+el.dataset.id)));
}

let sheetMac = null;
function openSheet(id) {
  sheetMac = MAC.find(m => m.id === id);
  const label = sheetMac.type === 'wash' ? 'Lavatrice' : 'Asciugatrice';
  $('#sh-title').textContent = label + ' ' + sheetMac.cap;
  $('#sh-sub').textContent = 'Macchina n° ' + sheetMac.id + ' · libera ora';
  $('#sh-price').textContent = sheetMac.type === 'wash' ? '5,00 €' : '1,50 €';
  $('#sheetbg').classList.add('show');
  $('#sheet').classList.add('show');
}
function closeSheet() { $('#sheetbg').classList.remove('show'); $('#sheet').classList.remove('show'); }
$('#sh-start') && $('#sh-start').addEventListener('click', async () => {
  if (sheetMac) {
    sheetMac.st = 'busy'; sheetMac.tot = 1920; sheetMac.left = 1920; notified[sheetMac.id] = 0;
    const price = sheetMac.type === 'wash' ? 5 : 1.5;
    await DB.addMovimento({ label: (sheetMac.type === 'wash' ? 'Lavatrice ' : 'Asciugatrice ') + sheetMac.id, delta: -price, risparmio: 1, icon: '🧺' });
    renderMachines(); renderWallet();
  }
  closeSheet();
  toast('Lavaggio avviato 🧺', 'Ti avvisiamo quando il bucato è pronto.');
});

/* ---------------- NAVIGAZIONE ---------------- */
const SCREENS = { home: 's-home', macchine: 's-macchine', prenota: 's-prenota', card: 's-card', profilo: 's-profilo' };
function go(tab) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#' + SCREENS[tab]).classList.add('active');
  $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  $('#screen-wrap').scrollTop = 0;
}
function initNav() {
  $('#tabbar').addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (b) go(b.dataset.t); });
  document.body.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go]'); if (!t) return;
    const v = t.dataset.go;
    if (v === 'prezzi-open') { go('profilo'); openPrezzi(true); }
    else if (v === 'info-call') { toast('Chiamaci', '091 205162 · info@speedqueenpalermo.it'); }
    else if (SCREENS[v]) go(v);
  });
}

/* ---------------- PRENOTA DOMICILIO ---------------- */
function itDate(d) {
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}
// data locale in formato yyyy-mm-dd (evita lo slittamento di fuso di toISOString)
function isoLocal(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
// distanza in km tra due coordinate (formula di Haversine)
function distKm(a, b) {
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
// prossime domeniche prenotabili: entro sabato 24:00 = prima che inizi la domenica
function nextDeliveryDates() {
  const out = []; const now = new Date();
  const d = new Date(); d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 70 && out.length < CONFIG.weeksAhead; i++) {
    const day = new Date(d); day.setDate(d.getDate() + i);
    if (day.getDay() !== CONFIG.deliveryDay) continue;
    if (now.getTime() < day.getTime()) out.push(day); // cutoff: inizio della domenica
  }
  return out;
}

let distOk = false;      // indirizzo verificato entro i 2 km
let distValue = null;

async function initPrenota() {
  $('#si-pickup').textContent = CONFIG.pickupWindow.replace('-', '–');
  $('#si-delivery').textContent = CONFIG.deliveryWindow.replace('-', '–');
  $('#book-form').telefono.value = CURRENT.telefono || '';

  await fillDates();
  $('#book-date').addEventListener('change', updateSlots);
  $('#book-form').indirizzo.addEventListener('input', () => {
    distOk = false; distValue = null; $('#dist-status').hidden = true;
  });
  $('#verify-dist').addEventListener('click', verifyDistance);
  $('#book-form').addEventListener('submit', onBookSubmit);
  renderBookings();
}

async function fillDates() {
  const sel = $('#book-date');
  const prev = sel.value;
  const dates = nextDeliveryDates();
  const bookings = await DB.getBookings();
  const opts = dates.map(d => {
    const iso = isoLocal(d);
    const used = bookings.filter(b => b.data_ritiro === iso && b.stato !== 'annullata').length;
    const left = CONFIG.maxDeliveries - used;
    const label = itDate(d) + (left > 0 ? ` · ${left} posti` : ' · completo');
    return `<option value="${iso}" ${left <= 0 ? 'disabled' : ''}>${label}</option>`;
  });
  sel.innerHTML = opts.length ? opts.join('') : '<option value="">Nessuna domenica disponibile</option>';
  if (prev) sel.value = prev;
  updateSlots();
}

async function slotsLeft(iso) {
  const bookings = await DB.getBookings();
  const used = bookings.filter(b => b.data_ritiro === iso && b.stato !== 'annullata').length;
  return CONFIG.maxDeliveries - used;
}

async function updateSlots() {
  const iso = $('#book-date').value;
  if (!iso) { $('#slots-left').textContent = '—'; return; }
  const left = await slotsLeft(iso);
  $('#slots-left').textContent = left + ' / ' + CONFIG.maxDeliveries;
}

function verifyDistance() {
  const s = $('#dist-status'); s.hidden = false;
  if (!navigator.geolocation) { s.className = 'dist-status ko'; s.textContent = 'Geolocalizzazione non disponibile su questo dispositivo.'; return; }
  s.className = 'dist-status wait'; s.textContent = 'Rilevo la posizione…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const km = distKm(CONFIG.shop, { lat: pos.coords.latitude, lon: pos.coords.longitude });
      distValue = km;
      if (km <= CONFIG.maxDistanceKm) {
        distOk = true; s.className = 'dist-status ok';
        s.textContent = `✓ Sei nella zona (${km.toFixed(1)} km dalla lavanderia).`;
      } else {
        distOk = false; s.className = 'dist-status ko';
        s.textContent = `✗ Fuori zona: ${km.toFixed(1)} km (max ${CONFIG.maxDistanceKm} km). Prenotazione non disponibile.`;
      }
    },
    () => { distOk = false; s.className = 'dist-status ko'; s.textContent = 'Non riesco a leggere la posizione. Attiva la localizzazione e riprova.'; },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

async function onBookSubmit(e) {
  e.preventDefault();
  const f = e.target; const err = $('#book-err'); err.hidden = true;
  const iso = f.data_ritiro.value;
  const fail = (msg) => { err.textContent = msg; err.hidden = false; };

  if (!CURRENT) return fail('Devi essere registrato per prenotare.');
  if (!iso) return fail('Seleziona una domenica disponibile.');
  if (!f.indirizzo.value.trim()) return fail('Inserisci l’indirizzo di ritiro.');
  if (f.telefono.value.replace(/\D/g, '').length < 7) return fail('Inserisci un telefono valido.');
  if (!distOk) return fail('Verifica che l’indirizzo sia entro 2 km con “Verifica distanza”.');
  const left = await slotsLeft(iso);
  if (left <= 0) { await fillDates(); return fail('Posti esauriti per questa domenica. Scegli un’altra data.'); }

  await DB.addBooking({
    email: CURRENT.email,
    nome: CURRENT.nome + ' ' + CURRENT.cognome,
    data_ritiro: iso,
    pickup: CONFIG.pickupWindow,
    delivery: CONFIG.deliveryWindow,
    indirizzo: f.indirizzo.value,
    telefono: f.telefono.value,
    note: f.note.value,
    distanza_km: distValue != null ? +distValue.toFixed(2) : null
  });
  f.indirizzo.value = ''; f.note.value = '';
  distOk = false; distValue = null; $('#dist-status').hidden = true;
  await fillDates();
  renderBookings();
  toast('Prenotazione inviata ✅', 'Ritiro domenica ' + CONFIG.pickupWindow + '. Attendi conferma.');
}

async function renderBookings() {
  const list = await DB.getBookings();
  const box = $('#bookings-list');
  if (!list.length) { box.innerHTML = '<div class="empty">Non hai ancora prenotazioni.</div>'; return; }
  box.innerHTML = list.map(b => {
    const d = new Date(b.data_ritiro + 'T00:00:00');
    const stLabel = { in_attesa: 'In attesa', confermata: 'Confermata', annullata: 'Annullata' }[b.stato];
    const win = b.pickup ? `Ritiro ${b.pickup} · Consegna ${b.delivery || ''}` : (b.fascia_oraria || '');
    return `<div class="bk"><div class="bi">🚚</div><div style="flex:1;min-width:0">
      <div class="bt">Ritiro a domicilio</div>
      <div class="bd">${itDate(d)}<br>${win}<br>${b.indirizzo}</div>
      ${b.stato !== 'annullata' ? `<button class="bk-cancel" data-cancel="${b.id}">Annulla</button>` : ''}
    </div><span class="st ${b.stato}">${stLabel}</span></div>`;
  }).join('');
  $$('#bookings-list [data-cancel]').forEach(btn => btn.addEventListener('click', async () => {
    await DB.cancelBooking(btn.dataset.cancel); await fillDates(); renderBookings(); toast('Prenotazione annullata', '');
  }));
}

/* ---------------- CARD / WALLET ---------------- */
function initCard() {
  $('#btn-ricarica').addEventListener('click', async () => {
    await DB.addMovimento({ label: 'Ricarica (demo)', delta: 10, icon: '💳' });
    renderWallet();
    toast('Ricarica demo +10 €', 'In sede ricarichi alla cassa automatica.');
  });
  renderWallet();
}
async function renderWallet() {
  const w = await DB.getWallet();
  $('#wallet-bal').textContent = w.saldo.toFixed(2).replace('.', ',') + ' €';
  $('#wallet-saved').textContent = w.risparmiato.toFixed(2).replace('.', ',') + ' €';
  const box = $('#wallet-moves');
  if (!w.movimenti.length) { box.innerHTML = '<div class="empty">Nessun movimento.</div>'; return; }
  box.innerHTML = w.movimenti.slice(0, 12).map(m => {
    const neg = m.delta < 0;
    const val = (neg ? '−' : '+') + Math.abs(m.delta).toFixed(2).replace('.', ',') + ' €';
    const when = new Date(m.when).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `<div class="hist"><div class="hi">${m.icon || '•'}</div><div><div class="ht">${m.label}</div><div class="hd">${when}</div></div><div class="hv ${neg ? '' : 'plus'}">${val}</div></div>`;
  }).join('');
}

/* ---------------- PROFILO ---------------- */
function initProfilo() {
  const u = CURRENT;
  const bd = u.data_nascita ? new Date(u.data_nascita + 'T00:00:00').toLocaleDateString('it-IT') : '—';
  $('#profile-data').innerHTML = [
    ['Email', u.email], ['Telefono', u.telefono], ['Data di nascita', bd],
    ['Luogo di nascita', u.luogo_nascita],
    ['Promozioni', u.consenso_marketing ? 'Attive' : 'Disattivate']
  ].map(([k, v]) => `<div class="dl"><span class="dk">${k}</span><span class="dv">${v || '—'}</span></div>`).join('');

  $('#toggle-prezzi').addEventListener('click', () => openPrezzi());
  $('#open-privacy2').addEventListener('click', openPrivacy);
  $('#logout').addEventListener('click', async () => {
    await DB.clearUser();
    location.reload();
  });
}
function openPrezzi(force) {
  const box = $('#prezzi-box'), chev = $('#toggle-prezzi .chev');
  const open = force === true ? true : box.hidden;
  box.hidden = !open; chev.textContent = open ? '−' : '＋';
}

/* ---------------- MISC: toast, privacy, clock, bell ---------------- */
let toastTimer;
function toast(t, d) {
  $('#toast-t').textContent = t; $('#toast-d').textContent = d;
  const el = $('#toast'); el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3800);
}
function openPrivacy() { $('#privacy-bg').classList.add('show'); }
function closePrivacy() { $('#privacy-bg').classList.remove('show'); }
function initMisc() {
  $('#bell').addEventListener('click', () => toast('Notifiche', 'Ti avviseremo qui quando il bucato è pronto.'));
  $('#toast').addEventListener('click', () => $('#toast').classList.remove('show'));
  $('#privacy-close').addEventListener('click', closePrivacy);
  $('#privacy-bg').addEventListener('click', (e) => { if (e.target.id === 'privacy-bg') closePrivacy(); });
}
function clockLoop() {
  const set = () => {
    const h = new Date().getHours();
    $('#store-state').textContent = (h >= 7 && h < 23) ? 'Aperto ora' : 'Chiuso ora';
  };
  set(); setInterval(set, 60000);
}
