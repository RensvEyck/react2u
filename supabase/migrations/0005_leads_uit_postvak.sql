-- De brug tussen het Postvak IN en de bellijst.
--
-- 1. contact_messages krijgt een telefoonnummer. Het contactformulier vraagt er
--    nu om, zodat een bericht — net als een sollicitatie — een belbare lead
--    oplevert. De kolom is nullable: berichten van vóór deze migratie hebben er
--    geen, en die mogen niet ongeldig worden. Het "verplicht" zit in het
--    formulier, niet in het schema.
--
-- 2. leads onthoudt uit welke inzending hij komt. De unieke index is wat de
--    knop in het Postvak IN idempotent maakt: dezelfde inzending kan niet twee
--    keer op de bellijst belanden. Bewust een index en geen controle vooraf —
--    tussen lezen en schrijven kan een tweede klik er alsnog doorheen glippen.
--    Alleen waar source_id gevuld is: handmatig toegevoegde leads hebben er
--    geen, en die mogen niet allemaal op één null-waarde botsen.

alter table public.contact_messages add column phone text;

alter table public.leads add column source_id uuid;

create unique index leads_source_id_idx on public.leads(source_id) where source_id is not null;
