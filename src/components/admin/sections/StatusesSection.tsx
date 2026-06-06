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
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { statusesApi } from '@/services/api';
import type { OrderStatus } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

// ─── Constants ─────────────────────────────────────────────────────────────────

const COLOR_OPTIONS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#6b7280', '#ec4899', '#06b6d4'];

// Static per-order estimated time in pipeline (hours), keyed by sort_order index
const STAGE_HOURS = [0.5, 2, 8, 24, 4, 1, 0.5, 2];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const hexAlpha = (hex: string, a: string) => hex + a;

// ─── Main component ────────────────────────────────────────────────────────────

export default function StatusesSection() {
  const [statuses,   setStatuses]   = useState<OrderStatus[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [editStatus, setEditStatus] = useState<OrderStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [form,       setForm]       = useState<Partial<OrderStatus>>({});
  const { toast } = useToast();

  const sorted = useMemo(
    () => [...statuses].sort((a, b) => a.sort_order - b.sort_order),
    [statuses],
  );

  const stats = useMemo(() => ({
    total:       statuses.length,
    active:      statuses.filter(s => !s.is_terminal).length,
    terminal:    statuses.filter(s =>  s.is_terminal).length,
    totalOrders: statuses.reduce((s, st) => s + (st.orders_count ?? 0), 0),
  }), [statuses]);

  const maxOrders = useMemo(
    () => Math.max(...statuses.map(s => s.orders_count ?? 0), 1),
    [statuses],
  );

  const load = useCallback(async () => {
    const data = await statusesApi.getAll();
    setStatuses(data);
  }, []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const openCreate = () => {
    setEditStatus(null);
    setForm({ name: '', color: '#3b82f6', description: '', is_terminal: false, sort_order: statuses.length + 1 });
    setDialogOpen(true);
  };
  const openEdit = (s: OrderStatus) => { setEditStatus(s); setForm({ ...s }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editStatus) { await statusesApi.update(editStatus.id, form); toast({ title: 'Статус обновлён' }); }
      else             { await statusesApi.create(form);               toast({ title: 'Статус создан'   }); }
      setDialogOpen(false);
      await load();
    } catch (e: unknown) {
      toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await statusesApi.delete(deleteId);
      toast({ title: 'Статус удалён', variant: 'destructive' });
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
              { label: 'Всего статусов', value: stats.total,       iconName: 'Tag',          color: 'text-neon-cyan',   border: 'border-neon-cyan/25',   bg: 'bg-neon-cyan/10' },
              { label: 'Активных',       value: stats.active,      iconName: 'PlayCircle',   color: 'text-violet-400',  border: 'border-violet-400/25',  bg: 'bg-violet-400/10' },
              { label: 'Финальных',      value: stats.terminal,    iconName: 'CheckCircle2', color: 'text-emerald-400', border: 'border-emerald-400/25', bg: 'bg-emerald-400/10' },
              { label: 'Заказов всего',  value: stats.totalOrders, iconName: 'ClipboardList',color: 'text-yellow-400',  border: 'border-yellow-400/25',  bg: 'bg-yellow-400/10' },
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

      {/* ── Header row ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Настройте жизненный цикл заказа — этапы прохождения ремонта</p>
        </div>
        <Button onClick={openCreate} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium">
          <Icon name="Plus" size={14} /> Добавить статус
        </Button>
      </div>

      {/* ── Flow visualization ────────────────────────────────────────────────── */}
      <Card className="border-border bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
            <Icon name="GitBranch" size={14} className="text-neon-cyan" /> ПАЙПЛАЙН СТАТУСОВ
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-24 rounded-full flex-shrink-0" />)}
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="flex items-center gap-2 pb-2 min-w-max">
                {sorted.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 flex-shrink-0">
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border transition-all hover:scale-105 cursor-default"
                      style={{
                        borderColor: hexAlpha(s.color, '50'),
                        backgroundColor: hexAlpha(s.color, '18'),
                        color: s.color,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}80` }} />
                      {s.name}
                      {s.is_terminal && <Icon name="CheckCircle2" size={10} style={{ color: s.color }} />}
                    </div>
                    {i < sorted.length - 1 && (
                      <Icon name="ArrowRight" size={14} className="text-muted-foreground/50 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ── Card grid ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border bg-card/60">
              <CardContent className="p-4 space-y-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(status => (
            <Card key={status.id} className="border-border bg-card/60 hover:bg-card transition-all group overflow-hidden"
              style={{ borderLeftWidth: 3, borderLeftColor: status.color }}>
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: status.color, boxShadow: `0 0 8px ${status.color}70` }}
                    />
                    <div>
                      <p className="font-semibold text-sm text-foreground">{status.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">Порядок: {status.sort_order}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {status.is_terminal && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-400/30 text-emerald-400 bg-emerald-400/10">
                        Финал
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground font-mono">
                      {status.orders_count ?? 0}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2 min-h-8">
                  {status.description || '—'}
                </p>

                {/* Action buttons */}
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" onClick={() => openEdit(status)} className="flex-1 h-7 border-border text-xs gap-1">
                    <Icon name="Pencil" size={11} /> Изменить
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteId(status.id)} className="h-7 px-2 border-red-500/30 text-red-400 hover:bg-red-500/10">
                    <Icon name="Trash2" size={11} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {sorted.length === 0 && (
            <div className="col-span-full flex flex-col items-center py-16 text-muted-foreground gap-2">
              <Icon name="Tag" size={32} className="opacity-20" />
              <p className="text-sm">Нет статусов</p>
            </div>
          )}
        </div>
      )}

      {/* ── Usage bar chart + Pipeline analysis ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Usage bar chart */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
              <Icon name="BarChart3" size={14} className="text-neon-cyan" /> ЗАКАЗЫ ПО СТАТУСАМ
            </CardTitle>
            <CardDescription className="text-xs">Количество заказов в каждом статусе</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-full rounded" />)
              : sorted.filter(s => (s.orders_count ?? 0) > 0).map(s => {
                  const pct = maxOrders > 0 ? Math.round(((s.orders_count ?? 0) / maxOrders) * 100) : 0;
                  return (
                    <div key={s.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="text-xs text-foreground">{s.name}</span>
                        </div>
                        <span className="font-mono font-bold text-sm tabular-nums" style={{ color: s.color }}>
                          {s.orders_count ?? 0}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: s.color }} />
                      </div>
                    </div>
                  );
                })}
            {!loading && sorted.every(s => !s.orders_count) && (
              <p className="text-xs text-muted-foreground/50 text-center py-4 italic">Нет данных о заказах</p>
            )}
          </CardContent>
        </Card>

        {/* Pipeline analysis */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
              <Icon name="Clock" size={14} className="text-violet-400" /> АНАЛИЗ ПАЙПЛАЙНА
            </CardTitle>
            <CardDescription className="text-xs">Оценочное время на каждом этапе</CardDescription>
          </CardHeader>
          <CardContent>
            {loading
              ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}</div>
              : (
                <div className="space-y-2">
                  {sorted.map((s, idx) => {
                    const hours = STAGE_HOURS[idx % STAGE_HOURS.length] ?? 1;
                    const timeLabel = hours < 1 ? `${Math.round(hours * 60)} мин` : hours >= 24 ? `${Math.round(hours / 24)} дн` : `${hours} ч`;
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 hover:bg-muted/10 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-[10px] text-muted-foreground/50 w-5 text-right">{s.sort_order}</span>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-xs font-medium text-foreground">{s.name}</span>
                          {s.is_terminal && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-400/30 text-emerald-400 bg-emerald-400/10">
                              Финал
                            </Badge>
                          )}
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">{timeLabel}</span>
                      </div>
                    );
                  })}
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* ── Edit / Create dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={v => !v && setDialogOpen(false)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="font-orbitron text-sm text-foreground">
              {editStatus ? `РЕДАКТИРОВАТЬ — ${editStatus.name}` : 'НОВЫЙ СТАТУС'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Live preview pill */}
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border"
                style={{
                  borderColor: hexAlpha(form.color ?? '#3b82f6', '50'),
                  backgroundColor: hexAlpha(form.color ?? '#3b82f6', '18'),
                  color: form.color ?? '#3b82f6',
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: form.color ?? '#3b82f6' }} />
                {form.name || 'Название статуса'}
                {form.is_terminal && <Icon name="CheckCircle2" size={10} />}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={lbl}>Название *</Label>
                <Input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} />
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>Порядок</Label>
                <Input
                  type="number" min={1}
                  value={form.sort_order ?? 1}
                  onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                  className={`${inp} font-mono`}
                />
              </div>
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

            <Separator className="bg-border/50" />

            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_terminal ?? false}
                onCheckedChange={v => setForm(f => ({ ...f, is_terminal: v }))}
              />
              <div>
                <Label className="text-sm text-foreground cursor-pointer">Финальный статус</Label>
                <p className="text-[10px] text-muted-foreground">Завершает обработку заказа</p>
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
              {saving ? 'Сохранение…' : editStatus ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-orbitron text-sm">Удалить статус?</AlertDialogTitle>
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
