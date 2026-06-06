import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';
import { mastersService, type Master } from '@/services/mockData';
import { useToast } from '@/hooks/use-toast';

const STATUS_MAP = {
  available: { label: 'Свободен', color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  busy:      { label: 'Занят',    color: 'text-orange-400 border-orange-400/30 bg-orange-400/10' },
  vacation:  { label: 'Отпуск',  color: 'text-muted-foreground border-border bg-muted/30' },
};
const LEVEL_MAP = {
  junior: { label: 'Junior', color: 'text-blue-400' },
  middle: { label: 'Middle', color: 'text-violet-400' },
  senior: { label: 'Senior', color: 'text-neon-cyan' },
};

const EMPTY: Omit<Master, 'id'> = {
  name: '', email: '', phone: '', specialization: [], level: 'junior',
  status: 'available', rating: 5.0, completedOrders: 0,
  joinedAt: new Date().toISOString().split('T')[0],
};

export default function MastersSection() {
  const [masters, setMasters] = useState<Master[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Master | null>(null);
  const [form, setForm] = useState<Omit<Master, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = () => mastersService.getAll().then(setMasters);
  useEffect(load, []);

  const filtered = masters.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.specialization.join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditItem(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (m: Master) => { setEditItem(m); setForm({ ...m }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    if (editItem) {
      await mastersService.update(editItem.id, form);
      toast({ title: 'Мастер обновлён' });
    } else {
      await mastersService.create(form);
      toast({ title: 'Мастер добавлен' });
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await mastersService.delete(deleteId);
    toast({ title: 'Мастер удалён', variant: 'destructive' });
    setDeleteId(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Поиск мастеров..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 bg-input border-border text-sm" />
        </div>
        <Button onClick={openCreate} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2">
          <Icon name="UserPlus" size={15} />
          Добавить мастера
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(master => {
          const st = STATUS_MAP[master.status];
          const lv = LEVEL_MAP[master.level];
          const initials = master.name.split(' ').map(n => n[0]).join('').slice(0, 2);
          return (
            <Card key={master.id} className="border-border bg-card/60 hover:border-neon-cyan/20 transition-all group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-11 h-11 border border-neon-cyan/20">
                      <AvatarFallback className="bg-neon-cyan/10 text-neon-cyan font-orbitron text-sm font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm text-foreground">{master.name}</p>
                      <p className={`text-xs font-mono font-bold ${lv.color}`}>{lv.label}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs ${st.color}`}>{st.label}</Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon name="Mail" size={12} />
                    <span className="truncate">{master.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon name="Phone" size={12} />
                    <span>{master.phone}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {master.specialization.map(s => (
                    <Badge key={s} variant="outline" className="text-xs border-border text-muted-foreground">{s}</Badge>
                  ))}
                </div>

                <Separator className="bg-border mb-3" />

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Icon name="Star" size={13} className="text-yellow-400 fill-yellow-400/50" />
                    <span className="font-mono text-sm font-bold text-foreground">{master.rating}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-mono font-bold text-foreground">{master.completedOrders}</span> заказов
                  </div>
                </div>
                <Progress value={(master.rating / 5) * 100} className="h-1 mb-4" />

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" onClick={() => openEdit(master)} className="flex-1 h-8 border-border text-xs gap-1.5">
                    <Icon name="Pencil" size={12} /> Изменить
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteId(master.id)} className="h-8 border-red-500/30 text-red-400 hover:bg-red-500/10 px-2">
                    <Icon name="Trash2" size={12} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-sm">{editItem ? 'РЕДАКТИРОВАТЬ МАСТЕРА' : 'НОВЫЙ МАСТЕР'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">ФИО</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-input border-border text-sm h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Email</Label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-input border-border text-sm h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Телефон</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-input border-border text-sm h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Уровень</Label>
                <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v as Master['level'] }))}>
                  <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="middle">Middle</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Статус</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Master['status'] }))}>
                  <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="available">Свободен</SelectItem>
                    <SelectItem value="busy">Занят</SelectItem>
                    <SelectItem value="vacation">Отпуск</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Рейтинг (0–5)</Label>
                <Input type="number" min="0" max="5" step="0.1" value={form.rating}
                  onChange={e => setForm(f => ({ ...f, rating: +e.target.value }))} className="bg-input border-border text-sm h-9 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Дата найма</Label>
                <Input type="date" value={form.joinedAt} onChange={e => setForm(f => ({ ...f, joinedAt: e.target.value }))} className="bg-input border-border text-sm h-9" />
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
            <AlertDialogTitle className="font-orbitron text-sm">Удалить мастера?</AlertDialogTitle>
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
