import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Icon from '@/components/ui/icon';
import { partsService, categoriesService, type Part, type Category } from '@/services/mockData';
import { useToast } from '@/hooks/use-toast';

const EMPTY: Omit<Part, 'id'> = {
  name: '', article: '', categoryId: '1', brand: '',
  quantity: 0, minQuantity: 1, price: 0, supplier: '', location: '',
};

export default function PartsSection() {
  const [parts, setParts] = useState<Part[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Part | null>(null);
  const [form, setForm] = useState<Omit<Part, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = () => { partsService.getAll().then(setParts); categoriesService.getAll().then(setCategories); };
  useEffect(load, []);

  const getCatName = (id: string) => categories.find(c => c.id === id)?.name ?? '—';

  const filtered = parts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.article.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = parts.filter(p => p.quantity <= p.minQuantity);

  const openCreate = () => { setEditItem(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (p: Part) => { setEditItem(p); setForm({ ...p }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    if (editItem) { await partsService.update(editItem.id, form); toast({ title: 'Запчасть обновлена' }); }
    else { await partsService.create(form); toast({ title: 'Запчасть добавлена' }); }
    setSaving(false); setDialogOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await partsService.delete(deleteId);
    toast({ title: 'Запчасть удалена', variant: 'destructive' });
    setDeleteId(null); load();
  };

  return (
    <div className="space-y-4">
      {lowStock.length > 0 && (
        <Alert className="border-orange-500/30 bg-orange-500/5">
          <Icon name="AlertTriangle" size={16} className="text-orange-400" />
          <AlertDescription className="text-orange-300 text-sm">
            <span className="font-bold">{lowStock.length} позиции</span> на складе требуют пополнения: {lowStock.map(p => p.name).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Поиск по названию, артикулу..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 bg-input border-border text-sm" />
        </div>
        <Button onClick={openCreate} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2">
          <Icon name="Plus" size={15} /> Добавить
        </Button>
      </div>

      <Card className="border-border bg-card/60">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Наименование</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Артикул</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Кол-во</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Цена</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Локация</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(part => {
              const isLow = part.quantity <= part.minQuantity;
              return (
                <TableRow key={part.id} className="border-border hover:bg-neon-cyan/3 transition-colors">
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-foreground">{part.name}</p>
                      <p className="text-xs text-muted-foreground">{part.brand} • {getCatName(part.categoryId)}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-neon-cyan/70">{part.article}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono font-bold text-sm ${isLow ? 'text-orange-400' : 'text-foreground'}`}>{part.quantity}</span>
                      <span className="text-xs text-muted-foreground">/ мин {part.minQuantity}</span>
                      {isLow && <Icon name="AlertTriangle" size={12} className="text-orange-400" />}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{part.price.toLocaleString('ru')} ₽</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs border-border text-muted-foreground font-mono">{part.location}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground">
                          <Icon name="MoreVertical" size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-card border-border" align="end">
                        <DropdownMenuItem onClick={() => openEdit(part)} className="gap-2 text-sm cursor-pointer">
                          <Icon name="Pencil" size={14} /> Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem onClick={() => setDeleteId(part.id)} className="gap-2 text-sm text-destructive cursor-pointer">
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
            <DialogTitle className="font-orbitron text-sm">{editItem ? 'РЕДАКТИРОВАТЬ ЗАПЧАСТЬ' : 'НОВАЯ ЗАПЧАСТЬ'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">Наименование</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-input border-border text-sm h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Артикул</Label>
                <Input value={form.article} onChange={e => setForm(f => ({ ...f, article: e.target.value }))} className="bg-input border-border text-sm h-9 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Производитель</Label>
                <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} className="bg-input border-border text-sm h-9" />
              </div>
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
                <Label className="text-xs font-mono text-muted-foreground">Кол-во</Label>
                <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} className="bg-input border-border text-sm h-9 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Мин. кол-во</Label>
                <Input type="number" value={form.minQuantity} onChange={e => setForm(f => ({ ...f, minQuantity: +e.target.value }))} className="bg-input border-border text-sm h-9 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Цена, ₽</Label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} className="bg-input border-border text-sm h-9 font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Поставщик</Label>
                <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="bg-input border-border text-sm h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Локация</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="bg-input border-border text-sm h-9 font-mono" placeholder="A-01-01" />
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
            <AlertDialogTitle className="font-orbitron text-sm">Удалить запчасть?</AlertDialogTitle>
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
