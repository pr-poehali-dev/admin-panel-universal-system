import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Icon from '@/components/ui/icon';
import { usersApi } from '@/services/api';
import type { User } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

// ─── Maps ──────────────────────────────────────────────────────────────────────

const ROLE_MAP: Record<User['role'], { label: string; color: string; iconName: string; border: string; bg: string }> = {
  admin:   { label: 'Администратор', color: 'text-neon-cyan',   iconName: 'ShieldCheck', border: 'border-neon-cyan/30',   bg: 'bg-neon-cyan/10' },
  manager: { label: 'Менеджер',      color: 'text-violet-400',  iconName: 'Briefcase',   border: 'border-violet-400/30',  bg: 'bg-violet-400/10' },
  master:  { label: 'Мастер',        color: 'text-emerald-400', iconName: 'Wrench',      border: 'border-emerald-400/30', bg: 'bg-emerald-400/10' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}

function timeAgo(s: string | null): string {
  if (!s) return 'Никогда';
  const diff = Date.now() - new Date(s).getTime();
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'Только что';
  if (h < 1) return `${m} мин назад`;
  if (d < 1) return `${h} ч назад`;
  if (d === 1) return 'Вчера';
  if (d < 30) return `${d} дн назад`;
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function exportCsv(users: User[]) {
  const h = ['ID', 'Имя', 'Email', 'Телефон', 'Роль', 'Статус', 'Заказов', 'Последний вход', 'Создан'];
  const rows = users.map(u => [
    u.id, u.name, u.email, u.phone,
    ROLE_MAP[u.role].label,
    u.status === 'active' ? 'Активен' : 'Заблокирован',
    u.orders_count,
    u.last_login ?? '—',
    u.created_at,
  ]);
  const csv = [h, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

// ─── Skeleton rows ─────────────────────────────────────────────────────────────

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="border-border">
          <TableCell><div className="flex items-center gap-2.5"><Skeleton className="w-8 h-8 rounded-full" /><div className="space-y-1"><Skeleton className="h-3 w-28" /><Skeleton className="h-2.5 w-36" /></div></div></TableCell>
          <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-3 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-3 w-16" /></TableCell>
          <TableCell><Skeleton className="h-3 w-10" /></TableCell>
          <TableCell><Skeleton className="h-6 w-6 rounded" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function UsersSection() {
  const [users,    setUsers]   = useState<User[]>([]);
  const [loading,  setLoading] = useState(true);
  const [search,   setSearch]  = useState('');
  const [fRole,    setFRole]   = useState('all');
  const [fStatus,  setFStatus] = useState('all');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving,   setSaving]  = useState(false);
  const [form,     setForm]    = useState<Partial<User>>({});
  const { toast } = useToast();

  const load = useCallback(async () => {
    const data = await usersApi.getAll();
    setUsers(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const filtered = useMemo(() => users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q);
    const matchRole   = fRole   === 'all' || u.role   === fRole;
    const matchStatus = fStatus === 'all' || u.status === fStatus;
    return matchSearch && matchRole && matchStatus;
  }), [users, search, fRole, fStatus]);

  const stats = useMemo(() => ({
    total:   users.length,
    admin:   users.filter(u => u.role === 'admin').length,
    manager: users.filter(u => u.role === 'manager').length,
    master:  users.filter(u => u.role === 'master').length,
  }), [users]);

  const recentLogins = useMemo(() =>
    [...users]
      .filter(u => u.last_login)
      .sort((a, b) => (b.last_login ?? '').localeCompare(a.last_login ?? ''))
      .slice(0, 5),
  [users]);

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: '', email: '', phone: '', role: 'master', status: 'active' });
    setEditOpen(true);
  };
  const openEdit = (u: User) => { setEditUser(u); setForm({ ...u }); setEditOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editUser) {
        await usersApi.update(editUser.id, form);
        toast({ title: 'Пользователь обновлён' });
      } else {
        await usersApi.create(form);
        toast({ title: 'Пользователь создан' });
      }
      setEditOpen(false);
      await load();
    } catch (e: unknown) {
      toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await usersApi.delete(deleteId);
      toast({ title: 'Пользователь удалён', variant: 'destructive' });
      setDeleteId(null);
      await load();
    } catch (e: unknown) {
      toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (u: User) => {
    const next: User['status'] = u.status === 'active' ? 'blocked' : 'active';
    await usersApi.patch(u.id, { status: next });
    await load();
  };

  const inp = 'bg-input border-border text-sm h-9';
  const lbl = 'text-[10px] font-mono text-muted-foreground uppercase tracking-wider';

  // ── Stat cards ───────────────────────────────────────────────────────────────
  const statCards = [
    { label: 'Всего пользователей', value: stats.total,   iconName: 'Users',       color: 'text-neon-cyan',   border: 'border-neon-cyan/25',   bg: 'bg-neon-cyan/10' },
    { label: 'Администраторы',      value: stats.admin,   iconName: 'ShieldCheck', color: 'text-neon-cyan',   border: 'border-neon-cyan/25',   bg: 'bg-neon-cyan/10' },
    { label: 'Менеджеры',           value: stats.manager, iconName: 'Briefcase',   color: 'text-violet-400',  border: 'border-violet-400/25',  bg: 'bg-violet-400/10' },
    { label: 'Мастера',             value: stats.master,  iconName: 'Wrench',      color: 'text-emerald-400', border: 'border-emerald-400/25', bg: 'bg-emerald-400/10' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Stats row ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border bg-card/60">
                <CardContent className="p-4 space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-14" /></CardContent>
              </Card>
            ))
          : statCards.map(c => (
              <Card key={c.label} className={`border ${c.border} bg-card/60 hover:bg-card transition-all`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <p className={lbl}>{c.label}</p>
                    <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center`}>
                      <Icon name={c.iconName} size={14} className={c.color} />
                    </div>
                  </div>
                  <p className={`text-3xl font-orbitron font-bold ${c.color} tabular-nums`}>{c.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-44 max-w-sm">
          <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Имя, email, телефон…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`pl-8 ${inp}`}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <Icon name="X" size={12} />
            </button>
          )}
        </div>

        <Select value={fRole} onValueChange={setFRole}>
          <SelectTrigger className={`w-40 ${inp}`}><SelectValue placeholder="Роль" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Все роли</SelectItem>
            {(Object.keys(ROLE_MAP) as User['role'][]).map(r => (
              <SelectItem key={r} value={r}>{ROLE_MAP[r].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className={`w-40 ${inp}`}><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="active">Активен</SelectItem>
            <SelectItem value="blocked">Заблокирован</SelectItem>
          </SelectContent>
        </Select>

        {(search || fRole !== 'all' || fStatus !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFRole('all'); setFStatus('all'); }}
            className="h-9 text-xs text-muted-foreground gap-1 px-2">
            <Icon name="FilterX" size={12} /> Сбросить
          </Button>
        )}

        <span className="text-[11px] font-mono text-muted-foreground ml-auto self-center">
          {filtered.length} / {users.length}
        </span>

        <Button variant="outline" size="sm" onClick={() => exportCsv(filtered)}
          className="border-border text-xs h-9 gap-1.5 text-muted-foreground hover:text-foreground">
          <Icon name="Download" size={13} /> CSV
        </Button>

        <Button onClick={openCreate} className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium">
          <Icon name="UserPlus" size={14} /> Добавить
        </Button>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────────── */}
      <Card className="border-border bg-card/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {['Пользователь', 'Роль', 'Телефон', 'Активен', 'Последний вход', 'Заказов', ''].map(h => (
                <TableHead key={h} className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows />
            ) : filtered.map(u => {
              const rm = ROLE_MAP[u.role];
              return (
                <TableRow key={u.id} className="border-border hover:bg-neon-cyan/[0.03] transition-colors">
                  {/* Name + email */}
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-8 h-8 border border-neon-cyan/20 flex-shrink-0">
                        <AvatarFallback className="bg-neon-cyan/10 text-neon-cyan font-orbitron text-[10px] font-bold">
                          {initials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate max-w-[160px]">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[160px]">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  {/* Role badge */}
                  <TableCell className="py-2.5">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${rm.border} ${rm.color} ${rm.bg} flex items-center gap-1 w-fit`}>
                      <Icon name={rm.iconName} size={9} />{rm.label}
                    </Badge>
                  </TableCell>
                  {/* Phone */}
                  <TableCell className="py-2.5 font-mono text-xs text-muted-foreground">{u.phone || '—'}</TableCell>
                  {/* Status switch */}
                  <TableCell className="py-2.5">
                    <Switch
                      checked={u.status === 'active'}
                      onCheckedChange={() => handleToggleStatus(u)}
                      className="scale-[0.8] origin-left"
                    />
                  </TableCell>
                  {/* Last login */}
                  <TableCell className="py-2.5">
                    <div>
                      <p className="text-xs text-foreground/80">{timeAgo(u.last_login)}</p>
                      {u.last_login && <p className="text-[10px] text-muted-foreground font-mono">{fmtDate(u.last_login)}</p>}
                    </div>
                  </TableCell>
                  {/* Orders count */}
                  <TableCell className="py-2.5 font-orbitron font-bold text-sm text-foreground tabular-nums">{u.orders_count}</TableCell>
                  {/* Actions */}
                  <TableCell className="py-2.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground">
                          <Icon name="MoreVertical" size={13} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-card border-border" align="end">
                        <DropdownMenuItem onClick={() => openEdit(u)} className="gap-2 text-xs cursor-pointer">
                          <Icon name="Pencil" size={13} /> Изменить
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem onClick={() => setDeleteId(u.id)} className="gap-2 text-xs text-destructive cursor-pointer focus:text-destructive">
                          <Icon name="Trash2" size={13} /> Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Icon name="SearchX" size={32} className="opacity-20" />
                    <p className="text-sm">Пользователи не найдены</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ── Role distribution ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
              <Icon name="PieChart" size={14} className="text-neon-cyan" /> РАСПРЕДЕЛЕНИЕ РОЛЕЙ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(Object.keys(ROLE_MAP) as User['role'][]).map(role => {
              const rm  = ROLE_MAP[role];
              const cnt = stats[role as keyof typeof stats] as number;
              const pct = stats.total > 0 ? Math.round((cnt / stats.total) * 100) : 0;
              return (
                <div key={role} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon name={rm.iconName} size={13} className={rm.color} />
                      <span className="text-sm text-foreground">{rm.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-orbitron font-bold text-sm text-foreground tabular-nums">{cnt}</span>
                      <span className={`text-xs font-mono ${rm.color}`}>{pct}%</span>
                    </div>
                  </div>
                  <Progress
                    value={pct}
                    className={`h-1.5 ${role === 'admin' ? '[&>div]:bg-neon-cyan' : role === 'manager' ? '[&>div]:bg-violet-400' : '[&>div]:bg-emerald-400'}`}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* ── Recent logins ──────────────────────────────────────────────────────── */}
        <Card className="border-border bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
              <Icon name="Activity" size={14} className="text-violet-400" /> ПОСЛЕДНИЕ ВХОДЫ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-1"><Skeleton className="h-3 w-24" /><Skeleton className="h-2.5 w-16" /></div>
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))
              : recentLogins.map(u => {
                  const rm = ROLE_MAP[u.role];
                  return (
                    <div key={u.id} className="flex items-center gap-3 py-1">
                      <Avatar className="w-8 h-8 border border-border flex-shrink-0">
                        <AvatarFallback className={`${rm.bg} ${rm.color} font-orbitron text-[10px] font-bold`}>
                          {initials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{u.name}</p>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border mt-0.5 ${rm.border} ${rm.color} ${rm.bg}`}>
                          {rm.label}
                        </Badge>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-foreground/80">{timeAgo(u.last_login)}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{fmtDate(u.last_login)}</p>
                      </div>
                    </div>
                  );
                })}
            {!loading && recentLogins.length === 0 && (
              <p className="text-xs text-muted-foreground/50 text-center py-4 italic">Нет данных о входах</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Edit / Create dialog ───────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={v => !v && setEditOpen(false)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="font-orbitron text-sm text-foreground">
              {editUser ? `РЕДАКТИРОВАТЬ — ${editUser.name}` : 'НОВЫЙ ПОЛЬЗОВАТЕЛЬ'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className={lbl}>ФИО *</Label>
              <Input
                value={form.name ?? ''}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Иванов Иван Иванович"
                className={inp}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={lbl}>Email</Label>
                <Input value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp} />
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>Телефон</Label>
                <Input value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inp} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={lbl}>Роль</Label>
                <Select value={form.role ?? 'master'} onValueChange={v => setForm(f => ({ ...f, role: v as User['role'] }))}>
                  <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {(Object.keys(ROLE_MAP) as User['role'][]).map(r => (
                      <SelectItem key={r} value={r}>{ROLE_MAP[r].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>Статус</Label>
                <Select value={form.status ?? 'active'} onValueChange={v => setForm(f => ({ ...f, status: v as User['status'] }))}>
                  <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="active">Активен</SelectItem>
                    <SelectItem value="blocked">Заблокирован</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/60 gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving} className="border-border h-9 text-sm">
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name?.trim()}
              className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium"
            >
              {saving && <Icon name="Loader2" size={13} className="animate-spin" />}
              {saving ? 'Сохранение…' : editUser ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ─────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-orbitron text-sm">Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">Действие необратимо.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-sm h-9">Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm h-9 gap-1.5">
              <Icon name="Trash2" size={13} /> Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
