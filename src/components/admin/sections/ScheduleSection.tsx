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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { scheduleApi, mastersApi } from '@/services/api';
import type { Schedule, Master } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

// ─── Maps ──────────────────────────────────────────────────────────────────────

const TYPE_MAP: Record<Schedule['type'], { label: string; color: string; iconName: string; dot: string }> = {
  work:        { label: 'Работа',   color: 'text-blue-400   border-blue-400/30   bg-blue-400/10',   iconName: 'Briefcase',  dot: 'bg-blue-400' },
  break:       { label: 'Перерыв', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10', iconName: 'Coffee',     dot: 'bg-yellow-400' },
  vacation:    { label: 'Отпуск',  color: 'text-slate-400  border-slate-400/30  bg-slate-400/10',  iconName: 'Palmtree',   dot: 'bg-slate-400' },
  appointment: { label: 'Встреча', color: 'text-violet-400 border-violet-400/30 bg-violet-400/10', iconName: 'CalendarCheck', dot: 'bg-violet-400' },
};

const WEEK_DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const toDateStr = (d: Date) => d.toISOString().split('T')[0];

const formatTime = (t: string) => {
  // normalise "HH:MM:SS" → "HH:MM"
  return (t ?? '').slice(0, 5);
};

// Get Monday of the current week containing `date`
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun .. 6=Sat
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ScheduleSection() {
  const [schedule,    setSchedule]    = useState<Schedule[]>([]);
  const [masters,     setMasters]     = useState<Master[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filterMaster, setFilterMaster] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editSlot,    setEditSlot]    = useState<Schedule | null>(null);
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [deleteId,    setDeleteId]    = useState<number | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [form,        setForm]        = useState<Partial<Schedule>>({});
  const { toast } = useToast();

  const load = useCallback(() =>
    Promise.all([scheduleApi.getAll().then(setSchedule), mastersApi.getAll().then(setMasters)]),
  []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:       schedule.length,
    work:        schedule.filter(s => s.type === 'work').length,
    brk:         schedule.filter(s => s.type === 'break').length,
    other:       schedule.filter(s => s.type === 'vacation' || s.type === 'appointment').length,
  }), [schedule]);

  // ── Selected-date filtered list ────────────────────────────────────────────

  const selectedDateStr = toDateStr(selectedDate);

  const daySlots = useMemo(() =>
    schedule
      .filter(s => {
        const matchMaster = filterMaster === 'all' || String(s.master_id) === filterMaster;
        const matchDate   = s.date === selectedDateStr;
        return matchMaster && matchDate;
      })
      .sort((a, b) => (a.time_start ?? '').localeCompare(b.time_start ?? '')),
  [schedule, filterMaster, selectedDateStr]);

  // ── Weekly strip (Mon–Sun of current week) ─────────────────────────────────

  const weekDays = useMemo(() => {
    const start = getWeekStart(selectedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dStr = toDateStr(d);
      const slots = schedule.filter(s => s.date === dStr);
      return { date: d, dateStr: dStr, dayLabel: WEEK_DAYS_SHORT[i], slots };
    });
  }, [schedule, selectedDate]);

  // ── Master availability for selected day ──────────────────────────────────

  const masterAvailability = useMemo(() =>
    masters.map(m => {
      const daySlotsMaster = schedule.filter(s => s.date === selectedDateStr && s.master_id === m.id);
      const workSlots      = daySlotsMaster.filter(s => s.type === 'work').length;
      const totalSlots     = daySlotsMaster.length;
      return { master: m, workSlots, totalSlots, busy: totalSlots > 0 };
    }),
  [masters, schedule, selectedDateStr]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditSlot(null);
    setForm({
      master_id: masters[0]?.id ?? null,
      date: selectedDateStr,
      time_start: '09:00',
      time_end: '10:00',
      type: 'work',
      notes: '',
      order_id: null,
    });
    setDialogOpen(true);
  };

  const openEdit = (s: Schedule) => { setEditSlot(s); setForm({ ...s }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editSlot) { await scheduleApi.update(editSlot.id, form); toast({ title: 'Запись обновлена' }); }
      else           { await scheduleApi.create(form);             toast({ title: 'Запись добавлена' }); }
      setDialogOpen(false);
      await load();
    } catch (e: unknown) {
      toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await scheduleApi.delete(deleteId);
      toast({ title: 'Запись удалена', variant: 'destructive' });
      setDeleteId(null);
      await load();
    } catch (e: unknown) {
      toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const getMasterName = (id: number | null) =>
    id == null ? '—' : (masters.find(m => m.id === id)?.name ?? '—');

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
              { label: 'Всего слотов',  value: stats.total, iconName: 'CalendarDays', color: 'text-neon-cyan',   border: 'border-neon-cyan/25',   bg: 'bg-neon-cyan/10' },
              { label: 'Рабочих',       value: stats.work,  iconName: 'Briefcase',    color: 'text-blue-400',    border: 'border-blue-400/25',    bg: 'bg-blue-400/10' },
              { label: 'Перерывов',     value: stats.brk,   iconName: 'Coffee',       color: 'text-yellow-400',  border: 'border-yellow-400/25',  bg: 'bg-yellow-400/10' },
              { label: 'Прочих',        value: stats.other, iconName: 'Calendar',     color: 'text-violet-400',  border: 'border-violet-400/25',  bg: 'bg-violet-400/10' },
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

      {/* ── Weekly strip ──────────────────────────────────────────────────────── */}
      <Card className="border-border bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
            <Icon name="CalendarRange" size={14} className="text-neon-cyan" /> НЕДЕЛЯ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(wd => {
              const isSelected = wd.dateStr === selectedDateStr;
              const isToday    = wd.dateStr === toDateStr(new Date());
              const typeCount  = (['work','break','vacation','appointment'] as Schedule['type'][]).reduce(
                (acc, t) => ({ ...acc, [t]: wd.slots.filter(s => s.type === t).length }),
                {} as Record<Schedule['type'], number>,
              );
              return (
                <button
                  key={wd.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(wd.date)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-neon-cyan/50 bg-neon-cyan/10'
                      : isToday
                      ? 'border-neon-cyan/20 bg-neon-cyan/5 hover:border-neon-cyan/30'
                      : 'border-border hover:border-border/80 hover:bg-muted/20'
                  }`}
                >
                  <span className={`text-[10px] font-mono font-bold uppercase ${isSelected ? 'text-neon-cyan' : 'text-muted-foreground'}`}>
                    {wd.dayLabel}
                  </span>
                  <span className={`text-xs font-orbitron font-bold ${isSelected ? 'text-neon-cyan' : isToday ? 'text-foreground' : 'text-foreground/70'}`}>
                    {wd.date.getDate()}
                  </span>
                  {wd.slots.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 justify-center">
                      {(Object.keys(TYPE_MAP) as Schedule['type'][]).map(t =>
                        typeCount[t] > 0
                          ? <span key={t} className={`w-1.5 h-1.5 rounded-full ${TYPE_MAP[t].dot}`} />
                          : null
                      )}
                    </div>
                  )}
                  {wd.slots.length === 0 && <span className="w-1.5 h-1.5" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Calendar + Schedule list (2-col) ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Calendar */}
        <Card className="border-border bg-card/60 self-start">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
              <Icon name="CalendarDays" size={14} className="text-neon-cyan" /> КАЛЕНДАРЬ
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center px-2 pb-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={d => d && setSelectedDate(d)}
              className="rounded-md w-full"
            />
          </CardContent>
        </Card>

        {/* Schedule list */}
        <div className="lg:col-span-2 space-y-3">
          {/* Toolbar above list */}
          <div className="flex gap-2 items-center">
            <Select value={filterMaster} onValueChange={setFilterMaster}>
              <SelectTrigger className={`w-52 ${inp}`}>
                <SelectValue placeholder="Все мастера" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Все мастера</SelectItem>
                {masters.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-[11px] font-mono text-muted-foreground ml-auto">
              {daySlots.length} слотов на {selectedDate.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })}
            </span>
            <Button onClick={openCreate} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium">
              <Icon name="Plus" size={14} /> Добавить
            </Button>
          </div>

          {/* Slot cards */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-border bg-card/60">
                  <CardContent className="p-4 flex gap-4 items-center">
                    <Skeleton className="w-16 h-12 rounded" />
                    <div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : daySlots.length === 0 ? (
            <Card className="border-border bg-card/40">
              <CardContent className="flex flex-col items-center py-14 gap-2 text-muted-foreground">
                <Icon name="CalendarX" size={32} className="opacity-20" />
                <p className="text-sm">Нет записей на выбранную дату</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {daySlots.map(slot => {
                const tm = TYPE_MAP[slot.type];
                return (
                  <Card key={slot.id} className={`border bg-card/60 hover:bg-card transition-all group border-l-2`}
                    style={{ borderLeftColor: tm.dot.replace('bg-', '') === 'blue-400' ? '#60a5fa' : tm.dot.replace('bg-', '') === 'yellow-400' ? '#facc15' : tm.dot.replace('bg-', '') === 'violet-400' ? '#a78bfa' : '#94a3b8' }}>
                    <CardContent className="p-4 flex items-center gap-4">
                      {/* Time block */}
                      <div className="flex-shrink-0 text-center w-16">
                        <p className="font-orbitron text-sm font-bold text-neon-cyan">{formatTime(slot.time_start)}</p>
                        <div className="w-px h-3 bg-border/60 mx-auto my-0.5" />
                        <p className="font-orbitron text-xs text-muted-foreground">{formatTime(slot.time_end)}</p>
                      </div>
                      <Separator orientation="vertical" className="h-10 bg-border/40" />
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border flex items-center gap-1 ${tm.color}`}>
                            <Icon name={tm.iconName} size={9} /> {tm.label}
                          </Badge>
                          <span className="text-sm font-medium text-foreground truncate">
                            {getMasterName(slot.master_id)}
                          </span>
                        </div>
                        {slot.notes && <p className="text-xs text-muted-foreground truncate">{slot.notes}</p>}
                        {slot.order_id && (
                          <p className="text-[10px] font-mono text-neon-cyan/60">
                            Заказ №{slot.order_id}
                          </p>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(slot)} className="w-7 h-7 text-muted-foreground hover:text-foreground">
                          <Icon name="Pencil" size={13} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(slot.id)} className="w-7 h-7 text-muted-foreground hover:text-red-400">
                          <Icon name="Trash2" size={13} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Master availability cards ─────────────────────────────────────────── */}
      <Card className="border-border bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
            <Icon name="Users" size={14} className="text-violet-400" /> ДОСТУПНОСТЬ МАСТЕРОВ
            <span className="text-[10px] font-sans font-normal text-muted-foreground normal-case">
              — {selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : masterAvailability.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 text-center py-4 italic">Нет мастеров</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {masterAvailability.map(({ master, workSlots, totalSlots, busy }) => (
                <div
                  key={master.id}
                  className={`flex flex-col gap-1.5 p-3 rounded-lg border transition-all ${
                    busy
                      ? 'border-orange-400/25 bg-orange-400/5'
                      : 'border-emerald-400/25 bg-emerald-400/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${busy ? 'bg-orange-400' : 'bg-emerald-400'}`} />
                    <p className="text-xs font-medium text-foreground truncate">{master.name.split(' ')[0]}</p>
                  </div>
                  <p className={`text-[10px] font-mono ${busy ? 'text-orange-400' : 'text-emerald-400'}`}>
                    {busy ? `${totalSlots} слот${totalSlots === 1 ? '' : 'ов'}` : 'Свободен'}
                  </p>
                  {busy && (
                    <Progress
                      value={Math.min(100, workSlots * 25)}
                      className="h-1 [&>div]:bg-orange-400"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit / Create dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={v => !v && setDialogOpen(false)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="font-orbitron text-sm text-foreground">
              {editSlot ? 'РЕДАКТИРОВАТЬ ЗАПИСЬ' : 'НОВАЯ ЗАПИСЬ'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={lbl}>Мастер</Label>
                <Select
                  value={form.master_id != null ? String(form.master_id) : 'none'}
                  onValueChange={v => setForm(f => ({ ...f, master_id: v === 'none' ? null : Number(v) }))}
                >
                  <SelectTrigger className={inp}><SelectValue placeholder="Выбрать" /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="none">Не назначен</SelectItem>
                    {masters.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>Тип</Label>
                <Select
                  value={form.type ?? 'work'}
                  onValueChange={v => setForm(f => ({ ...f, type: v as Schedule['type'] }))}
                >
                  <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {(Object.keys(TYPE_MAP) as Schedule['type'][]).map(t => (
                      <SelectItem key={t} value={t}>
                        <div className="flex items-center gap-2">
                          <Icon name={TYPE_MAP[t].iconName} size={13} className={TYPE_MAP[t].color.split(' ')[0]} />
                          {TYPE_MAP[t].label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={lbl}>Дата</Label>
              <Input
                type="date"
                value={form.date ?? selectedDateStr}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className={inp}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={lbl}>Начало</Label>
                <Input
                  type="time"
                  value={formatTime(form.time_start ?? '')}
                  onChange={e => setForm(f => ({ ...f, time_start: e.target.value }))}
                  className={`${inp} font-mono`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>Конец</Label>
                <Input
                  type="time"
                  value={formatTime(form.time_end ?? '')}
                  onChange={e => setForm(f => ({ ...f, time_end: e.target.value }))}
                  className={`${inp} font-mono`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={lbl}>Номер заказа (необязательно)</Label>
              <Input
                type="number"
                placeholder="ID заказа"
                value={form.order_id ?? ''}
                onChange={e => setForm(f => ({ ...f, order_id: e.target.value ? Number(e.target.value) : null }))}
                className={inp}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={lbl}>Заметки</Label>
              <Textarea
                value={form.notes ?? ''}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="bg-input border-border text-sm resize-none"
                placeholder="Дополнительная информация…"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/60 gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving} className="border-border h-9 text-sm">
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium"
            >
              {saving && <Icon name="Loader2" size={13} className="animate-spin" />}
              {saving ? 'Сохранение…' : editSlot ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-orbitron text-sm">Удалить запись?</AlertDialogTitle>
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
