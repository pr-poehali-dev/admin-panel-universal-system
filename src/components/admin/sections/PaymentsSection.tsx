import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';
import { paymentsService, type Payment } from '@/services/mockData';
import { useToast } from '@/hooks/use-toast';

const STATUS_MAP = {
  pending:   { label: 'Ожидает',  color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' },
  completed: { label: 'Выполнен', color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  refunded:  { label: 'Возврат',  color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
  failed:    { label: 'Ошибка',   color: 'text-red-400 border-red-400/30 bg-red-400/10' },
};

const METHOD_MAP: Record<string, { label: string; icon: string }> = {
  cash:     { label: 'Наличные',  icon: 'Banknote' },
  card:     { label: 'Карта',     icon: 'CreditCard' },
  transfer: { label: 'Перевод',   icon: 'ArrowLeftRight' },
  online:   { label: 'Онлайн',    icon: 'Globe' },
};

const EMPTY: Omit<Payment, 'id'> = {
  orderId: '', amount: 0, method: 'cash', status: 'pending',
  createdAt: new Date().toISOString().split('T')[0], description: '',
};

export default function PaymentsSection() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Payment | null>(null);
  const [form, setForm] = useState<Omit<Payment, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = () => paymentsService.getAll().then(setPayments);
  useEffect(load, []);

  const filtered = payments.filter(p => {
    const matchSearch = p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.orderId.includes(search);
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalRevenue = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const totalFailed = payments.filter(p => p.status === 'failed').reduce((s, p) => s + p.amount, 0);

  const openCreate = () => { setEditItem(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (p: Payment) => { setEditItem(p); setForm({ ...p }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    if (editItem) { await paymentsService.update(editItem.id, form); toast({ title: 'Платёж обновлён' }); }
    else { await paymentsService.create(form); toast({ title: 'Платёж создан' }); }
    setSaving(false); setDialogOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await paymentsService.delete(deleteId);
    toast({ title: 'Платёж удалён', variant: 'destructive' });
    setDeleteId(null); load();
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Получено', value: totalRevenue, color: 'text-emerald-400', icon: 'TrendingUp', border: 'border-emerald-400/20' },
          { label: 'Ожидается', value: totalPending, color: 'text-yellow-400', icon: 'Clock', border: 'border-yellow-400/20' },
          { label: 'Отклонено', value: totalFailed, color: 'text-red-400', icon: 'TrendingDown', border: 'border-red-400/20' },
        ].map(s => (
          <Card key={s.label} className={`border ${s.border} bg-card/40`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className={`text-xl font-orbitron font-bold ${s.color}`}>{s.value.toLocaleString('ru')} ₽</p>
              </div>
              <Icon name={s.icon} size={24} className={`${s.color} opacity-40`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Поиск платежей..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 bg-input border-border text-sm" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 h-9 bg-input border-border text-sm"><SelectValue placeholder="Все статусы" /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Все статусы</SelectItem>
              {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2">
          <Icon name="Plus" size={15} /> Добавить платёж
        </Button>
      </div>

      <Card className="border-border bg-card/60">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Заказ</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Описание</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Способ</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Сумма</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Статус</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Дата</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(payment => {
              const sm = STATUS_MAP[payment.status];
              const mm = METHOD_MAP[payment.method];
              return (
                <TableRow key={payment.id} className="border-border hover:bg-neon-cyan/3 transition-colors">
                  <TableCell className="font-mono text-xs text-neon-cyan/70">{payment.orderId}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{payment.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Icon name={mm.icon} size={13} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{mm.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className={`font-mono font-bold text-sm ${payment.status === 'completed' ? 'text-emerald-400' : 'text-foreground'}`}>
                    {payment.amount.toLocaleString('ru')} ₽
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${sm.color}`}>{sm.label}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{payment.createdAt}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground">
                          <Icon name="MoreVertical" size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-card border-border" align="end">
                        <DropdownMenuItem onClick={() => openEdit(payment)} className="gap-2 text-sm cursor-pointer">
                          <Icon name="Pencil" size={14} /> Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem onClick={() => setDeleteId(payment.id)} className="gap-2 text-sm text-destructive cursor-pointer">
                          <Icon name="Trash2" size={14} /> Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-sm">{editItem ? 'РЕДАКТИРОВАТЬ ПЛАТЁЖ' : 'НОВЫЙ ПЛАТЁЖ'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Заказ (ID)</Label>
                <Input value={form.orderId} onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))} className="bg-input border-border text-sm h-9 font-mono" placeholder="1" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Сумма, ₽</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} className="bg-input border-border text-sm h-9 font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">Описание</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-input border-border text-sm h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Способ оплаты</Label>
                <Select value={form.method} onValueChange={v => setForm(f => ({ ...f, method: v as Payment['method'] }))}>
                  <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {Object.entries(METHOD_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Статус</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Payment['status'] }))}>
                  <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border">Отмена</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-neon-cyan text-background hover:bg-neon-cyan/90">
              {saving ? <Icon name="Loader2" size={14} className="animate-spin mr-1" /> : <Icon name="Save" size={14} className="mr-1" />}
              {editItem ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-orbitron text-sm">Удалить платёж?</AlertDialogTitle>
            <AlertDialogDescription>Это действие нельзя отменить.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
