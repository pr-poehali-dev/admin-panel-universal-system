import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import Icon from '@/components/ui/icon';
import { notificationsApi, type Notification } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const TYPE_MAP = {
  info:    { label: 'Инфо',     icon: 'Info',          color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/30' },
  warning: { label: 'Внимание', icon: 'AlertTriangle',  color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/30' },
  error:   { label: 'Ошибка',   icon: 'AlertCircle',    color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/30' },
  success: { label: 'Успех',    icon: 'CheckCircle2',   color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
} as const;

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff/60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff/3600)} ч назад`;
  return d.toLocaleDateString('ru');
}

function groupByDate(items: Notification[]) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: Record<string, Notification[]> = { Сегодня: [], Вчера: [], Ранее: [] };
  items.forEach(n => {
    const d = new Date(n.created_at).toDateString();
    if (d === today) groups['Сегодня'].push(n);
    else if (d === yesterday) groups['Вчера'].push(n);
    else groups['Ранее'].push(n);
  });
  return Object.entries(groups).filter(([,v]) => v.length > 0);
}

const EMPTY = { title: '', message: '', type: 'info' as Notification['type'] };

export default function NotificationsSection() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [showUnread, setShowUnread] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    notificationsApi.getAll().then(data => { setNotifications(data); setLoading(false); });
  };
  useEffect(load, []);

  const filtered = useMemo(() => notifications.filter(n => {
    const matchType = filterType === 'all' || n.type === filterType;
    const matchUnread = !showUnread || !n.is_read;
    return matchType && matchUnread;
  }), [notifications, filterType, showUnread]);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const handleMarkRead = async (id: number) => {
    await notificationsApi.markRead(id);
    toast({ title: 'Уведомление прочитано' });
    load();
  };

  const handleMarkAll = async () => {
    await notificationsApi.markAllRead();
    toast({ title: 'Все уведомления прочитаны' });
    load();
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await notificationsApi.create({ title: form.title, message: form.message, type: form.type, is_read: false });
    toast({ title: 'Уведомление создано' });
    setSaving(false); setDialogOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await notificationsApi.delete(deleteId);
    toast({ title: 'Уведомление удалено', variant: 'destructive' });
    setDeleteId(null); load();
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? [...Array(4)].map((_,i) => <Skeleton key={i} className="h-16 rounded-xl"/>) :
          (Object.entries(TYPE_MAP) as [keyof typeof TYPE_MAP, typeof TYPE_MAP[keyof typeof TYPE_MAP]][]).map(([key, tm]) => {
          const count = notifications.filter(n => n.type === key).length;
          return (
            <Card key={key} className={`border ${tm.border} ${tm.bg} cursor-pointer transition-all hover:opacity-80`}
              onClick={() => setFilterType(filterType === key ? 'all' : key)}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name={tm.icon} size={15} className={tm.color} />
                  <span className="text-xs text-foreground">{tm.label}</span>
                </div>
                <span className={`font-orbitron font-bold text-lg ${tm.color}`}>{count}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Unread banner */}
      {unreadCount > 0 && (
        <Card className="border-neon-cyan/30 bg-neon-cyan/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neon-cyan/20 border border-neon-cyan/30 flex items-center justify-center">
                <Icon name="Bell" size={16} className="text-neon-cyan animate-pulse-neon" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  <span className="font-orbitron text-neon-cyan">{unreadCount}</span> непрочитанных уведомлений
                </p>
                <p className="text-xs text-muted-foreground">Нажмите чтобы отметить все прочитанными</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleMarkAll} className="border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 gap-2 h-9">
              <Icon name="CheckCheck" size={14} /> Прочитать все
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {[{ key: 'all', label: 'Все' }, ...Object.entries(TYPE_MAP).map(([k,v]) => ({ key: k, label: v.label }))].map(f => (
            <Button key={f.key} size="sm" variant={filterType === f.key ? 'default' : 'outline'}
              onClick={() => setFilterType(f.key)}
              className={cn('h-8 text-xs', filterType === f.key ? 'bg-neon-cyan text-background' : 'border-border text-muted-foreground')}>
              {f.label}
              <Badge className="ml-1.5 bg-white/20 text-inherit text-xs px-1 h-4">
                {f.key === 'all' ? notifications.length : notifications.filter(n => n.type === f.key).length}
              </Badge>
            </Button>
          ))}
          <Separator orientation="vertical" className="h-6 bg-border" />
          <div className="flex items-center gap-2">
            <Switch checked={showUnread} onCheckedChange={setShowUnread} className="data-[state=checked]:bg-neon-cyan" />
            <Label className="text-sm text-foreground text-nowrap">Непрочитанные</Label>
          </div>
        </div>
        <Button onClick={() => { setForm({ ...EMPTY }); setDialogOpen(true); }}
          className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2">
          <Icon name="Plus" size={15} /> Создать
        </Button>
      </div>

      {/* Notification list grouped */}
      <ScrollArea className="max-h-[600px]">
        <div className="space-y-4 pr-1">
          {loading ? [...Array(3)].map((_,i) => <Skeleton key={i} className="h-20 rounded-xl"/>) :
            grouped.length === 0 ? (
              <Card className="border-border bg-card/40">
                <CardContent className="p-10 text-center text-muted-foreground font-mono text-sm">
                  Нет уведомлений
                </CardContent>
              </Card>
            ) : (
              grouped.map(([dateGroup, items]) => (
                <div key={dateGroup}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{dateGroup}</span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map(notif => {
                      const tm = TYPE_MAP[notif.type];
                      return (
                        <Card key={notif.id} className={cn(
                          'border transition-all group',
                          notif.is_read ? 'border-border bg-card/40 opacity-70' : `${tm.border} bg-card/70 shadow-sm`
                        )}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tm.bg} border ${tm.border}`}>
                                <Icon name={tm.icon} size={16} className={tm.color} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-sm font-medium text-foreground">{notif.title}</span>
                                  <Badge variant="outline" className={`text-xs ${tm.border} ${tm.color}`}>{tm.label}</Badge>
                                  {!notif.is_read && <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse-neon" />}
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">{notif.message}</p>
                                <p className="text-xs text-muted-foreground/60 mt-1.5 font-mono">{timeAgo(notif.created_at)}</p>
                              </div>
                              <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notif.is_read && (
                                  <Button variant="ghost" size="icon" onClick={() => handleMarkRead(notif.id)}
                                    className="w-7 h-7 text-muted-foreground hover:text-neon-cyan">
                                    <Icon name="Check" size={13} />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => setDeleteId(notif.id)}
                                  className="w-7 h-7 text-muted-foreground hover:text-red-400">
                                  <Icon name="Trash2" size={13} />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))
            )
          }
        </div>
      </ScrollArea>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-sm">НОВОЕ УВЕДОМЛЕНИЕ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">Тип</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as Notification['type'] }))}>
                <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {(Object.entries(TYPE_MAP) as [keyof typeof TYPE_MAP, typeof TYPE_MAP[keyof typeof TYPE_MAP]][]).map(([k,v]) => (
                    <SelectItem key={k} value={k}>
                      <div className="flex items-center gap-2">
                        <Icon name={v.icon} size={13} className={v.color} />{v.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">Заголовок</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-input border-border text-sm h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">Сообщение</Label>
              <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="bg-input border-border text-sm min-h-20 resize-none" />
            </div>
            {/* Preview */}
            {form.title && (
              <div className={`p-3 rounded-lg border ${TYPE_MAP[form.type].border} ${TYPE_MAP[form.type].bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon name={TYPE_MAP[form.type].icon} size={14} className={TYPE_MAP[form.type].color} />
                  <span className={`text-sm font-medium ${TYPE_MAP[form.type].color}`}>{form.title}</span>
                </div>
                {form.message && <p className="text-xs text-muted-foreground">{form.message}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border">Отмена</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()} className="bg-neon-cyan text-background hover:bg-neon-cyan/90">
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
