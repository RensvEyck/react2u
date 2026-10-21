/** Van ons ervaringsniveau naar de vaste waarden van LinkedIn. */
export function linkedinNiveau(niveau: string | null | undefined): string {
  const n = (niveau || "").toLowerCase();
  if (n.startsWith("student")) return "INTERNSHIP";
  if (n.startsWith("starter")) return "ENTRY_LEVEL";
  if (n.startsWith("medior")) return n.includes("senior") ? "MID_SENIOR_LEVEL" : "ASSOCIATE";
  if (n.startsWith("senior")) return "MID_SENIOR_LEVEL";
  return "NOT_APPLICABLE";
}
