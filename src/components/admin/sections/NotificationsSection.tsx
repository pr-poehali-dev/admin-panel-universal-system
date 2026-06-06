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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';
import { notificationsService, type Notification } from '@/services/mockData';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const TYPE_MAP = {
  info:    { label: 'Инфо',     icon: 'Info',          color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/30' },
  warning: { label: 'Внимание', icon: 'AlertTriangle',  color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/30' },
  error:   { label: 'Ошибка',   icon: 'AlertCircle',    color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/30' },
  success: { label: 'Успех',    icon: 'CheckCircle2',   color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
};

const EMPTY: Omit<Notification, 'id'> = {
  userId: '1', title: '', message: '', type: 'info', isRead: false,
  createdAt: new Date().toLocaleString('ru'),
};

export default function NotificationsSection() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [showUnread, setShowUnread] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Notification, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = () => notificationsService.getAll().then(setNotifications);
  useEffect(load, []);

  const filtered = notifications.filter(n => {
    const matchType = filterType === 'all' || n.type === filterType;
    const matchUnread = !showUnread || !n.isRead;
    return matchType && matchUnread;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkRead = async (id: string) => {
    await notificationsService.markRead(id);
    load();
  };

  const handleMarkAll = async () => {
    await notificationsService.markAllRead();
    toast({ title: 'Все уведомления прочитаны' });
    load();
  };

  const handleSave = async () => {
    setSaving(true);
    await notificationsService.create(form);
    toast({ title: 'Уведомление создано' });
    setSaving(false); setDialogOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await notificationsService.delete(deleteId);
    toast({ title: 'Уведомление удалено', variant: 'destructive' });
    setDeleteId(null); load();
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(TYPE_MAP).map(([key, tm]) => {
          const count = notifications.filter(n => n.type === key).length;
          return (
            <Card key={key} className={`border ${tm.border} ${tm.bg} cursor-pointer transition-all hover:opacity-80`}
              onClick={() => setFilterType(filterType === key ? 'all' : key)}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name={tm.icon} size={15} className={tm.color} />
                  <span className="text-xs text-foreground">{tm.label}</span>
                </div>
                <span className={`font-mono font-bold text-lg ${tm.color}`}>{count}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={showUnread} onCheckedChange={setShowUnread} className="data-[state=checked]:bg-neon-cyan" />
            <Label className="text-sm text-foreground">Только непрочитанные</Label>
            {unreadCount > 0 && (
              <Badge className="bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30 text-xs">{unreadCount}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAll} className="border-border h-9 gap-2 text-sm">
              <Icon name="CheckCheck" size={14} /> Прочитать все
            </Button>
          )}
          <Button onClick={() => { setForm(EMPTY); setDialogOpen(true); }}
            className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2">
            <Icon name="Plus" size={15} /> Создать
          </Button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card className="border-border bg-card/40">
            <CardContent className="p-10 text-center text-muted-foreground font-mono text-sm">
              Нет уведомлений
            </CardContent>
          </Card>
        )}
        {filtered.map(notif => {
          const tm = TYPE_MAP[notif.type];
          return (
            <Card key={notif.id}
              className={cn(
                'border transition-all group',
                notif.isRead
                  ? 'border-border bg-card/40 opacity-70'
                  : `${tm.border} bg-card/70 shadow-sm`
              )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tm.bg} border ${tm.border}`}>
                    <Icon name={tm.icon} size={16} className={tm.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{notif.title}</span>
                      <Badge variant="outline" className={`text-xs ${tm.border} ${tm.color}`}>{tm.label}</Badge>
                      {!notif.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse-neon" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{notif.message}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1.5 font-mono">{notif.createdAt}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!notif.isRead && (
                      <Button variant="ghost" size="icon" onClick={() => handleMarkRead(notif.id)}
                        className="w-7 h-7 text-muted-foreground hover:text-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                        <Icon name="Check" size={13} />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(notif.id)}
                      className="w-7 h-7 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icon name="Trash2" size={13} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-sm">НОВОЕ УВЕДОМЛЕНИЕ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">Заголовок</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-input border-border text-sm h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">Сообщение</Label>
              <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="bg-input border-border text-sm min-h-20 resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">Тип</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as Notification['type'] }))}>
                <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {Object.entries(TYPE_MAP).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <div className="flex items-center gap-2">
                        <Icon name={v.icon} size={13} className={v.color} />
                        {v.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border">Отмена</Button>
            <Button onClick={handleSave} disabled={saving || !form.title} className="bg-neon-cyan text-background hover:bg-neon-cyan/90">
              {saving ? <Icon name="Loader2" size={14} className="animate-spin mr-1" /> : <Icon name="Send" size={14} className="mr-1" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-orbitron text-sm">Удалить уведомление?</AlertDialogTitle>
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
