import { werkdagenTekst } from "./koppelingen";

/**
 * Wat de invuller na het versturen te horen krijgt, op het scherm en in de
 * bevestigingsmail: dezelfde zinnen op beide plekken, dus hier op één plek.
 * Je-vorm, kort, geen marketingtaal.
 */
export const BEVESTIGING = {
  offerte: {
    kop: "Bedankt voor je aanvraag",
    tekst: "We bellen je binnen twee werkdagen om kennis te maken en sturen daarna een voorstel op maat.",
    knop: "Plan direct een kennismaking",
  },
  contact: {
    kop: "Bedankt voor je bericht",
    tekst: "We reageren binnen één werkdag.",
  },
  sollicitatie: {
    /** "op Casemanager", of "open sollicitatie" als er geen vacature is. */
    kop: (vacature: string | null | undefined) =>
      vacature && vacature.trim().toLowerCase() !== "open sollicitatie"
        ? `Bedankt voor je sollicitatie op ${vacature.trim()}`
        : "Bedankt voor je open sollicitatie",
    tekst: (werkdagen: number) => `We nemen binnen ${werkdagenTekst(werkdagen)} contact met je op.`,
  },
} as const;

/** Onder een bedankmelding: waar de bevestiging heen is. */
export function bevestigdNaarTekst(email: string) {
  return `We hebben een bevestiging gestuurd naar ${email}.`;
}
