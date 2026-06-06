import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Icon from '@/components/ui/icon';
import { scheduleService, mastersService, type Schedule, type Master } from '@/services/mockData';
import { useToast } from '@/hooks/use-toast';

const TYPE_MAP = {
  work:        { label: 'Работа',        color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
  break:       { label: 'Перерыв',       color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' },
  vacation:    { label: 'Отпуск',        color: 'text-muted-foreground border-border bg-muted/20' },
  appointment: { label: 'Встреча',       color: 'text-violet-400 border-violet-400/30 bg-violet-400/10' },
};

const EMPTY: Omit<Schedule, 'id'> = {
  masterId: '1', date: new Date().toISOString().split('T')[0],
  timeStart: '09:00', timeEnd: '10:00', type: 'work', notes: '',
};

export default function ScheduleSection() {
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [filterMaster, setFilterMaster] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Schedule | null>(null);
  const [form, setForm] = useState<Omit<Schedule, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = () => { scheduleService.getAll().then(setSchedule); mastersService.getAll().then(setMasters); };
  useEffect(load, []);

  const getMasterName = (id: string) => masters.find(m => m.id === id)?.name ?? '—';

  const filtered = schedule.filter(s => {
    const matchMaster = filterMaster === 'all' || s.masterId === filterMaster;
    const dateStr = selectedDate?.toISOString().split('T')[0];
    const matchDate = !dateStr || s.date === dateStr;
    return matchMaster && matchDate;
  });

  const openCreate = () => { setEditItem(null); setForm({ ...EMPTY, date: selectedDate?.toISOString().split('T')[0] || EMPTY.date }); setDialogOpen(true); };
  const openEdit = (s: Schedule) => { setEditItem(s); setForm({ ...s }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    if (editItem) { await scheduleService.update(editItem.id, form); toast({ title: 'Запись обновлена' }); }
    else { await scheduleService.create(form); toast({ title: 'Запись добавлена' }); }
    setSaving(false); setDialogOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await scheduleService.delete(deleteId);
    toast({ title: 'Запись удалена', variant: 'destructive' });
    setDeleteId(null); load();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
              <Icon name="CalendarDays" size={16} className="text-neon-cyan" />
              КАЛЕНДАРЬ
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md"
            />
          </CardContent>
        </Card>

        {/* Schedule list */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex gap-3 items-center justify-between">
            <Select value={filterMaster} onValueChange={setFilterMaster}>
              <SelectTrigger className="w-52 h-9 bg-input border-border text-sm"><SelectValue placeholder="Все мастера" /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Все мастера</SelectItem>
                {masters.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={openCreate} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2">
              <Icon name="Plus" size={15} /> Добавить
            </Button>
          </div>

          {filtered.length === 0 ? (
            <Card className="border-border bg-card/40">
              <CardContent className="p-10 text-center text-muted-foreground font-mono text-sm">
                Нет записей на выбранную дату
              </CardContent>
            </Card>
          ) : (
            filtered.map(slot => {
              const tm = TYPE_MAP[slot.type];
              return (
                <Card key={slot.id} className="border-border bg-card/60 hover:border-neon-cyan/20 transition-all group">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-shrink-0 text-center w-16">
                      <p className="font-orbitron text-sm font-bold text-neon-cyan">{slot.timeStart}</p>
                      <div className="w-px h-4 bg-border mx-auto my-1" />
                      <p className="font-orbitron text-xs text-muted-foreground">{slot.timeEnd}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={`text-xs ${tm.color}`}>{tm.label}</Badge>
                        <span className="text-sm text-foreground">{getMasterName(slot.masterId)}</span>
                      </div>
                      {slot.notes && <p className="text-xs text-muted-foreground truncate">{slot.notes}</p>}
                      {slot.orderId && <p className="text-xs font-mono text-neon-cyan/60">Заказ: {slot.orderId}</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            })
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-sm">{editItem ? 'РЕДАКТИРОВАТЬ ЗАПИСЬ' : 'НОВАЯ ЗАПИСЬ'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Мастер</Label>
                <Select value={form.masterId} onValueChange={v => setForm(f => ({ ...f, masterId: v }))}>
                  <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {masters.map(m => <SelectItem key={m.id} value={m.id}>{m.name.split(' ')[0]} {m.name.split(' ')[1]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Тип</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as Schedule['type'] }))}>
                  <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {Object.entries(TYPE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Дата</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-input border-border text-sm h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Начало</Label>
                <Input type="time" value={form.timeStart} onChange={e => setForm(f => ({ ...f, timeStart: e.target.value }))} className="bg-input border-border text-sm h-9 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Конец</Label>
                <Input type="time" value={form.timeEnd} onChange={e => setForm(f => ({ ...f, timeEnd: e.target.value }))} className="bg-input border-border text-sm h-9 font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">Заметки</Label>
              <Textarea value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-input border-border text-sm min-h-16 resize-none" />
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
            <AlertDialogTitle className="font-orbitron text-sm">Удалить запись?</AlertDialogTitle>
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
