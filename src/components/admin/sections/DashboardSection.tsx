import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';
import { ordersService, mastersService, paymentsService, partsService } from '@/services/mockData';
import type { Order, Master, Payment, Part } from '@/services/mockData';

const STAT_CARDS = [
  { label: 'Заказов всего', icon: 'ClipboardList', color: 'text-neon-cyan', bg: 'bg-neon-cyan/10', border: 'border-neon-cyan/20', key: 'orders' },
  { label: 'Мастеров активно', icon: 'Wrench', color: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/20', key: 'masters' },
  { label: 'Выручка (июнь)', icon: 'CreditCard', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', key: 'revenue' },
  { label: 'Позиций на складе', icon: 'Package', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', key: 'parts' },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-400',
  high: 'text-orange-400',
  normal: 'text-blue-400',
  low: 'text-muted-foreground',
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Срочный',
  high: 'Высокий',
  normal: 'Обычный',
  low: 'Низкий',
};

export default function DashboardSection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [parts, setParts] = useState<Part[]>([]);

  useEffect(() => {
    ordersService.getAll().then(setOrders);
    mastersService.getAll().then(setMasters);
    paymentsService.getAll().then(setPayments);
    partsService.getAll().then(setParts);
  }, []);

  const revenue = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const activeMasters = masters.filter(m => m.status === 'available').length;
  const lowStockParts = parts.filter(p => p.quantity <= p.minQuantity);
  const urgentOrders = orders.filter(o => o.priority === 'urgent' || o.priority === 'high');

  const stats = [
    { key: 'orders', value: orders.length },
    { key: 'masters', value: activeMasters },
    { key: 'revenue', value: `${revenue.toLocaleString('ru')} ₽` },
    { key: 'parts', value: parts.reduce((s, p) => s + p.quantity, 0) },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card, i) => {
          const stat = stats.find(s => s.key === card.key);
          return (
            <Card key={card.key} className={`border ${card.border} bg-card/60 hover:bg-card transition-colors`}
              style={{ animationDelay: `${i * 60}ms` }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">{card.label}</p>
                    <p className="text-2xl font-orbitron font-bold text-foreground">{stat?.value ?? '—'}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${card.bg} border ${card.border} flex items-center justify-center`}>
                    <Icon name={card.icon} size={18} className={card.color} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent orders */}
        <Card className="lg:col-span-2 border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
              <Icon name="ClipboardList" size={16} className="text-neon-cyan" />
              ПОСЛЕДНИЕ ЗАКАЗЫ
            </CardTitle>
            <CardDescription className="text-xs">Активные заказы требующие внимания</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {orders.map(order => (
              <div key={order.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-neon-cyan/20 hover:bg-neon-cyan/3 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-neon-cyan/70">{order.number}</span>
                    <Badge variant="outline" className={`text-xs px-1.5 py-0 border-0 ${PRIORITY_COLORS[order.priority]}`}>
                      {PRIORITY_LABELS[order.priority]}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground truncate mt-0.5">{order.diagnosis}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-mono text-foreground">{order.totalPrice.toLocaleString('ru')} ₽</p>
                  <p className="text-xs text-muted-foreground">до {order.deadline}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Masters load */}
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                <Icon name="Wrench" size={16} className="text-violet-400" />
                ЗАГРУЗКА МАСТЕРОВ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {masters.map(master => (
                <div key={master.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground truncate">{master.name.split(' ')[0]} {master.name.split(' ')[1]?.[0]}.</span>
                    <Badge variant="outline" className={`text-xs px-1.5 py-0 ${
                      master.status === 'available' ? 'text-emerald-400 border-emerald-400/30' :
                      master.status === 'busy' ? 'text-orange-400 border-orange-400/30' :
                      'text-muted-foreground border-border'
                    }`}>
                      {master.status === 'available' ? 'Свободен' : master.status === 'busy' ? 'Занят' : 'Отпуск'}
                    </Badge>
                  </div>
                  <Progress
                    value={master.status === 'available' ? 30 : master.status === 'busy' ? 90 : 0}
                    className="h-1"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Low stock alert */}
          {lowStockParts.length > 0 && (
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-orange-400 flex items-center gap-2">
                  <Icon name="AlertTriangle" size={15} className="text-orange-400" />
                  ЗАКАНЧИВАЕТСЯ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lowStockParts.map(part => (
                  <div key={part.id} className="flex items-center justify-between">
                    <span className="text-xs text-foreground truncate flex-1 mr-2">{part.name}</span>
                    <Badge variant="outline" className="text-xs px-1.5 border-orange-400/30 text-orange-400">
                      {part.quantity} шт.
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Urgent */}
          {urgentOrders.length > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-red-400 flex items-center gap-2">
                  <Icon name="Flame" size={15} />
                  СРОЧНЫЕ ЗАКАЗЫ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {urgentOrders.map(o => (
                  <div key={o.id} className="flex items-center justify-between">
                    <span className="font-mono text-xs text-red-400/80">{o.number}</span>
                    <span className="text-xs text-muted-foreground">до {o.deadline}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Завершено заказов', value: orders.filter(o => o.completedAt).length, total: orders.length, color: 'bg-neon-cyan' },
          { label: 'Оплачено полностью', value: payments.filter(p => p.status === 'completed').length, total: payments.length, color: 'bg-emerald-500' },
          { label: 'Мастеров доступно', value: activeMasters, total: masters.length, color: 'bg-violet-500' },
          { label: 'Позиций >0 на складе', value: parts.filter(p => p.quantity > 0).length, total: parts.length, color: 'bg-orange-500' },
        ].map(metric => (
          <Card key={metric.label} className="border-border bg-card/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-2">{metric.label}</p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-xl font-orbitron font-bold text-foreground">{metric.value}</span>
                <span className="text-xs text-muted-foreground">/ {metric.total}</span>
              </div>
              <Progress value={metric.total ? (metric.value / metric.total) * 100 : 0} className="h-1" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="bg-border/50" />
      <p className="text-xs font-mono text-muted-foreground/40 text-right">
        LAST SYNC: {new Date().toLocaleTimeString('ru')} • AIS TECHSERVICE v2.6.0
      </p>
    </div>
  );
}
