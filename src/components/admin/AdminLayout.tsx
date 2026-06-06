import { useState } from 'react';
import Sidebar, { type SectionId } from './Sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/contexts/AuthContext';

import DashboardSection from './sections/DashboardSection';
import OrdersSection from './sections/OrdersSection';
import DevicesSection from './sections/DevicesSection';
import MastersSection from './sections/MastersSection';
import UsersSection from './sections/UsersSection';
import ServicesSection from './sections/ServicesSection';
import PartsSection from './sections/PartsSection';
import CategoriesSection from './sections/CategoriesSection';
import StatusesSection from './sections/StatusesSection';
import ScheduleSection from './sections/ScheduleSection';
import PaymentsSection from './sections/PaymentsSection';
import AnalyticsSection from './sections/AnalyticsSection';
import NotificationsSection from './sections/NotificationsSection';

const SECTION_TITLES: Record<SectionId, { title: string; subtitle: string; icon: string }> = {
  dashboard:     { title: 'Дашборд',        subtitle: 'Общая сводка системы',                icon: 'LayoutDashboard' },
  orders:        { title: 'Заказы',          subtitle: 'Управление заказами на ремонт',        icon: 'ClipboardList' },
  devices:       { title: 'Техника',         subtitle: 'Устройства, принятые в ремонт',        icon: 'HardDrive' },
  masters:       { title: 'Мастера',         subtitle: 'Специалисты сервисного центра',        icon: 'Wrench' },
  users:         { title: 'Пользователи',    subtitle: 'Учётные записи и права доступа',       icon: 'Users' },
  services:      { title: 'Услуги',          subtitle: 'Каталог услуг и прайс-лист',           icon: 'Zap' },
  parts:         { title: 'Запчасти',        subtitle: 'Склад деталей и комплектующих',        icon: 'Package' },
  categories:    { title: 'Категории',       subtitle: 'Типы техники и классификация',         icon: 'Tag' },
  statuses:      { title: 'Статусы',         subtitle: 'Жизненный цикл заказа',               icon: 'GitBranch' },
  schedule:      { title: 'Расписание',      subtitle: 'Планирование работы мастеров',         icon: 'CalendarDays' },
  payments:      { title: 'Платежи',         subtitle: 'Финансовые операции',                 icon: 'CreditCard' },
  analytics:     { title: 'Аналитика',       subtitle: 'Статистика и отчёты',                 icon: 'BarChart3' },
  notifications: { title: 'Уведомления',     subtitle: 'Системные сообщения и алерты',        icon: 'Bell' },
};

const SECTION_COMPONENTS: Record<SectionId, React.ComponentType> = {
  dashboard:     DashboardSection,
  orders:        OrdersSection,
  devices:       DevicesSection,
  masters:       MastersSection,
  users:         UsersSection,
  services:      ServicesSection,
  parts:         PartsSection,
  categories:    CategoriesSection,
  statuses:      StatusesSection,
  schedule:      ScheduleSection,
  payments:      PaymentsSection,
  analytics:     AnalyticsSection,
  notifications: NotificationsSection,
};

export default function AdminLayout() {
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');
  const [search, setSearch] = useState('');
  const { logout } = useAuth();

  const meta = SECTION_TITLES[activeSection];
  const ActiveComponent = SECTION_COMPONENTS[activeSection];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center gap-4 px-6 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0 relative">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/20 to-transparent" />

          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <Icon name={meta.icon} size={18} className="text-neon-cyan" />
              <div>
                <h1 className="font-orbitron text-sm font-bold text-foreground tracking-wide leading-none">
                  {meta.title}
                </h1>
              </div>
            </div>
            <Separator orientation="vertical" className="h-5 bg-border" />
            <span className="text-xs text-muted-foreground hidden md:block">{meta.subtitle}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden lg:block">
              <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по системе..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 w-52 bg-input border-border text-xs font-mono focus:border-neon-cyan/50"
              />
            </div>

            <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-neon-cyan relative">
              <Icon name="Bell" size={16} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            </Button>

            <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-red-400" onClick={logout}>
              <Icon name="LogOut" size={16} />
            </Button>

            {/* Status indicator */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono text-emerald-400">ONLINE</span>
            </div>
          </div>
        </header>

        {/* Breadcrumb strip */}
        <div className="px-6 py-2 flex items-center gap-1.5 text-xs font-mono text-muted-foreground border-b border-border/50 bg-background/50 flex-shrink-0">
          <Icon name="Home" size={11} />
          <span>/</span>
          <span className="text-neon-cyan/70">AIS</span>
          <span>/</span>
          <span className="text-foreground">{meta.title}</span>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in" key={activeSection}>
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}
