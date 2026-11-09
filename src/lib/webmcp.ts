/**
 * WebMCP-tools op de publieke aanvraagformulieren (declaratieve API,
 * https://developer.chrome.com/docs/ai/webmcp/declarative-api). In een browser
 * met WebMCP kan een AI-agent zo'n formulier herkennen en invullen voor de
 * bezoeker; de veldnamen komen uit `name`, de omschrijvingen uit de labels.
 * Er staat bewust geen `toolautosubmit` op: de bezoeker ziet het ingevulde
 * formulier en verstuurt het zelf (en doet zo ook de Turnstile-controle).
 *
 * De omschrijvingen zijn Engels: ze zijn voor het taalmodel, niet voor de
 * bezoeker, en staan zo los van de taal van de pagina.
 */
export const WEBMCP = {
  contact: {
    toolname: "send_contact_message",
    tooldescription:
      "Send a message to React2u, an occupational health and absence management service (arbodienst) in Eindhoven, the Netherlands. " +
      "Use this for general questions. React2u replies by e-mail or phone on working days.",
  },
  kennismaken: {
    toolname: "request_introduction_and_quote",
    tooldescription:
      "Request an introductory meeting and a quote from React2u for an employer: absence management, prevention, re-integration, HR advice or payroll. " +
      "React2u responds within two working days.",
  },
  partner: {
    toolname: "join_partner_program",
    tooldescription:
      "Sign up an accountancy or HR advisory firm for the React2u partner program, to refer employers who need absence management.",
  },
} as const;

/** Het lokveld tegen spam (`website`): een agent moet het leeg laten, net als een mens. */
export const LOKVELD = { toolparamdescription: "Leave this field empty." } as const;

/** Het privacyvinkje: het label bevat een link en levert zo geen omschrijving op. Instemmen blijft aan de bezoeker. */
export const PRIVACYVINKJE = {
  toolparamdescription: "Consent to the React2u privacy statement. Only tick this when the user has agreed to it.",
} as const;
