/**
 * Ikon lucide berdasarkan nama yang disimpan di database (kolom icon m_module / m_menu).
 * Hanya ikon yang terdaftar di peta ini yang ikut dibundel; nama tidak dikenal memakai ikon kotak.
 *
 * Dipakai di: components/layout/AppSidebar.tsx, halaman master modul dan menu (poin 1.13).
 */
import {
  BookOpen,
  Box,
  Building2,
  CalendarClock,
  ClipboardList,
  Database,
  FlaskConical,
  HandHeart,
  History,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  ListOrdered,
  Menu,
  Package,
  Pill,
  Receipt,
  Settings,
  Shield,
  Stethoscope,
  TestTube,
  UserCog,
  UserPlus,
  UserRound,
  Users,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';

const APP_ICONS: Record<string, LucideIcon> = {
  'book-open': BookOpen,
  'building-2': Building2,
  'calendar-clock': CalendarClock,
  'clipboard-list': ClipboardList,
  database: Database,
  'flask-conical': FlaskConical,
  'hand-heart': HandHeart,
  history: History,
  'key-round': KeyRound,
  'layout-dashboard': LayoutDashboard,
  'layout-grid': LayoutGrid,
  'list-ordered': ListOrdered,
  menu: Menu,
  package: Package,
  pill: Pill,
  receipt: Receipt,
  settings: Settings,
  shield: Shield,
  stethoscope: Stethoscope,
  'test-tube': TestTube,
  'user-cog': UserCog,
  'user-plus': UserPlus,
  'user-round': UserRound,
  users: Users,
};

export function AppIcon({ icon, ...props }: { icon: string | null } & LucideProps) {
  const Icon = (icon && APP_ICONS[icon]) || Box;
  return <Icon {...props} />;
}
