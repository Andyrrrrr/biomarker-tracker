import {
  Activity,
  Apple,
  Bean,
  Droplet,
  Flame,
  FlaskConical,
  HeartPulse,
  Hourglass,
  Mars,
  ShieldCheck,
  SunMedium,
  TestTube,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Icon names stored on categories (src/db/seed/catalog.ts) → Lucide icons.
const ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  apple: Apple,
  bean: Bean,
  droplet: Droplet,
  flame: Flame,
  "flask-conical": FlaskConical,
  "heart-pulse": HeartPulse,
  hourglass: Hourglass,
  mars: Mars,
  "shield-check": ShieldCheck,
  "sun-medium": SunMedium,
  "test-tube": TestTube,
  waves: Waves,
  zap: Zap,
};

export function CategoryIcon({ icon, className }: { icon: string | null; className?: string }) {
  const Icon = (icon && ICONS[icon]) || Activity;
  return <Icon className={className} aria-hidden />;
}
