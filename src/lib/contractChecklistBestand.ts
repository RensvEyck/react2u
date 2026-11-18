import "server-only";
import { supabasePublic } from "./supabase/public";
import { contractUrl, type Bijlage } from "./mail";
import { offerteHuisstijl } from "./offerteHuisstijl";
import { contractChecklistPdf } from "./contractChecklistPdf";
import { checklistPdfNaam, heeftChecklist, type ChecklistStand } from "./contractChecklist";
import { normaliseerOpdrachtgever, type Contract, type ContractPubliek } from "./contracten";

/*
 * De Checklist arbeidsomstandigheden als pdf-bijlage (0042): leeg bij de
 * contractmail en om te printen, ingevuld met de antwoorden van de klant. Via
 * het token en de publieke functies, net als lib/contractGetekend.ts, zodat de
 * klantroute, de beheerroute en de mails precies dezelfde pdf maken.
 */

type Kern = Pick<Contract, "nummer" | "bedrijf" | "opdrachtgever" | "soort" | "token">;

/** De link naar de checklistpagina van dit contract. */
export function checklistUrl(token: string) {
  return `${contractUrl(token)}/checklist`;
}

/** De pdf voor een bekend contract en een bekende stand (het beheer leest beide met zijn eigen sessie). */
export async function checklistPdfBijlage(c: Pick<Kern, "nummer" | "bedrijf" | "opdrachtgever" | "token">, stand: ChecklistStand | null): Promise<Bijlage> {
  const { contact } = await offerteHuisstijl();
  const content = await contractChecklistPdf({
    contract: { nummer: c.nummer, bedrijf: c.bedrijf, opdrachtgever: normaliseerOpdrachtgever(c.opdrachtgever) },
    stand,
    contact,
    link: checklistUrl(c.token),
  });
  return { filename: checklistPdfNaam(c, Boolean(stand)), content };
}

/** De stand van de checklist via het token (null als er nog niets is ingevuld, of als het contract geen checklist heeft). */
export async function checklistStand(token: string): Promise<ChecklistStand | null> {
  const { data } = await supabasePublic().rpc("contract_checklist_bekijken", { p_token: token });
  return (data as ChecklistStand | null) ?? null;
}

/**
 * De pdf via het token, voor de klantroute en de mails: null voor een onbekend
 * token, een concept, een ingetrokken contract of een resellerovereenkomst.
 */
export async function checklistPdfViaToken(token: string, bekend?: ContractPubliek | null): Promise<Bijlage | null> {
  const sb = supabasePublic();
  const c = bekend ?? ((await sb.rpc("contract_bekijken", { p_token: token, p_tel: false })).data as ContractPubliek | null);
  if (!c || c.status === "ingetrokken" || !heeftChecklist(c)) return null;
  const stand = await checklistStand(token);
  return checklistPdfBijlage({ nummer: c.nummer, bedrijf: c.bedrijf, opdrachtgever: c.opdrachtgever, token }, stand);
}
