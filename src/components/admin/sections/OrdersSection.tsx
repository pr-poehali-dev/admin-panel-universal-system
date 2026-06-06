import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { ordersService, statusesService, type Order, type OrderStatus } from '@/services/mockData';
import { useToast } from '@/hooks/use-toast';

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Срочный', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  high:   { label: 'Высокий', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  normal: { label: 'Обычный', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  low:    { label: 'Низкий',  color: 'bg-muted text-muted-foreground border-border' },
};

const EMPTY: Omit<Order, 'id'> = {
  number: '', clientId: '', deviceId: '', masterId: '', statusId: '1',
  services: [], parts: [], diagnosis: '', totalPrice: 0, paidAmount: 0,
  createdAt: new Date().toISOString().split('T')[0],
  deadline: '', priority: 'normal',
};

export default function OrdersSection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Order | null>(null);
  const [form, setForm] = useState<Omit<Order, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = () => {
    ordersService.getAll().then(setOrders);
    statusesService.getAll().then(setStatuses);
  };
  useEffect(load, []);

  const filtered = orders.filter(o => {
    const matchSearch = o.number.toLowerCase().includes(search.toLowerCase()) ||
      o.diagnosis.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || o.statusId === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => {
    setEditItem(null);
    setForm({ ...EMPTY, number: `ORD-2026-${String(orders.length + 1).padStart(3, '0')}` });
    setDialogOpen(true);
  };

  const openEdit = (order: Order) => {
    setEditItem(order);
    setForm({ ...order });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (editItem) {
      await ordersService.update(editItem.id, form);
      toast({ title: 'Заказ обновлён', description: form.number });
    } else {
      await ordersService.create(form);
      toast({ title: 'Заказ создан', description: form.number });
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await ordersService.delete(deleteId);
    toast({ title: 'Заказ удалён', variant: 'destructive' });
    setDeleteId(null);
    load();
  };

  const getStatus = (id: string) => statuses.find(s => s.id === id);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Поиск по номеру или диагнозу..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 bg-input border-border text-sm" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44 h-9 bg-input border-border text-sm">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Все статусы</SelectItem>
              {statuses.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2">
          <Icon name="Plus" size={15} />
          Новый заказ
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border bg-card/60">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Номер</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Диагноз</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Статус</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Приоритет</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Сумма</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Срок</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(order => {
              const status = getStatus(order.statusId);
              const priority = PRIORITY_MAP[order.priority];
              return (
                <TableRow key={order.id} className="border-border hover:bg-neon-cyan/3 transition-colors">
                  <TableCell className="font-mono text-xs text-neon-cyan/80">{order.number}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{order.diagnosis}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs" style={{ color: status?.color, borderColor: status?.color + '40', backgroundColor: status?.color + '15' }}>
                      {status?.name ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${priority?.color}`}>{priority?.label}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{order.totalPrice.toLocaleString('ru')} ₽</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{order.deadline}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground">
                          <Icon name="MoreVertical" size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-card border-border" align="end">
                        <DropdownMenuItem onClick={() => openEdit(order)} className="gap-2 text-sm cursor-pointer">
                          <Icon name="Pencil" size={14} /> Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem onClick={() => setDeleteId(order.id)} className="gap-2 text-sm text-destructive cursor-pointer">
                          <Icon name="Trash2" size={14} /> Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10 font-mono text-sm">Нет данных</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-sm text-foreground">
              {editItem ? 'РЕДАКТИРОВАТЬ ЗАКАЗ' : 'НОВЫЙ ЗАКАЗ'}
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="main">
            <TabsList className="bg-muted w-full">
              <TabsTrigger value="main" className="flex-1 text-xs">Основное</TabsTrigger>
              <TabsTrigger value="financial" className="flex-1 text-xs">Финансы</TabsTrigger>
            </TabsList>
            <TabsContent value="main" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-muted-foreground">Номер заказа</Label>
                  <Input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} className="bg-input border-border text-sm h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-muted-foreground">Приоритет</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Order['priority'] }))}>
                    <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {Object.entries(PRIORITY_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Диагноз</Label>
                <Textarea value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} className="bg-input border-border text-sm min-h-20 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-muted-foreground">Статус</Label>
                  <Select value={form.statusId} onValueChange={v => setForm(f => ({ ...f, statusId: v }))}>
                    <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-muted-foreground">Срок</Label>
                  <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="bg-input border-border text-sm h-9" />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="financial" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-muted-foreground">Сумма, ₽</Label>
                  <Input type="number" value={form.totalPrice} onChange={e => setForm(f => ({ ...f, totalPrice: +e.target.value }))} className="bg-input border-border text-sm h-9 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-muted-foreground">Оплачено, ₽</Label>
                  <Input type="number" value={form.paidAmount} onChange={e => setForm(f => ({ ...f, paidAmount: +e.target.value }))} className="bg-input border-border text-sm h-9 font-mono" />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border">Отмена</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-neon-cyan text-background hover:bg-neon-cyan/90">
              {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Save" size={14} />}
              {editItem ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-orbitron text-sm">Удалить заказ?</AlertDialogTitle>
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
