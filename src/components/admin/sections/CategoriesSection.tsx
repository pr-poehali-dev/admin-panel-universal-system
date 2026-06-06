import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { categoriesService, type Category } from '@/services/mockData';
import { useToast } from '@/hooks/use-toast';

const ICON_OPTIONS = ['Laptop', 'Smartphone', 'Tablet', 'Monitor', 'Printer', 'Tv', 'Camera', 'Headphones', 'Gamepad2', 'Server'];
const COLOR_OPTIONS = ['#00d4ff', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

const EMPTY: Omit<Category, 'id'> = {
  name: '', description: '', icon: 'Laptop', color: '#00d4ff',
  deviceCount: 0, createdAt: new Date().toISOString().split('T')[0],
};

export default function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const [form, setForm] = useState<Omit<Category, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = () => categoriesService.getAll().then(setCategories);
  useEffect(load, []);

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditItem(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (c: Category) => { setEditItem(c); setForm({ ...c }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    if (editItem) { await categoriesService.update(editItem.id, form); toast({ title: 'Категория обновлена' }); }
    else { await categoriesService.create(form); toast({ title: 'Категория создана' }); }
    setSaving(false); setDialogOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await categoriesService.delete(deleteId);
    toast({ title: 'Категория удалена', variant: 'destructive' });
    setDeleteId(null); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Поиск категорий..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 bg-input border-border text-sm" />
        </div>
        <Button onClick={openCreate} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2">
          <Icon name="Plus" size={15} /> Добавить категорию
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(cat => (
          <Card key={cat.id} className="border-border bg-card/60 hover:bg-card transition-all group overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: cat.color + '20', border: `1px solid ${cat.color}40` }}>
                  <Icon name={cat.icon} size={22} style={{ color: cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{cat.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{cat.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-xs border-border text-muted-foreground">
                  {cat.deviceCount} устройств
                </Badge>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} className="w-7 h-7 text-muted-foreground hover:text-foreground">
                    <Icon name="Pencil" size={13} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(cat.id)} className="w-7 h-7 text-muted-foreground hover:text-red-400">
                    <Icon name="Trash2" size={13} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-sm">{editItem ? 'РЕДАКТИРОВАТЬ КАТЕГОРИЮ' : 'НОВАЯ КАТЕГОРИЯ'}</DialogTitle>
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
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">Иконка</Label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map(icon => (
                  <button key={icon} onClick={() => setForm(f => ({ ...f, icon }))}
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                      form.icon === icon ? 'border-neon-cyan/50 bg-neon-cyan/10' : 'border-border hover:border-border/80'
                    }`}>
                    <Icon name={icon} size={16} className={form.icon === icon ? 'text-neon-cyan' : 'text-muted-foreground'} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">Цвет</Label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button key={color} onClick={() => setForm(f => ({ ...f, color }))}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      form.color === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }} />
                ))}
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
            <AlertDialogTitle className="font-orbitron text-sm">Удалить категорию?</AlertDialogTitle>
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
