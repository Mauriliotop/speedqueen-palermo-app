/* ============================================================
   Speed Queen Palermo — Assistente / Chatbot
   ------------------------------------------------------------
   Assistente basato su parole chiave (nessun costo, nessun
   backend, funziona offline). Conosce le info reali della
   lavanderia e può aprire le sezioni dell'app.

   DOMANI: per un chatbot con AI vera, sostituire replyFor()
   con una chiamata a un backend che interroga il modello
   (la chiave AI non va mai messa nel codice dell'app).
   ============================================================ */
(function () {
  const norm = (s) => (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // via accenti
    .replace(/[^a-z0-9\s]/g, ' ');

  const MAPS_URL = 'https://www.google.com/maps/dir/?api=1&destination=' +
    encodeURIComponent('Via Sebastiano La Franca 16, Palermo');

  // Base di conoscenza: ogni voce ha parole chiave, risposta, e opzionali chip/azione
  const INTENTS = [
    { keys: ['orari', 'orario', 'aperto', 'aperti', 'chiuso', 'quando', 'apre', 'chiude', 'domenica aperto', 'festivi', 'feriali'],
      a: 'Siamo aperti <b>tutti i giorni, dalle 07:00 alle 23:00</b>, orario continuato — anche la domenica e i festivi. 🕖' },

    { keys: ['come lavare', 'lavare', 'lavaggio', 'usare la lavatrice', 'come si lava', 'come funziona la lavatrice', 'fare il bucato', 'primo lavaggio', 'istruzioni lavatrice'],
      a: '<b>Come lavare, passo passo</b> 🧺<br>1. Scegli la lavatrice adatta al carico (8, 15 o 18 kg) — guarda quelle libere nell\'app.<br>2. Dividi i capi (bianchi/colorati, delicati a parte) e non riempirla oltre il bordo.<br>3. Carica il bucato e chiudi bene l\'oblò.<br>4. Metti detersivo (e ammorbidente) nel cassetto.<br>5. Scegli programma e temperatura.<br>6. Paga alla cassa (contanti/carta/Fidelity) e avvia.<br>A fine ciclo ricevi l\'avviso <b>“bucato pronto”</b>.',
      chips: [{ t: 'Vedi macchine libere', go: 'macchine' }, { t: 'Come asciugare', q: 'come asciugare' }] },

    { keys: ['asciug', 'usare asciugatrice', 'quanto tempo asciuga', 'come si asciuga'],
      a: '<b>Come asciugare</b> 🔥<br>1. Scegli un\'asciugatrice libera (15 kg).<br>2. Non sovraccaricarla: i capi devono girare liberi.<br>3. Imposta il tempo: consigliati <b>almeno 20 minuti</b> (un blocco è 10 min).<br>4. Paga/avvia alla cassa.<br>5. Segui le etichette per i capi delicati.<br>Costo asciugatrice 15 kg (10 min): 2,00 € / <b>1,50 € con Fidelity</b>.',
      chips: [{ t: 'Vedi macchine libere', go: 'macchine' }] },

    { keys: ['prezzo', 'prezzi', 'costo', 'costa', 'quanto costa', 'listino', 'tariffe', 'tariffa'],
      a: '<b>Prezzi</b> (Contanti / <b>Fidelity</b>):<br>• Lavatrice 8 kg: 6,00 € / <b>5,00 €</b><br>• Lavatrice 15 kg: 9,00 € / <b>8,00 €</b><br>• Lavatrice 18 kg: 12,00 € / <b>11,00 €</b><br>• Asciugatrice 15 kg (10 min): 2,00 € / <b>1,50 €</b><br>• 🐾 Pet 10 kg: 6,00 € / <b>5,00 €</b>',
      chips: [{ t: 'Vedi listino completo', go: 'prezzi-open' }] },

    { keys: ['acquistare card', 'comprare card', 'avere la card', 'fare la card', 'fare la tessera', 'ottenere la card', 'voglio la card', 'come avere la card', 'nuova card', 'richiedere card'],
      a: '<b>Come avere la Fidelity Card</b> 💳<br>• Richiedila direttamente in lavanderia (o chiama il 091 205162).<br>• Ti dà <b>prezzi ridotti</b> su ogni lavaggio e asciugatura.<br>• Una volta attiva, la usi alla cassa automatica e la gestisci qui nell\'app.',
      chips: [{ t: 'Apri la mia Card', go: 'card' }, { t: 'Come ricaricarla', q: 'ricaricare card' }] },

    { keys: ['ricaric', 'caricare la card', 'mettere credito', 'aggiungere credito', 'credito card', 'ricaricare la tessera'],
      a: '<b>Come ricaricare la Card</b> 💶<br>1. Vai alla <b>cassa automatica</b> in sede.<br>2. Seleziona “Ricarica” e appoggia la card.<br>3. Inserisci contanti o paga con carta.<br>Il credito è <b>subito disponibile</b> per lavaggi e asciugature.',
      chips: [{ t: 'Apri la mia Card', go: 'card' }] },

    { keys: ['fidelity', 'card', 'carta fedelta', 'sconto', 'punti', 'tessera', 'risparmio', 'risparmiare', 'conviene'],
      a: 'Con la <b>Fidelity Card</b> ogni ciclo costa meno 💳. Nell\'app vedi saldo, risparmio e movimenti; la richiedi e ricarichi in sede.',
      chips: [{ t: 'Apri la mia Card', go: 'card' }, { t: 'Come averla', q: 'acquistare card' }, { t: 'Come ricaricarla', q: 'ricaricare card' }] },

    { keys: ['arriv', 'raggiung', 'in auto', 'in macchina', 'parcheggi', 'mezzi', 'autobus', 'bus', 'stazione', 'strada', 'navigatore', 'itinerario'],
      a: '<b>Come raggiungerci</b> — Via Sebastiano La Franca, 16 (zona Policlinico, Palermo) 📍<br>🚗 In auto: dirigiti verso il <b>Policlinico</b>; trovi parcheggio nelle vie limitrofe.<br>🚌 Mezzi: fermate bus nei pressi del Policlinico.<br>🚉 Dalla Stazione Centrale: circa 10 minuti.<br>Tocca “Avvia navigatore”: l\'itinerario parte <b>dalla tua posizione</b>.',
      chips: [{ t: 'Avvia navigatore', maps: true }] },

    { keys: ['dove', 'indirizzo', 'via', 'trovare', 'mappa', 'posizione', 'zona', 'siete', 'ubicazione'],
      a: 'Siamo in <b>Via Sebastiano La Franca, 16</b> — Palermo, zona Policlinico. 📍',
      chips: [{ t: 'Avvia navigatore', maps: true }, { t: 'Come arrivare', q: 'come arrivare' }] },

    { keys: ['domicilio', 'ritiro', 'consegna', 'ritirare', 'passate', 'venite a prendere', 'portate', 'a casa'],
      a: 'Facciamo <b>ritiro e consegna a domicilio</b> 🚚:<br>• solo la <b>domenica mattina</b><br>• prenoti <b>entro il sabato alle 24:00</b><br>• indirizzo <b>entro 2 km</b> dalla lavanderia<br>• ritiro 09:30–10:00, consegna 12:00–12:30<br>• max 4 consegne a domenica',
      chips: [{ t: 'Prenota il ritiro', go: 'prenota' }] },

    { keys: ['come funziona', 'prima volta', 'aiuto', 'guida', 'non so', 'come si fa', 'spiegami', 'istruzioni'],
      a: '<b>Prima volta? Ecco come funziona</b> ✨<br>1. Scegli e carica una lavatrice libera.<br>2. Detersivo + programma, poi paga alla cassa e avvia.<br>3. Asciuga in asciugatrice.<br>Con la <b>Fidelity Card</b> spendi meno. Vuoi i dettagli?',
      chips: [{ t: 'Come lavare', q: 'come lavare' }, { t: 'Come asciugare', q: 'come asciugare' }, { t: 'Fidelity Card', q: 'fidelity' }] },

    { keys: ['detersivo', 'ammorbidente', 'sapone', 'detergente'],
      a: 'Metti detersivo e ammorbidente nell\'apposito cassetto della lavatrice. Puoi portare i tuoi prodotti; chiedi in cassa per quelli disponibili in sede. 🧴' },

    { keys: ['ozono', 'igiene', 'igienizza', 'sanifica', 'pulizia macchine', 'odori', 'pulite'],
      a: 'Le lavatrici usano la <b>tecnologia ad ozono</b> 💨: igienizzazione automatica a ogni ciclo, per contrastare i cattivi odori. Le macchine sono pulite e sicure.' },

    { keys: ['pet', 'cane', 'gatto', 'animale', 'animali', 'zampe', 'cuccia', 'cucce'],
      a: 'Abbiamo il <b>Pet Corner</b> 🐾: lavatrice e asciugatrice dedicate ai tessili dei tuoi animali, separate dalle altre macchine.' },

    { keys: ['macchine', 'libere', 'libera', 'disponibili', 'disponibile', 'posto libero', 'lavatrice libera', 'quante libere', 'c e posto'],
      a: 'Puoi vedere <b>in tempo reale</b> quali lavatrici e asciugatrici sono libere e quanto manca alla fine del ciclo.',
      chips: [{ t: 'Vedi le macchine', go: 'macchine' }] },

    { keys: ['piumone', 'piumoni', 'coperta', 'coperte', 'matrimoniale', 'ingombrante', 'tende', 'grande', 'tappeto'],
      a: 'Sì! Abbiamo macchine professionali <b>fino a 18 kg</b>, perfette per piumoni, coperte, tende e capi ingombranti. 🧺' },

    { keys: ['pagare', 'pagamento', 'contanti', 'bancomat', 'carta di credito', 'pos', 'come si paga', 'come pago'],
      a: 'Paghi come preferisci alla <b>cassa automatica</b>: contanti, carta di credito o <b>Fidelity Card</b>. 💶' },

    { keys: ['telefono', 'chiamare', 'numero', 'contatto', 'contatti', 'email', 'mail', 'assistenza', 'operatore', 'parlare'],
      a: 'Se ti serve, ci trovi al <b>091 205162</b> o via email a <b>info@speedqueenpalermo.it</b> 📞 — ma qui rispondo subito a quasi tutto!' },

    { keys: ['registr', 'account', 'profilo', 'iscriver', 'privacy', 'dati personali'],
      a: 'Il tuo profilo serve per Fidelity Card e prenotazioni. I dati sono trattati secondo l\'informativa privacy e usati solo per i servizi della lavanderia. 🔒',
      chips: [{ t: 'Vai al profilo', go: 'profilo' }] },

    { keys: ['ciao', 'salve', 'buongiorno', 'buonasera', 'hey', 'ehi', 'buondi'],
      a: 'Ciao! 👋 Sono l\'assistente Speed Queen. Posso spiegarti come lavare, asciugare, usare la Card, come arrivare e altro.' },

    { keys: ['grazie', 'perfetto', 'ok grazie', 'gentile', 'ottimo', 'top'],
      a: 'Figurati! 😊 Se ti serve altro sono qui.' }
  ];

  const DEFAULT_CHIPS = [
    { t: 'Come lavare', q: 'come lavare' },
    { t: 'Come asciugare', q: 'come asciugare' },
    { t: 'Fidelity Card', q: 'fidelity' },
    { t: 'Prezzi', q: 'prezzi' },
    { t: 'Come arrivare', q: 'come arrivare' },
    { t: 'Ritiro a domicilio', q: 'domicilio' },
    { t: 'Orari', q: 'orari' }
  ];

  function replyFor(text) {
    const t = norm(text);
    let best = null, bestScore = 0;
    for (const it of INTENTS) {
      let score = 0;
      for (const k of it.keys) if (t.includes(norm(k))) score += norm(k).split(' ').length;
      if (score > bestScore) { bestScore = score; best = it; }
    }
    if (best && bestScore > 0) return { a: best.a, chips: best.chips || null };
    return {
      a: 'Non sono sicuro di aver capito 🤔. Posso aiutarti con <b>orari, prezzi, ritiro a domicilio, Fidelity Card, macchine libere</b> e altro. Oppure chiama il <b>091 205162</b>.',
      chips: null
    };
  }

  // ---- UI ----
  let started = false;
  function el(id) { return document.getElementById(id); }

  function addMsg(html, who) {
    const wrap = el('chat-msgs');
    const d = document.createElement('div');
    d.className = 'cmsg ' + who;
    d.innerHTML = html;
    wrap.appendChild(d);
    wrap.scrollTop = wrap.scrollHeight;
    return d;
  }

  function typing() {
    const d = addMsg('<span class="dot"></span><span class="dot"></span><span class="dot"></span>', 'bot typing');
    return d;
  }

  function renderChips(chips) {
    const box = el('chat-chips');
    box.innerHTML = '';
    (chips || DEFAULT_CHIPS).forEach(c => {
      const b = document.createElement('button');
      b.className = 'cchip';
      b.textContent = c.t;
      b.addEventListener('click', () => {
        if (c.maps) { window.open(MAPS_URL, '_blank'); return; }
        if (c.go) { handleGo(c.go); return; }
        sendUser(c.q || c.t);
      });
      box.appendChild(b);
    });
  }

  function handleGo(target) {
    closeChat();
    if (typeof window.go === 'function') {
      if (target === 'prezzi-open') { window.go('profilo'); if (typeof window.openPrezzi === 'function') window.openPrezzi(true); }
      else if (target === 'info-call') { if (typeof window.toast === 'function') window.toast('Contatti', '091 205162 · info@speedqueenpalermo.it'); }
      else window.go(target);
    }
  }

  function botRespond(text) {
    const t = typing();
    setTimeout(() => {
      t.remove();
      const r = replyFor(text);
      addMsg(r.a, 'bot');
      renderChips(r.chips);
    }, 500);
  }

  function sendUser(text) {
    if (!text.trim()) return;
    addMsg(escapeHtml(text), 'me');
    botRespond(text);
  }

  function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function openChat() {
    el('chat-bg').classList.add('show');
    el('chat').classList.add('show');
    if (!started) {
      started = true;
      const name = (window.CURRENT && window.CURRENT.nome) ? window.CURRENT.nome : '';
      addMsg('Ciao' + (name ? ' ' + escapeHtml(name) : '') + '! 👋 Sono l\'assistente <b>Speed Queen</b>. Chiedimi di orari, prezzi, ritiro a domicilio e altro.', 'bot');
      renderChips(null);
    }
    setTimeout(() => el('chat-text') && el('chat-text').focus(), 200);
  }
  function closeChat() {
    el('chat-bg').classList.remove('show');
    el('chat').classList.remove('show');
  }

  window.addEventListener('load', () => {
    const open = el('chat-open'); if (open) open.addEventListener('click', openChat);
    const close = el('chat-close'); if (close) close.addEventListener('click', closeChat);
    const bg = el('chat-bg'); if (bg) bg.addEventListener('click', closeChat);
    const form = el('chat-form');
    if (form) form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = el('chat-text');
      sendUser(input.value);
      input.value = '';
    });
  });

  // esposto per eventuale uso esterno
  window.openChat = openChat;
})();
