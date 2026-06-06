import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { partsApi, categoriesApi } from '@/services/api';
import type { Part, Category } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt  = (n: number) => n.toLocaleString('ru-RU') + ' ₽';
const fmtN = (n: number) => n.toLocaleString('ru-RU');

function exportCsv(parts: Part[]) {
  const h = ['ID', 'Название', 'Артикул', 'Бренд', 'Категория', 'Кол-во', 'Мин. кол-во', 'Цена', 'Поставщик', 'Место'];
  const rows = parts.map(p => [p.id, p.name, p.article, p.brand, p.category_name ?? '—', p.quantity, p.min_quantity, p.price, p.supplier, p.location]);
  const csv = [h, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = `parts_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

const isLow = (p: Part) => p.quantity <= p.min_quantity;

// ─── Main component ────────────────────────────────────────────────────────────

export default function PartsSection() {
  const [parts,      setParts]      = useState<Part[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [fCat,       setFCat]       = useState('all');
  const [fLow,       setFLow]       = useState(false);
  const [editPart,   setEditPart]   = useState<Part | null>(null);
  const [editOpen,   setEditOpen]   = useState(false);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [form,       setForm]       = useState<Partial<Part>>({});
  const { toast } = useToast();

  const load = useCallback(() =>
    Promise.all([partsApi.getAll().then(setParts), categoriesApi.getAll().then(setCategories)]),
  []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const filtered = useMemo(() => parts.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || p.name.toLowerCase().includes(q)
      || p.article.toLowerCase().includes(q)
      || p.brand.toLowerCase().includes(q)
      || p.supplier.toLowerCase().includes(q)
      || p.location.toLowerCase().includes(q);
    const matchCat = fCat === 'all' || String(p.category_id) === fCat;
    const matchLow = !fLow || isLow(p);
    return matchSearch && matchCat && matchLow;
  }), [parts, search, fCat, fLow]);

  const stats = useMemo(() => {
    const lowStock = parts.filter(isLow);
    return {
      types:     parts.length,
      totalQty:  parts.reduce((s, p) => s + p.quantity, 0),
      totalValue:parts.reduce((s, p) => s + p.quantity * p.price, 0),
      lowCount:  lowStock.length,
      lowList:   lowStock,
    };
  }, [parts]);

  // Category value breakdown
  const catValue = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    parts.forEach(p => {
      const key = p.category_name ?? 'Без категории';
      const cur = map.get(key) ?? { count: 0, value: 0 };
      map.set(key, { count: cur.count + 1, value: cur.value + p.quantity * p.price });
    });
    return Array.from(map.entries()).sort((a, b) => b[1].value - a[1].value);
  }, [parts]);

  const openEdit   = (p: Part) => { setEditPart(p); setForm({ ...p }); setEditOpen(true); };
  const openCreate = () => {
    setEditPart(null);
    setForm({ name: '', article: '', brand: '', quantity: 0, min_quantity: 1, price: 0, supplier: '', location: '', category_id: null });
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editPart) { await partsApi.update(editPart.id, form); toast({ title: 'Запчасть обновлена' }); }
      else { await partsApi.create(form); toast({ title: 'Запчасть добавлена' }); }
      setEditOpen(false); await load();
    } catch (e: unknown) { toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await partsApi.delete(deleteId); toast({ title: 'Удалено', variant: 'destructive' }); setDeleteId(null); await load(); }
    catch (e: unknown) { toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' }); }
  };

  const inp = 'bg-input border-border text-sm h-9';
  const lbl = 'text-[10px] font-mono text-muted-foreground uppercase tracking-wider';

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Stats row ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border bg-card/60">
                <CardContent className="p-4 space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-20" /></CardContent>
              </Card>
            ))
          : ([
              { label: 'Типов запчастей',  value: fmtN(stats.types),             iconName: 'Package',       color: 'text-neon-cyan',   border: 'border-neon-cyan/25',   bg: 'bg-neon-cyan/10' },
              { label: 'Общее кол-во',     value: fmtN(stats.totalQty) + ' шт.', iconName: 'Layers',        color: 'text-violet-400',  border: 'border-violet-400/25',  bg: 'bg-violet-400/10' },
              { label: 'Стоимость склада', value: fmt(stats.totalValue),          iconName: 'Warehouse',     color: 'text-emerald-400', border: 'border-emerald-400/25', bg: 'bg-emerald-400/10' },
              { label: 'Заканчивается',    value: stats.lowCount,                 iconName: 'PackageX',      color: 'text-orange-400',  border: 'border-orange-400/25',  bg: 'bg-orange-400/10' },
            ]).map(c => (
              <Card key={c.label} className={`border ${c.border} bg-card/60 hover:bg-card transition-all`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <p className={lbl}>{c.label}</p>
                    <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center`}>
                      <Icon name={c.iconName} size={14} className={c.color} />
                    </div>
                  </div>
                  <p className={`text-2xl font-orbitron font-bold ${c.color} tabular-nums leading-tight`}>{c.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* ── Low stock alert banner ─────────────────────────────────────────────── */}
      {!loading && stats.lowCount > 0 && (
        <Alert className="border-orange-500/40 bg-orange-500/[0.06]">
          <Icon name="AlertTriangle" size={16} className="text-orange-400" />
          <AlertDescription className="text-sm">
            <span className="font-semibold text-orange-400">{stats.lowCount} позиций</span>
            {' '}ниже минимального остатка:{' '}
            <span className="text-muted-foreground">
              {stats.lowList.slice(0, 4).map(p => p.name).join(', ')}
              {stats.lowList.length > 4 && ` и ещё ${stats.lowList.length - 4}`}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Toolbar ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-44 max-w-sm">
          <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Название, артикул, бренд…"
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

        <div className="flex items-center gap-2 px-1">
          <Switch checked={fLow} onCheckedChange={setFLow} className="scale-[0.8] origin-left" />
          <span className="text-xs text-muted-foreground">Только заканчивающиеся</span>
        </div>

        {(search || fCat !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFCat('all'); setFLow(false); }} className="h-9 text-xs text-muted-foreground gap-1 px-2">
            <Icon name="FilterX" size={12} /> Сбросить
          </Button>
        )}
        <span className="text-[11px] font-mono text-muted-foreground ml-auto self-center">{filtered.length} / {parts.length}</span>
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
              {['Запчасть', 'Артикул', 'Остаток', 'Цена', 'Место', 'Поставщик', ''].map(h => (
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
              : filtered.map(p => {
                  const low      = isLow(p);
                  const critical = p.quantity === 0;
                  return (
                    <TableRow key={p.id} className={`border-border hover:bg-neon-cyan/[0.03] transition-colors ${critical ? 'bg-red-500/[0.03]' : low ? 'bg-orange-500/[0.03]' : ''}`}>
                      {/* Name + brand */}
                      <TableCell className="py-2.5">
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.brand}{p.category_name ? ` · ${p.category_name}` : ''}</p>
                      </TableCell>
                      {/* Article */}
                      <TableCell className="py-2.5 font-mono text-xs text-neon-cyan/80">{p.article || '—'}</TableCell>
                      {/* Qty */}
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          {(critical || low) && <Icon name={critical ? 'AlertCircle' : 'AlertTriangle'} size={12} className={critical ? 'text-red-400' : 'text-orange-400'} />}
                          <span className={`font-orbitron font-bold text-sm tabular-nums ${critical ? 'text-red-400' : low ? 'text-orange-400' : 'text-foreground'}`}>
                            {p.quantity}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">/ {p.min_quantity}</span>
                        </div>
                      </TableCell>
                      {/* Price */}
                      <TableCell className="py-2.5 font-mono text-sm text-foreground tabular-nums">{fmt(p.price)}</TableCell>
                      {/* Location */}
                      <TableCell className="py-2.5">
                        {p.location
                          ? <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-neon-cyan/20 text-neon-cyan/70 font-mono">{p.location}</Badge>
                          : <span className="text-muted-foreground/40 text-xs">—</span>}
                      </TableCell>
                      {/* Supplier */}
                      <TableCell className="py-2.5 text-xs text-muted-foreground truncate max-w-[100px]">{p.supplier || '—'}</TableCell>
                      {/* Actions */}
                      <TableCell className="py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground">
                              <Icon name="MoreVertical" size={13} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-card border-border" align="end">
                            <DropdownMenuItem onClick={() => openEdit(p)} className="gap-2 text-xs cursor-pointer"><Icon name="Pencil" size={13} /> Изменить</DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem onClick={() => setDeleteId(p.id)} className="gap-2 text-xs text-destructive cursor-pointer focus:text-destructive"><Icon name="Trash2" size={13} /> Удалить</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-16">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icon name="SearchX" size={32} className="opacity-20" /><p className="text-sm">Запчасти не найдены</p>
                </div>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ── Category value breakdown + Low stock panel ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Stock value by category */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
              <Icon name="Warehouse" size={14} className="text-neon-cyan" /> СТОИМОСТЬ ПО КАТЕГОРИЯМ
            </CardTitle>
            <CardDescription className="text-xs">Общая стоимость запасов каждой категории</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)
              : catValue.length === 0
                ? <p className="text-xs text-muted-foreground/50 text-center py-4 italic">Нет данных</p>
                : catValue.map(([name, data]) => {
                    const maxVal = catValue[0][1].value || 1;
                    const pct    = Math.round((data.value / maxVal) * 100);
                    return (
                      <div key={name} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-foreground">{name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{data.count} поз.</p>
                          </div>
                          <span className="font-mono font-bold text-sm text-neon-cyan tabular-nums">{fmt(data.value)}</span>
                        </div>
                        <Progress value={pct} className="h-1.5 [&>div]:bg-neon-cyan/70" />
                      </div>
                    );
                  })}
          </CardContent>
        </Card>

        {/* Low stock detailed panel */}
        <Card className={`border ${stats.lowCount > 0 ? 'border-orange-500/30 bg-orange-500/[0.04]' : 'border-border bg-card/60'}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-sm font-orbitron flex items-center gap-2 ${stats.lowCount > 0 ? 'text-orange-400' : 'text-foreground'}`}>
                <Icon name="PackageX" size={14} className={stats.lowCount > 0 ? 'text-orange-400' : 'text-muted-foreground'} />
                НА ИСХОДЕ
              </CardTitle>
              {stats.lowCount > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-400/40 text-orange-400 bg-orange-400/10 font-mono">
                  {stats.lowCount} позиций
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">Позиции ниже минимального порога</CardDescription>
          </CardHeader>
          <CardContent>
            {loading
              ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
              : stats.lowList.length === 0
                ? (
                    <div className="flex flex-col items-center py-6 text-muted-foreground gap-2">
                      <Icon name="PackageCheck" size={28} className="opacity-25" />
                      <p className="text-sm">Все запасы в норме</p>
                    </div>
                  )
                : (
                    <ScrollArea className="max-h-64">
                      <div className="space-y-3 pr-2">
                        {stats.lowList.map(p => {
                          const critical = p.quantity === 0;
                          const shortage = p.min_quantity - p.quantity;
                          const pct      = p.min_quantity > 0 ? Math.round((p.quantity / p.min_quantity) * 100) : 0;
                          return (
                            <div key={p.id} className={`rounded-lg border p-3 space-y-2 ${critical ? 'border-red-500/30 bg-red-500/[0.06]' : 'border-orange-500/20 bg-orange-500/[0.04]'}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <Icon name={critical ? 'AlertCircle' : 'AlertTriangle'} size={11} className={critical ? 'text-red-400' : 'text-orange-400'} />
                                    <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                                  </div>
                                  <p className="text-[10px] font-mono text-muted-foreground">{p.article || '—'} · {p.brand}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className={`font-orbitron font-bold text-base tabular-nums ${critical ? 'text-red-400' : 'text-orange-400'}`}>{p.quantity} шт.</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">мин {p.min_quantity}</p>
                                </div>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${critical ? 'bg-red-400' : 'bg-orange-400'}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                Не хватает:{' '}
                                <span className={`font-mono font-bold ${critical ? 'text-red-400' : 'text-orange-400'}`}>{shortage} шт.</span>
                                {p.supplier && <span> · Поставщик: <span className="text-foreground">{p.supplier}</span></span>}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
          </CardContent>
        </Card>
      </div>

      {/* ── Edit / Create dialog ───────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={v => !v && setEditOpen(false)}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
            <DialogTitle className="font-orbitron text-sm text-foreground">
              {editPart ? `РЕДАКТИРОВАТЬ — ${editPart.name}` : 'НОВАЯ ЗАПЧАСТЬ'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className={lbl}>Название *</Label><Input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} /></div>
                <div className="space-y-1.5"><Label className={lbl}>Артикул</Label><Input value={form.article ?? ''} onChange={e => setForm(f => ({ ...f, article: e.target.value }))} className={inp} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className={lbl}>Бренд</Label><Input value={form.brand ?? ''} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} className={inp} /></div>
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
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label className={lbl}>Кол-во</Label><Input type="number" min={0} value={form.quantity ?? 0} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} className={inp} /></div>
                <div className="space-y-1.5"><Label className={lbl}>Мин. кол-во</Label><Input type="number" min={0} value={form.min_quantity ?? 1} onChange={e => setForm(f => ({ ...f, min_quantity: Number(e.target.value) }))} className={inp} /></div>
                <div className="space-y-1.5"><Label className={lbl}>Цена (₽)</Label><Input type="number" min={0} value={form.price ?? 0} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} className={inp} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className={lbl}>Поставщик</Label><Input value={form.supplier ?? ''} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className={inp} /></div>
                <div className="space-y-1.5"><Label className={lbl}>Место хранения</Label><Input value={form.location ?? ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Полка A3" className={inp} /></div>
              </div>
              {/* Live value preview */}
              {(form.quantity ?? 0) > 0 && (form.price ?? 0) > 0 && (
                <div className="rounded-lg border border-neon-cyan/15 bg-neon-cyan/5 p-3">
                  <p className={lbl}>Общая стоимость на складе</p>
                  <p className="font-orbitron font-bold text-lg text-neon-cyan tabular-nums mt-1">
                    {fmt((form.quantity ?? 0) * (form.price ?? 0))}
                  </p>
                </div>
              )}
              {/* Low stock warning in form */}
              {(form.quantity ?? 0) <= (form.min_quantity ?? 0) && (form.min_quantity ?? 0) > 0 && (
                <div className="flex items-center gap-2 text-xs text-orange-400 p-2 rounded-lg border border-orange-400/20 bg-orange-400/5">
                  <Icon name="AlertTriangle" size={12} />
                  <span>Количество ниже или равно минимальному — позиция попадёт в список «на исходе»</span>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="px-6 py-4 border-t border-border/60 gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving} className="border-border h-9 text-sm">Отмена</Button>
            <Button onClick={handleSave} disabled={saving || !form.name?.trim()} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium">
              {saving && <Icon name="Loader2" size={13} className="animate-spin" />}
              {saving ? 'Сохранение…' : editPart ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-orbitron text-sm">Удалить запчасть?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">Действие необратимо.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-sm h-9">Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm h-9 gap-1.5">
              <Icon name="Trash2" size={13} /> Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
