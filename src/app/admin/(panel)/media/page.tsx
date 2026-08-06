import { requirePerm } from "@/lib/admin";
import MediaBeheer from "./MediaBeheer";

/**
 * De mediabibliotheek zelf is een client component (uploaden gebeurt
 * rechtstreeks vanuit de browser naar Supabase Storage). Die kan dus geen
 * rechtencontrole doen. Deze server-wrapper doet dat wél — zonder hem was
 * elke ingelogde gebruiker binnen, ongeacht zijn rol.
 *
 * De echte grens blijft de storage-policy: `has_perm('media')` op
 * storage.objects. Dit voorkomt alleen dat iemand zonder dat recht een scherm
 * te zien krijgt waar niets werkt.
 */
export default async function MediaPage() {
  await requirePerm("media");
  return <MediaBeheer />;
}
