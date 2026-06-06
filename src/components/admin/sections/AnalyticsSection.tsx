import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Icon from '@/components/ui/icon';
import { ordersService, mastersService, paymentsService, type Order, type Master, type Payment } from '@/services/mockData';

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'];
const REVENUE_DATA = [
  { month: 'Янв', revenue: 45000, orders: 12 },
  { month: 'Фев', revenue: 62000, orders: 18 },
  { month: 'Мар', revenue: 58000, orders: 15 },
  { month: 'Апр', revenue: 71000, orders: 21 },
  { month: 'Май', revenue: 84000, orders: 24 },
  { month: 'Июн', revenue: 49200, orders: 10 },
];

const CATEGORY_DATA = [
  { name: 'Ноутбуки', value: 38, color: '#00d4ff' },
  { name: 'Смартфоны', value: 31, color: '#8b5cf6' },
  { name: 'Планшеты', value: 12, color: '#10b981' },
  { name: 'ПК', value: 13, color: '#f59e0b' },
  { name: 'Принтеры', value: 6, color: '#ef4444' },
];

const MASTER_PERF = [
  { name: 'Орлов', completed: 48, rating: 4.9 },
  { name: 'Соколов', completed: 41, rating: 4.8 },
  { name: 'Зайцев', completed: 22, rating: 4.6 },
  { name: 'Смирнова', completed: 31, rating: 4.7 },
  { name: 'Кузнецов', completed: 8, rating: 4.3 },
];

const chartConfig = {
  revenue: { label: 'Выручка', color: 'hsl(185 100% 50%)' },
  orders: { label: 'Заказы', color: 'hsl(270 80% 60%)' },
};

export default function AnalyticsSection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [period, setPeriod] = useState('6m');

  useEffect(() => {
    ordersService.getAll().then(setOrders);
    mastersService.getAll().then(setMasters);
    paymentsService.getAll().then(setPayments);
  }, []);

  const totalRevenue = REVENUE_DATA.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = REVENUE_DATA.reduce((s, d) => s + d.orders, 0);
  const avgCheck = Math.round(totalRevenue / totalOrders);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Выручка за 6 мес.', value: `${(totalRevenue / 1000).toFixed(0)}K ₽`, delta: '+18%', up: true, icon: 'TrendingUp', color: 'text-emerald-400', border: 'border-emerald-400/20' },
          { label: 'Заказов завершено', value: totalOrders, delta: '+12%', up: true, icon: 'CheckCircle2', color: 'text-neon-cyan', border: 'border-neon-cyan/20' },
          { label: 'Средний чек', value: `${avgCheck.toLocaleString('ru')} ₽`, delta: '+5%', up: true, icon: 'Receipt', color: 'text-violet-400', border: 'border-violet-400/20' },
          { label: 'Отказов', value: '3', delta: '-2', up: false, icon: 'XCircle', color: 'text-red-400', border: 'border-red-400/20' },
        ].map(kpi => (
          <Card key={kpi.label} className={`border ${kpi.border} bg-card/60`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
                <Icon name={kpi.icon} size={16} className={`${kpi.color} opacity-60`} />
              </div>
              <p className={`text-2xl font-orbitron font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className={`text-xs mt-1 flex items-center gap-1 ${kpi.up ? 'text-emerald-400' : 'text-red-400'}`}>
                <Icon name={kpi.up ? 'ArrowUpRight' : 'ArrowDownRight'} size={12} />
                {kpi.delta} к прошлому периоду
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="revenue">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-muted">
            <TabsTrigger value="revenue" className="text-xs">Выручка</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs">Заказы</TabsTrigger>
            <TabsTrigger value="masters" className="text-xs">Мастера</TabsTrigger>
            <TabsTrigger value="categories" className="text-xs">Категории</TabsTrigger>
          </TabsList>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-28 h-8 bg-input border-border text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="3m">3 месяца</SelectItem>
              <SelectItem value="6m">6 месяцев</SelectItem>
              <SelectItem value="1y">1 год</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="revenue">
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-orbitron text-foreground">ДИНАМИКА ВЫРУЧКИ</CardTitle>
              <CardDescription className="text-xs">Помесячная выручка сервисного центра</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <BarChart data={REVENUE_DATA}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}K`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="hsl(185 100% 50%)" radius={[4,4,0,0]} opacity={0.8} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-orbitron text-foreground">КОЛИЧЕСТВО ЗАКАЗОВ</CardTitle>
              <CardDescription className="text-xs">Динамика принятых и выполненных заказов</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <LineChart data={REVENUE_DATA}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="orders" stroke="hsl(270 80% 60%)" strokeWidth={2} dot={{ fill: 'hsl(270 80% 60%)', r: 4 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="masters">
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-orbitron text-foreground">ЭФФЕКТИВНОСТЬ МАСТЕРОВ</CardTitle>
              <CardDescription className="text-xs">Сравнение по выполненным заказам</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {MASTER_PERF.map(mp => (
                <div key={mp.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground font-medium">{mp.name}</span>
                      <div className="flex items-center gap-1">
                        <Icon name="Star" size={11} className="text-yellow-400 fill-yellow-400/50" />
                        <span className="text-xs font-mono text-yellow-400">{mp.rating}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{mp.completed} заказов</span>
                  </div>
                  <Progress value={(mp.completed / 48) * 100} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-foreground">РАСПРЕДЕЛЕНИЕ ПО ТИПАМ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center mb-4">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={CATEGORY_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                        dataKey="value" paddingAngle={3}>
                        {CATEGORY_DATA.map((entry, i) => (
                          <Cell key={i} fill={entry.color} opacity={0.85} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{ background: 'hsl(220 20% 7%)', border: '1px solid hsl(220 20% 15%)', borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {CATEGORY_DATA.map(cat => (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm text-foreground">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={cat.value} className="w-20 h-1.5" />
                        <span className="text-sm font-mono text-muted-foreground w-8 text-right">{cat.value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-foreground">ИТОГОВЫЕ МЕТРИКИ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Среднее время ремонта', value: '3.2 дня', icon: 'Clock', color: 'text-neon-cyan' },
                  { label: 'Повторные клиенты', value: '34%', icon: 'RefreshCw', color: 'text-violet-400' },
                  { label: 'NPS (удовлетворённость)', value: '87 / 100', icon: 'Heart', color: 'text-pink-400' },
                  { label: 'Процент с гарантией', value: '91%', icon: 'ShieldCheck', color: 'text-emerald-400' },
                  { label: 'Среднее ожидание', value: '1.4 ч', icon: 'Timer', color: 'text-yellow-400' },
                ].map(m => (
                  <div key={m.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <Icon name={m.icon} size={15} className={m.color} />
                      <span className="text-sm text-muted-foreground">{m.label}</span>
                    </div>
                    <span className={`font-mono font-bold text-sm ${m.color}`}>{m.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
