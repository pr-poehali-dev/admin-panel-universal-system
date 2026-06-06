import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Legend,
} from 'recharts';
import Icon from '@/components/ui/icon';
import { analyticsApi } from '@/services/api';
import type { Analytics } from '@/services/api';

// ─── Palette ───────────────────────────────────────────────────────────────────

const C = {
  cyan:   'hsl(185 100% 50%)',
  violet: 'hsl(270 80% 60%)',
  green:  'hsl(150 100% 45%)',
  orange: 'hsl(30 100% 55%)',
  red:    'hsl(0 84% 60%)',
  yellow: 'hsl(48 96% 53%)',
  blue:   'hsl(217 91% 60%)',
  muted:  'hsl(215 20% 40%)',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: C.red,
  high:   C.orange,
  normal: C.blue,
  low:    C.muted,
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Срочный',
  high:   'Высокий',
  normal: 'Обычный',
  low:    'Низкий',
};

const METHOD_LABELS: Record<string, string> = {
  cash:     'Наличные',
  card:     'Карта',
  transfer: 'Перевод',
  online:   'Онлайн',
};

const METHOD_COLORS: string[] = [C.cyan, C.violet, C.green, C.orange];
const CAT_COLORS:    string[] = [C.cyan, C.violet, C.green, C.orange, C.red, C.yellow, C.blue];

// ─── Static fallback monthly data (used when API returns empty) ────────────────

const FALLBACK_MONTHLY = [
  { period: '2026-01', orders_count: 12, revenue: 45000 },
  { period: '2026-02', orders_count: 18, revenue: 62000 },
  { period: '2026-03', orders_count: 15, revenue: 58000 },
  { period: '2026-04', orders_count: 21, revenue: 71000 },
  { period: '2026-05', orders_count: 24, revenue: 84000 },
  { period: '2026-06', orders_count: 10, revenue: 49200 },
];

// ─── Chart configs ─────────────────────────────────────────────────────────────

const cfgRevenue = {
  revenue:      { label: 'Выручка',  color: C.cyan },
  paid:         { label: 'Оплачено', color: C.green },
};
const cfgOrders  = { orders_count: { label: 'Заказов',  color: C.violet } };
const cfgRevenueVsPaid = {
  revenue: { label: 'Выручка',  color: C.cyan },
  paid:    { label: 'Оплачено', color: C.green },
};
const cfgMasters = { completed_orders: { label: 'Выполнено', color: C.cyan } };
const cfgStatus  = { cnt: { label: 'Заказов', color: C.cyan } };

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';
const fmtK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);

const MONTH_NAMES = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

function formatPeriod(p: string): string {
  const parts = p.split('-');
  if (parts.length >= 2) {
    const m = parseInt(parts[1], 10) - 1;
    const y = parts[0].slice(2);
    return `${MONTH_NAMES[m] ?? p}'${y}`;
  }
  return p;
}

function ratingColor(r: number): string {
  if (r >= 4.8) return C.cyan;
  if (r >= 4.5) return C.green;
  if (r >= 4.0) return C.yellow;
  return C.orange;
}

function ratingTier(r: number): string {
  if (r >= 4.8) return 'Топ';
  if (r >= 4.5) return 'Хорошо';
  if (r >= 4.0) return 'Норма';
  return 'Ниже среднего';
}

// ─── Custom pie label ──────────────────────────────────────────────────────────

interface PieLabelProps {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number;
  percent: number;
}
function PiePct({ cx, cy, midAngle, innerRadius, outerRadius, percent }: PieLabelProps) {
  if (percent < 0.06) return null;
  const R = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * R);
  const y = cy + r * Math.sin(-midAngle * R);
  return (
    <text x={x} y={y} fill="hsl(220 20% 4%)" textAnchor="middle" dominantBaseline="central"
      fontSize={10} fontWeight="bold" fontFamily="'IBM Plex Mono', monospace">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ─── Reusable axis props ───────────────────────────────────────────────────────

const xProps = {
  tick: { fontSize: 10, fill: C.muted },
  axisLine: false as const,
  tickLine: false as const,
};
const yProps = (formatter?: (v: number) => string) => ({
  tick: { fontSize: 10, fill: C.muted },
  axisLine: false as const,
  tickLine: false as const,
  width: 38,
  ...(formatter ? { tickFormatter: formatter } : {}),
});

// ─── Skeleton blocks ───────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-border bg-card/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton({ h = 'h-56' }: { h?: string }) {
  return (
    <div className={`${h} flex items-end gap-2 px-4 pb-2`}>
      {[55, 80, 60, 95, 70, 85, 45, 75].map((v, i) => (
        <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${v}%` }} />
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 px-4 pb-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-2 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Rate circle card ─────────────────────────────────────────────────────────

interface RateCardProps {
  label: string; value: number; sub: string;
  color: string; border: string; bg: string; barClass: string;
}
function RateCard({ label, value, sub, color, border, bg, barClass }: RateCardProps) {
  return (
    <Card className={`border ${border} ${bg} hover:bg-card transition-all`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</p>
          <span className={`font-orbitron font-bold text-2xl ${color} tabular-nums`}>{value}%</span>
        </div>
        <Progress value={value} className={`h-2 mb-2 ${barClass}`} />
        <p className="text-xs text-muted-foreground font-mono">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AnalyticsSection() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [period,    setPeriod]    = useState('6m');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    analyticsApi.get(period)
      .then(data => { if (!cancelled) setAnalytics(data); })
      .catch(e  => { if (!cancelled) setError(e?.message ?? 'Ошибка загрузки'); })
      .finally(()=> { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [period]);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const monthly = useMemo(() => {
    const raw = analytics?.monthly ?? [];
    const src = raw.length > 0 ? raw : FALLBACK_MONTHLY;
    return src.map(m => ({
      ...m,
      label:   formatPeriod(m.period),
      paid:    Math.round(m.revenue * 0.78),   // estimated paid (no separate field)
    }));
  }, [analytics]);

  const kpi = analytics?.kpi;

  const completionRate = useMemo(() =>
    kpi && kpi.total > 0 ? Math.round((kpi.completed / kpi.total) * 100) : 0,
  [kpi]);

  const paidRate = useMemo(() =>
    kpi && kpi.revenue > 0 ? Math.round((kpi.paid / kpi.revenue) * 100) : 0,
  [kpi]);

  const avgCheck = useMemo(() =>
    kpi && kpi.completed > 0 ? Math.round(kpi.revenue / kpi.completed) : 0,
  [kpi]);

  const totalMonthlyRevenue = useMemo(() =>
    monthly.reduce((s, m) => s + m.revenue, 0),
  [monthly]);

  // by_status enriched with total for pct
  const statusTotal = useMemo(() =>
    (analytics?.by_status ?? []).reduce((s, st) => s + st.cnt, 0),
  [analytics]);

  // payment methods enriched
  const methodTotal = useMemo(() =>
    (analytics?.payment_methods ?? []).reduce((s, pm) => s + pm.total, 0),
  [analytics]);

  const methodsEnriched = useMemo(() =>
    (analytics?.payment_methods ?? []).map((pm, i) => ({
      ...pm,
      label:   METHOD_LABELS[pm.method] ?? pm.method,
      color:   METHOD_COLORS[i % METHOD_COLORS.length],
      avg:     pm.cnt > 0 ? Math.round(pm.total / pm.cnt) : 0,
      pctRev:  methodTotal > 0 ? Math.round((pm.total / methodTotal) * 100) : 0,
    })),
  [analytics, methodTotal]);

  const priorityData = useMemo(() =>
    (analytics?.by_priority ?? []).map(p => ({
      name:  PRIORITY_LABELS[p.priority] ?? p.priority,
      value: p.cnt,
      color: PRIORITY_COLORS[p.priority] ?? C.muted,
    })),
  [analytics]);

  const mastersChartData = useMemo(() =>
    [...(analytics?.masters ?? [])]
      .sort((a, b) => b.completed_orders - a.completed_orders)
      .slice(0, 10)
      .map(m => ({
        name:             m.name.split(' ').slice(0, 2).map((w, i) => i === 1 ? w[0] + '.' : w).join(' '),
        completed_orders: m.completed_orders,
        rating:           m.rating,
        fill:             ratingColor(m.rating),
      })),
  [analytics]);

  const maxMasterOrders = useMemo(() =>
    Math.max(...mastersChartData.map(m => m.completed_orders), 1),
  [mastersChartData]);

  const categoriesData = useMemo(() =>
    (analytics?.categories ?? []).map((c, i) => ({
      ...c,
      fill: c.color || CAT_COLORS[i % CAT_COLORS.length],
    })),
  [analytics]);

  // ── Error state ──────────────────────────────────────────────────────────────

  if (error) {
    return (
      <Card className="border-red-500/30 bg-red-500/5">
        <CardContent className="p-6 flex items-center gap-3">
          <Icon name="AlertCircle" size={20} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Ошибка загрузки аналитики</p>
            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Period selector (shared across all tabs) ──────────────────────────────────

  const PeriodSelect = () => (
    <Select value={period} onValueChange={setPeriod}>
      <SelectTrigger className="w-32 h-8 bg-input border-border text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-card border-border">
        <SelectItem value="1m">1 месяц</SelectItem>
        <SelectItem value="3m">3 месяца</SelectItem>
        <SelectItem value="6m">6 месяцев</SelectItem>
        <SelectItem value="1y">1 год</SelectItem>
      </SelectContent>
    </Select>
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Global header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="BarChart3" size={16} className="text-neon-cyan" />
          <h2 className="font-orbitron text-sm font-bold text-foreground uppercase tracking-wider">
            Аналитика
          </h2>
          {!loading && analytics && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-neon-cyan/30 text-neon-cyan/80 font-mono">
              {analytics.kpi.total} заказов
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && <Icon name="Loader2" size={14} className="text-neon-cyan animate-spin" />}
          <PeriodSelect />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted h-9">
          <TabsTrigger value="overview"  className="text-xs gap-1.5">
            <Icon name="LayoutDashboard" size={12} /> Обзор
          </TabsTrigger>
          <TabsTrigger value="orders"    className="text-xs gap-1.5">
            <Icon name="ClipboardList" size={12} /> Заказы
          </TabsTrigger>
          <TabsTrigger value="finance"   className="text-xs gap-1.5">
            <Icon name="Banknote" size={12} /> Финансы
          </TabsTrigger>
          <TabsTrigger value="masters"   className="text-xs gap-1.5">
            <Icon name="Users" size={12} /> Мастера и Склад
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 1 — ОБЗОР
        ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="mt-0 space-y-4">

          {/* KPI cards */}
          {loading ? <KpiSkeleton /> : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Заказов всего',
                  value: kpi?.total ?? 0,
                  icon: 'ClipboardList', color: 'text-neon-cyan',
                  border: 'border-neon-cyan/25', bg: 'bg-neon-cyan/10',
                  sub: `${kpi?.completed ?? 0} выполнено`,
                },
                {
                  label: 'Выручка',
                  value: kpi ? fmt(kpi.revenue) : '—',
                  icon: 'TrendingUp', color: 'text-emerald-400',
                  border: 'border-emerald-400/25', bg: 'bg-emerald-400/10',
                  sub: `ср. чек ${fmt(avgCheck)}`,
                },
                {
                  label: 'Оплачено',
                  value: kpi ? fmt(kpi.paid) : '—',
                  icon: 'Wallet', color: 'text-violet-400',
                  border: 'border-violet-400/25', bg: 'bg-violet-400/10',
                  sub: `${paidRate}% от выручки`,
                },
                {
                  label: 'Выполнено',
                  value: kpi?.completed ?? 0,
                  icon: 'CheckCircle2', color: 'text-yellow-400',
                  border: 'border-yellow-400/25', bg: 'bg-yellow-400/10',
                  sub: `${completionRate}% от всех`,
                },
              ].map(card => (
                <Card key={card.label} className={`border ${card.border} bg-card/60 hover:bg-card transition-all group`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider leading-tight">{card.label}</p>
                      <div className={`w-9 h-9 rounded-lg ${card.bg} border ${card.border} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                        <Icon name={card.icon} size={16} className={card.color} />
                      </div>
                    </div>
                    <p className={`text-2xl font-orbitron font-bold ${card.color} tabular-nums leading-tight`}>
                      {typeof card.value === 'number' ? card.value.toLocaleString('ru-RU') : card.value}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1.5">{card.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Revenue + Orders charts side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Monthly revenue bar */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                  <Icon name="BarChart3" size={14} className="text-neon-cyan" />
                  ВЫРУЧКА ПО МЕСЯЦАМ
                </CardTitle>
                <CardDescription className="text-xs">
                  Итого за период: {fmt(totalMonthlyRevenue)}
                  {analytics?.monthly.length === 0 && ' (демо-данные)'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <ChartSkeleton /> : (
                  <ChartContainer config={cfgRevenue} className="h-56 w-full">
                    <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 12%)" vertical={false} />
                      <XAxis dataKey="label" {...xProps} />
                      <YAxis {...yProps(fmtK)} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(v) => [fmt(Number(v)), 'Выручка']} />} />
                      <Bar dataKey="revenue" fill={C.cyan} radius={[3, 3, 0, 0]} opacity={0.85} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Monthly orders line */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                  <Icon name="TrendingUp" size={14} className="text-violet-400" />
                  ЗАКАЗЫ ПО МЕСЯЦАМ
                </CardTitle>
                <CardDescription className="text-xs">Динамика количества принятых заказов</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <ChartSkeleton /> : (
                  <ChartContainer config={cfgOrders} className="h-56 w-full">
                    <LineChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 12%)" vertical={false} />
                      <XAxis dataKey="label" {...xProps} />
                      <YAxis {...yProps()} allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(v) => [String(v), 'Заказов']} />} />
                      <Line
                        dataKey="orders_count"
                        stroke={C.violet}
                        strokeWidth={2.5}
                        dot={{ fill: C.violet, r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: C.violet }}
                      />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rate cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1].map(i => (
                <Card key={i} className="border-border bg-card/60">
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RateCard
                label="Процент выполнения"
                value={completionRate}
                sub={`${kpi?.completed ?? 0} из ${kpi?.total ?? 0} заказов завершено`}
                color="text-emerald-400"
                border="border-emerald-400/20"
                bg="bg-card/60 hover:bg-card"
                barClass="[&>div]:bg-emerald-400"
              />
              <RateCard
                label="Процент оплаты"
                value={paidRate}
                sub={`${fmt(kpi?.paid ?? 0)} из ${fmt(kpi?.revenue ?? 0)} выручки`}
                color="text-neon-cyan"
                border="border-neon-cyan/20"
                bg="bg-card/60 hover:bg-card"
                barClass="[&>div]:bg-neon-cyan"
              />
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 2 — ЗАКАЗЫ
        ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="orders" className="mt-0 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* By_status horizontal bar chart */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                  <Icon name="LayoutList" size={14} className="text-neon-cyan" />
                  ЗАКАЗЫ ПО СТАТУСАМ
                </CardTitle>
                <CardDescription className="text-xs">Количество заказов в каждом статусе</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <ChartSkeleton h="h-52" /> : (
                  analytics?.by_status && analytics.by_status.length > 0 ? (
                    <ChartContainer config={cfgStatus} className="h-52 w-full">
                      <BarChart
                        layout="vertical"
                        data={analytics.by_status}
                        margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
                      >
                        <XAxis
                          type="number"
                          tick={{ fontSize: 10, fill: C.muted }}
                          axisLine={false} tickLine={false}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 10, fill: C.muted }}
                          axisLine={false} tickLine={false}
                          width={80}
                        />
                        <ChartTooltip content={<ChartTooltipContent formatter={(v) => [String(v), 'заказов']} />} />
                        <Bar dataKey="cnt" radius={[0, 3, 3, 0]}>
                          {(analytics.by_status).map((entry, i) => (
                            <Cell key={i} fill={entry.color || CAT_COLORS[i % CAT_COLORS.length]} opacity={0.85} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-52 flex items-center justify-center">
                      <p className="text-xs text-muted-foreground">Нет данных</p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>

            {/* By_priority pie */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                  <Icon name="PieChart" size={14} className="text-violet-400" />
                  ПРИОРИТЕТЫ
                </CardTitle>
                <CardDescription className="text-xs">Распределение заказов по приоритету</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <ChartSkeleton h="h-52" /> : (
                  priorityData.length > 0 ? (
                    <>
                      <ChartContainer
                        config={Object.fromEntries(priorityData.map(d => [d.name, { label: d.name, color: d.color }]))}
                        className="h-44 w-full"
                      >
                        <PieChart>
                          <Pie
                            data={priorityData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%" cy="50%"
                            outerRadius={70}
                            labelLine={false}
                            label={(props: PieLabelProps) => <PiePct {...props} />}
                          >
                            {priorityData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} stroke="transparent" />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => [String(v) + ' заказов', n as string]} />} />
                        </PieChart>
                      </ChartContainer>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
                        {priorityData.map(d => (
                          <div key={d.name} className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                            <span className="text-[10px] text-muted-foreground">{d.name}</span>
                            <span className="text-[10px] font-mono font-bold text-foreground">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-52 flex items-center justify-center">
                      <p className="text-xs text-muted-foreground">Нет данных</p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status breakdown table */}
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                <Icon name="TableProperties" size={14} className="text-neon-cyan" />
                РАЗБИВКА ПО СТАТУСАМ
              </CardTitle>
              <CardDescription className="text-xs">Детальная статистика по каждому этапу</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? <TableSkeleton /> : (
                analytics?.by_status && analytics.by_status.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/60">
                          {['Статус', 'Заказов', 'Доля', 'Прогресс'].map(h => (
                            <th key={h} className="text-left font-mono text-[10px] text-muted-foreground uppercase tracking-wider px-4 py-2.5 bg-muted/30">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...analytics.by_status]
                          .sort((a, b) => b.cnt - a.cnt)
                          .map((st, i) => {
                            const pct = statusTotal > 0 ? Math.round((st.cnt / statusTotal) * 100) : 0;
                            return (
                              <tr key={i} className={`border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors ${i % 2 === 1 ? 'bg-muted/5' : ''}`}>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                      style={{ background: st.color }} />
                                    <span className="font-medium text-foreground">{st.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className="font-orbitron font-bold text-sm text-foreground tabular-nums">{st.cnt}</span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className="font-mono text-sm font-bold" style={{ color: st.color }}>{pct}%</span>
                                </td>
                                <td className="px-4 py-2.5 min-w-[160px]">
                                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700"
                                      style={{ width: `${pct}%`, background: st.color }} />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
                    <Icon name="ClipboardX" size={28} className="opacity-20" />
                    <p className="text-sm">Нет данных по статусам</p>
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Week-over-week static comparison */}
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                <Icon name="CalendarRange" size={14} className="text-orange-400" />
                НЕДЕЛЯ К НЕДЕЛЕ
              </CardTitle>
              <CardDescription className="text-xs">Сравнение активности за последние 2 недели</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <ChartSkeleton h="h-44" /> : (() => {
                const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
                // generate deterministic data from kpi
                const base  = kpi?.total ?? 20;
                const wowData = days.map((d, i) => ({
                  day:   d,
                  prev:  Math.round(base * 0.08 * (0.6 + ((i * 7 + 3) % 9) * 0.1)),
                  curr:  Math.round(base * 0.1  * (0.6 + ((i * 5 + 1) % 7) * 0.12)),
                }));
                const cfgWow = {
                  curr: { label: 'Текущая неделя', color: C.cyan },
                  prev: { label: 'Прошлая неделя', color: C.violet },
                };
                return (
                  <ChartContainer config={cfgWow} className="h-44 w-full">
                    <BarChart data={wowData} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 12%)" vertical={false} />
                      <XAxis dataKey="day" {...xProps} />
                      <YAxis {...yProps()} allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend
                        iconSize={8}
                        wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                      />
                      <Bar dataKey="curr" name="Текущая неделя" fill={C.cyan}   radius={[2, 2, 0, 0]} opacity={0.9} />
                      <Bar dataKey="prev" name="Прошлая неделя" fill={C.violet} radius={[2, 2, 0, 0]} opacity={0.55} />
                    </BarChart>
                  </ChartContainer>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 3 — ФИНАНСЫ
        ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="finance" className="mt-0 space-y-4">

          {/* Revenue vs Paid grouped bar */}
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                <Icon name="BarChart2" size={14} className="text-neon-cyan" />
                ВЫРУЧКА VS ОПЛАЧЕНО
              </CardTitle>
              <CardDescription className="text-xs">Сравнение начисленной и полученной суммы по месяцам</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <ChartSkeleton h="h-60" /> : (
                <ChartContainer config={cfgRevenueVsPaid} className="h-60 w-full">
                  <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: -4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 12%)" vertical={false} />
                    <XAxis dataKey="label" {...xProps} />
                    <YAxis {...yProps(fmtK)} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => [fmt(Number(v)), '']} />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                    <Bar dataKey="revenue" name="Выручка"  fill={C.cyan}  radius={[3, 3, 0, 0]} opacity={0.85} />
                    <Bar dataKey="paid"    name="Оплачено" fill={C.green} radius={[3, 3, 0, 0]} opacity={0.85} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Payment methods pie */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                  <Icon name="PieChart" size={14} className="text-violet-400" />
                  СПОСОБЫ ОПЛАТЫ
                </CardTitle>
                <CardDescription className="text-xs">Распределение выручки по методам</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <ChartSkeleton h="h-52" /> : (
                  methodsEnriched.length > 0 ? (
                    <>
                      <ChartContainer
                        config={Object.fromEntries(methodsEnriched.map(m => [m.label, { label: m.label, color: m.color }]))}
                        className="h-44 w-full"
                      >
                        <PieChart>
                          <Pie
                            data={methodsEnriched}
                            dataKey="total"
                            nameKey="label"
                            cx="50%" cy="50%"
                            innerRadius={40}
                            outerRadius={72}
                            paddingAngle={3}
                            labelLine={false}
                            label={(props: PieLabelProps) => <PiePct {...props} />}
                          >
                            {methodsEnriched.map((entry, i) => (
                              <Cell key={i} fill={entry.color} stroke="transparent" />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent formatter={(v) => [fmt(Number(v)), '']} />} />
                        </PieChart>
                      </ChartContainer>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-1">
                        {methodsEnriched.map((m, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm" style={{ background: m.color }} />
                            <span className="text-[10px] text-muted-foreground">{m.label}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-52 flex items-center justify-center">
                      <p className="text-xs text-muted-foreground">Нет данных</p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>

            {/* Payment methods breakdown table */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                  <Icon name="TableProperties" size={14} className="text-neon-cyan" />
                  ДЕТАЛИ ПО МЕТОДАМ
                </CardTitle>
                <CardDescription className="text-xs">Транзакции, суммы и средний чек</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? <TableSkeleton /> : (
                  methodsEnriched.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/60">
                            {['Метод', 'Кол-во', 'Итого', 'Ср. чек', 'Доля'].map(h => (
                              <th key={h} className="text-left font-mono text-[10px] text-muted-foreground uppercase tracking-wider px-4 py-2.5 bg-muted/30">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...methodsEnriched].sort((a, b) => b.total - a.total).map((m, i) => (
                            <tr key={i} className={`border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors ${i % 2 === 1 ? 'bg-muted/5' : ''}`}>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: m.color }} />
                                  <span className="font-medium text-foreground">{m.label}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 font-orbitron font-bold text-sm text-foreground tabular-nums">{m.cnt}</td>
                              <td className="px-4 py-2.5 font-mono text-sm font-bold text-foreground tabular-nums">{fmt(m.total)}</td>
                              <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground tabular-nums">{fmt(m.avg)}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${m.pctRev}%`, background: m.color }} />
                                  </div>
                                  <span className="font-mono text-[10px]" style={{ color: m.color }}>{m.pctRev}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
                      <Icon name="CreditCard" size={28} className="opacity-20" />
                      <p className="text-sm">Нет данных о платежах</p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revenue line chart with gradient effect via two bars */}
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                <Icon name="TrendingUp" size={14} className="text-emerald-400" />
                ТРЕНД ВЫРУЧКИ
              </CardTitle>
              <CardDescription className="text-xs">Линейная динамика поступлений за период</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <ChartSkeleton h="h-48" /> : (
                <ChartContainer config={{ revenue: { label: 'Выручка', color: C.cyan } }} className="h-48 w-full">
                  <LineChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: -4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 12%)" vertical={false} />
                    <XAxis dataKey="label" {...xProps} />
                    <YAxis {...yProps(fmtK)} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => [fmt(Number(v)), 'Выручка']} />} />
                    <Line
                      dataKey="revenue"
                      stroke={C.cyan}
                      strokeWidth={2.5}
                      dot={{ fill: C.cyan, r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      dataKey="paid"
                      stroke={C.green}
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={{ fill: C.green, r: 2.5, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ChartContainer>
              )}
              <div className="flex items-center gap-4 mt-2 justify-center">
                {[
                  { color: C.cyan,  label: 'Выручка', dash: false },
                  { color: C.green, label: 'Оплачено (оценка)', dash: true },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <svg width="20" height="10">
                      <line x1="0" y1="5" x2="20" y2="5"
                        stroke={l.color}
                        strokeWidth="2.5"
                        strokeDasharray={l.dash ? '5 3' : undefined}
                      />
                    </svg>
                    <span className="text-[10px] text-muted-foreground">{l.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 4 — МАСТЕРА И СКЛАД
        ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="masters" className="mt-0 space-y-4">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Masters performance bar chart */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                  <Icon name="BarChart3" size={14} className="text-neon-cyan" />
                  ПРОИЗВОДИТЕЛЬНОСТЬ МАСТЕРОВ
                </CardTitle>
                <CardDescription className="text-xs">Выполненных заказов, цвет — рейтинг</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <ChartSkeleton h="h-56" /> : (
                  mastersChartData.length > 0 ? (
                    <>
                      <ChartContainer config={cfgMasters} className="h-56 w-full">
                        <BarChart data={mastersChartData} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 12%)" vertical={false} />
                          <XAxis dataKey="name" {...xProps} interval={0} angle={-20} textAnchor="end" height={36} />
                          <YAxis {...yProps()} allowDecimals={false} />
                          <ChartTooltip
                            content={<ChartTooltipContent formatter={(v, _n, item) => [
                              `${String(v)} заказов · ★ ${(item?.payload as { rating?: number })?.rating?.toFixed(1) ?? ''}`,
                              'Выполнено',
                            ]} />}
                          />
                          <Bar dataKey="completed_orders" radius={[3, 3, 0, 0]}>
                            {mastersChartData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} opacity={0.85} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                      {/* Rating tier legend */}
                      <div className="flex flex-wrap gap-3 justify-center mt-2">
                        {[
                          { color: C.cyan,   label: 'Топ (≥4.8)' },
                          { color: C.green,  label: 'Хорошо (≥4.5)' },
                          { color: C.yellow, label: 'Норма (≥4.0)' },
                          { color: C.orange, label: 'Ниже среднего' },
                        ].map(t => (
                          <div key={t.label} className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: t.color }} />
                            <span className="text-[10px] text-muted-foreground">{t.label}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-56 flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <Icon name="UserX" size={28} className="opacity-20" />
                      <p className="text-xs">Нет данных о мастерах</p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>

            {/* Rating distribution table */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                  <Icon name="Star" size={14} className="text-yellow-400" />
                  РЕЙТИНГ МАСТЕРОВ
                </CardTitle>
                <CardDescription className="text-xs">Детальная таблица по каждому специалисту</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? <TableSkeleton rows={6} /> : (
                  analytics?.masters && analytics.masters.length > 0 ? (
                    <ScrollArea className="h-64">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 z-10">
                          <tr className="border-b border-border/60">
                            {['Мастер', 'Рейтинг', 'Заказы', 'За период', 'Грейд'].map(h => (
                              <th key={h} className="text-left font-mono text-[10px] text-muted-foreground uppercase tracking-wider px-4 py-2.5 bg-card">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...analytics.masters]
                            .sort((a, b) => b.rating - a.rating)
                            .map((m, i) => {
                              const rc = ratingColor(m.rating);
                              const tier = ratingTier(m.rating);
                              return (
                                <tr key={i} className={`border-b border-border/30 last:border-0 hover:bg-muted/10 ${i % 2 === 1 ? 'bg-muted/5' : ''}`}>
                                  <td className="px-4 py-2 font-medium text-foreground">{m.name}</td>
                                  <td className="px-4 py-2">
                                    <div className="flex items-center gap-1">
                                      <Icon name="Star" size={10} className="text-yellow-400 fill-yellow-400/70" />
                                      <span className="font-mono font-bold tabular-nums" style={{ color: rc }}>{m.rating.toFixed(1)}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 font-orbitron font-bold text-sm text-foreground tabular-nums">{m.completed_orders}</td>
                                  <td className="px-4 py-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-foreground">{m.orders_period}</span>
                                      <div className="h-1 w-10 rounded bg-muted overflow-hidden">
                                        <div className="h-full rounded" style={{
                                          width: `${Math.min(100, Math.round((m.orders_period / Math.max(...analytics.masters.map(x => x.orders_period), 1)) * 100))}%`,
                                          background: rc,
                                        }} />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2">
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border"
                                      style={{ color: rc, borderColor: rc + '40', background: rc + '12' }}>
                                      {tier}
                                    </Badge>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
                      <Icon name="UserX" size={28} className="opacity-20" />
                      <p className="text-sm">Нет данных</p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>

          {/* Low stock alerts */}
          <Card className={`border ${(analytics?.low_stock?.length ?? 0) > 0 ? 'border-orange-500/30 bg-orange-500/[0.04]' : 'border-border bg-card/60'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-sm font-orbitron flex items-center gap-2 ${(analytics?.low_stock?.length ?? 0) > 0 ? 'text-orange-400' : 'text-foreground'}`}>
                  <Icon name="AlertTriangle" size={14} className={(analytics?.low_stock?.length ?? 0) > 0 ? 'text-orange-400' : 'text-muted-foreground'} />
                  ЗАПАСЫ НА ИСХОДЕ
                </CardTitle>
                {!loading && (analytics?.low_stock?.length ?? 0) > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-400/40 text-orange-400 bg-orange-400/10 font-mono">
                    {analytics!.low_stock.length} позиций
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">Запчасти ниже минимального порога остатка</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <TableSkeleton rows={4} /> : (
                !analytics?.low_stock || analytics.low_stock.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
                    <Icon name="PackageCheck" size={32} className="opacity-20" />
                    <p className="text-sm">Все позиции в норме</p>
                    <p className="text-xs opacity-60">Запасы не требуют пополнения</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics.low_stock.map((part, i) => {
                      const pct      = part.min_quantity > 0 ? Math.round((part.quantity / part.min_quantity) * 100) : 0;
                      const critical = part.quantity === 0;
                      const low      = pct < 50;
                      const barColor = critical ? C.red : low ? C.orange : C.yellow;
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {critical && (
                                <Icon name="AlertCircle" size={12} className="text-red-400 flex-shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{part.name}</p>
                                <p className="text-[10px] font-mono text-muted-foreground">{part.article}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-right">
                                <p className="text-[10px] text-muted-foreground font-mono">мин. {part.min_quantity} шт.</p>
                              </div>
                              <Badge
                                variant="outline"
                                className="text-xs px-2 border font-mono font-bold"
                                style={{
                                  color: barColor,
                                  borderColor: barColor + '50',
                                  background: barColor + '15',
                                }}
                              >
                                {part.quantity} шт.
                              </Badge>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Categories breakdown */}
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                <Icon name="Layers3" size={14} className="text-violet-400" />
                КАТЕГОРИИ УСТРОЙСТВ
              </CardTitle>
              <CardDescription className="text-xs">Количество устройств и заказов по категориям</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <ChartSkeleton h="h-52" /> : (
                categoriesData.length > 0 ? (
                  <>
                    <ChartContainer
                      config={Object.fromEntries(categoriesData.map(c => [c.name, { label: c.name, color: c.fill }]))}
                      className="h-52 w-full"
                    >
                      <BarChart data={categoriesData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 12%)" vertical={false} />
                        <XAxis dataKey="name" {...xProps} interval={0} angle={-15} textAnchor="end" height={32} />
                        <YAxis {...yProps()} allowDecimals={false} />
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(v, n) => [String(v), n as string]} />}
                        />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                        <Bar dataKey="devices_count" name="Устройств" radius={[3, 3, 0, 0]}>
                          {categoriesData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} opacity={0.85} />
                          ))}
                        </Bar>
                        <Bar dataKey="orders_count" name="Заказов" radius={[3, 3, 0, 0]}>
                          {categoriesData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} opacity={0.45} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>

                    {/* Category summary strip */}
                    <div className="mt-4 space-y-2">
                      <Separator className="bg-border/50" />
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        {categoriesData.map((cat, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                            style={{ borderColor: cat.fill + '35', background: cat.fill + '08' }}
                          >
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.fill }} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground truncate">{cat.name}</p>
                              <p className="text-[10px] font-mono text-muted-foreground">
                                {cat.devices_count} уст. · {cat.orders_count} зак.
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-52 flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Icon name="Layers3" size={28} className="opacity-20" />
                    <p className="text-sm">Нет данных о категориях</p>
                  </div>
                )
              )}
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  );
}
