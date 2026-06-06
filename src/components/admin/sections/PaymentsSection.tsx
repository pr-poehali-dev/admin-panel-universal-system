import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from 'recharts';
import Icon from '@/components/ui/icon';
import { paymentsApi, ordersApi } from '@/services/api';
import type { Payment, Order } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

// ─── Static maps ───────────────────────────────────────────────────────────────

const STATUS_MAP: Record<Payment['status'], { label: string; color: string; dot: string; chartColor: string }> = {
  completed: { label: 'Выполнен', color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10', dot: 'bg-emerald-400', chartColor: 'hsl(150 100% 45%)' },
  pending:   { label: 'Ожидает',  color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',   dot: 'bg-yellow-400',  chartColor: 'hsl(48 96% 53%)' },
  refunded:  { label: 'Возврат',  color: 'text-blue-400 border-blue-400/30 bg-blue-400/10',         dot: 'bg-blue-400',    chartColor: 'hsl(217 91% 60%)' },
  failed:    { label: 'Ошибка',   color: 'text-red-400 border-red-400/30 bg-red-400/10',            dot: 'bg-red-400',     chartColor: 'hsl(0 84% 60%)' },
};

const METHOD_MAP: Record<Payment['method'], { label: string; icon: string; color: string; chartColor: string }> = {
  cash:     { label: 'Наличные', icon: 'Banknote',        color: 'text-emerald-400', chartColor: 'hsl(150 100% 45%)' },
  card:     { label: 'Карта',    icon: 'CreditCard',      color: 'text-neon-cyan',   chartColor: 'hsl(185 100% 50%)' },
  transfer: { label: 'Перевод',  icon: 'ArrowLeftRight',  color: 'text-violet-400',  chartColor: 'hsl(270 80% 60%)' },
  online:   { label: 'Онлайн',   icon: 'Globe',           color: 'text-orange-400',  chartColor: 'hsl(30 100% 55%)' },
};

const pieConfig  = { value: { label: 'Сумма' } };
const barConfig  = { amount: { label: 'Сумма', color: 'hsl(185 100% 50%)' } };

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

function fmtDateTime(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtDateOnly(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function exportCsv(payments: Payment[]) {
  const header = ['ID', 'Заказ', 'Описание', 'Способ', 'Сумма', 'Статус', 'Дата'];
  const rows = payments.map(p => [
    p.id,
    p.order_number ?? p.order_id ?? '—',
    p.description,
    METHOD_MAP[p.method]?.label ?? p.method,
    p.amount,
    STATUS_MAP[p.status]?.label ?? p.status,
    p.created_at,
  ]);
  const csv = [header, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `payments_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Date group helpers ────────────────────────────────────────────────────────

function dateGroupLabel(dateStr: string): string {
  const d   = new Date(dateStr);
  const now = new Date();
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const payDay    = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (payDay.getTime() === today.getTime())     return 'Сегодня';
  if (payDay.getTime() === yesterday.getTime()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── Create / Edit dialog ──────────────────────────────────────────────────────

interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Payment>) => Promise<void>;
  payment: Payment | null;
  orders: Order[];
  saving: boolean;
}

function EditDialog({ open, onClose, onSave, payment, orders, saving }: EditDialogProps) {
  const EMPTY: Partial<Payment> = {
    order_id: null, amount: 0, method: 'cash', status: 'pending',
    description: '', created_at: new Date().toISOString().split('T')[0],
  };

  const [form, setForm] = useState<Partial<Payment>>(EMPTY);

  useEffect(() => {
    if (open) setForm(payment ? { ...payment } : EMPTY);
  }, [open, payment]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Payment>(k: K, v: Payment[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const lbl = 'text-[10px] font-mono text-muted-foreground uppercase tracking-wider';
  const inp = 'bg-input border-border text-sm h-9';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader className="pb-2 border-b border-border/60">
          <DialogTitle className="font-orbitron text-sm text-foreground">
            {payment ? `РЕДАКТИРОВАТЬ ПЛАТЁЖ #${payment.id}` : 'НОВЫЙ ПЛАТЁЖ'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Order */}
          <div className="space-y-1.5">
            <Label className={lbl}>Заказ</Label>
            <Select
              value={form.order_id != null ? String(form.order_id) : 'none'}
              onValueChange={v => set('order_id', v === 'none' ? null : Number(v))}
            >
              <SelectTrigger className={inp}><SelectValue placeholder="Выбрать заказ" /></SelectTrigger>
              <SelectContent className="bg-card border-border max-h-60">
                <SelectItem value="none">Без привязки к заказу</SelectItem>
                {orders.map(o => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.number} — {o.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label className={lbl}>Сумма (₽)</Label>
            <Input
              type="number" min={0} step={0.01}
              value={form.amount ?? 0}
              onChange={e => set('amount', parseFloat(e.target.value) || 0)}
              className={inp}
            />
          </div>

          {/* Method + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className={lbl}>Способ оплаты</Label>
              <Select
                value={form.method ?? 'cash'}
                onValueChange={v => set('method', v as Payment['method'])}
              >
                <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {(Object.entries(METHOD_MAP) as [Payment['method'], typeof METHOD_MAP[Payment['method']]][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <div className="flex items-center gap-2">
                        <Icon name={v.icon} size={13} className={v.color} />
                        <span>{v.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={lbl}>Статус</Label>
              <Select
                value={form.status ?? 'pending'}
                onValueChange={v => set('status', v as Payment['status'])}
              >
                <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {(Object.entries(STATUS_MAP) as [Payment['status'], typeof STATUS_MAP[Payment['status']]][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className={lbl}>Описание</Label>
            <Input
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
              placeholder="Комментарий к платежу…"
              className={inp}
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className={lbl}>Дата</Label>
            <Input
              type="date"
              value={(form.created_at ?? '').split('T')[0]}
              onChange={e => set('created_at', e.target.value)}
              className={inp}
            />
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-border/60 gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}
            className="border-border h-9 text-sm">
            Отмена
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={saving || !form.amount}
            className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium"
          >
            {saving && <Icon name="Loader2" size={13} className="animate-spin" />}
            {saving ? 'Сохранение…' : payment ? 'Сохранить' : 'Создать платёж'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Custom pie label ──────────────────────────────────────────────────────────

interface PieLabelProps {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number;
  percent: number; name: string;
}

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: PieLabelProps) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r  = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x  = cx + r * Math.cos(-midAngle * RADIAN);
  const y  = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="hsl(220 20% 4%)" textAnchor="middle" dominantBaseline="central"
      fontSize={10} fontWeight="bold" fontFamily="'IBM Plex Mono', monospace">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function PaymentsSection() {
  const [payments, setPayments]   = useState<Payment[]>([]);
  const [stats,    setStats]      = useState<Record<string, number>>({});
  const [orders,   setOrders]     = useState<Order[]>([]);
  const [loading,  setLoading]    = useState(true);

  // list tab state
  const [search,         setSearch]         = useState('');
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [filterMethod,   setFilterMethod]   = useState('all');

  // dialog / delete
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [editOpen,    setEditOpen]    = useState(false);
  const [deleteId,    setDeleteId]    = useState<number | null>(null);
  const [saving,      setSaving]      = useState(false);

  const { toast } = useToast();

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadPayments = useCallback(async () => {
    const res = await paymentsApi.getAll();
    setPayments(res.items ?? []);
    setStats(res.stats ?? {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadPayments(),
      ordersApi.getAll().then(setOrders),
    ]).finally(() => setLoading(false));
  }, [loadPayments]);

  // ── Derived / filtered ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter(p => {
      const matchSearch = !q ||
        p.description.toLowerCase().includes(q) ||
        (p.order_number ?? '').toLowerCase().includes(q) ||
        String(p.order_id ?? '').includes(q) ||
        String(p.amount).includes(q);
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      const matchMethod = filterMethod === 'all' || p.method === filterMethod;
      return matchSearch && matchStatus && matchMethod;
    });
  }, [payments, search, filterStatus, filterMethod]);

  // Summary sums
  const sums = useMemo(() => ({
    completed: payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0),
    pending:   payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0),
    refunded:  payments.filter(p => p.status === 'refunded').reduce((s, p) => s + p.amount, 0),
    failed:    payments.filter(p => p.status === 'failed').reduce((s, p) => s + p.amount, 0),
  }), [payments]);

  // Method aggregates for analytics
  const methodAgg = useMemo(() =>
    (Object.keys(METHOD_MAP) as Payment['method'][]).map(m => ({
      method: m,
      label: METHOD_MAP[m].label,
      icon:  METHOD_MAP[m].icon,
      color: METHOD_MAP[m].color,
      chartColor: METHOD_MAP[m].chartColor,
      count:  payments.filter(p => p.method === m).length,
      amount: payments.filter(p => p.method === m && p.status === 'completed').reduce((s, p) => s + p.amount, 0),
    })).filter(a => a.count > 0),
  [payments]);

  // Status aggregates for bar chart
  const statusAgg = useMemo(() =>
    (Object.keys(STATUS_MAP) as Payment['status'][]).map(s => ({
      status: s,
      label: STATUS_MAP[s].label,
      chartColor: STATUS_MAP[s].chartColor,
      count:  payments.filter(p => p.status === s).length,
      amount: payments.filter(p => p.status === s).reduce((a, p) => a + p.amount, 0),
    })).filter(a => a.count > 0),
  [payments]);

  // Top 5 largest payments
  const top5 = useMemo(() =>
    [...payments].sort((a, b) => b.amount - a.amount).slice(0, 5),
  [payments]);

  // Timeline grouping
  const timelineGroups = useMemo(() => {
    const sorted = [...payments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const groups = new Map<string, Payment[]>();
    sorted.forEach(p => {
      const label = dateGroupLabel(p.created_at);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(p);
    });
    return Array.from(groups.entries());
  }, [payments]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openCreate = () => { setEditPayment(null); setEditOpen(true); };
  const openEdit   = (p: Payment) => { setEditPayment(p); setEditOpen(true); };

  const handleSave = async (data: Partial<Payment>) => {
    setSaving(true);
    try {
      if (editPayment) {
        await paymentsApi.update(editPayment.id, data);
        toast({ title: 'Платёж обновлён' });
      } else {
        await paymentsApi.create(data);
        toast({ title: 'Платёж создан' });
      }
      setEditOpen(false);
      await loadPayments();
    } catch (e: unknown) {
      toast({ title: 'Ошибка', description: (e as Error)?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await paymentsApi.delete(deleteId);
      toast({ title: 'Платёж удалён', variant: 'destructive' });
      setDeleteId(null);
      await loadPayments();
    } catch (e: unknown) {
      toast({ title: 'Ошибка', description: (e as Error)?.message, variant: 'destructive' });
    }
  };

  // ── Loading skeleton ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border bg-card/60">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1 max-w-sm" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Card className="border-border bg-card/60">
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ════════════════ SUMMARY CARDS ════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { key: 'completed' as const, label: 'Получено',  icon: 'TrendingUp',   border: 'border-emerald-400/25', bg: 'bg-emerald-400/10', num: 'text-emerald-400' },
          { key: 'pending'   as const, label: 'Ожидает',   icon: 'Clock',        border: 'border-yellow-400/25',  bg: 'bg-yellow-400/10',  num: 'text-yellow-400' },
          { key: 'refunded'  as const, label: 'Возвраты',  icon: 'Undo2',        border: 'border-blue-400/25',    bg: 'bg-blue-400/10',    num: 'text-blue-400' },
          { key: 'failed'    as const, label: 'Отклонено', icon: 'TrendingDown', border: 'border-red-400/25',     bg: 'bg-red-400/10',     num: 'text-red-400' },
        ]).map(card => (
          <Card key={card.key} className={`border ${card.border} bg-card/60 hover:bg-card transition-all`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{card.label}</p>
                <div className={`w-8 h-8 rounded-lg ${card.bg} border ${card.border} flex items-center justify-center`}>
                  <Icon name={card.icon} size={14} className={card.num} />
                </div>
              </div>
              <p className={`text-xl font-orbitron font-bold ${card.num} tabular-nums leading-tight`}>
                {fmt(sums[card.key])}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground mt-1">
                {payments.filter(p => p.status === card.key).length} транзакций
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ════════════════ MAIN TABS ════════════════ */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="bg-muted h-9">
          <TabsTrigger value="list"      className="text-xs gap-1.5">
            <Icon name="TableProperties" size={12} /> Список
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs gap-1.5">
            <Icon name="PieChart" size={12} /> Аналитика
          </TabsTrigger>
          <TabsTrigger value="timeline"  className="text-xs gap-1.5">
            <Icon name="History" size={12} /> История
          </TabsTrigger>
        </TabsList>

        {/* ─────────────── TAB 1: СПИСОК ─────────────── */}
        <TabsContent value="list" className="mt-0 space-y-3">

          {/* Filters + actions row */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-44 max-w-sm">
              <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Заказ, описание, сумма…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 bg-input border-border text-sm"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <Icon name="X" size={12} />
                </button>
              )}
            </div>

            {/* Status filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 h-9 bg-input border-border text-sm">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Все статусы</SelectItem>
                {(Object.entries(STATUS_MAP) as [Payment['status'], typeof STATUS_MAP[Payment['status']]][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Method filter */}
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className="w-40 h-9 bg-input border-border text-sm">
                <SelectValue placeholder="Все способы" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Все способы</SelectItem>
                {(Object.entries(METHOD_MAP) as [Payment['method'], typeof METHOD_MAP[Payment['method']]][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    <div className="flex items-center gap-2">
                      <Icon name={v.icon} size={13} className={v.color} />
                      <span>{v.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset */}
            {(search || filterStatus !== 'all' || filterMethod !== 'all') && (
              <Button variant="ghost" size="sm"
                onClick={() => { setSearch(''); setFilterStatus('all'); setFilterMethod('all'); }}
                className="h-9 text-xs text-muted-foreground gap-1 px-2">
                <Icon name="FilterX" size={12} /> Сбросить
              </Button>
            )}

            <span className="text-[11px] font-mono text-muted-foreground ml-auto self-center">
              {filtered.length} / {payments.length}
            </span>

            {/* Export */}
            <Button variant="outline" size="sm"
              onClick={() => exportCsv(filtered)}
              className="border-border text-xs h-9 gap-1.5 text-muted-foreground hover:text-foreground">
              <Icon name="Download" size={13} /> Экспорт CSV
            </Button>

            {/* Create */}
            <Button onClick={openCreate}
              className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium">
              <Icon name="Plus" size={14} /> Добавить платёж
            </Button>
          </div>

          {/* Table */}
          <Card className="border-border bg-card/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-32">Заказ</TableHead>
                  <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Описание</TableHead>
                  <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Способ</TableHead>
                  <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider text-right">Сумма</TableHead>
                  <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Статус</TableHead>
                  <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider hidden md:table-cell">Дата</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(payment => {
                  const sm  = STATUS_MAP[payment.status];
                  const mm  = METHOD_MAP[payment.method];
                  const isCompleted = payment.status === 'completed';
                  const isRefunded  = payment.status === 'refunded';
                  const isFailed    = payment.status === 'failed';
                  return (
                    <TableRow
                      key={payment.id}
                      className="border-border hover:bg-neon-cyan/[0.03] transition-colors"
                    >
                      {/* Order number */}
                      <TableCell className="py-2.5">
                        {payment.order_number ? (
                          <span className="font-mono text-xs text-neon-cyan/80 cursor-default hover:text-neon-cyan transition-colors">
                            {payment.order_number}
                          </span>
                        ) : payment.order_id ? (
                          <span className="font-mono text-xs text-muted-foreground/60">#{payment.order_id}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40 italic">—</span>
                        )}
                      </TableCell>

                      {/* Description */}
                      <TableCell className="py-2.5 max-w-[200px]">
                        <p className="text-sm text-foreground/80 truncate">
                          {payment.description || <span className="text-muted-foreground/40 italic">без описания</span>}
                        </p>
                      </TableCell>

                      {/* Method */}
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Icon name={mm.icon} size={13} className={mm.color} />
                          <span className="text-xs text-muted-foreground">{mm.label}</span>
                        </div>
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="py-2.5 text-right">
                        <span className={`font-mono font-bold text-sm tabular-nums ${
                          isCompleted ? 'text-emerald-400' :
                          isRefunded  ? 'text-blue-400' :
                          isFailed    ? 'text-red-400/60 line-through' :
                          'text-foreground'
                        }`}>
                          {isRefunded && '−'}{fmt(payment.amount)}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border flex items-center gap-1 w-fit ${sm.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                          {sm.label}
                        </Badge>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="py-2.5 hidden md:table-cell">
                        <span className="font-mono text-xs text-muted-foreground">
                          {fmtDateTime(payment.created_at)}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"
                              className="w-7 h-7 text-muted-foreground hover:text-foreground">
                              <Icon name="MoreVertical" size={13} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-card border-border" align="end">
                            <DropdownMenuItem onClick={() => openEdit(payment)} className="gap-2 text-xs cursor-pointer">
                              <Icon name="Pencil" size={13} /> Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                              onClick={() => setDeleteId(payment.id)}
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
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Icon name="SearchX" size={32} className="opacity-20" />
                        <p className="text-sm">Платежи не найдены</p>
                        <p className="text-xs opacity-60">Измените параметры поиска или добавьте платёж</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ─────────────── TAB 2: АНАЛИТИКА ─────────────── */}
        <TabsContent value="analytics" className="mt-0 space-y-4">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Pie chart — methods distribution */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                  <Icon name="PieChart" size={14} className="text-neon-cyan" />
                  СПОСОБЫ ОПЛАТЫ
                </CardTitle>
                <CardDescription className="text-xs">Распределение по количеству транзакций</CardDescription>
              </CardHeader>
              <CardContent>
                {methodAgg.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-muted-foreground">
                    <p className="text-xs">Нет данных</p>
                  </div>
                ) : (
                  <>
                    <ChartContainer config={pieConfig} className="h-52 w-full">
                      <PieChart>
                        <Pie
                          data={methodAgg}
                          dataKey="count"
                          nameKey="label"
                          cx="50%" cy="50%"
                          outerRadius={80}
                          labelLine={false}
                          label={(props: PieLabelProps) => <PieLabel {...props} />}
                        >
                          {methodAgg.map((entry, i) => (
                            <Cell key={i} fill={entry.chartColor} stroke="transparent" />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(v, n) => [String(v) + ' транз.', n as string]} />}
                        />
                      </PieChart>
                    </ChartContainer>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 justify-center mt-2">
                      {methodAgg.map(m => (
                        <div key={m.method} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: m.chartColor }} />
                          <Icon name={m.icon} size={11} className={m.color} />
                          <span className="text-[10px] text-muted-foreground">{m.label}</span>
                          <span className="text-[10px] font-mono font-bold text-foreground">{m.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Bar chart — status distribution */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                  <Icon name="BarChart3" size={14} className="text-violet-400" />
                  СТАТУСЫ ПЛАТЕЖЕЙ
                </CardTitle>
                <CardDescription className="text-xs">Суммы по статусам транзакций</CardDescription>
              </CardHeader>
              <CardContent>
                {statusAgg.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-muted-foreground">
                    <p className="text-xs">Нет данных</p>
                  </div>
                ) : (
                  <ChartContainer config={barConfig} className="h-52 w-full">
                    <BarChart data={statusAgg} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
                        axisLine={false} tickLine={false}
                        tickFormatter={v => `${Math.round(v / 1000)}K`}
                        width={36}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={(v) => [fmt(Number(v)), 'Сумма']} />}
                      />
                      <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                        {statusAgg.map((entry, i) => (
                          <Cell key={i} fill={entry.chartColor} opacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Top 5 largest payments */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                  <Icon name="Trophy" size={14} className="text-yellow-400" />
                  ТОП-5 ПЛАТЕЖЕЙ
                </CardTitle>
                <CardDescription className="text-xs">Крупнейшие транзакции в системе</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider pl-4">#</TableHead>
                      <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Заказ</TableHead>
                      <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Способ</TableHead>
                      <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider text-right pr-4">Сумма</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {top5.map((p, idx) => {
                      const mm  = METHOD_MAP[p.method];
                      const sm  = STATUS_MAP[p.status];
                      const medalColor = idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-orange-700' : 'text-muted-foreground/40';
                      return (
                        <TableRow key={p.id} className="border-border hover:bg-neon-cyan/[0.03]">
                          <TableCell className="py-2 pl-4">
                            <span className={`font-orbitron font-bold text-sm ${medalColor}`}>{idx + 1}</span>
                          </TableCell>
                          <TableCell className="py-2">
                            <div>
                              <p className="font-mono text-xs text-neon-cyan/80">{p.order_number ?? (p.order_id ? `#${p.order_id}` : '—')}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{p.description || '—'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-1.5">
                              <Icon name={mm.icon} size={12} className={mm.color} />
                              <Badge variant="outline" className={`text-[9px] px-1 py-0 border ${sm.color}`}>{sm.label}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 text-right pr-4">
                            <span className="font-orbitron font-bold text-sm text-foreground tabular-nums">{fmt(p.amount)}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {top5.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
                          Нет данных
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Method cards */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                  <Icon name="Wallet" size={14} className="text-neon-cyan" />
                  МЕТОДЫ ОПЛАТЫ
                </CardTitle>
                <CardDescription className="text-xs">Выручка по каждому способу оплаты</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {methodAgg.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
                    <Icon name="Wallet" size={24} className="opacity-20" />
                    <p className="text-xs">Нет данных</p>
                  </div>
                ) : (
                  methodAgg.map(m => {
                    const maxAmt = Math.max(...methodAgg.map(a => a.amount), 1);
                    const pct    = Math.round((m.amount / maxAmt) * 100);
                    return (
                      <div key={m.method} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: m.chartColor + '20', border: `1px solid ${m.chartColor}40` }}>
                              <Icon name={m.icon} size={13} className={m.color} />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-foreground">{m.label}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{m.count} транзакций</p>
                            </div>
                          </div>
                          <p className="font-mono font-bold text-sm text-foreground tabular-nums">{fmt(m.amount)}</p>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: m.chartColor }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Stats from API */}
                {Object.keys(stats).length > 0 && (
                  <>
                    <Separator className="bg-border/50 mt-2" />
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {Object.entries(stats).slice(0, 4).map(([k, v]) => (
                        <div key={k} className="rounded-lg border border-border/50 bg-muted/10 p-2.5">
                          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5 truncate">{k}</p>
                          <p className="font-mono text-sm font-bold text-foreground tabular-nums">
                            {typeof v === 'number' && v > 1000 ? fmt(v) : String(v)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─────────────── TAB 3: ИСТОРИЯ ─────────────── */}
        <TabsContent value="timeline" className="mt-0">
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                  <Icon name="History" size={14} className="text-neon-cyan" />
                  ИСТОРИЯ ТРАНЗАКЦИЙ
                </CardTitle>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {payments.length} записей
                </span>
              </div>
            </CardHeader>

            <ScrollArea className="h-[600px]">
              <div className="px-6 py-4">
                {timelineGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                    <Icon name="History" size={40} className="opacity-15" />
                    <p className="text-sm">История платежей пуста</p>
                    <p className="text-xs opacity-60">Платежи появятся здесь после создания</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {timelineGroups.map(([dateLabel, items]) => (
                      <div key={dateLabel}>
                        {/* Date heading */}
                        <div className="flex items-center gap-3 mb-3 sticky top-0 bg-card/95 py-1 z-10">
                          <div className="flex items-center gap-2">
                            <Icon name="CalendarDays" size={13} className="text-neon-cyan" />
                            <span className="text-xs font-mono font-bold text-neon-cyan uppercase tracking-wider">
                              {dateLabel}
                            </span>
                          </div>
                          <div className="flex-1 h-px bg-neon-cyan/10" />
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {items.length} платеж{items.length === 1 ? '' : items.length < 5 ? 'а' : 'ей'}
                            {' · '}
                            {fmt(items.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0))}
                          </span>
                        </div>

                        {/* Timeline items */}
                        <div className="space-y-0 ml-2">
                          {items.map((payment, idx) => {
                            const sm = STATUS_MAP[payment.status];
                            const mm = METHOD_MAP[payment.method];
                            const isLast = idx === items.length - 1;
                            const isCompleted = payment.status === 'completed';
                            const isRefunded  = payment.status === 'refunded';
                            const isFailed    = payment.status === 'failed';

                            return (
                              <div key={payment.id} className="flex gap-4">
                                {/* Timeline spine */}
                                <div className="flex flex-col items-center flex-shrink-0 w-8">
                                  {/* Icon node */}
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 flex-shrink-0"
                                    style={{
                                      borderColor: mm.chartColor + '60',
                                      background: mm.chartColor + '15',
                                    }}
                                  >
                                    <Icon name={mm.icon} size={14} className={mm.color} />
                                  </div>
                                  {/* Vertical line */}
                                  {!isLast && (
                                    <div className="w-px flex-1 min-h-[16px] bg-border/50 my-0.5" />
                                  )}
                                </div>

                                {/* Content */}
                                <div className={`flex-1 min-w-0 pb-4 ${isLast ? '' : ''}`}>
                                  <div className="flex items-start justify-between gap-2 pt-1.5">
                                    {/* Left: order + description */}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                        {payment.order_number ? (
                                          <span className="font-mono text-xs text-neon-cyan/80 font-medium">
                                            {payment.order_number}
                                          </span>
                                        ) : payment.order_id ? (
                                          <span className="font-mono text-xs text-muted-foreground/60">
                                            #{payment.order_id}
                                          </span>
                                        ) : null}
                                        <Badge variant="outline"
                                          className={`text-[9px] px-1.5 py-0 border flex items-center gap-1 ${sm.color}`}>
                                          <span className={`w-1 h-1 rounded-full ${sm.dot}`} />
                                          {sm.label}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-foreground/80 truncate">
                                        {payment.description || (
                                          <span className="italic text-muted-foreground/40">без описания</span>
                                        )}
                                      </p>
                                    </div>

                                    {/* Right: amount + time */}
                                    <div className="text-right flex-shrink-0">
                                      <p className={`font-orbitron font-bold text-base tabular-nums leading-tight ${
                                        isCompleted ? 'text-emerald-400' :
                                        isRefunded  ? 'text-blue-400' :
                                        isFailed    ? 'text-red-400/50' :
                                        'text-foreground'
                                      }`}>
                                        {isCompleted && '+'}
                                        {isRefunded  && '−'}
                                        {fmt(payment.amount)}
                                      </p>
                                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                        {new Date(payment.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Method pill */}
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono"
                                      style={{ background: mm.chartColor + '12', border: `1px solid ${mm.chartColor}30` }}>
                                      <Icon name={mm.icon} size={9} className={mm.color} />
                                      <span className={mm.color}>{mm.label}</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      #{payment.id}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ════ Edit Dialog ════════════════════════════════════════════════════ */}
      <EditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
        payment={editPayment}
        orders={orders}
        saving={saving}
      />

      {/* ════ Delete Confirm ═════════════════════════════════════════════════ */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-orbitron text-sm">Удалить платёж?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              Это действие необратимо. Транзакция будет удалена из системы без возможности восстановления.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-sm h-9">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm h-9 gap-1.5"
            >
              <Icon name="Trash2" size={13} /> Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
