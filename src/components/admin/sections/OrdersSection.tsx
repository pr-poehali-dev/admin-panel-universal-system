import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import Icon from '@/components/ui/icon';
import { ordersApi, statusesApi, mastersApi, devicesApi } from '@/services/api';
import type { Order, OrderStatus, Master, Device } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

// ─── Maps & constants ──────────────────────────────────────────────────────────

const PRIORITY_MAP: Record<string, { label: string; color: string; ring: string }> = {
  urgent: { label: 'Срочный', color: 'bg-red-500/15 text-red-400 border-red-500/30',    ring: 'border-l-red-500' },
  high:   { label: 'Высокий', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', ring: 'border-l-orange-500' },
  normal: { label: 'Обычный', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', ring: 'border-l-blue-500/60' },
  low:    { label: 'Низкий',  color: 'bg-muted text-muted-foreground border-border',     ring: 'border-l-border' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Наличные', card: 'Карта', transfer: 'Перевод', online: 'Онлайн',
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Ожидает',  color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' },
  completed: { label: 'Оплачен',  color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  refunded:  { label: 'Возврат',  color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
  failed:    { label: 'Ошибка',   color: 'text-red-400 border-red-400/30 bg-red-400/10' },
};

// Last 7 days labels for the analytics chart (static, as requested)
const TODAY = new Date();
const WEEK_LABELS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(TODAY);
  d.setDate(TODAY.getDate() - (6 - i));
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
});

const barChartConfig = {
  count: { label: 'Заказов', color: 'hsl(185 100% 50%)' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('ru-RU') + ' ₽'; }

function fmtDate(s: string | null | undefined, fallback = '—') {
  if (!s) return fallback;
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

function exportCsv(orders: Order[]) {
  const header = ['Номер', 'Клиент', 'Телефон', 'Устройство', 'Мастер', 'Статус', 'Приоритет', 'Сумма', 'Оплачено', 'Дедлайн'];
  const rows = orders.map(o => [
    o.number, o.client_name, o.client_phone,
    [o.device_brand, o.device_name].filter(Boolean).join(' ') || '—',
    o.master_name || '—', o.status_name || '—',
    PRIORITY_MAP[o.priority]?.label ?? o.priority,
    o.total_price, o.paid_amount, o.deadline ?? '—',
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// Distribute orders into fake last-7-day buckets deterministically by id
function buildWeekData(orders: Order[]) {
  const buckets = Array.from({ length: 7 }, (_, i) => ({ label: WEEK_LABELS[i], count: 0 }));
  orders.forEach(o => { buckets[o.id % 7].count += 1; });
  return buckets;
}

// ─── Empty form factory ────────────────────────────────────────────────────────

function emptyForm(orderCount: number): Partial<Order> {
  return {
    number: `ORD-${new Date().getFullYear()}-${String(orderCount + 1).padStart(3, '0')}`,
    client_name: '', client_phone: '', diagnosis: '',
    notes: '', priority: 'normal', total_price: 0, paid_amount: 0,
    status_id: null, master_id: null, device_id: null,
    deadline: '', created_at: new Date().toISOString().split('T')[0],
    completed_at: null,
  };
}

// ─── Detail drawer ─────────────────────────────────────────────────────────────

interface DetailSheetProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onEdit: (o: Order) => void;
  statuses: OrderStatus[];
}

function DetailSheet({ order, open, onClose, onEdit, statuses }: DetailSheetProps) {
  if (!order) return null;
  const prio = PRIORITY_MAP[order.priority] ?? PRIORITY_MAP.normal;
  const status = statuses.find(s => s.id === order.status_id);
  const paid = order.paid_amount ?? 0;
  const total = order.total_price ?? 0;
  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const overdue = isOverdue(order.deadline);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl bg-card border-l border-neon-cyan/20 p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-neon-cyan/70">{order.number}</span>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${prio.color}`}>
                  {prio.label}
                </Badge>
                {status && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border"
                    style={{ color: status.color, borderColor: status.color + '50', background: status.color + '15' }}>
                    {status.name}
                  </Badge>
                )}
              </div>
              <SheetTitle className="font-orbitron text-base text-foreground leading-tight">
                {order.client_name || 'Клиент не указан'}
              </SheetTitle>
              {order.client_phone && (
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{order.client_phone}</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => onEdit(order)}
              className="border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 h-8 gap-1.5 text-xs flex-shrink-0">
              <Icon name="Pencil" size={12} /> Изменить
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-5">

            {/* Device block */}
            {(order.device_name || order.device_brand) && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Устройство</p>
                <p className="text-sm font-medium text-foreground">
                  {[order.device_brand, order.device_name].filter(Boolean).join(' ')}
                </p>
              </div>
            )}

            {/* Diagnosis */}
            {order.diagnosis && (
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Диагноз / описание</p>
                <p className="text-sm text-foreground/90 leading-relaxed">{order.diagnosis}</p>
              </div>
            )}

            {/* Master + dates row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Мастер</p>
                <p className="text-sm font-medium text-foreground">{order.master_name || '—'}</p>
              </div>
              <div className={`rounded-lg border p-3 ${overdue ? 'border-red-500/30 bg-red-500/5' : 'border-border/60 bg-muted/20'}`}>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Дедлайн</p>
                <p className={`text-sm font-medium font-mono ${overdue ? 'text-red-400' : 'text-foreground'}`}>
                  {fmtDate(order.deadline)}
                  {overdue && <span className="ml-1 text-[9px] text-red-400 uppercase">просрочен</span>}
                </p>
              </div>
            </div>

            {/* Payment summary */}
            <div className="rounded-lg border border-neon-cyan/15 bg-neon-cyan/5 p-3 space-y-3">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Финансы</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Оплачено</p>
                  <p className="font-orbitron text-lg font-bold text-neon-cyan">{fmt(paid)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Итого</p>
                  <p className="font-orbitron text-lg font-bold text-foreground">{fmt(total)}</p>
                </div>
              </div>
              <div className="space-y-1">
                <Progress value={paidPct} className="h-1.5 [&>div]:bg-neon-cyan" />
                <p className="text-[10px] font-mono text-muted-foreground text-right">{paidPct}% оплачено</p>
              </div>
            </div>

            {/* Services list */}
            {order.services && order.services.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  Работы ({order.services.length})
                </p>
                <div className="space-y-1">
                  {order.services.map((svc, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                      <div className="flex items-center gap-2">
                        <Icon name="Wrench" size={11} className="text-violet-400 flex-shrink-0" />
                        <span className="text-xs text-foreground">{svc.service_name ?? `Услуга #${svc.service_id}`}</span>
                      </div>
                      <span className="font-mono text-xs text-foreground">{fmt(svc.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parts list */}
            {order.parts && order.parts.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  Запчасти ({order.parts.length})
                </p>
                <div className="space-y-1">
                  {order.parts.map((part, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon name="Package" size={11} className="text-orange-400 flex-shrink-0" />
                        <span className="text-xs text-foreground truncate">{part.part_name ?? `Запчасть #${part.part_id}`}</span>
                        {part.article && <span className="text-[10px] text-muted-foreground font-mono">{part.article}</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground">×{part.quantity}</span>
                        <span className="font-mono text-xs text-foreground">{fmt(part.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payments history */}
            {order.payments && order.payments.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  История платежей ({order.payments.length})
                </p>
                <div className="space-y-1.5">
                  {order.payments.map((p, i) => {
                    const ps = PAYMENT_STATUS_MAP[p.status] ?? PAYMENT_STATUS_MAP.pending;
                    return (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/10">
                        <div className="flex items-center gap-2">
                          <Icon name="CreditCard" size={12} className="text-muted-foreground" />
                          <div>
                            <p className="text-xs text-foreground">{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{fmtDate(p.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${ps.color}`}>{ps.label}</Badge>
                          <span className="font-mono text-sm font-bold text-foreground">{fmt(p.amount)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            {order.notes && (
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Примечания</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{order.notes}</p>
              </div>
            )}

            {/* Meta row */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] font-mono text-muted-foreground">
              <span>Создан: {fmtDate(order.created_at)}</span>
              {order.completed_at && <span>Завершён: {fmtDate(order.completed_at)}</span>}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ─── Edit dialog ───────────────────────────────────────────────────────────────

interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Order>) => Promise<void>;
  order: Order | null;
  statuses: OrderStatus[];
  masters: Master[];
  devices: Device[];
  saving: boolean;
}

function EditDialog({ open, onClose, onSave, order, statuses, masters, devices, saving }: EditDialogProps) {
  const [tab, setTab] = useState('main');
  const [form, setForm] = useState<Partial<Order>>({});

  useEffect(() => {
    if (open) {
      setTab('main');
      setForm(order ? { ...order } : {});
    }
  }, [open, order]);

  const set = <K extends keyof Order>(k: K, v: Order[K]) => setForm(f => ({ ...f, [k]: v }));
  const str = (k: keyof Order) => String(form[k] ?? '');
  const num = (k: keyof Order) => Number(form[k] ?? 0);

  const fieldClass = 'bg-input border-border text-sm h-9';
  const labelClass = 'text-[10px] font-mono text-muted-foreground uppercase tracking-wider';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle className="font-orbitron text-sm text-foreground">
            {order ? `РЕДАКТИРОВАТЬ — ${order.number}` : 'НОВЫЙ ЗАКАЗ'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="mx-6 mt-4 bg-muted w-fit h-8">
            <TabsTrigger value="main"     className="text-xs px-3 h-6">Основное</TabsTrigger>
            <TabsTrigger value="client"   className="text-xs px-3 h-6">Клиент</TabsTrigger>
            <TabsTrigger value="finance"  className="text-xs px-3 h-6">Финансы</TabsTrigger>
            <TabsTrigger value="details"  className="text-xs px-3 h-6">Детали</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* ── Основное ── */}
            <TabsContent value="main" className="px-6 pb-2 space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className={labelClass}>Номер заказа</Label>
                  <Input value={str('number')} onChange={e => set('number', e.target.value)} className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>Приоритет</Label>
                  <Select value={str('priority') || 'normal'} onValueChange={v => set('priority', v as Order['priority'])}>
                    <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="low">Низкий</SelectItem>
                      <SelectItem value="normal">Обычный</SelectItem>
                      <SelectItem value="high">Высокий</SelectItem>
                      <SelectItem value="urgent">Срочный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className={labelClass}>Статус</Label>
                  <Select
                    value={form.status_id != null ? String(form.status_id) : ''}
                    onValueChange={v => set('status_id', v ? Number(v) : null)}
                  >
                    <SelectTrigger className={fieldClass}><SelectValue placeholder="Выбрать…" /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {statuses.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>Мастер</Label>
                  <Select
                    value={form.master_id != null ? String(form.master_id) : 'none'}
                    onValueChange={v => set('master_id', v === 'none' ? null : Number(v))}
                  >
                    <SelectTrigger className={fieldClass}><SelectValue placeholder="Не назначен" /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="none">Не назначен</SelectItem>
                      {masters.map(m => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className={labelClass}>Устройство</Label>
                <Select
                  value={form.device_id != null ? String(form.device_id) : 'none'}
                  onValueChange={v => set('device_id', v === 'none' ? null : Number(v))}
                >
                  <SelectTrigger className={fieldClass}><SelectValue placeholder="Выбрать устройство" /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="none">Не привязано</SelectItem>
                    {devices.map(d => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {[d.brand, d.name].filter(Boolean).join(' ')} — {d.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className={labelClass}>Диагноз / описание</Label>
                <Textarea
                  value={str('diagnosis')}
                  onChange={e => set('diagnosis', e.target.value)}
                  rows={3}
                  className="bg-input border-border text-sm resize-none"
                />
              </div>
            </TabsContent>

            {/* ── Клиент ── */}
            <TabsContent value="client" className="px-6 pb-2 space-y-4 mt-0">
              <div className="space-y-1.5">
                <Label className={labelClass}>Имя клиента</Label>
                <Input value={str('client_name')} onChange={e => set('client_name', e.target.value)} className={fieldClass} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Телефон</Label>
                <Input value={str('client_phone')} onChange={e => set('client_phone', e.target.value)} className={fieldClass} placeholder="+7 (000) 000-00-00" />
              </div>
            </TabsContent>

            {/* ── Финансы ── */}
            <TabsContent value="finance" className="px-6 pb-2 space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className={labelClass}>Стоимость (₽)</Label>
                  <Input
                    type="number" min={0}
                    value={num('total_price')}
                    onChange={e => set('total_price', Number(e.target.value))}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>Оплачено (₽)</Label>
                  <Input
                    type="number" min={0}
                    value={num('paid_amount')}
                    onChange={e => set('paid_amount', Number(e.target.value))}
                    className={fieldClass}
                  />
                </div>
              </div>
              {num('total_price') > 0 && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Оплачено</span>
                    <span className="font-mono font-bold text-neon-cyan">
                      {Math.min(100, Math.round((num('paid_amount') / num('total_price')) * 100))}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, Math.round((num('paid_amount') / num('total_price')) * 100))}
                    className="h-1.5 [&>div]:bg-neon-cyan"
                  />
                </div>
              )}
            </TabsContent>

            {/* ── Детали ── */}
            <TabsContent value="details" className="px-6 pb-2 space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className={labelClass}>Дата создания</Label>
                  <Input
                    type="date"
                    value={str('created_at').split('T')[0]}
                    onChange={e => set('created_at', e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>Дедлайн</Label>
                  <Input
                    type="date"
                    value={str('deadline').split('T')[0]}
                    onChange={e => set('deadline', e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Примечания</Label>
                <Textarea
                  value={str('notes')}
                  onChange={e => set('notes', e.target.value)}
                  rows={4}
                  className="bg-input border-border text-sm resize-none"
                  placeholder="Внутренние заметки по заказу…"
                />
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t border-border/60 gap-2">
          <Button variant="outline" onClick={onClose} className="border-border text-sm h-9" disabled={saving}>
            Отмена
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={saving}
            className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium"
          >
            {saving && <Icon name="Loader2" size={14} className="animate-spin" />}
            {saving ? 'Сохранение…' : order ? 'Сохранить' : 'Создать заказ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Kanban column ─────────────────────────────────────────────────────────────

interface KanbanColProps {
  status: OrderStatus;
  orders: Order[];
  onCardClick: (o: Order) => void;
}

function KanbanCol({ status, orders, onCardClick }: KanbanColProps) {
  return (
    <div className="flex-shrink-0 w-64 flex flex-col gap-2">
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-lg border"
        style={{ borderColor: status.color + '40', background: status.color + '10' }}
      >
        <span className="text-xs font-mono font-bold truncate" style={{ color: status.color }}>
          {status.name}
        </span>
        <span
          className="text-[10px] font-orbitron font-bold px-1.5 py-0.5 rounded-full border"
          style={{ color: status.color, borderColor: status.color + '50', background: status.color + '15' }}
        >
          {orders.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 min-h-[80px]">
        {orders.length === 0 && (
          <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-border/40 text-[10px] text-muted-foreground/40">
            Пусто
          </div>
        )}
        {orders.map(order => {
          const prio = PRIORITY_MAP[order.priority] ?? PRIORITY_MAP.normal;
          const overdue = isOverdue(order.deadline);
          return (
            <div
              key={order.id}
              onClick={() => onCardClick(order)}
              className={`group p-3 rounded-lg border-l-2 border border-border/50 bg-card/80 hover:bg-card hover:border-border cursor-pointer transition-all duration-150 hover:shadow-lg ${prio.ring}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] text-neon-cyan/70">{order.number}</span>
                <Badge variant="outline" className={`text-[9px] px-1 py-0 border leading-tight ${prio.color}`}>
                  {prio.label}
                </Badge>
              </div>
              {order.client_name && (
                <p className="text-xs font-medium text-foreground truncate mb-1">{order.client_name}</p>
              )}
              {order.diagnosis && (
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                  {order.diagnosis}
                </p>
              )}
              <div className="flex items-center justify-between">
                {order.master_name ? (
                  <span className="text-[10px] text-muted-foreground truncate">{order.master_name.split(' ')[0]}</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground/40 italic">мастер не назн.</span>
                )}
                {order.total_price > 0 && (
                  <span className="font-mono text-[10px] text-foreground/80 flex-shrink-0">
                    {fmt(order.total_price)}
                  </span>
                )}
              </div>
              {order.deadline && (
                <div className={`flex items-center gap-1 mt-1.5 text-[9px] font-mono ${overdue ? 'text-red-400' : 'text-muted-foreground/60'}`}>
                  <Icon name="Clock" size={8} />
                  {fmtDate(order.deadline)}
                  {overdue && ' — просрочен'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function OrdersSection() {
  // Data
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [masters,  setMasters]  = useState<Master[]>([]);
  const [devices,  setDevices]  = useState<Device[]>([]);

  // UI state
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Sheet / dialog
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailOpen,  setDetailOpen]  = useState(false);
  const [editOrder,   setEditOrder]   = useState<Order | null>(null);
  const [editOpen,    setEditOpen]    = useState(false);
  const [deleteId,    setDeleteId]    = useState<number | null>(null);
  const [saving,      setSaving]      = useState(false);

  const { toast } = useToast();

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadOrders = useCallback(() => {
    return ordersApi.getAll().then(setOrders);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      ordersApi.getAll().then(setOrders),
      statusesApi.getAll().then(setStatuses),
      mastersApi.getAll().then(setMasters),
      devicesApi.getAll().then(setDevices),
    ]).finally(() => setLoading(false));
  }, []);

  // ── Filtered list ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        o.number.toLowerCase().includes(q) ||
        o.client_name.toLowerCase().includes(q) ||
        o.client_phone.includes(q) ||
        (o.diagnosis ?? '').toLowerCase().includes(q) ||
        (o.master_name ?? '').toLowerCase().includes(q) ||
        (o.device_name ?? '').toLowerCase().includes(q);
      const matchStatus   = filterStatus   === 'all' || String(o.status_id) === filterStatus;
      const matchPriority = filterPriority === 'all' || o.priority === filterPriority;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [orders, search, filterStatus, filterPriority]);

  // ── Kanban grouping ─────────────────────────────────────────────────────────

  const kanbanCols = useMemo(() => {
    return statuses
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(s => ({
        status: s,
        orders: orders.filter(o => o.status_id === s.id),
      }));
  }, [statuses, orders]);

  // ── Analytics ───────────────────────────────────────────────────────────────

  const analytics = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const total     = orders.length;
    const completed = orders.filter(o => statuses.find(s => s.id === o.status_id && s.is_terminal)).length;
    const active    = total - completed;
    const overdue   = orders.filter(o => isOverdue(o.deadline) && !statuses.find(s => s.id === o.status_id && s.is_terminal)).length;
    const doneToday = orders.filter(o => o.completed_at?.split('T')[0] === todayStr).length;

    // Top masters by orders assigned
    const masterMap = new Map<string, number>();
    orders.forEach(o => {
      if (o.master_name) masterMap.set(o.master_name, (masterMap.get(o.master_name) ?? 0) + 1);
    });
    const topMasters = Array.from(masterMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));

    const weekData = buildWeekData(orders);
    return { total, completed, active, overdue, doneToday, topMasters, weekData };
  }, [orders, statuses]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openDetail = (o: Order) => { setDetailOrder(o); setDetailOpen(true); };
  const openCreate = () => { setEditOrder(null); setEditOpen(true); };
  const openEdit   = (o: Order) => { setDetailOpen(false); setEditOrder(o); setEditOpen(true); };

  const handleSave = async (data: Partial<Order>) => {
    setSaving(true);
    try {
      if (editOrder) {
        await ordersApi.update(editOrder.id, data);
        toast({ title: 'Заказ обновлён', description: editOrder.number });
      } else {
        await ordersApi.create(data);
        toast({ title: 'Заказ создан', description: data.number });
      }
      setEditOpen(false);
      await loadOrders();
    } catch (e: unknown) {
      toast({ title: 'Ошибка', description: (e as Error)?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await ordersApi.delete(deleteId);
      toast({ title: 'Заказ удалён', variant: 'destructive' });
      setDeleteId(null);
      await loadOrders();
    } catch (e: unknown) {
      toast({ title: 'Ошибка удаления', description: (e as Error)?.message, variant: 'destructive' });
    }
  };

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Icon name="Loader2" size={20} className="animate-spin text-neon-cyan" />
        <span className="text-sm font-mono">Загрузка заказов…</span>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ═══════════════════ TOP TOOLBAR ═══════════════════ */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        {/* Summary chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-neon-cyan/25 bg-neon-cyan/5">
            <Icon name="ClipboardList" size={12} className="text-neon-cyan" />
            <span className="text-xs font-mono text-neon-cyan font-bold">{orders.length}</span>
            <span className="text-[10px] text-muted-foreground">всего</span>
          </div>
          {analytics.overdue > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-red-500/30 bg-red-500/5">
              <Icon name="AlertCircle" size={12} className="text-red-400" />
              <span className="text-xs font-mono text-red-400 font-bold">{analytics.overdue}</span>
              <span className="text-[10px] text-muted-foreground">просрочено</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(filtered)}
            className="border-border text-xs h-9 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Icon name="Download" size={13} /> Экспорт CSV
          </Button>
          <Button
            onClick={openCreate}
            className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium"
          >
            <Icon name="Plus" size={14} /> Новый заказ
          </Button>
        </div>
      </div>

      {/* ═══════════════════ MAIN TABS ═══════════════════ */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="bg-muted h-9">
          <TabsTrigger value="list"      className="text-xs gap-1.5">
            <Icon name="TableProperties" size={12} /> Список
          </TabsTrigger>
          <TabsTrigger value="kanban"    className="text-xs gap-1.5">
            <Icon name="Columns3" size={12} /> Воронка
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs gap-1.5">
            <Icon name="BarChart3" size={12} /> Аналитика
          </TabsTrigger>
        </TabsList>

        {/* ─────────────── TAB 1: СПИСОК ─────────────── */}
        <TabsContent value="list" className="space-y-3 mt-0">

          {/* Filters row */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Номер, клиент, диагноз, мастер…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 bg-input border-border text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <Icon name="X" size={12} />
                </button>
              )}
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44 h-9 bg-input border-border text-sm">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Все статусы</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-40 h-9 bg-input border-border text-sm">
                <SelectValue placeholder="Приоритет" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Все приоритеты</SelectItem>
                <SelectItem value="urgent">Срочный</SelectItem>
                <SelectItem value="high">Высокий</SelectItem>
                <SelectItem value="normal">Обычный</SelectItem>
                <SelectItem value="low">Низкий</SelectItem>
              </SelectContent>
            </Select>

            {(filterStatus !== 'all' || filterPriority !== 'all' || search) && (
              <Button
                variant="ghost" size="sm"
                onClick={() => { setSearch(''); setFilterStatus('all'); setFilterPriority('all'); }}
                className="h-9 text-xs text-muted-foreground gap-1 px-2"
              >
                <Icon name="FilterX" size={12} /> Сбросить
              </Button>
            )}

            <span className="text-[11px] font-mono text-muted-foreground ml-auto">
              {filtered.length} из {orders.length}
            </span>
          </div>

          {/* Table */}
          <Card className="border-border bg-card/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-32">Номер</TableHead>
                  <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Клиент</TableHead>
                  <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Устройство</TableHead>
                  <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider hidden md:table-cell">Мастер</TableHead>
                  <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Статус</TableHead>
                  <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Приоритет</TableHead>
                  <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider text-right hidden sm:table-cell">Сумма / Оплата</TableHead>
                  <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider text-right hidden md:table-cell">Дедлайн</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(order => {
                  const prio    = PRIORITY_MAP[order.priority] ?? PRIORITY_MAP.normal;
                  const overdue = isOverdue(order.deadline);
                  const paid    = order.paid_amount ?? 0;
                  const total   = order.total_price ?? 0;
                  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;

                  return (
                    <TableRow
                      key={order.id}
                      className="border-border hover:bg-neon-cyan/[0.03] transition-colors cursor-pointer"
                      onClick={() => openDetail(order)}
                    >
                      {/* Number */}
                      <TableCell className="py-2.5">
                        <span className="font-mono text-xs text-neon-cyan/80">{order.number}</span>
                      </TableCell>

                      {/* Client */}
                      <TableCell className="py-2.5">
                        <p className="text-sm font-medium text-foreground truncate max-w-[140px]">{order.client_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{order.client_phone}</p>
                      </TableCell>

                      {/* Device */}
                      <TableCell className="py-2.5 hidden lg:table-cell">
                        <p className="text-xs text-foreground/80 truncate max-w-[120px]">
                          {[order.device_brand, order.device_name].filter(Boolean).join(' ') || '—'}
                        </p>
                      </TableCell>

                      {/* Master */}
                      <TableCell className="py-2.5 hidden md:table-cell">
                        <p className="text-xs text-foreground/80 truncate max-w-[100px]">
                          {order.master_name || <span className="text-muted-foreground/40 italic">не назн.</span>}
                        </p>
                      </TableCell>

                      {/* Status badge */}
                      <TableCell className="py-2.5">
                        {order.status_name ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 border"
                            style={{
                              color: order.status_color,
                              borderColor: (order.status_color ?? '#888') + '50',
                              background: (order.status_color ?? '#888') + '15',
                            }}
                          >
                            {order.status_name}
                          </Badge>
                        ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                      </TableCell>

                      {/* Priority badge */}
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${prio.color}`}>
                          {prio.label}
                        </Badge>
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="py-2.5 text-right hidden sm:table-cell" onClick={e => e.stopPropagation()}>
                        <p className="font-mono text-xs font-medium text-foreground">{fmt(total)}</p>
                        <div className="flex items-center gap-1.5 justify-end mt-1">
                          <Progress value={paidPct} className="h-1 w-12 [&>div]:bg-emerald-400" />
                          <span className="text-[10px] font-mono text-emerald-400">{paidPct}%</span>
                        </div>
                      </TableCell>

                      {/* Deadline */}
                      <TableCell className="py-2.5 text-right hidden md:table-cell">
                        {order.deadline ? (
                          <div className={`flex items-center gap-1 justify-end ${overdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                            {overdue && <Icon name="AlertCircle" size={10} className="text-red-400" />}
                            <span className="font-mono text-xs">{fmtDate(order.deadline)}</span>
                          </div>
                        ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-2.5" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground">
                              <Icon name="MoreVertical" size={13} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-card border-border" align="end">
                            <DropdownMenuItem onClick={() => openDetail(order)} className="gap-2 text-xs cursor-pointer">
                              <Icon name="Eye" size={13} /> Просмотр
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(order)} className="gap-2 text-xs cursor-pointer">
                              <Icon name="Pencil" size={13} /> Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                              onClick={() => setDeleteId(order.id)}
                              className="gap-2 text-xs text-destructive cursor-pointer focus:text-destructive"
                            >
                              <Icon name="Trash2" size={13} /> Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Icon name="SearchX" size={32} className="opacity-25" />
                        <p className="text-sm">Заказы не найдены</p>
                        <p className="text-xs opacity-60">Попробуйте изменить фильтры или поисковый запрос</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ─────────────── TAB 2: ВОРОНКА (KANBAN) ─────────────── */}
        <TabsContent value="kanban" className="mt-0">
          <Card className="border-border bg-card/60 p-4">
            {kanbanCols.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-muted-foreground gap-2">
                <Icon name="Columns3" size={32} className="opacity-25" />
                <p className="text-sm">Статусы не загружены</p>
              </div>
            ) : (
              <ScrollArea className="w-full">
                <div className="flex gap-3 pb-3 min-w-max">
                  {kanbanCols.map(col => (
                    <KanbanCol
                      key={col.status.id}
                      status={col.status}
                      orders={col.orders}
                      onCardClick={openDetail}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </Card>

          {/* Kanban summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {kanbanCols.slice(0, 4).map(col => (
              <div
                key={col.status.id}
                className="flex items-center gap-2.5 p-3 rounded-lg border"
                style={{ borderColor: col.status.color + '35', background: col.status.color + '08' }}
              >
                <span
                  className="text-2xl font-orbitron font-bold tabular-nums"
                  style={{ color: col.status.color }}
                >
                  {col.orders.length}
                </span>
                <span className="text-xs text-muted-foreground leading-tight">{col.status.name}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ─────────────── TAB 3: АНАЛИТИКА ─────────────── */}
        <TabsContent value="analytics" className="mt-0 space-y-4">

          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Всего заказов',    value: analytics.total,     icon: 'ClipboardList',  color: 'text-neon-cyan',   border: 'border-neon-cyan/25',   bg: 'bg-neon-cyan/10' },
              { label: 'Активных',         value: analytics.active,    icon: 'Activity',       color: 'text-violet-400',  border: 'border-violet-400/25',  bg: 'bg-violet-400/10' },
              { label: 'Просрочено',       value: analytics.overdue,   icon: 'AlertTriangle',  color: 'text-red-400',     border: 'border-red-400/25',     bg: 'bg-red-400/10' },
              { label: 'Завершено сегодня',value: analytics.doneToday, icon: 'CheckCircle2',   color: 'text-emerald-400', border: 'border-emerald-400/25', bg: 'bg-emerald-400/10' },
            ].map(card => (
              <Card key={card.label} className={`border ${card.border} bg-card/60`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider leading-tight">{card.label}</p>
                    <div className={`w-8 h-8 rounded-lg ${card.bg} border ${card.border} flex items-center justify-center`}>
                      <Icon name={card.icon} size={14} className={card.color} />
                    </div>
                  </div>
                  <p className={`text-3xl font-orbitron font-bold ${card.color} tabular-nums`}>{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Bar chart — last 7 days */}
            <Card className="lg:col-span-2 border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                  <Icon name="BarChart3" size={14} className="text-neon-cyan" />
                  ЗАКАЗЫ ЗА 7 ДНЕЙ
                </CardTitle>
                <CardDescription className="text-xs">Количество заказов по дням</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={barChartConfig} className="h-52 w-full">
                  <BarChart data={analytics.weekData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
                      axisLine={false} tickLine={false}
                      allowDecimals={false} width={28}
                    />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => [String(v), 'Заказов']} />} />
                    <Bar dataKey="count" fill="hsl(185 100% 50%)" radius={[3, 3, 0, 0]} opacity={0.85} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Top masters table */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                  <Icon name="Trophy" size={14} className="text-yellow-400" />
                  ТОП МАСТЕРОВ
                </CardTitle>
                <CardDescription className="text-xs">По количеству назначенных заказов</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.topMasters.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
                    <Icon name="UserX" size={24} className="opacity-25" />
                    <p className="text-xs">Нет данных</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics.topMasters.map((m, i) => {
                      const maxCount = analytics.topMasters[0]?.count ?? 1;
                      const pct = Math.round((m.count / maxCount) * 100);
                      const medal = i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-700' : 'text-muted-foreground';
                      return (
                        <div key={m.name} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`font-orbitron text-xs font-bold ${medal} w-4 text-center`}>
                                {i + 1}
                              </span>
                              <span className="text-xs text-foreground truncate max-w-[110px]">{m.name}</span>
                            </div>
                            <span className="font-mono text-xs font-bold text-foreground">{m.count}</span>
                          </div>
                          <Progress value={pct} className="h-1.5 [&>div]:bg-violet-400" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status breakdown */}
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                <Icon name="PieChart" size={14} className="text-violet-400" />
                РАСПРЕДЕЛЕНИЕ ПО СТАТУСАМ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {kanbanCols.filter(c => c.orders.length > 0).map(col => {
                  const pct = orders.length > 0 ? Math.round((col.orders.length / orders.length) * 100) : 0;
                  return (
                    <div
                      key={col.status.id}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border flex-1 min-w-[140px]"
                      style={{ borderColor: col.status.color + '35', background: col.status.color + '08' }}
                    >
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground truncate">{col.status.name}</span>
                          <span className="font-orbitron font-bold text-sm" style={{ color: col.status.color }}>
                            {col.orders.length}
                          </span>
                        </div>
                        <Progress
                          value={pct}
                          className="h-1"
                          style={{ ['--progress-color' as string]: col.status.color }}
                        />
                        <span className="text-[10px] font-mono text-muted-foreground mt-1 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════ DETAIL SHEET ═══════════════════ */}
      <DetailSheet
        order={detailOrder}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={openEdit}
        statuses={statuses}
      />

      {/* ═══════════════════ EDIT DIALOG ═══════════════════ */}
      <EditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
        order={editOrder}
        statuses={statuses}
        masters={masters}
        devices={devices}
        saving={saving}
      />

      {/* ═══════════════════ DELETE CONFIRM ═══════════════════ */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-orbitron text-sm">Удалить заказ?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              Это действие необратимо. Заказ и все связанные данные будут удалены безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-sm h-9">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm h-9"
            >
              <Icon name="Trash2" size={13} /> Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
