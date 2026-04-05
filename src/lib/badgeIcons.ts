import {
  Award, Zap, Crown, ChevronsUp, ArrowUpCircle, Flame,
  Anchor, Rocket, Target, Shield, TrendingUp, Star,
} from "lucide-react";

/** Canonical map from icon_name (DB) → Lucide component */
export const BADGE_ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  zap: Zap,
  crown: Crown,
  "chevrons-up": ChevronsUp,
  "arrow-up-circle": ArrowUpCircle,
  flame: Flame,
  anchor: Anchor,
  rocket: Rocket,
  bolt: Zap,
  target: Target,
  shield: Shield,
  "trending-up": TrendingUp,
  star: Star,
  award: Award,
};

/** Returns the Lucide component for a given icon_name, defaults to Award */
export function getBadgeIcon(
  name: string | null,
): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  return name ? (BADGE_ICON_MAP[name.toLowerCase()] ?? Award) : Award;
}
