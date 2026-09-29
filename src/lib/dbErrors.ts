/**
 * Bestaat de tabel (nog) niet? PostgREST meldt dat als PGRST205, Postgres zelf
 * als 42P01. Gebruikt om schermen netjes te laten wachten op een migratie die
 * nog niet gedraaid is, in plaats van ze te laten crashen.
 */
export function isMissingTable(error: { code?: string } | null | undefined): boolean {
  return error?.code === "PGRST205" || error?.code === "42P01";
}
