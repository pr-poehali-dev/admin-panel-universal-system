import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';
import { servicesService, categoriesService, type Service, type Category } from '@/services/mockData';
import { useToast } from '@/hooks/use-toast';

const EMPTY: Omit<Service, 'id'> = {
  name: '', description: '', categoryId: '1', price: 0, duration: 60, warranty: 30, isActive: true,
};

export default function ServicesSection() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Service | null>(null);
  const [form, setForm] = useState<Omit<Service, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = () => { servicesService.getAll().then(setServices); categoriesService.getAll().then(setCategories); };
  useEffect(load, []);

  const getCatName = (id: string) => categories.find(c => c.id === id)?.name ?? '—';

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditItem(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (s: Service) => { setEditItem(s); setForm({ ...s }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    if (editItem) { await servicesService.update(editItem.id, form); toast({ title: 'Услуга обновлена' }); }
    else { await servicesService.create(form); toast({ title: 'Услуга добавлена' }); }
    setSaving(false); setDialogOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await servicesService.delete(deleteId);
    toast({ title: 'Услуга удалена', variant: 'destructive' });
    setDeleteId(null); load();
  };

  const toggleActive = async (svc: Service) => {
    await servicesService.update(svc.id, { isActive: !svc.isActive });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Поиск услуг..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 bg-input border-border text-sm" />
        </div>
        <Button onClick={openCreate} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2">
          <Icon name="Plus" size={15} /> Добавить услугу
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(svc => (
          <Card key={svc.id} className={`border-border bg-card/60 hover:border-neon-cyan/20 transition-all ${!svc.isActive ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-medium text-foreground leading-tight">{svc.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">{getCatName(svc.categoryId)}</CardDescription>
                </div>
                <Switch checked={svc.isActive} onCheckedChange={() => toggleActive(svc)} className="data-[state=checked]:bg-neon-cyan flex-shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{svc.description}</p>
              <Separator className="bg-border mb-3" />
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div>
                  <p className="text-lg font-orbitron font-bold text-neon-cyan">{svc.price.toLocaleString('ru')}</p>
                  <p className="text-xs text-muted-foreground">₽</p>
                </div>
                <div>
                  <p className="text-lg font-orbitron font-bold text-violet-400">{svc.duration}</p>
                  <p className="text-xs text-muted-foreground">мин.</p>
                </div>
                <div>
                  <p className="text-lg font-orbitron font-bold text-emerald-400">{svc.warranty}</p>
                  <p className="text-xs text-muted-foreground">дней</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(svc)} className="flex-1 h-8 border-border text-xs gap-1.5">
                  <Icon name="Pencil" size={12} /> Изменить
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteId(svc.id)} className="h-8 border-red-500/30 text-red-400 hover:bg-red-500/10 px-2">
                  <Icon name="Trash2" size={12} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-sm">{editItem ? 'РЕДАКТИРОВАТЬ УСЛУГУ' : 'НОВАЯ УСЛУГА'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">Название</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-input border-border text-sm h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">Описание</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-input border-border text-sm min-h-16 resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">Категория</Label>
              <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Цена, ₽</Label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} className="bg-input border-border text-sm h-9 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Время, мин</Label>
                <Input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))} className="bg-input border-border text-sm h-9 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Гарантия, дн</Label>
                <Input type="number" value={form.warranty} onChange={e => setForm(f => ({ ...f, warranty: +e.target.value }))} className="bg-input border-border text-sm h-9 font-mono" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} className="data-[state=checked]:bg-neon-cyan" />
              <Label className="text-sm text-foreground">Услуга активна</Label>
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
            <AlertDialogTitle className="font-orbitron text-sm">Удалить услугу?</AlertDialogTitle>
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
