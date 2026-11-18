/* ============================================================
   Speed Queen Palermo — Livello dati (Data Layer)
   ------------------------------------------------------------
   OGGI: i dati sono salvati nel dispositivo (localStorage), così
   l'app è subito funzionante e provabile.

   DOMANI (quando colleghiamo Supabase): basta sostituire il corpo
   di questi metodi con le chiamate al database. Le firme restano
   identiche (sono già asincrone / Promise), quindi il resto
   dell'app NON va modificato. I punti da cambiare sono segnati
   con "// >>> SUPABASE".
   ============================================================ */

const DB = (() => {
  const K_USER = 'sq_user';
  const K_BOOKINGS = 'sq_bookings';
  const K_WALLET = 'sq_wallet';

  // ---- Helper localStorage sicuri ----
  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (_) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (_) { return false; }
  }

  /* ---------------------------------------------------------
     SUPABASE (predisposizione, non attivo finché non collegato)
     Per attivare: creare le tabelle con supabase-schema.sql,
     poi scommentare e inserire URL + anon key qui sotto.
  ----------------------------------------------------------
  const SUPABASE_URL = 'https://xxxx.supabase.co';
  const SUPABASE_ANON_KEY = 'xxxxx';
  let sb = null;
  // import o <script> di @supabase/supabase-js, poi:
  // sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  --------------------------------------------------------- */

  return {
    /* ===================== UTENTE ===================== */
    async getUser() {
      // >>> SUPABASE: const { data } = await sb.auth.getUser(); ...
      return read(K_USER, null);
    },

    async saveUser(user) {
      const record = {
        nome: (user.nome || '').trim(),
        cognome: (user.cognome || '').trim(),
        email: (user.email || '').trim().toLowerCase(),
        telefono: (user.telefono || '').trim(),
        data_nascita: user.data_nascita || '',
        luogo_nascita: (user.luogo_nascita || '').trim(),
        consenso_privacy: !!user.consenso_privacy,
        consenso_marketing: !!user.consenso_marketing,
        created_at: new Date().toISOString()
      };
      // >>> SUPABASE:
      //   await sb.auth.signUp({ email, password })  (o OTP)
      //   await sb.from('profiles').insert(record)
      write(K_USER, record);
      if (!read(K_WALLET, null)) write(K_WALLET, { saldo: 0, risparmiato: 0, movimenti: [] });
      return record;
    },

    async clearUser() {
      try { localStorage.removeItem(K_USER); } catch (_) {}
      return true;
    },

    /* ===================== PRENOTAZIONI DOMICILIO ===================== */
    async getBookings() {
      // >>> SUPABASE: const { data } = await sb.from('bookings').select('*').order('created_at',{ascending:false});
      return read(K_BOOKINGS, []);
    },

    async addBooking(b) {
      const list = read(K_BOOKINGS, []);
      const record = {
        id: 'bk_' + Date.now(),
        tipo: 'ritiro_consegna',                  // ritiro + riconsegna
        email: (b.email || '').trim().toLowerCase(), // utente registrato
        nome: (b.nome || '').trim(),
        data_ritiro: b.data_ritiro,               // ISO yyyy-mm-dd (domenica)
        pickup: b.pickup || '',                   // orario ritiro (fisso)
        delivery: b.delivery || '',               // orario consegna (fisso)
        indirizzo: (b.indirizzo || '').trim(),
        telefono: (b.telefono || '').trim(),
        distanza_km: (typeof b.distanza_km === 'number') ? b.distanza_km : null,
        note: (b.note || '').trim(),
        stato: 'in_attesa',                       // in_attesa | confermata | annullata
        created_at: new Date().toISOString()
      };
      // >>> SUPABASE: await sb.from('bookings').insert(record)
      list.unshift(record);
      write(K_BOOKINGS, list);
      return record;
    },

    async cancelBooking(id) {
      const list = read(K_BOOKINGS, []);
      const i = list.findIndex((x) => x.id === id);
      if (i >= 0) { list[i].stato = 'annullata'; write(K_BOOKINGS, list); }
      // >>> SUPABASE: await sb.from('bookings').update({stato:'annullata'}).eq('id', id)
      return true;
    },

    /* ===================== FIDELITY / WALLET (demo) ===================== */
    async getWallet() {
      return read(K_WALLET, { saldo: 0, risparmiato: 0, movimenti: [] });
    },
    async addMovimento(m) {
      const w = read(K_WALLET, { saldo: 0, risparmiato: 0, movimenti: [] });
      w.movimenti.unshift({ ...m, when: new Date().toISOString() });
      if (typeof m.delta === 'number') w.saldo = Math.max(0, +(w.saldo + m.delta).toFixed(2));
      if (typeof m.risparmio === 'number') w.risparmiato = +(w.risparmiato + m.risparmio).toFixed(2);
      write(K_WALLET, w);
      return w;
    }
  };
})();
