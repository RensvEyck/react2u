# React2u website

Next.js 16 + Supabase + Tailwind v4. Publieke site op basis van pagina's/blokken uit
Supabase (tabellen: `pages`, `blocks`, `vacancies`, `applications`, `contact_messages`,
`site_settings`) met een beheeromgeving onder `/admin`. Live op Vercel (project "react2u",
team FlexHero); Supabase-project `tumwtappyegkjabtmold`. Databaseschema staat in
`supabase/migrations/`.

## Agent skills

### Issue tracker

Issues live in GitHub Issues via de `gh` CLI (remote nog niet gekoppeld — zie opmerking
in het bestand). See `docs/agents/issue-tracker.md`.

### Triage labels

Standaardlabels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`,
`wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: één `CONTEXT.md` + `docs/adr/` in de repo-root. See `docs/agents/domain.md`.
