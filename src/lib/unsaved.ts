/**
 * Is er ergens werk dat nog niet is opgeslagen?
 *
 * Een editor zet dit aan zolang er wijzigingen openstaan; alles wat binnen de
 * admin navigeert zonder gewone link (het commandopalet, via router.push)
 * vraagt het na. De browser zelf vangt sluiten en herladen af met
 * beforeunload, en klikken op links vangt de editor zelf — maar een
 * programmatische navigatie ziet geen van beide.
 */
let dirty = false;

export function setUnsaved(value: boolean) {
  dirty = value;
}

export const LEAVE_QUESTION = "Je hebt wijzigingen die nog niet zijn opgeslagen. Toch weggaan?";

/** true als er niets openstaat, of als de gebruiker bevestigt dat hij weg wil. */
export function confirmLeave(): boolean {
  return !dirty || window.confirm(LEAVE_QUESTION);
}
