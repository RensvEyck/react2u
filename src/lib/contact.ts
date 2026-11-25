/**
 * De contactgegevens als de instelling `site_settings.contact` ontbreekt.
 *
 * Een eigen module, los van lib/content.ts: de onderhoudspagina
 * (lib/maintenance.ts) heeft alleen dit nodig, en die wordt in de middleware
 * gebundeld. Via content.ts zou daar ook supabase-js in meekomen, en dat is
 * precies de bibliotheek die het publieke pad niet meer laadt.
 */
export const CONTACT_FALLBACK = {
  phone: "0856205800",
  phoneDisplay: "085 - 620 58 00",
  email: "info@react2u.nl",
  addressLine1: "Stratumsedijk 29",
  addressLine2: "5611 NB Eindhoven",
  kvk: "95076824",
  btw: "NL866991906B01",
  iban: "NL67INGB0107832259",
};
export type ContactInfo = typeof CONTACT_FALLBACK;
