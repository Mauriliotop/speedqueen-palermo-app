-- ============================================================
-- Speed Queen Palermo — Schema database (Supabase / PostgreSQL)
-- Da eseguire nel progetto Supabase dedicato quando lo colleghiamo.
-- (SQL Editor → incolla → Run, oppure come migrazione.)
-- ============================================================

-- 1) PROFILI UTENTE --------------------------------------------------
create table if not exists public.profiles (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  cognome        text not null,
  email          text not null unique,
  telefono       text not null,
  data_nascita   date not null,
  luogo_nascita  text not null,
  consenso_privacy   boolean not null default false,
  consenso_marketing boolean not null default false,
  created_at     timestamptz not null default now()
);

-- 2) PRENOTAZIONI RITIRO/CONSEGNA A DOMICILIO ------------------------
create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  email          text not null references public.profiles(email) on delete cascade,
  nome           text,
  tipo           text not null default 'ritiro_consegna',
  data_ritiro    date not null,                 -- domenica
  pickup         text not null default '09:30 - 10:00',
  delivery       text not null default '12:00 - 12:30',
  indirizzo      text not null,
  telefono       text not null,
  distanza_km    numeric,                        -- distanza dalla lavanderia (max 2 km)
  note           text,
  stato          text not null default 'in_attesa'
                 check (stato in ('in_attesa','confermata','annullata')),
  created_at     timestamptz not null default now()
);

-- Limite max 4 consegne per domenica (da far valere anche lato server):
--   create unique index ... oppure una funzione/trigger che conti le bookings
--   non annullate con stesso data_ritiro e rifiuti l'inserimento oltre 4.

create index if not exists bookings_email_idx on public.bookings(email);
create index if not exists bookings_data_idx  on public.bookings(data_ritiro);

-- 3) SICUREZZA (Row Level Security) ----------------------------------
-- Attivare RLS e definire le policy in base al tipo di autenticazione
-- scelto (Supabase Auth con email, OTP, ecc.). Esempio di base:
alter table public.profiles enable row level security;
alter table public.bookings enable row level security;

-- Ogni utente vede/modifica solo i propri dati (quando si usa Supabase Auth):
--   create policy "profili propri" on public.profiles
--     for all using (auth.jwt() ->> 'email' = email);
--   create policy "prenotazioni proprie" on public.bookings
--     for all using (auth.jwt() ->> 'email' = email);

-- Il personale della lavanderia (ruolo service_role) vede tutto dal
-- pannello Supabase per gestire le prenotazioni.

-- ============================================================
-- NOTA GDPR: data e luogo di nascita, email e telefono sono dati
-- personali. Conservare solo il necessario, raccogliere il consenso
-- (campo consenso_privacy), prevedere cancellazione su richiesta.
-- ============================================================
