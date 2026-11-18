# Speed Queen Palermo — App (PWA)

App web installabile (PWA) per la lavanderia self-service **Speed Queen Palermo**
(Via Sebastiano La Franca, 16 · Policlinico · tel. 091 205162).

Funziona su **iPhone, Android e computer**: si apre nel browser e si può
"installare" sulla schermata Home come una vera app, anche offline.

## Cosa fa l'app

- **Registrazione utente** — nome, cognome, email, telefono, data e luogo di
  nascita, con **consenso privacy** obbligatorio (GDPR) e consenso marketing facoltativo.
- **Macchine in tempo reale** — lavatrici/asciugatrici libere o in uso, con conto
  alla rovescia e notifica "bucato pronto" *(dati dimostrativi finché le macchine non sono collegate)*.
- **Ritiro a domicilio** — prenotazione del ritiro/consegna, **un giorno a settimana
  (mercoledì), solo su prenotazione**, con scelta di data, fascia oraria e indirizzo.
- **Fidelity Card digitale** — saldo, risparmio, movimenti.
- **Promozioni & slogan** — vetrina offerte e messaggi che invogliano a lavare/asciugare.
- **Profilo** — dati utente, listino prezzi, contatti, informativa privacy, logout.

## Come provarla subito (in locale)

Serve un piccolo server web (il service worker non parte aprendo il file direttamente).
Dentro la cartella `pwa/`:

```bash
npx serve
```

oppure:

```bash
python -m http.server 8080
```

Poi apri l'indirizzo mostrato (es. `http://localhost:3000`) sul telefono o sul computer.

## Come pubblicarla online (gratis)

La cartella `pwa/` contiene **solo file statici**: si pubblica ovunque.

- **Netlify** — trascina la cartella `pwa/` su https://app.netlify.com/drop → link pronto.
- **Vercel** — `vercel` dentro la cartella.
- **GitHub Pages** — carica i file in un repo e attiva Pages.

Dopo la pubblicazione, dal telefono: *Condividi → Aggiungi a schermata Home*.

## Collegare il database (Supabase) — passo successivo

Oggi i dati sono salvati sul dispositivo (localStorage) per poter provare tutto.
Per salvarli nel **database reale**:

1. Creare un progetto Supabase dedicato (isolato dagli altri).
2. Eseguire lo schema in [`supabase-schema.sql`](supabase-schema.sql) (tabelle `profiles` e `bookings`).
3. In [`data.js`](data.js) inserire URL e chiave anon e attivare le righe segnate `// >>> SUPABASE`.

Il resto dell'app **non va modificato**: le funzioni dati sono già asincrone e
pronte allo scambio.

## Struttura file

```
pwa/
├─ index.html              # struttura e schermate
├─ styles.css              # stile (tema chiaro/scuro, mobile-first)
├─ app.js                  # logica: registrazione, macchine, prenotazioni, card
├─ data.js                 # livello dati (localStorage ora, Supabase-ready)
├─ manifest.webmanifest    # identità PWA (nome, icone, colori)
├─ sw.js                   # service worker (offline + installabilità + push)
├─ supabase-schema.sql     # schema database pronto
└─ icons/                  # icone app
```

## Note privacy (GDPR)

L'app raccoglie dati personali (incluse data e luogo di nascita). Prima della
pubblicazione reale far validare l'**informativa privacy** (testo di esempio in
`index.html`) e definire tempi di conservazione e gestione delle richieste di cancellazione.
