import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Icon from '@/components/ui/icon';
import { categoriesApi } from '@/services/api';
import type { Category } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

// ─── Constants ─────────────────────────────────────────────────────────────────

const ICON_OPTIONS = ['Laptop', 'Smartphone', 'Tablet', 'Monitor', 'Printer', 'Tv', 'Camera', 'Headphones', 'Server', 'Cpu'];
const COLOR_OPTIONS = ['#00d4ff', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ─── Main component ────────────────────────────────────────────────────────────

export default function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [editCat,    setEditCat]    = useState<Category | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [form,       setForm]       = useState<Partial<Category>>({});
  const { toast } = useToast();

  const EMPTY: Partial<Category> = {
    name: '', description: '', icon: 'Laptop', color: '#00d4ff', device_count: 0,
    created_at: new Date().toISOString().split('T')[0],
  };

  const load = useCallback(async () => {
    const data = await categoriesApi.getAll();
    setCategories(data);
  }, []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const filtered = useMemo(() =>
    categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
  [categories, search]);

  const stats = useMemo(() => {
    const totalDevices = categories.reduce((s, c) => s + (c.device_count ?? 0), 0);
    const sorted = [...categories].sort((a, b) => (b.device_count ?? 0) - (a.device_count ?? 0));
    const mostPopular = sorted[0] ?? null;
    const leastUsed   = sorted.at(-1) ?? null;
    const newest = [...categories].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
    const avg = categories.length ? Math.round(totalDevices / categories.length) : 0;
    return { total: categories.length, totalDevices, mostPopular, leastUsed, newest, avg };
  }, [categories]);

  const maxDevices = useMemo(() =>
    Math.max(...categories.map(c => c.device_count ?? 0), 1),
  [categories]);

  const openCreate = () => { setEditCat(null); setForm({ ...EMPTY }); setDialogOpen(true); };
  const openEdit   = (c: Category) => { setEditCat(c); setForm({ ...c }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editCat) { await categoriesApi.update(editCat.id, form); toast({ title: 'Категория обновлена' }); }
      else          { await categoriesApi.create(form);            toast({ title: 'Категория создана'  }); }
      setDialogOpen(false);
      await load();
    } catch (e: unknown) {
      toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await categoriesApi.delete(deleteId);
      toast({ title: 'Категория удалена', variant: 'destructive' });
      setDeleteId(null);
      await load();
    } catch (e: unknown) {
      toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const lbl = 'text-[10px] font-mono text-muted-foreground uppercase tracking-wider';
  const inp = 'bg-input border-border text-sm h-9';

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Stats row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border bg-card/60">
                <CardContent className="p-4 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-12" /></CardContent>
              </Card>
            ))
          : ([
              { label: 'Категорий',        value: stats.total,        iconName: 'Layers3',    color: 'text-neon-cyan',   border: 'border-neon-cyan/25',   bg: 'bg-neon-cyan/10' },
              { label: 'Всего устройств',  value: stats.totalDevices, iconName: 'Cpu',        color: 'text-violet-400',  border: 'border-violet-400/25',  bg: 'bg-violet-400/10' },
              { label: 'Самая популярная', value: stats.mostPopular?.name ?? '—', iconName: 'Trophy', color: 'text-yellow-400', border: 'border-yellow-400/25', bg: 'bg-yellow-400/10' },
              { label: 'Ср. устройств',    value: stats.avg,          iconName: 'BarChart3',  color: 'text-emerald-400', border: 'border-emerald-400/25', bg: 'bg-emerald-400/10' },
            ]).map(c => (
              <Card key={c.label} className={`border ${c.border} bg-card/60 hover:bg-card transition-all`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <p className={lbl}>{c.label}</p>
                    <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center`}>
                      <Icon name={c.iconName} size={14} className={c.color} />
                    </div>
                  </div>
                  <p className={`text-2xl font-orbitron font-bold ${c.color} tabular-nums leading-tight truncate`}>{c.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск категорий…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`pl-8 ${inp}`}
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><Icon name="X" size={12} /></button>}
        </div>
        <span className="text-[11px] font-mono text-muted-foreground ml-auto">{filtered.length} / {categories.length}</span>
        <Button onClick={openCreate} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium">
          <Icon name="Plus" size={14} /> Добавить категорию
        </Button>
      </div>

      {/* ── Card grid ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border bg-card/60">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3"><Skeleton className="w-12 h-12 rounded-xl" /><div className="space-y-1.5 flex-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-36" /></div></div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(cat => (
            <Card key={cat.id} className="border-border bg-card/60 hover:bg-card hover:border-neon-cyan/15 transition-all group overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (cat.color || '#888') + '20', border: `1px solid ${cat.color || '#888'}40` }}
                  >
                    <Icon name={cat.icon || 'Cpu'} size={22} style={{ color: cat.color || '#888' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{cat.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{cat.description || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="font-mono text-xs border-border text-muted-foreground">
                    {cat.device_count ?? 0} устройств
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground/60">{fmtDate(cat.created_at)}</span>
                </div>

                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" onClick={() => openEdit(cat)} className="flex-1 h-7 border-border text-xs gap-1">
                    <Icon name="Pencil" size={11} /> Изменить
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteId(cat.id)} className="h-7 px-2 border-red-500/30 text-red-400 hover:bg-red-500/10">
                    <Icon name="Trash2" size={11} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center py-16 text-muted-foreground gap-2">
              <Icon name="SearchX" size={32} className="opacity-20" />
              <p className="text-sm">Категории не найдены</p>
            </div>
          )}
        </div>
      )}

      {/* ── Device distribution bar list ──────────────────────────────────────── */}
      <Card className="border-border bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
            <Icon name="BarChart3" size={14} className="text-neon-cyan" /> РАСПРЕДЕЛЕНИЕ УСТРОЙСТВ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)
            : [...categories]
                .sort((a, b) => (b.device_count ?? 0) - (a.device_count ?? 0))
                .map(cat => {
                  const pct = maxDevices > 0 ? Math.round(((cat.device_count ?? 0) / maxDevices) * 100) : 0;
                  return (
                    <div key={cat.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                            style={{ background: (cat.color || '#888') + '20', border: `1px solid ${cat.color || '#888'}40` }}
                          >
                            <Icon name={cat.icon || 'Cpu'} size={12} style={{ color: cat.color || '#888' }} />
                          </div>
                          <span className="text-sm text-foreground">{cat.name}</span>
                        </div>
                        <span className="font-orbitron font-bold text-sm tabular-nums" style={{ color: cat.color || '#888' }}>
                          {cat.device_count ?? 0}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: cat.color || '#888' }}
                        />
                      </div>
                    </div>
                  );
                })}
        </CardContent>
      </Card>

      {/* ── Usage insights ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Самая популярная', iconName: 'Trophy', color: 'text-yellow-400', border: 'border-yellow-400/25', bg: 'bg-yellow-400/10',
            name: stats.mostPopular?.name ?? '—',
            sub: stats.mostPopular ? `${stats.mostPopular.device_count ?? 0} устройств` : '—',
          },
          {
            label: 'Наименее используемая', iconName: 'TrendingDown', color: 'text-muted-foreground', border: 'border-border', bg: 'bg-muted/20',
            name: stats.leastUsed?.name ?? '—',
            sub: stats.leastUsed ? `${stats.leastUsed.device_count ?? 0} устройств` : '—',
          },
          {
            label: 'Последняя добавленная', iconName: 'CalendarPlus', color: 'text-neon-cyan', border: 'border-neon-cyan/25', bg: 'bg-neon-cyan/10',
            name: stats.newest?.name ?? '—',
            sub: stats.newest ? fmtDate(stats.newest.created_at) : '—',
          },
        ].map(c => (
          <Card key={c.label} className={`border ${c.border} bg-card/60`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center`}>
                  <Icon name={c.iconName} size={13} className={c.color} />
                </div>
                <p className={lbl}>{c.label}</p>
              </div>
              <p className={`text-base font-semibold text-foreground truncate`}>{c.name}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Edit / Create dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={v => !v && setDialogOpen(false)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="font-orbitron text-sm text-foreground">
              {editCat ? `РЕДАКТИРОВАТЬ — ${editCat.name}` : 'НОВАЯ КАТЕГОРИЯ'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/10">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: (form.color || '#888') + '25', border: `1px solid ${form.color || '#888'}50` }}
              >
                <Icon name={form.icon || 'Cpu'} size={20} style={{ color: form.color || '#888' }} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{form.name || 'Название категории'}</p>
                <p className="text-xs text-muted-foreground">{form.description || 'Описание…'}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={lbl}>Название *</Label>
              <Input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} />
            </div>

            <div className="space-y-1.5">
              <Label className={lbl}>Описание</Label>
              <Textarea
                value={form.description ?? ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="bg-input border-border text-sm resize-none"
              />
            </div>

            {/* Icon picker */}
            <div className="space-y-2">
              <Label className={lbl}>Иконка</Label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, icon }))}
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                      form.icon === icon
                        ? 'border-neon-cyan/60 bg-neon-cyan/10 scale-110'
                        : 'border-border hover:border-border/80 hover:bg-muted/30'
                    }`}
                  >
                    <Icon name={icon} size={16} className={form.icon === icon ? 'text-neon-cyan' : 'text-muted-foreground'} />
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div className="space-y-2">
              <Label className={lbl}>Цвет</Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                      form.color === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/60 gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving} className="border-border h-9 text-sm">
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name?.trim()}
              className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium"
            >
              {saving && <Icon name="Loader2" size={13} className="animate-spin" />}
              {saving ? 'Сохранение…' : editCat ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-orbitron text-sm">Удалить категорию?</AlertDialogTitle>
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
