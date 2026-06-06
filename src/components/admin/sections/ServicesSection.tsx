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
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { servicesApi, categoriesApi } from '@/services/api';
import type { Service, Category } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

function exportCsv(services: Service[]) {
  const h = ['ID', 'Название', 'Категория', 'Цена', 'Длит.(мин)', 'Гарантия(дн)', 'Активна'];
  const rows = services.map(s => [s.id, s.name, s.category_name ?? '—', s.price, s.duration, s.warranty, s.is_active ? 'Да' : 'Нет']);
  const csv = [h, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = `services_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ServicesSection() {
  const [services,   setServices]   = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [fCat,       setFCat]       = useState('all');
  const [fActive,    setFActive]    = useState(true);   // true = show active only, false = show all
  const [activeOnly, setActiveOnly] = useState(false);  // toolbar switch
  const [editSvc,    setEditSvc]    = useState<Service | null>(null);
  const [editOpen,   setEditOpen]   = useState(false);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [form,       setForm]       = useState<Partial<Service>>({});
  const { toast } = useToast();

  void fActive; // suppress unused warning — we use activeOnly below

  const load = useCallback(() =>
    Promise.all([servicesApi.getAll().then(setServices), categoriesApi.getAll().then(setCategories)]),
  []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const filtered = useMemo(() => services.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    const matchCat    = fCat === 'all' || String(s.category_id) === fCat;
    const matchActive = !activeOnly || s.is_active;
    return matchSearch && matchCat && matchActive;
  }), [services, search, fCat, activeOnly]);

  const stats = useMemo(() => {
    const prices = services.map(s => s.price).filter(p => p > 0);
    return {
      total:    services.length,
      active:   services.filter(s => s.is_active).length,
      inactive: services.filter(s => !s.is_active).length,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      minPrice: prices.length ? Math.min(...prices) : 0,
      avgPrice: prices.length ? Math.round(prices.reduce((a, v) => a + v, 0) / prices.length) : 0,
    };
  }, [services]);

  // Group services by category for accordion
  const catGroups = useMemo(() => {
    const map = new Map<string, Service[]>();
    filtered.forEach(s => {
      const key = s.category_name ?? 'Без категории';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const inactiveList = useMemo(() => services.filter(s => !s.is_active), [services]);

  const openEdit   = (s: Service) => { setEditSvc(s); setForm({ ...s }); setEditOpen(true); };
  const openCreate = () => {
    setEditSvc(null);
    setForm({ name: '', description: '', category_id: null, price: 0, duration: 60, warranty: 30, is_active: true });
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editSvc) { await servicesApi.update(editSvc.id, form); toast({ title: 'Услуга обновлена' }); }
      else { await servicesApi.create(form); toast({ title: 'Услуга создана' }); }
      setEditOpen(false); await load();
    } catch (e: unknown) { toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await servicesApi.delete(deleteId); toast({ title: 'Удалено', variant: 'destructive' }); setDeleteId(null); await load(); }
    catch (e: unknown) { toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' }); }
  };

  const handleToggle = async (s: Service) => {
    await servicesApi.patch(s.id, { is_active: !s.is_active });
    await load();
  };

  const handleReactivate = async (s: Service) => {
    await servicesApi.patch(s.id, { is_active: true });
    toast({ title: 'Услуга активирована', description: s.name });
    await load();
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
              { label: 'Всего услуг',   value: stats.total,             iconName: 'Wrench',      color: 'text-neon-cyan',   border: 'border-neon-cyan/25',   bg: 'bg-neon-cyan/10' },
              { label: 'Активных',      value: stats.active,            iconName: 'CheckCircle2', color: 'text-emerald-400', border: 'border-emerald-400/25', bg: 'bg-emerald-400/10' },
              { label: 'Неактивных',    value: stats.inactive,          iconName: 'PauseCircle',  color: 'text-muted-foreground', border: 'border-border', bg: 'bg-muted/20' },
              { label: 'Макс. цена',    value: fmt(stats.maxPrice),     iconName: 'TrendingUp',   color: 'text-violet-400',  border: 'border-violet-400/25',  bg: 'bg-violet-400/10' },
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

      {/* ── Toolbar ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-44 max-w-sm">
          <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Название, описание…" value={search} onChange={e => setSearch(e.target.value)} className={`pl-8 ${inp}`} />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><Icon name="X" size={12} /></button>}
        </div>

        <Select value={fCat} onValueChange={setFCat}>
          <SelectTrigger className={`w-40 ${inp}`}><SelectValue placeholder="Категория" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Все категории</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Active-only toggle */}
        <div className="flex items-center gap-2 px-2">
          <Switch checked={activeOnly} onCheckedChange={v => { setActiveOnly(v); setFActive(v); }} className="scale-[0.8] origin-left" />
          <span className="text-xs text-muted-foreground">Только активные</span>
        </div>

        {(search || fCat !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFCat('all'); }} className="h-9 text-xs text-muted-foreground gap-1 px-2">
            <Icon name="FilterX" size={12} /> Сбросить
          </Button>
        )}
        <span className="text-[11px] font-mono text-muted-foreground ml-auto self-center">{filtered.length} / {services.length}</span>
        <Button variant="outline" size="sm" onClick={() => exportCsv(filtered)} className="border-border text-xs h-9 gap-1.5 text-muted-foreground hover:text-foreground">
          <Icon name="Download" size={13} /> CSV
        </Button>
        <Button onClick={openCreate} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium">
          <Icon name="Plus" size={14} /> Добавить
        </Button>
      </div>

      {/* ── Service card grid ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border bg-card/60">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" />
                <div className="flex gap-3"><Skeleton className="h-8 w-20 rounded-lg" /><Skeleton className="h-8 w-20 rounded-lg" /><Skeleton className="h-8 w-20 rounded-lg" /></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <Card
              key={s.id}
              className={`border bg-card/60 hover:bg-card transition-all group ${s.is_active ? 'border-border hover:border-neon-cyan/20' : 'border-border/40 opacity-65'}`}
            >
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-semibold text-foreground leading-tight truncate">{s.name}</p>
                    {s.category_name && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border text-muted-foreground mt-1">{s.category_name}</Badge>
                    )}
                  </div>
                  <Switch checked={s.is_active} onCheckedChange={() => handleToggle(s)} className="scale-[0.75] origin-right flex-shrink-0 mt-0.5" />
                </div>

                {/* Description */}
                {s.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">{s.description}</p>
                )}

                {/* Metric boxes */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="rounded-lg bg-neon-cyan/5 border border-neon-cyan/15 p-2 text-center">
                    <p className="text-[9px] font-mono text-muted-foreground uppercase mb-0.5">Цена</p>
                    <p className="text-xs font-orbitron font-bold text-neon-cyan tabular-nums leading-tight">{fmt(s.price)}</p>
                  </div>
                  <div className="rounded-lg bg-violet-400/5 border border-violet-400/15 p-2 text-center">
                    <p className="text-[9px] font-mono text-muted-foreground uppercase mb-0.5">Время</p>
                    <p className="text-xs font-orbitron font-bold text-violet-400 tabular-nums leading-tight">{s.duration}<span className="text-[8px] ml-0.5 font-sans font-normal">мин</span></p>
                  </div>
                  <div className="rounded-lg bg-emerald-400/5 border border-emerald-400/15 p-2 text-center">
                    <p className="text-[9px] font-mono text-muted-foreground uppercase mb-0.5">Гарантия</p>
                    <p className="text-xs font-orbitron font-bold text-emerald-400 tabular-nums leading-tight">{s.warranty}<span className="text-[8px] ml-0.5 font-sans font-normal">дн</span></p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" onClick={() => openEdit(s)} className="flex-1 h-7 border-border text-xs gap-1">
                    <Icon name="Pencil" size={11} /> Изменить
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteId(s.id)} className="h-7 px-2 border-red-500/30 text-red-400 hover:bg-red-500/10">
                    <Icon name="Trash2" size={11} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center py-16 text-muted-foreground gap-2">
              <Icon name="SearchX" size={32} className="opacity-20" />
              <p className="text-sm">Услуги не найдены</p>
            </div>
          )}
        </div>
      )}

      {/* ── Price stats + by-category accordion ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Price stats */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
              <Icon name="Receipt" size={14} className="text-neon-cyan" /> ЦЕНОВОЙ ДИАПАЗОН
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Минимальная', value: fmt(stats.minPrice), color: 'text-blue-400',    iconName: 'TrendingDown' },
              { label: 'Средняя',     value: fmt(stats.avgPrice), color: 'text-neon-cyan',   iconName: 'Minus' },
              { label: 'Максимальная',value: fmt(stats.maxPrice), color: 'text-emerald-400', iconName: 'TrendingUp' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2">
                  <Icon name={item.iconName} size={13} className={item.color} />
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
                <span className={`font-orbitron font-bold text-base ${item.color} tabular-nums`}>{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Inactive alert */}
        {inactiveList.length > 0 ? (
          <Card className="border-yellow-500/30 bg-yellow-500/[0.04]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-orbitron text-yellow-400 flex items-center gap-2">
                <Icon name="AlertTriangle" size={14} /> НЕАКТИВНЫЕ УСЛУГИ
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-400/40 text-yellow-400 bg-yellow-400/10 font-mono ml-auto">
                  {inactiveList.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">Недоступны для выбора в заказах</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {inactiveList.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{fmt(s.price)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleReactivate(s)}
                    className="h-7 text-[10px] text-emerald-400 hover:text-emerald-300 px-2 gap-1 flex-shrink-0">
                    <Icon name="Play" size={10} /> Включить
                  </Button>
                </div>
              ))}
              {inactiveList.length > 5 && (
                <p className="text-[10px] text-muted-foreground">…и ещё {inactiveList.length - 5}</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-5 flex flex-col items-center justify-center h-full gap-2 text-center">
              <Icon name="CheckCircle2" size={28} className="text-emerald-400 opacity-60" />
              <p className="text-sm font-medium text-emerald-400">Все услуги активны</p>
              <p className="text-xs text-muted-foreground">Нет отключённых услуг</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── By-category accordion ───────────────────────────────────────────────── */}
      <Card className="border-border bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
            <Icon name="Layers3" size={14} className="text-violet-400" /> УСЛУГИ ПО КАТЕГОРИЯМ
          </CardTitle>
          <CardDescription className="text-xs">Раскройте категорию для просмотра услуг</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : catGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 text-center py-4 italic">Нет данных</p>
          ) : (
            <Accordion type="multiple" className="space-y-1">
              {catGroups.map(([catName, svcs]) => (
                <AccordionItem key={catName} value={catName} className="border border-border/50 rounded-lg px-3 overflow-hidden">
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Icon name="Tag" size={13} className="text-neon-cyan/70" />
                      <span className="text-sm font-medium text-foreground">{catName}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-neon-cyan/30 text-neon-cyan/80 font-mono">
                        {svcs.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <div className="space-y-1.5">
                      {svcs.map(s => (
                        <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/20 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.is_active ? 'bg-emerald-400' : 'bg-muted-foreground/30'}`} />
                            <span className="text-xs text-foreground truncate">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                            <span className="font-mono text-xs font-bold text-neon-cyan tabular-nums">{fmt(s.price)}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{s.duration} мин</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* ── Edit / Create dialog ───────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={v => !v && setEditOpen(false)}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
            <DialogTitle className="font-orbitron text-sm text-foreground">
              {editSvc ? `РЕДАКТИРОВАТЬ — ${editSvc.name}` : 'НОВАЯ УСЛУГА'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="px-6 py-4 space-y-4">
              <div className="space-y-1.5">
                <Label className={lbl}>Название *</Label>
                <Input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} />
              </div>
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
                <Label className={lbl}>Описание</Label>
                <Textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="bg-input border-border text-sm resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className={lbl}>Цена (₽)</Label>
                  <Input type="number" min={0} value={form.price ?? 0} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} className={inp} />
                </div>
                <div className="space-y-1.5">
                  <Label className={lbl}>Длит. (мин)</Label>
                  <Input type="number" min={1} value={form.duration ?? 60} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} className={inp} />
                </div>
                <div className="space-y-1.5">
                  <Label className={lbl}>Гарантия (дн)</Label>
                  <Input type="number" min={0} value={form.warranty ?? 30} onChange={e => setForm(f => ({ ...f, warranty: Number(e.target.value) }))} className={inp} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label className="text-sm text-foreground cursor-pointer">Услуга активна</Label>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="px-6 py-4 border-t border-border/60 gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving} className="border-border h-9 text-sm">Отмена</Button>
            <Button onClick={handleSave} disabled={saving || !form.name?.trim()} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium">
              {saving && <Icon name="Loader2" size={13} className="animate-spin" />}
              {saving ? 'Сохранение…' : editSvc ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader><AlertDialogTitle className="font-orbitron text-sm">Удалить услугу?</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground text-sm">Действие необратимо.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-sm h-9">Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm h-9 gap-1.5"><Icon name="Trash2" size={13} /> Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
