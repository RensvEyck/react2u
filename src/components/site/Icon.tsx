import {
  LuRoute, LuMap, LuStethoscope, LuMessagesSquare, LuPencilLine, LuScale, LuHeart, LuUserRound,
  LuCheck, LuSprout, LuHandHelping, LuLightbulb, LuShieldCheck, LuGraduationCap, LuClipboardCheck,
  LuUsers, LuCompass, LuAward,
} from "react-icons/lu";
import type { IconType } from "react-icons";

// De namen staan in de blokdata in de database (bv. `icon: "route"`); hernoem
// ze dus niet. Een nieuwe naam toevoegen kan altijd.
const ICONS: Record<string, IconType> = {
  route: LuRoute,
  map: LuMap,
  "first-aid": LuStethoscope,
  comments: LuMessagesSquare,
  edit: LuPencilLine,
  "balance-scale": LuScale,
  heart: LuHeart,
  user: LuUserRound,
  check: LuCheck,
  leaf: LuSprout,
  helping: LuHandHelping,
  lightbulb: LuLightbulb,
  shield: LuShieldCheck,
  training: LuGraduationCap,
  clipboard: LuClipboardCheck,
  users: LuUsers,
  compass: LuCompass,
  award: LuAward,
};

export default function Icon({ name, className }: { name?: string; className?: string }) {
  const Cmp = (name && ICONS[name]) || LuCheck;
  return <Cmp className={className} aria-hidden="true" />;
}
