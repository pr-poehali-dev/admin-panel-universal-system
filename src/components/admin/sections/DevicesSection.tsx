import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { devicesApi, categoriesApi } from '@/services/api';
import type { Device, Category } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

// ─── Maps ──────────────────────────────────────────────────────────────────────

const CONDITION_MAP: Record<Device['condition'], { label: string; color: string }> = {
  new:  { label: 'Новое',         color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  good: { label: 'Хорошее',       color: 'text-blue-400   border-blue-400/30   bg-blue-400/10' },
  fair: { label: 'Удовлетворит.', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' },
  poor: { label: 'Плохое',        color: 'text-red-400    border-red-400/30    bg-red-400/10' },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Срочный', color: 'text-red-400    border-red-400/30    bg-red-400/10' },
  high:   { label: 'Высокий', color: 'text-orange-400 border-orange-400/30 bg-orange-400/10' },
  normal: { label: 'Обычный', color: 'text-blue-400   border-blue-400/30   bg-blue-400/10' },
  low:    { label: 'Низкий',  color: 'text-muted-foreground border-border bg-muted/20' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (s: string | null | undefined) => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const fmtMoney = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

function exportCsv(devices: Device[]) {
  const h = ['ID', 'Название', 'Бренд', 'Модель', 'Категория', 'Серийный №', 'Состояние', 'Клиент', 'Телефон', 'Email', 'Получено'];
  const rows = devices.map(d => [
    d.id, d.name, d.brand, d.model, d.category_name ?? '—',
    d.serial_number, CONDITION_MAP[d.condition].label,
    d.client_name, d.client_phone, d.client_email, d.received_at,
  ]);
  const csv = [h, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = `devices_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function DevicesSection() {
  const [devices,       setDevices]       = useState<Device[]>([]);
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [fCat,          setFCat]          = useState('all');
  const [fCond,         setFCond]         = useState('all');
  const [sheetDevice,   setSheetDevice]   = useState<Device | null>(null);
  const [sheetOpen,     setSheetOpen]     = useState(false);
  const [detailDevice,  setDetailDevice]  = useState<Device | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editDevice,    setEditDevice]    = useState<Device | null>(null);
  const [editOpen,      setEditOpen]      = useState(false);
  const [deleteId,      setDeleteId]      = useState<number | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [form,          setForm]          = useState<Partial<Device>>({});
  const { toast } = useToast();

  const load = useCallback(() =>
    Promise.all([devicesApi.getAll().then(setDevices), categoriesApi.getAll().then(setCategories)]),
  []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const filtered = useMemo(() => devices.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || d.name.toLowerCase().includes(q)
      || d.brand.toLowerCase().includes(q)
      || d.serial_number.toLowerCase().includes(q)
      || d.client_name.toLowerCase().includes(q)
      || d.model.toLowerCase().includes(q);
    const matchCat  = fCat  === 'all' || String(d.category_id) === fCat;
    const matchCond = fCond === 'all' || d.condition === fCond;
    return matchSearch && matchCat && matchCond;
  }), [devices, search, fCat, fCond]);

  const stats = useMemo(() => ({
    total: devices.length,
    new:   devices.filter(d => d.condition === 'new').length,
    good:  devices.filter(d => d.condition === 'good').length,
    fair:  devices.filter(d => d.condition === 'fair').length,
    poor:  devices.filter(d => d.condition === 'poor').length,
  }), [devices]);

  // Category breakdown with device counts
  const catBreakdown = useMemo(() => categories.filter(c => c.device_count > 0), [categories]);

  const openDetail = (d: Device) => {
    setSheetDevice(d);
    setSheetOpen(true);
    setDetailDevice(null);
    setDetailLoading(true);
    devicesApi.getById(d.id)
      .then(setDetailDevice)
      .catch(() => setDetailDevice(d))
      .finally(() => setDetailLoading(false));
  };

  const openEdit = (d: Device) => { setEditDevice(d); setForm({ ...d }); setEditOpen(true); };
  const openCreate = () => {
    setEditDevice(null);
    setForm({
      name: '', brand: '', model: '', serial_number: '', condition: 'good',
      client_name: '', client_phone: '', client_email: '',
      received_at: new Date().toISOString().split('T')[0], notes: '',
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editDevice) {
        await devicesApi.update(editDevice.id, form);
        toast({ title: 'Устройство обновлено' });
      } else {
        await devicesApi.create(form);
        toast({ title: 'Устройство добавлено' });
      }
      setEditOpen(false);
      await load();
    } catch (e: unknown) {
      toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await devicesApi.delete(deleteId);
      toast({ title: 'Устройство удалено', variant: 'destructive' });
      setDeleteId(null);
      await load();
    } catch (e: unknown) {
      toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const displayDevice = detailDevice ?? sheetDevice;
  const inp = 'bg-input border-border text-sm h-9';
  const lbl = 'text-[10px] font-mono text-muted-foreground uppercase tracking-wider';

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Stats row ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border bg-card/60">
                <CardContent className="p-4 space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-14" /></CardContent>
              </Card>
            ))
          : ([
              { label: 'Всего устройств', value: stats.total, iconName: 'Cpu',          color: 'text-neon-cyan',   border: 'border-neon-cyan/25',   bg: 'bg-neon-cyan/10' },
              { label: 'Новые',           value: stats.new,   iconName: 'Sparkles',      color: 'text-emerald-400', border: 'border-emerald-400/25', bg: 'bg-emerald-400/10' },
              { label: 'Хорошее сост.',   value: stats.good,  iconName: 'CheckCircle2',  color: 'text-blue-400',    border: 'border-blue-400/25',    bg: 'bg-blue-400/10' },
              { label: 'Плохое / Удовл.', value: stats.poor + stats.fair, iconName: 'AlertTriangle', color: 'text-orange-400', border: 'border-orange-400/25', bg: 'bg-orange-400/10' },
            ]).map(c => (
              <Card key={c.label} className={`border ${c.border} bg-card/60 hover:bg-card transition-all`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <p className={lbl}>{c.label}</p>
                    <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center`}>
                      <Icon name={c.iconName} size={14} className={c.color} />
                    </div>
                  </div>
                  <p className={`text-3xl font-orbitron font-bold ${c.color} tabular-nums`}>{c.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-44 max-w-sm">
          <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Название, бренд, серийный, клиент…"
            value={search} onChange={e => setSearch(e.target.value)}
            className={`pl-8 ${inp}`}
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><Icon name="X" size={12} /></button>}
        </div>

        <Select value={fCat} onValueChange={setFCat}>
          <SelectTrigger className={`w-40 ${inp}`}><SelectValue placeholder="Категория" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Все категории</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={fCond} onValueChange={setFCond}>
          <SelectTrigger className={`w-40 ${inp}`}><SelectValue placeholder="Состояние" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Все состояния</SelectItem>
            {(Object.keys(CONDITION_MAP) as Device['condition'][]).map(k => (
              <SelectItem key={k} value={k}>{CONDITION_MAP[k].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || fCat !== 'all' || fCond !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFCat('all'); setFCond('all'); }} className="h-9 text-xs text-muted-foreground gap-1 px-2">
            <Icon name="FilterX" size={12} /> Сбросить
          </Button>
        )}
        <span className="text-[11px] font-mono text-muted-foreground ml-auto self-center">{filtered.length} / {devices.length}</span>
        <Button variant="outline" size="sm" onClick={() => exportCsv(filtered)} className="border-border text-xs h-9 gap-1.5 text-muted-foreground hover:text-foreground">
          <Icon name="Download" size={13} /> CSV
        </Button>
        <Button onClick={openCreate} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium">
          <Icon name="Plus" size={14} /> Добавить
        </Button>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────────── */}
      <Card className="border-border bg-card/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {['Устройство', 'Категория', 'Серийный №', 'Состояние', 'Клиент', 'Принято', ''].map(h => (
                <TableHead key={h} className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              : filtered.map(d => {
                  const cm = CONDITION_MAP[d.condition];
                  return (
                    <TableRow
                      key={d.id}
                      className="border-border hover:bg-neon-cyan/[0.03] cursor-pointer transition-colors"
                      onClick={() => openDetail(d)}
                    >
                      <TableCell className="py-2.5">
                        <p className="text-sm font-medium text-foreground">{d.brand} {d.name}</p>
                        <p className="text-[10px] text-muted-foreground">{d.model}</p>
                      </TableCell>
                      <TableCell className="py-2.5">
                        {d.category_name
                          ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground flex items-center gap-1 w-fit">
                                {d.category_color && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: d.category_color }} />}
                                {d.category_name}
                              </Badge>
                            )
                          : <span className="text-muted-foreground/40 text-xs">—</span>}
                      </TableCell>
                      <TableCell className="py-2.5 font-mono text-xs text-neon-cyan/80">{d.serial_number || '—'}</TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${cm.color}`}>{cm.label}</Badge>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <p className="text-xs font-medium text-foreground">{d.client_name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{d.client_phone}</p>
                      </TableCell>
                      <TableCell className="py-2.5 font-mono text-xs text-muted-foreground">{fmtDate(d.received_at)}</TableCell>
                      <TableCell className="py-2.5" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground">
                              <Icon name="MoreVertical" size={13} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-card border-border" align="end">
                            <DropdownMenuItem onClick={() => openDetail(d)} className="gap-2 text-xs cursor-pointer"><Icon name="Eye" size={13} /> Просмотр</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(d)} className="gap-2 text-xs cursor-pointer"><Icon name="Pencil" size={13} /> Изменить</DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem onClick={() => setDeleteId(d.id)} className="gap-2 text-xs text-destructive cursor-pointer focus:text-destructive"><Icon name="Trash2" size={13} /> Удалить</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-16">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icon name="SearchX" size={32} className="opacity-20" /><p className="text-sm">Устройства не найдены</p>
                </div>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ── Condition distribution + Category breakdown ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
              <Icon name="BarChart3" size={14} className="text-neon-cyan" /> СОСТОЯНИЕ УСТРОЙСТВ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(Object.keys(CONDITION_MAP) as Device['condition'][]).map(k => {
              const cm  = CONDITION_MAP[k];
              const cnt = stats[k as keyof typeof stats] as number;
              const pct = stats.total > 0 ? Math.round((cnt / stats.total) * 100) : 0;
              const barClass = k === 'new' ? '[&>div]:bg-emerald-400' : k === 'good' ? '[&>div]:bg-blue-400' : k === 'fair' ? '[&>div]:bg-yellow-400' : '[&>div]:bg-red-400';
              return (
                <div key={k} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${cm.color}`}>{cm.label}</Badge>
                    <div className="flex items-center gap-2">
                      <span className="font-orbitron font-bold text-sm text-foreground tabular-nums">{cnt}</span>
                      <span className={`text-xs font-mono ${cm.color.split(' ')[0]}`}>{pct}%</span>
                    </div>
                  </div>
                  <Progress value={pct} className={`h-1.5 ${barClass}`} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
              <Icon name="Layers3" size={14} className="text-violet-400" /> ПО КАТЕГОРИЯМ
            </CardTitle>
            <CardDescription className="text-xs">Количество устройств в каждой категории</CardDescription>
          </CardHeader>
          <CardContent>
            {catBreakdown.length === 0
              ? <p className="text-xs text-muted-foreground/50 italic text-center py-4">Нет данных</p>
              : (
                <div className="grid grid-cols-2 gap-2.5">
                  {catBreakdown.map(c => (
                    <div key={c.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/50 bg-muted/10">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: (c.color || '#888') + '20', border: `1px solid ${c.color || '#888'}40` }}
                      >
                        <Icon name={c.icon || 'Cpu'} size={13} style={{ color: c.color || '#888' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{c.device_count} уст.</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* ── Detail Sheet ───────────────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={v => !v && setSheetOpen(false)}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-card border-l border-neon-cyan/20 p-0 flex flex-col">
          {displayDevice && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60">
                <div className="flex items-start justify-between pr-8">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${CONDITION_MAP[displayDevice.condition].color}`}>
                        {CONDITION_MAP[displayDevice.condition].label}
                      </Badge>
                      {displayDevice.category_name && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                          {displayDevice.category_name}
                        </Badge>
                      )}
                    </div>
                    <SheetTitle className="font-orbitron text-base text-foreground leading-snug">
                      {displayDevice.brand} {displayDevice.name}
                    </SheetTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{displayDevice.model}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setSheetOpen(false); openEdit(displayDevice); }}
                    className="border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 h-8 gap-1.5 text-xs flex-shrink-0">
                    <Icon name="Pencil" size={12} /> Изменить
                  </Button>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1">
                <div className="px-6 py-5 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Серийный №</p>
                      <p className="font-mono text-xs text-neon-cyan/80">{displayDevice.serial_number || '—'}</p>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Принято</p>
                      <p className="font-mono text-xs text-foreground">{fmtDate(displayDevice.received_at)}</p>
                    </div>
                  </div>

                  <Separator className="bg-border/50" />
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Клиент</p>
                    <div className="flex items-center gap-2 text-sm"><Icon name="User" size={12} className="text-muted-foreground" /><span className="text-foreground">{displayDevice.client_name}</span></div>
                    <div className="flex items-center gap-2 text-sm"><Icon name="Phone" size={12} className="text-muted-foreground" /><span className="font-mono text-foreground">{displayDevice.client_phone}</span></div>
                    {displayDevice.client_email && <div className="flex items-center gap-2 text-sm"><Icon name="Mail" size={12} className="text-muted-foreground" /><span className="text-foreground">{displayDevice.client_email}</span></div>}
                  </div>

                  {displayDevice.notes && (
                    <>
                      <Separator className="bg-border/50" />
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Заметки</p>
                        <p className="text-sm text-foreground/80 leading-relaxed">{displayDevice.notes}</p>
                      </div>
                    </>
                  )}

                  <Separator className="bg-border/50" />
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      История заказов
                      {detailLoading && <Icon name="Loader2" size={10} className="animate-spin" />}
                    </p>
                    {displayDevice.orders && displayDevice.orders.length > 0 ? (
                      <div className="space-y-2">
                        {displayDevice.orders.map(o => {
                          const pm = PRIORITY_MAP[o.priority] ?? PRIORITY_MAP.normal;
                          return (
                            <div key={o.id} className="p-2.5 rounded-lg border border-border/50 bg-muted/10">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-mono text-xs text-neon-cyan/80">{o.number}</span>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className={`text-[9px] px-1 py-0 border ${pm.color}`}>{pm.label}</Badge>
                                  <span className="font-mono text-xs font-bold text-foreground">{fmtMoney(o.total_price)}</span>
                                </div>
                              </div>
                              {o.diagnosis && <p className="text-xs text-muted-foreground truncate">{o.diagnosis}</p>}
                              {o.status_name && (
                                <span className="text-[10px] font-mono" style={{ color: o.status_color }}>{o.status_name}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : !detailLoading && (
                      <p className="text-xs text-muted-foreground/50 italic">Заказов нет</p>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Edit / Create dialog ───────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={v => !v && setEditOpen(false)}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
            <DialogTitle className="font-orbitron text-sm text-foreground">
              {editDevice ? `РЕДАКТИРОВАТЬ — ${editDevice.brand} ${editDevice.name}` : 'НОВОЕ УСТРОЙСТВО'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label className={lbl}>Название *</Label><Input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} /></div>
                <div className="space-y-1.5"><Label className={lbl}>Бренд</Label><Input value={form.brand ?? ''} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} className={inp} /></div>
                <div className="space-y-1.5"><Label className={lbl}>Модель</Label><Input value={form.model ?? ''} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} className={inp} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className={lbl}>Категория</Label>
                  <Select value={form.category_id != null ? String(form.category_id) : 'none'} onValueChange={v => setForm(f => ({ ...f, category_id: v === 'none' ? null : Number(v) }))}>
                    <SelectTrigger className={inp}><SelectValue placeholder="Без категории" /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="none">Без категории</SelectItem>
                      {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={lbl}>Состояние</Label>
                  <Select value={form.condition ?? 'good'} onValueChange={v => setForm(f => ({ ...f, condition: v as Device['condition'] }))}>
                    <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {(Object.keys(CONDITION_MAP) as Device['condition'][]).map(k => <SelectItem key={k} value={k}>{CONDITION_MAP[k].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label className={lbl}>Серийный номер</Label><Input value={form.serial_number ?? ''} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} className={inp} /></div>
              <Separator className="bg-border/50" />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className={lbl}>Имя клиента</Label><Input value={form.client_name ?? ''} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className={inp} /></div>
                <div className="space-y-1.5"><Label className={lbl}>Телефон</Label><Input value={form.client_phone ?? ''} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} className={inp} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className={lbl}>Email клиента</Label><Input value={form.client_email ?? ''} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} className={inp} /></div>
                <div className="space-y-1.5"><Label className={lbl}>Дата получения</Label><Input type="date" value={(form.received_at ?? '').split('T')[0]} onChange={e => setForm(f => ({ ...f, received_at: e.target.value }))} className={inp} /></div>
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>Заметки</Label>
                <Textarea value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="bg-input border-border text-sm resize-none" />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="px-6 py-4 border-t border-border/60 gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving} className="border-border h-9 text-sm">Отмена</Button>
            <Button onClick={handleSave} disabled={saving || !form.name?.trim()} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium">
              {saving && <Icon name="Loader2" size={13} className="animate-spin" />}
              {saving ? 'Сохранение…' : editDevice ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader><AlertDialogTitle className="font-orbitron text-sm">Удалить устройство?</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground text-sm">Действие необратимо.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-sm h-9">Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm h-9 gap-1.5"><Icon name="Trash2" size={13} /> Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
