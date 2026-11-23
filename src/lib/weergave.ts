import "server-only";
import { cookies } from "next/headers";
import { isMijnReact2u, kanWisselen, type Permission } from "./permissions";

/**
 * Welke weergave een collega ziet: Mijn React2u (het werknemersportaal) of
 * Beheer. Een werknemer altijd Mijn React2u; wie kan wisselen, kiest het zelf
 * en dat onthoudt deze browser in een cookie (weergaveActions.ts).
 */
export const WEERGAVE_COOKIE = "r2u_weergave";

export async function inMijnReact2u(permissions: readonly Permission[]): Promise<boolean> {
  if (isMijnReact2u(permissions)) return true;
  if (!kanWisselen(permissions)) return false;
  return (await cookies()).get(WEERGAVE_COOKIE)?.value === "mijn";
}
