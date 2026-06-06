import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Icon from '@/components/ui/icon';
import { statusesService, type OrderStatus } from '@/services/mockData';
import { useToast } from '@/hooks/use-toast';

const COLOR_OPTIONS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#6b7280', '#ec4899', '#06b6d4'];

const EMPTY: Omit<OrderStatus, 'id'> = {
  name: '', color: '#3b82f6', description: '', isTerminal: false, order: 1,
};

export default function StatusesSection() {
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<OrderStatus | null>(null);
  const [form, setForm] = useState<Omit<OrderStatus, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = () => statusesService.getAll().then(d => setStatuses(d.sort((a, b) => a.order - b.order)));
  useEffect(load, []);

  const openCreate = () => { setEditItem(null); setForm({ ...EMPTY, order: statuses.length + 1 }); setDialogOpen(true); };
  const openEdit = (s: OrderStatus) => { setEditItem(s); setForm({ ...s }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    if (editItem) { await statusesService.update(editItem.id, form); toast({ title: 'Статус обновлён' }); }
    else { await statusesService.create(form); toast({ title: 'Статус создан' }); }
    setSaving(false); setDialogOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await statusesService.delete(deleteId);
    toast({ title: 'Статус удалён', variant: 'destructive' });
    setDeleteId(null); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Настройте жизненный цикл заказа — этапы прохождения ремонта</p>
        <Button onClick={openCreate} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2">
          <Icon name="Plus" size={15} /> Добавить статус
        </Button>
      </div>

      {/* Flow visualization */}
      <div className="flex items-center gap-2 flex-wrap p-4 rounded-xl border border-border bg-muted/20">
        {statuses.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono"
              style={{ borderColor: s.color + '50', backgroundColor: s.color + '15', color: s.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </div>
            {i < statuses.length - 1 && <Icon name="ArrowRight" size={14} className="text-muted-foreground flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {statuses.map(status => (
          <Card key={status.id} className="border-border bg-card/60 hover:bg-card transition-all group">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: status.color,
                    boxShadow: `0 0 8px ${status.color}60` }} />
                  <div>
                    <p className="font-medium text-sm text-foreground">{status.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">Порядок: {status.order}</p>
                  </div>
                </div>
                {status.isTerminal && (
                  <Badge variant="outline" className="text-xs border-muted text-muted-foreground">Финал</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{status.description}</p>
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="outline" size="sm" onClick={() => openEdit(status)} className="flex-1 h-7 border-border text-xs gap-1">
                  <Icon name="Pencil" size={11} /> Изменить
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteId(status.id)} className="h-7 border-red-500/30 text-red-400 hover:bg-red-500/10 px-2">
                  <Icon name="Trash2" size={11} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-sm">{editItem ? 'РЕДАКТИРОВАТЬ СТАТУС' : 'НОВЫЙ СТАТУС'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Название</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-input border-border text-sm h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Порядок</Label>
                <Input type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: +e.target.value }))} className="bg-input border-border text-sm h-9 font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">Описание</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-input border-border text-sm min-h-16 resize-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">Цвет</Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map(color => (
                  <button key={color} onClick={() => setForm(f => ({ ...f, color }))}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${form.color === color ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isTerminal} onCheckedChange={v => setForm(f => ({ ...f, isTerminal: v }))} className="data-[state=checked]:bg-neon-cyan" />
              <Label className="text-sm text-foreground">Финальный статус (завершает заказ)</Label>
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
            <AlertDialogTitle className="font-orbitron text-sm">Удалить статус?</AlertDialogTitle>
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
