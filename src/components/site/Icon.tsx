import {
  FaRoute, FaRegMap, FaFirstAid, FaRegComments, FaRegEdit, FaBalanceScale,
  FaRegHeart, FaRegUser, FaCheck, FaLeaf, FaHandsHelping, FaRegLightbulb, FaShieldAlt,
} from "react-icons/fa";
import type { IconType } from "react-icons";

const ICONS: Record<string, IconType> = {
  route: FaRoute,
  map: FaRegMap,
  "first-aid": FaFirstAid,
  comments: FaRegComments,
  edit: FaRegEdit,
  "balance-scale": FaBalanceScale,
  heart: FaRegHeart,
  user: FaRegUser,
  check: FaCheck,
  leaf: FaLeaf,
  helping: FaHandsHelping,
  lightbulb: FaRegLightbulb,
  shield: FaShieldAlt,
};

export default function Icon({ name, className }: { name?: string; className?: string }) {
  const Cmp = (name && ICONS[name]) || FaCheck;
  return <Cmp className={className} />;
}
