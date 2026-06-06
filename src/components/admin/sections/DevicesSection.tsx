import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import Icon from '@/components/ui/icon';
import { devicesService, categoriesService, type Device, type Category } from '@/services/mockData';
import { useToast } from '@/hooks/use-toast';

const CONDITION_MAP = {
  new:  { label: 'Новое',         color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  good: { label: 'Хорошее',       color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
  fair: { label: 'Удовлетворит.', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' },
  poor: { label: 'Плохое',        color: 'text-red-400 border-red-400/30 bg-red-400/10' },
};

const EMPTY: Omit<Device, 'id'> = {
  name: '', brand: '', model: '', categoryId: '1',
  serialNumber: '', condition: 'good', clientId: '',
  receivedAt: new Date().toISOString().split('T')[0], notes: '',
};

export default function DevicesSection() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Device | null>(null);
  const [form, setForm] = useState<Omit<Device, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = () => {
    devicesService.getAll().then(setDevices);
    categoriesService.getAll().then(setCategories);
  };
  useEffect(load, []);

  const getCatName = (id: string) => categories.find(c => c.id === id)?.name ?? '—';

  const filtered = devices.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
    d.brand.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditItem(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (d: Device) => { setEditItem(d); setForm({ ...d }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    if (editItem) { await devicesService.update(editItem.id, form); toast({ title: 'Устройство обновлено' }); }
    else { await devicesService.create(form); toast({ title: 'Устройство добавлено' }); }
    setSaving(false); setDialogOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await devicesService.delete(deleteId);
    toast({ title: 'Устройство удалено', variant: 'destructive' });
    setDeleteId(null); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Поиск по названию, марке, S/N..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 bg-input border-border text-sm" />
        </div>
        <Button onClick={openCreate} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2">
          <Icon name="Plus" size={15} /> Добавить устройство
        </Button>
      </div>

      <Card className="border-border bg-card/60">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Устройство</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Категория</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Серийный №</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Состояние</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Принято</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(device => {
              const cond = CONDITION_MAP[device.condition];
              return (
                <TableRow key={device.id} className="border-border hover:bg-neon-cyan/3 transition-colors">
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-foreground">{device.name}</p>
                      <p className="text-xs text-muted-foreground">{device.brand} {device.model}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{getCatName(device.categoryId)}</TableCell>
                  <TableCell className="font-mono text-xs text-neon-cyan/70">{device.serialNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${cond.color}`}>{cond.label}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{device.receivedAt}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground">
                          <Icon name="MoreVertical" size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-card border-border" align="end">
                        <DropdownMenuItem onClick={() => openEdit(device)} className="gap-2 text-sm cursor-pointer">
                          <Icon name="Pencil" size={14} /> Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem onClick={() => setDeleteId(device.id)} className="gap-2 text-sm text-destructive cursor-pointer">
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
            <DialogTitle className="font-orbitron text-sm">{editItem ? 'РЕДАКТИРОВАТЬ УСТРОЙСТВО' : 'НОВОЕ УСТРОЙСТВО'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">Название</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-input border-border text-sm h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Производитель</Label>
                <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} className="bg-input border-border text-sm h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Модель</Label>
                <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} className="bg-input border-border text-sm h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Категория</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Состояние</Label>
                <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v as Device['condition'] }))}>
                  <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {Object.entries(CONDITION_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Серийный номер</Label>
                <Input value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} className="bg-input border-border text-sm h-9 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Дата приёма</Label>
                <Input type="date" value={form.receivedAt} onChange={e => setForm(f => ({ ...f, receivedAt: e.target.value }))} className="bg-input border-border text-sm h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">Заметки</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-input border-border text-sm min-h-16 resize-none" />
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
            <AlertDialogTitle className="font-orbitron text-sm">Удалить устройство?</AlertDialogTitle>
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
