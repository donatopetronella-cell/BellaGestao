import {
  BarChart3,
  Boxes,
  CalendarDays,
  CreditCard,
  Gift,
  LayoutDashboard,
  MessageCircle,
  Megaphone,
  Package,
  Percent,
  Scissors,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
  UserSquare2,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { NavIconName } from '@/config/navigation'

/**
 * Server components cannot hand component references to client components, so
 * the navigation config carries icon *names* and they are resolved here.
 */
export const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  agenda: CalendarDays,
  clients: Users,
  professionals: UserSquare2,
  services: Scissors,
  products: Package,
  inventory: Boxes,
  sales: ShoppingBag,
  cash: Wallet,
  finance: CreditCard,
  commissions: Percent,
  marketing: Megaphone,
  whatsapp: MessageCircle,
  loyalty: Gift,
  reports: BarChart3,
  ai: Sparkles,
  settings: Settings,
}
