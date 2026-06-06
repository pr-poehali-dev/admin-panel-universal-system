import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export type SectionId =
  | 'dashboard' | 'orders' | 'devices' | 'masters'
  | 'users' | 'services' | 'parts' | 'categories'
  | 'statuses' | 'schedule' | 'payments' | 'analytics' | 'notifications';

interface NavItem {
  id: SectionId;
  label: string;
  icon: string;
  badge?: number;
  color?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Дашборд', icon: 'LayoutDashboard', color: 'text-neon-cyan' },
  { id: 'orders', label: 'Заказы', icon: 'ClipboardList', badge: 5, color: 'text-violet-400' },
  { id: 'devices', label: 'Техника', icon: 'HardDrive', color: 'text-blue-400' },
  { id: 'masters', label: 'Мастера', icon: 'Wrench', color: 'text-emerald-400' },
  { id: 'users', label: 'Пользователи', icon: 'Users', color: 'text-yellow-400' },
  { id: 'services', label: 'Услуги', icon: 'Zap', color: 'text-orange-400' },
  { id: 'parts', label: 'Детали', icon: 'Package', color: 'text-pink-400' },
  { id: 'categories', label: 'Категории', icon: 'Tag', color: 'text-teal-400' },
  { id: 'statuses', label: 'Статусы', icon: 'GitBranch', color: 'text-indigo-400' },
  { id: 'schedule', label: 'Расписание', icon: 'CalendarDays', color: 'text-cyan-400' },
  { id: 'payments', label: 'Платежи', icon: 'CreditCard', color: 'text-green-400' },
  { id: 'analytics', label: 'Аналитика', icon: 'BarChart3', color: 'text-purple-400' },
  { id: 'notifications', label: 'Уведомления', icon: 'Bell', badge: 3, color: 'text-red-400' },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  master: 'Мастер',
};

interface SidebarProps {
  activeSection: SectionId;
  onSectionChange: (id: SectionId) => void;
}

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const initials = user?.name.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U';

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out relative',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Neon top line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/60 to-transparent" />

        {/* Logo */}
        <div className={cn(
          'flex items-center gap-3 px-4 py-5 border-b border-sidebar-border overflow-hidden',
          collapsed && 'justify-center px-2'
        )}>
          <div className="flex-shrink-0 w-8 h-8 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 flex items-center justify-center">
            <Icon name="Cpu" size={16} className="text-neon-cyan" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-orbitron text-sm font-bold text-neon-cyan tracking-wider truncate">TECHSERVICE</p>
              <p className="font-mono text-[10px] text-muted-foreground tracking-widest">AIS v2.6</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            const btn = (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative overflow-hidden',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-neon-cyan/10 border border-neon-cyan/25'
                    : 'hover:bg-sidebar-accent border border-transparent'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4/5 bg-neon-cyan rounded-r-full" />
                )}
                <Icon
                  name={item.icon}
                  size={18}
                  className={cn(
                    'flex-shrink-0 transition-colors',
                    isActive ? item.color : 'text-muted-foreground group-hover:' + (item.color || 'text-foreground')
                  )}
                />
                {!collapsed && (
                  <>
                    <span className={cn(
                      'flex-1 text-sm text-left truncate transition-colors',
                      isActive ? 'text-foreground font-medium' : 'text-muted-foreground group-hover:text-foreground'
                    )}>
                      {item.label}
                    </span>
                    {item.badge && item.badge > 0 && (
                      <Badge className="bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30 text-xs px-1.5 min-w-5 h-5 flex items-center justify-center">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right" className="bg-card border-border text-foreground font-ibm text-sm">
                    <div className="flex items-center gap-2">
                      {item.label}
                      {item.badge && item.badge > 0 && (
                        <Badge className="bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30 text-xs px-1.5">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }
            return btn;
          })}
        </nav>

        <Separator className="bg-sidebar-border" />

        {/* User block */}
        <div className={cn('p-3 flex items-center gap-3', collapsed && 'justify-center px-2')}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="w-8 h-8 flex-shrink-0 border border-neon-cyan/30 cursor-pointer">
                <AvatarFallback className="bg-neon-cyan/10 text-neon-cyan text-xs font-orbitron font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="bg-card border-border text-foreground">
                <p className="font-medium text-sm">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.role && ROLE_LABELS[user.role]}</p>
              </TooltipContent>
            )}
          </Tooltip>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.role && ROLE_LABELS[user.role]}</p>
            </div>
          )}

          {!collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="w-8 h-8 flex-shrink-0 text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                >
                  <Icon name="LogOut" size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-card border-border text-foreground">Выйти</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-neon-cyan hover:border-neon-cyan/40 transition-all z-10"
        >
          <Icon name={collapsed ? 'ChevronRight' : 'ChevronLeft'} size={12} />
        </button>
      </aside>
    </TooltipProvider>
  );
}
