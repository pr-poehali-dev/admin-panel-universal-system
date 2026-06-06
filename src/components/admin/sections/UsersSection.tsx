import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Icon from '@/components/ui/icon';
import { usersService, type User, type UserRole } from '@/services/mockData';
import { useToast } from '@/hooks/use-toast';

const ROLE_MAP: Record<UserRole, { label: string; color: string }> = {
  admin:   { label: 'Администратор', color: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10' },
  manager: { label: 'Менеджер',      color: 'text-violet-400 border-violet-400/30 bg-violet-400/10' },
  master:  { label: 'Мастер',        color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
};

const EMPTY: Omit<User, 'id'> = {
  name: '', email: '', phone: '', role: 'master', status: 'active',
  createdAt: new Date().toISOString().split('T')[0], lastLogin: '—', ordersCount: 0,
};

export default function UsersSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<User | null>(null);
  const [form, setForm] = useState<Omit<User, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = () => usersService.getAll().then(setUsers);
  useEffect(load, []);

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const openCreate = () => { setEditItem(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (u: User) => { setEditItem(u); setForm({ ...u }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    if (editItem) {
      await usersService.update(editItem.id, form);
      toast({ title: 'Пользователь обновлён' });
    } else {
      await usersService.create(form);
      toast({ title: 'Пользователь создан' });
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await usersService.delete(deleteId);
    toast({ title: 'Пользователь удалён', variant: 'destructive' });
    setDeleteId(null);
    load();
  };

  const toggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    await usersService.update(user.id, { status: newStatus });
    toast({ title: newStatus === 'active' ? 'Пользователь активирован' : 'Пользователь заблокирован' });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Поиск по имени или email..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 bg-input border-border text-sm" />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-40 h-9 bg-input border-border text-sm"><SelectValue placeholder="Все роли" /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Все роли</SelectItem>
              <SelectItem value="admin">Администратор</SelectItem>
              <SelectItem value="manager">Менеджер</SelectItem>
              <SelectItem value="master">Мастер</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2">
          <Icon name="UserPlus" size={15} />
          Добавить
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {(['admin', 'manager', 'master'] as UserRole[]).map(role => {
          const count = users.filter(u => u.role === role).length;
          const rm = ROLE_MAP[role];
          return (
            <Card key={role} className="border-border bg-card/40">
              <CardContent className="p-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{rm.label}</span>
                <Badge variant="outline" className={`text-sm font-mono font-bold ${rm.color}`}>{count}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border bg-card/60">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Пользователь</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Роль</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Телефон</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Последний вход</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground uppercase">Статус</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(user => {
              const rm = ROLE_MAP[user.role];
              const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2);
              return (
                <TableRow key={user.id} className="border-border hover:bg-neon-cyan/3 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8 border border-border">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-orbitron">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${rm.color}`}>{rm.label}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{user.phone}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{user.lastLogin}</TableCell>
                  <TableCell>
                    <Switch
                      checked={user.status === 'active'}
                      onCheckedChange={() => toggleStatus(user)}
                      className="data-[state=checked]:bg-neon-cyan"
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground">
                          <Icon name="MoreVertical" size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-card border-border" align="end">
                        <DropdownMenuItem onClick={() => openEdit(user)} className="gap-2 text-sm cursor-pointer">
                          <Icon name="Pencil" size={14} /> Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem onClick={() => setDeleteId(user.id)} className="gap-2 text-sm text-destructive cursor-pointer">
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
            <DialogTitle className="font-orbitron text-sm">{editItem ? 'РЕДАКТИРОВАТЬ' : 'НОВЫЙ ПОЛЬЗОВАТЕЛЬ'}</DialogTitle>
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
                <Label className="text-xs font-mono text-muted-foreground">Роль</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as UserRole }))}>
                  <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="admin">Администратор</SelectItem>
                    <SelectItem value="manager">Менеджер</SelectItem>
                    <SelectItem value="master">Мастер</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Статус</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as User['status'] }))}>
                  <SelectTrigger className="bg-input border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="active">Активен</SelectItem>
                    <SelectItem value="blocked">Заблокирован</SelectItem>
                  </SelectContent>
                </Select>
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
            <AlertDialogTitle className="font-orbitron text-sm">Удалить пользователя?</AlertDialogTitle>
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
