import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import Icon from '@/components/ui/icon';
import { analyticsApi, ordersApi } from '@/services/api';
import type { Analytics, Order } from '@/services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_MAP: Record<string, { label: string; color: string; dot: string }> = {
  urgent: { label: 'Срочный', color: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-400' },
  high:   { label: 'Высокий', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-400' },
  normal: { label: 'Обычный', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
  low:    { label: 'Низкий',  color: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' },
};

const MASTER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  available: { label: 'Свободен', color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  busy:      { label: 'Занят',    color: 'text-orange-400 border-orange-400/30 bg-orange-400/10' },
  vacation:  { label: 'Отпуск',  color: 'text-muted-foreground border-border bg-muted/20' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash:     'Наличные',
  card:     'Карта',
  transfer: 'Перевод',
  online:   'Онлайн',
};

const PAYMENT_METHOD_COLORS: string[] = [
  'hsl(185 100% 50%)',
  'hsl(270 80% 60%)',
  'hsl(150 100% 45%)',
  'hsl(30 100% 55%)',
];

const revenueChartConfig = {
  revenue: { label: 'Выручка', color: 'hsl(185 100% 50%)' },
};

const ordersChartConfig = {
  orders_count: { label: 'Заказы', color: 'hsl(270 80% 60%)' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(n: number): string {
  return n.toLocaleString('ru-RU') + ' ₽';
}

function formatPeriod(period: string): string {
  // period comes as "YYYY-MM" or similar
  const parts = period.split('-');
  if (parts.length >= 2) {
    const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const month = parseInt(parts[1], 10) - 1;
    return monthNames[month] ?? period;
  }
  return period;
}

function getRatingStars(rating: number): { filled: boolean }[] {
  return Array.from({ length: 5 }, (_, i) => ({ filled: i < Math.round(rating) }));
}

function getMasterInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function getWorkloadPercent(ordersInPeriod: number, completedOrders: number): number {
  if (completedOrders === 0) return 0;
  const ratio = ordersInPeriod / Math.max(completedOrders * 0.15, 1);
  return Math.min(Math.round(ratio * 100), 100);
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function KpiSkeletons() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="border-border bg-card/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/40">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <div className="flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

function MastersSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="border-border bg-card/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
            <div className="flex gap-1">
              {[...Array(5)].map((_, j) => <Skeleton key={j} className="h-3 w-3 rounded-sm" />)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  bg: string;
  border: string;
  trend?: number | null;
  trendLabel?: string;
}

function KpiCard({ label, value, icon, color, bg, border, trend, trendLabel }: KpiCardProps) {
  const isUp = trend !== null && trend !== undefined && trend >= 0;
  return (
    <Card className={`border ${border} bg-card/60 hover:bg-card transition-all duration-200 group`}
      style={{ boxShadow: `0 0 0 0 transparent` }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider leading-tight">{label}</p>
          <div className={`w-9 h-9 rounded-lg ${bg} border ${border} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
            <Icon name={icon} size={16} className={color} />
          </div>
        </div>
        <p className={`text-2xl font-orbitron font-bold ${color} tabular-nums`}>{value}</p>
        {trend !== null && trend !== undefined && (
          <p className={`text-xs mt-1.5 flex items-center gap-0.5 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            <Icon name={isUp ? 'TrendingUp' : 'TrendingDown'} size={11} />
            <span className="font-mono">{isUp ? '+' : ''}{trend}%</span>
            {trendLabel && <span className="text-muted-foreground ml-1">{trendLabel}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardSection() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      analyticsApi.get(),
      ordersApi.getAll({ limit: 5 }),
    ])
      .then(([analyticsData, ordersData]) => {
        if (cancelled) return;
        setAnalytics(analyticsData);
        // ordersApi.getAll may return array or object with items
        const orders = Array.isArray(ordersData) ? ordersData : (ordersData as unknown as { items: Order[] }).items ?? [];
        setRecentOrders(orders.slice(0, 5));
      })
      .catch(err => {
        if (cancelled) return;
        setError(err?.message ?? 'Ошибка загрузки данных');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // ── Derived values ──────────────────────────────────────────────────────────

  const kpi = analytics?.kpi;
  const completionRate = kpi && kpi.total > 0 ? Math.round((kpi.completed / kpi.total) * 100) : 0;
  const paidRate = kpi && kpi.revenue > 0 ? Math.round((kpi.paid / kpi.revenue) * 100) : 0;

  const avgRating =
    analytics?.masters && analytics.masters.length > 0
      ? (analytics.masters.reduce((s, m) => s + m.rating, 0) / analytics.masters.length).toFixed(1)
      : '—';

  const totalPartsInStock = analytics?.low_stock
    ? analytics.low_stock.reduce((s, p) => s + p.quantity, 0)
    : 0;

  const activeMastersCount = analytics?.masters
    ? analytics.masters.filter(m => (m.orders_period ?? 0) > 0).length
    : 0;

  const monthlyData = (analytics?.monthly ?? []).map(m => ({
    ...m,
    label: formatPeriod(m.period),
  }));

  const pieData = (analytics?.payment_methods ?? []).map((pm, i) => ({
    name: PAYMENT_METHOD_LABELS[pm.method] ?? pm.method,
    value: pm.total,
    cnt: pm.cnt,
    color: PAYMENT_METHOD_COLORS[i % PAYMENT_METHOD_COLORS.length],
  }));

  const totalByStatus = analytics?.by_status?.reduce((s, st) => s + st.cnt, 0) ?? 0;

  // ── Error state ─────────────────────────────────────────────────────────────

  if (error) {
    return (
      <Card className="border-red-500/30 bg-red-500/5">
        <CardContent className="p-6 flex items-center gap-3">
          <Icon name="AlertCircle" size={20} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Ошибка загрузки</p>
            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── 1. KPI Cards ─────────────────────────────────────────────────── */}
      {loading ? (
        <KpiSkeletons />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Всего заказов"
            value={kpi?.total ?? '—'}
            icon="ClipboardList"
            color="text-neon-cyan"
            bg="bg-neon-cyan/10"
            border="border-neon-cyan/25"
            trend={null}
          />
          <KpiCard
            label="Выручка (оплачено)"
            value={kpi ? formatMoney(kpi.paid) : '—'}
            icon="Banknote"
            color="text-emerald-400"
            bg="bg-emerald-400/10"
            border="border-emerald-400/25"
            trend={null}
          />
          <KpiCard
            label="Активных мастеров"
            value={activeMastersCount}
            icon="Wrench"
            color="text-violet-400"
            bg="bg-violet-400/10"
            border="border-violet-400/25"
            trend={null}
          />
          <KpiCard
            label="Мало на складе"
            value={analytics?.low_stock?.length ?? 0}
            icon="PackageX"
            color="text-orange-400"
            bg="bg-orange-400/10"
            border="border-orange-400/25"
            trend={null}
          />
        </div>
      )}

      {/* ── 2. Recent Orders + Masters Workload ──────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Recent Orders table */}
        <Card className="xl:col-span-2 border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
              <Icon name="ClipboardList" size={15} className="text-neon-cyan" />
              ПОСЛЕДНИЕ ЗАКАЗЫ
            </CardTitle>
            <CardDescription className="text-xs">5 наиболее свежих заявок в системе</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton />
            ) : recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Icon name="ClipboardX" size={32} className="opacity-30" />
                <p className="text-xs">Заказы не найдены</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* Header row */}
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-3 pb-1">
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider w-20">Номер</span>
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Клиент / Диагноз</span>
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Мастер</span>
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider text-right">Сумма</span>
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider text-right">Дедлайн</span>
                </div>
                <Separator className="bg-border/60" />
                {recentOrders.map(order => {
                  const prio = PRIORITY_MAP[order.priority] ?? PRIORITY_MAP.normal;
                  return (
                    <div
                      key={order.id}
                      className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center px-3 py-2.5 rounded-lg border border-border/40 hover:border-neon-cyan/20 hover:bg-neon-cyan/[0.03] transition-all duration-150"
                    >
                      {/* Number + priority */}
                      <div className="flex flex-col gap-1 w-20">
                        <span className="font-mono text-xs text-neon-cyan/80 truncate">{order.number}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border rounded-full w-fit ${prio.color}`}>
                          {prio.label}
                        </Badge>
                      </div>

                      {/* Client + diagnosis */}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{order.client_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{order.diagnosis || '—'}</p>
                      </div>

                      {/* Master */}
                      <div className="text-xs text-muted-foreground text-right min-w-[80px]">
                        {order.master_name ? (
                          <span className="text-foreground/80">{order.master_name.split(' ')[0]}</span>
                        ) : (
                          <span className="text-muted-foreground/50 italic">не назн.</span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="text-right min-w-[70px]">
                        <span className="font-mono text-xs font-medium text-foreground">
                          {order.total_price > 0 ? formatMoney(order.total_price) : '—'}
                        </span>
                      </div>

                      {/* Deadline */}
                      <div className="text-right min-w-[70px]">
                        {order.deadline ? (
                          <span className="font-mono text-xs text-muted-foreground">
                            {new Date(order.deadline).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Masters Workload */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
              <Icon name="Users" size={15} className="text-violet-400" />
              ЗАГРУЗКА МАСТЕРОВ
            </CardTitle>
            <CardDescription className="text-xs">Активность за текущий период</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-2 w-16" />
                      </div>
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                    <Skeleton className="h-1.5 w-full" />
                  </div>
                ))}
              </div>
            ) : !analytics?.masters || analytics.masters.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
                <Icon name="UserX" size={28} className="opacity-30" />
                <p className="text-xs">Нет данных о мастерах</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.masters.slice(0, 6).map((master, idx) => {
                  const workload = getWorkloadPercent(master.orders_period, master.completed_orders);
                  const initials = getMasterInitials(master.name);
                  const isBusy = master.orders_period > 0;
                  const statusKey = isBusy ? 'busy' : 'available';
                  const st = MASTER_STATUS_MAP[statusKey];
                  const progressColor = workload > 75 ? 'text-orange-400' : workload > 40 ? 'text-violet-400' : 'text-emerald-400';
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-8 h-8 border border-violet-400/20 flex-shrink-0">
                          <AvatarFallback className="bg-violet-400/10 text-violet-400 font-orbitron text-[10px] font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{master.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {getRatingStars(master.rating).map((star, si) => (
                              <Icon
                                key={si}
                                name="Star"
                                size={9}
                                className={star.filled ? 'text-yellow-400 fill-yellow-400/70' : 'text-muted-foreground/30'}
                              />
                            ))}
                            <span className="text-[10px] font-mono text-muted-foreground ml-0.5">{master.rating.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${st.color}`}>
                            {st.label}
                          </Badge>
                          <span className={`text-[10px] font-mono font-bold ${progressColor}`}>{workload}%</span>
                        </div>
                      </div>
                      <Progress
                        value={workload}
                        className={`h-1.5 ${workload > 75 ? '[&>div]:bg-orange-400' : workload > 40 ? '[&>div]:bg-violet-400' : '[&>div]:bg-emerald-400'}`}
                      />
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {master.orders_period} за период · {master.completed_orders} всего
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Order Status Pipeline ──────────────────────────────────────── */}
      <Card className="border-border bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
            <Icon name="GitBranch" size={15} className="text-neon-cyan" />
            ПАЙПЛАЙН СТАТУСОВ
          </CardTitle>
          <CardDescription className="text-xs">Распределение заказов по этапам обработки</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 flex-shrink-0">
                  <Skeleton className="h-16 w-28 rounded-lg" />
                  {i < 4 && <Skeleton className="h-3 w-6" />}
                </div>
              ))}
            </div>
          ) : !analytics?.by_status || analytics.by_status.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Нет данных</p>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {analytics.by_status.map((status, idx) => {
                const pct = totalByStatus > 0 ? Math.round((status.cnt / totalByStatus) * 100) : 0;
                const isLast = idx === analytics.by_status.length - 1;
                return (
                  <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                    <div
                      className="relative flex flex-col items-center justify-center px-4 py-3 rounded-lg border transition-all hover:scale-105 duration-150 min-w-[90px]"
                      style={{
                        borderColor: `${status.color}40`,
                        background: `${status.color}0d`,
                      }}
                    >
                      <span
                        className="font-orbitron font-bold text-xl tabular-nums"
                        style={{ color: status.color }}
                      >
                        {status.cnt}
                      </span>
                      <span className="text-[10px] text-muted-foreground text-center leading-tight mt-1 max-w-[80px] truncate">
                        {status.name}
                      </span>
                      <span
                        className="absolute -top-1.5 -right-1.5 text-[9px] font-mono font-bold px-1 rounded-full border"
                        style={{ color: status.color, borderColor: `${status.color}50`, background: `${status.color}15` }}
                      >
                        {pct}%
                      </span>
                    </div>
                    {!isLast && (
                      <Icon name="ChevronRight" size={16} className="text-muted-foreground/40 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 4. Charts Row (Revenue bar + Payment donut) ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Monthly Revenue Bar Chart */}
        <Card className="lg:col-span-2 border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
              <Icon name="BarChart3" size={15} className="text-neon-cyan" />
              ДИНАМИКА ВЫРУЧКИ
            </CardTitle>
            <CardDescription className="text-xs">Помесячная выручка по завершённым заказам</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-48 flex items-end gap-2 px-2">
                {[60, 80, 45, 90, 70, 55].map((h, i) => (
                  <Skeleton key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : monthlyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                <p className="text-xs">Нет данных за период</p>
              </div>
            ) : (
              <Tabs defaultValue="revenue">
                <TabsList className="bg-muted mb-3 h-7">
                  <TabsTrigger value="revenue" className="text-xs h-5 px-3">Выручка</TabsTrigger>
                  <TabsTrigger value="orders" className="text-xs h-5 px-3">Заказы</TabsTrigger>
                </TabsList>
                <TabsContent value="revenue">
                  <ChartContainer config={revenueChartConfig} className="h-48 w-full">
                    <BarChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={v => `${Math.round(v / 1000)}K`}
                        width={36}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={(v) => [formatMoney(Number(v)), 'Выручка']} />}
                      />
                      <Bar dataKey="revenue" fill="hsl(185 100% 50%)" radius={[3, 3, 0, 0]} opacity={0.85} />
                    </BarChart>
                  </ChartContainer>
                </TabsContent>
                <TabsContent value="orders">
                  <ChartContainer config={ordersChartConfig} className="h-48 w-full">
                    <BarChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={(v) => [String(v), 'Заказов']} />}
                      />
                      <Bar dataKey="orders_count" fill="hsl(270 80% 60%)" radius={[3, 3, 0, 0]} opacity={0.85} />
                    </BarChart>
                  </ChartContainer>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Donut */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
              <Icon name="PieChart" size={15} className="text-violet-400" />
              СПОСОБЫ ОПЛАТЫ
            </CardTitle>
            <CardDescription className="text-xs">Структура платежей по методам</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-32 w-32 rounded-full" />
                <div className="space-y-2 w-full">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <Skeleton className="h-3 flex-1" />
                    </div>
                  ))}
                </div>
              </div>
            ) : pieData.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
                <Icon name="PieChart" size={28} className="opacity-20" />
                <p className="text-xs">Нет данных</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <ChartContainer
                  config={Object.fromEntries(pieData.map(d => [d.name, { label: d.name, color: d.color }]))}
                  className="h-36 w-full"
                >
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={62}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(v) => [formatMoney(Number(v)), '']} />}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="w-full space-y-1.5">
                  {pieData.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                        <span className="text-xs text-muted-foreground">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">{entry.cnt} опл.</span>
                        <span className="text-xs font-mono font-medium text-foreground">{formatMoney(entry.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 5. Stock Alerts + Masters Grid (full) ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Stock Alerts */}
        <Card className={`border ${(analytics?.low_stock?.length ?? 0) > 0 ? 'border-orange-500/30 bg-orange-500/5' : 'border-border bg-card/60'}`}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-sm font-orbitron flex items-center gap-2 ${(analytics?.low_stock?.length ?? 0) > 0 ? 'text-orange-400' : 'text-foreground'}`}>
              <Icon name="AlertTriangle" size={15} className={(analytics?.low_stock?.length ?? 0) > 0 ? 'text-orange-400' : 'text-muted-foreground'} />
              ЗАПАСЫ НА ИСХОДЕ
              {!loading && analytics?.low_stock && analytics.low_stock.length > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-400/40 text-orange-400 bg-orange-400/10 ml-auto">
                  {analytics.low_stock.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">Запчасти ниже минимального остатка</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-3 w-36" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                ))}
              </div>
            ) : !analytics?.low_stock || analytics.low_stock.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-muted-foreground gap-2">
                <Icon name="PackageCheck" size={28} className="opacity-25" />
                <p className="text-xs">Все позиции в норме</p>
              </div>
            ) : (
              <div className="space-y-2">
                {analytics.low_stock.map((part, i) => {
                  const pct = part.min_quantity > 0 ? Math.round((part.quantity / part.min_quantity) * 100) : 100;
                  const isCritical = part.quantity === 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isCritical && <Icon name="AlertCircle" size={11} className="text-red-400 flex-shrink-0" />}
                          <span className="text-xs text-foreground truncate">{part.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[10px] font-mono text-muted-foreground">мин {part.min_quantity}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${isCritical ? 'border-red-500/40 text-red-400 bg-red-500/10' : 'border-orange-400/40 text-orange-400 bg-orange-400/10'}`}>
                            {part.quantity} шт.
                          </Badge>
                        </div>
                      </div>
                      <Progress
                        value={Math.min(pct, 100)}
                        className={`h-1 ${isCritical ? '[&>div]:bg-red-400' : '[&>div]:bg-orange-400'}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Masters full grid */}
        <div className="lg:col-span-2">
          <Card className="border-border bg-card/60 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                <Icon name="UserCheck" size={15} className="text-neon-cyan" />
                МАСТЕРА — СВОДКА
              </CardTitle>
              <CardDescription className="text-xs">Рейтинг и статистика по всем специалистам</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <MastersSkeleton />
              ) : !analytics?.masters || analytics.masters.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
                  <Icon name="UserX" size={28} className="opacity-25" />
                  <p className="text-xs">Нет данных</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analytics.masters.map((master, idx) => {
                    const initials = getMasterInitials(master.name);
                    const maxOrders = Math.max(...analytics.masters.map(m => m.completed_orders), 1);
                    const barPct = Math.round((master.completed_orders / maxOrders) * 100);
                    const borderColor = idx % 2 === 0 ? 'border-neon-cyan/15' : 'border-violet-400/15';
                    const avatarColor = idx % 2 === 0 ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20' : 'bg-violet-400/10 text-violet-400 border-violet-400/20';
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col gap-2.5 p-3 rounded-lg border ${borderColor} hover:bg-card/80 transition-all`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar className={`w-9 h-9 border ${avatarColor} flex-shrink-0`}>
                            <AvatarFallback className={`${avatarColor} font-orbitron text-[11px] font-bold`}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{master.name}</p>
                            <div className="flex items-center gap-1">
                              {getRatingStars(master.rating).map((star, si) => (
                                <Icon
                                  key={si}
                                  name="Star"
                                  size={9}
                                  className={star.filled ? 'text-yellow-400 fill-yellow-400/70' : 'text-border'}
                                />
                              ))}
                              <span className="text-[10px] font-mono text-yellow-400 font-bold ml-0.5">
                                {master.rating.toFixed(1)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-orbitron font-bold text-sm text-foreground">{master.completed_orders}</p>
                            <p className="text-[10px] text-muted-foreground">заказов</p>
                          </div>
                        </div>
                        <Progress value={barPct} className="h-1 [&>div]:bg-neon-cyan/70" />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {master.orders_period} за период
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            топ {100 - barPct + 1}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── 6. Bottom Metrics Row ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Icon name="Gauge" size={14} className="text-neon-cyan" />
          <h3 className="text-xs font-orbitron text-muted-foreground uppercase tracking-wider">Сводные метрики</h3>
          <Separator className="flex-1 bg-border/60" />
        </div>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-border bg-card/60">
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-1.5 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Completion rate */}
            <Card className="border-emerald-400/20 bg-card/60 hover:bg-card transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="CheckCircle2" size={13} className="text-emerald-400" />
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Выполнение</p>
                </div>
                <p className="text-3xl font-orbitron font-bold text-emerald-400">{completionRate}%</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                  {kpi?.completed ?? 0} из {kpi?.total ?? 0} заказов
                </p>
                <Progress value={completionRate} className="h-1.5 mt-2 [&>div]:bg-emerald-400" />
              </CardContent>
            </Card>

            {/* Paid rate */}
            <Card className="border-neon-cyan/20 bg-card/60 hover:bg-card transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="Wallet" size={13} className="text-neon-cyan" />
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Оплачено</p>
                </div>
                <p className="text-3xl font-orbitron font-bold text-neon-cyan">{paidRate}%</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                  {kpi ? formatMoney(kpi.paid) : '—'} из {kpi ? formatMoney(kpi.revenue) : '—'}
                </p>
                <Progress value={paidRate} className="h-1.5 mt-2 [&>div]:bg-neon-cyan" />
              </CardContent>
            </Card>

            {/* Average rating */}
            <Card className="border-yellow-400/20 bg-card/60 hover:bg-card transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="Star" size={13} className="text-yellow-400" />
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Рейтинг</p>
                </div>
                <p className="text-3xl font-orbitron font-bold text-yellow-400">{avgRating}</p>
                <div className="flex items-center gap-1 mt-1">
                  {getRatingStars(parseFloat(String(avgRating)) || 0).map((star, si) => (
                    <Icon
                      key={si}
                      name="Star"
                      size={11}
                      className={star.filled ? 'text-yellow-400 fill-yellow-400/60' : 'text-muted-foreground/25'}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                  по {analytics?.masters?.length ?? 0} мастерам
                </p>
              </CardContent>
            </Card>

            {/* Parts in stock */}
            <Card className="border-violet-400/20 bg-card/60 hover:bg-card transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="Package" size={13} className="text-violet-400" />
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Склад</p>
                </div>
                <p className="text-3xl font-orbitron font-bold text-violet-400">
                  {analytics?.low_stock ? totalPartsInStock : '—'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                  шт. в низком остатке
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Icon name="AlertTriangle" size={11} className="text-orange-400" />
                  <span className="text-[10px] text-orange-400 font-mono">
                    {analytics?.low_stock?.length ?? 0} позиц. критично
                  </span>
                </div>
              </CardContent>
            </Card>

          </div>
        )}
      </div>

    </div>
  );
}
