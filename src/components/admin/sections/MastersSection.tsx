import { useEffect, useState, useMemo, useCallback, useRef, KeyboardEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import Icon from '@/components/ui/icon';
import { mastersApi } from '@/services/api';
import type { Master, Order } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

// ─── Static maps ───────────────────────────────────────────────────────────────

const STATUS_MAP: Record<Master['status'], { label: string; color: string; dot: string }> = {
  available: { label: 'Свободен', color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10', dot: 'bg-emerald-400' },
  busy:      { label: 'Занят',    color: 'text-orange-400 border-orange-400/30 bg-orange-400/10',   dot: 'bg-orange-400' },
  vacation:  { label: 'Отпуск',  color: 'text-slate-400 border-slate-400/30 bg-slate-400/10',      dot: 'bg-slate-400' },
};

const LEVEL_MAP: Record<Master['level'], { label: string; color: string; border: string; bg: string }> = {
  junior: { label: 'Junior', color: 'text-blue-400',   border: 'border-blue-400/30',   bg: 'bg-blue-400/10' },
  middle: { label: 'Middle', color: 'text-violet-400', border: 'border-violet-400/30', bg: 'bg-violet-400/10' },
  senior: { label: 'Senior', color: 'text-neon-cyan',  border: 'border-neon-cyan/30',  bg: 'bg-neon-cyan/10' },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Срочный', color: 'text-red-400 border-red-400/30 bg-red-400/10' },
  high:   { label: 'Высокий', color: 'text-orange-400 border-orange-400/30 bg-orange-400/10' },
  normal: { label: 'Обычный', color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
  low:    { label: 'Низкий',  color: 'text-muted-foreground border-border bg-muted/20' },
};

const chartConfig = {
  completed_orders: { label: 'Заказов выполнено', color: 'hsl(185 100% 50%)' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtMoney(n: number) {
  return n.toLocaleString('ru-RU') + ' ₽';
}

// ─── Star renderer ─────────────────────────────────────────────────────────────

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < Math.floor(rating);
        const half   = !filled && i < rating;
        return (
          <Icon
            key={i}
            name="Star"
            size={size}
            className={
              filled ? 'text-yellow-400 fill-yellow-400/80'
              : half  ? 'text-yellow-400 fill-yellow-400/30'
              : 'text-muted-foreground/30'
            }
          />
        );
      })}
    </span>
  );
}

// ─── Avatar tile ───────────────────────────────────────────────────────────────

function MasterAvatar({ master, size = 'md' }: { master: Master; size?: 'sm' | 'md' | 'lg' }) {
  const lv = LEVEL_MAP[master.level];
  const dim = size === 'lg' ? 'w-16 h-16' : size === 'sm' ? 'w-8 h-8' : 'w-11 h-11';
  const txt = size === 'lg' ? 'text-base' : size === 'sm' ? 'text-[10px]' : 'text-sm';
  return (
    <Avatar className={`${dim} border ${lv.border} flex-shrink-0`}>
      <AvatarFallback className={`${lv.bg} ${lv.color} font-orbitron font-bold ${txt}`}>
        {initials(master.name)}
      </AvatarFallback>
    </Avatar>
  );
}

// ─── Detail Sheet ──────────────────────────────────────────────────────────────

interface DetailSheetProps {
  master: Master | null;
  open: boolean;
  onClose: () => void;
  onEdit: (m: Master) => void;
}

function DetailSheet({ master, open, onClose, onEdit }: DetailSheetProps) {
  const [detail, setDetail] = useState<Master | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!open || !master) { setDetail(null); return; }
    setLoadingDetail(true);
    mastersApi.getById(master.id)
      .then(setDetail)
      .catch(() => setDetail(master))
      .finally(() => setLoadingDetail(false));
  }, [open, master]);

  const m = detail ?? master;
  if (!m) return null;

  const lv = LEVEL_MAP[m.level];
  const st = STATUS_MAP[m.status];
  const recentOrders: Order[] = m.recent_orders ?? [];

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg bg-card border-l border-neon-cyan/15 p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-5 border-b border-border/60">
          <div className="flex items-start gap-4 pr-8">
            <MasterAvatar master={m} size="lg" />
            <div className="flex-1 min-w-0">
              <SheetTitle className="font-orbitron text-base text-foreground leading-tight mb-1">
                {m.name}
              </SheetTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs border ${lv.border} ${lv.color} ${lv.bg}`}>
                  {lv.label}
                </Badge>
                <Badge variant="outline" className={`text-xs border ${st.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot} mr-1.5 inline-block`} />
                  {st.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Stars rating={m.rating} size={13} />
                <span className="font-mono text-sm font-bold text-yellow-400">{m.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-5">

            {/* Contact */}
            <div className="space-y-2">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Контакты</p>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Icon name="Mail" size={13} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground/80 truncate">{m.email || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Icon name="Phone" size={13} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground/80">{m.phone || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Icon name="Calendar" size={13} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground/80">В команде с {fmtDate(m.joined_at)}</span>
                </div>
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-neon-cyan/15 bg-neon-cyan/5 p-3 text-center">
                <p className="font-orbitron font-bold text-2xl text-neon-cyan tabular-nums">{m.completed_orders}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">выполнено заказов</p>
              </div>
              <div className="rounded-lg border border-violet-400/15 bg-violet-400/5 p-3 text-center">
                <p className="font-orbitron font-bold text-2xl text-violet-400 tabular-nums">{m.active_orders ?? 0}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">активных сейчас</p>
              </div>
            </div>

            {/* Rating bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-mono">Рейтинг</span>
                <span className="font-mono font-bold text-yellow-400">{m.rating.toFixed(1)} / 5.0</span>
              </div>
              <Progress value={(m.rating / 5) * 100} className="h-2 [&>div]:bg-yellow-400" />
            </div>

            {/* Specializations */}
            {m.specialization.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Специализации</p>
                <div className="flex flex-wrap gap-1.5">
                  {m.specialization.map(s => (
                    <Badge key={s} variant="outline" className="text-xs border-border text-muted-foreground">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Bio */}
            {m.bio && (
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">О мастере</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{m.bio}</p>
              </div>
            )}

            <Separator className="bg-border/50" />

            {/* Recent orders */}
            <div className="space-y-2">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                Последние заказы
                {loadingDetail && <Icon name="Loader2" size={10} className="animate-spin" />}
              </p>
              {recentOrders.length === 0 && !loadingDetail ? (
                <p className="text-xs text-muted-foreground/50 italic">Нет данных о заказах</p>
              ) : (
                <div className="space-y-2">
                  {recentOrders.slice(0, 5).map(order => {
                    const prio = PRIORITY_MAP[order.priority] ?? PRIORITY_MAP.normal;
                    return (
                      <div key={order.id}
                        className="flex items-start justify-between p-2.5 rounded-lg border border-border/50 bg-muted/10 gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-[10px] text-neon-cyan/70">{order.number}</span>
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 border leading-tight ${prio.color}`}>
                              {prio.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-foreground truncate">{order.client_name}</p>
                          {order.diagnosis && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{order.diagnosis}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-mono text-xs font-medium text-foreground">{fmtMoney(order.total_price)}</p>
                          {order.status_name && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{order.status_name}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer action */}
        <div className="px-6 py-4 border-t border-border/60">
          <Button
            onClick={() => { onClose(); onEdit(m); }}
            className="w-full bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium"
          >
            <Icon name="Pencil" size={13} /> Редактировать мастера
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Specialization tag input ──────────────────────────────────────────────────

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput('');
  };

  const remove = (tag: string) => onChange(tags.filter(t => t !== tag));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
    if (e.key === 'Backspace' && !input && tags.length) remove(tags[tags.length - 1]);
  };

  return (
    <div
      className="min-h-9 flex flex-wrap gap-1.5 items-center px-3 py-1.5 rounded-md border border-input bg-input cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map(tag => (
        <span key={tag}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan text-xs font-mono">
          {tag}
          <button type="button" onClick={e => { e.stopPropagation(); remove(tag); }}
            className="text-neon-cyan/50 hover:text-neon-cyan leading-none">
            <Icon name="X" size={9} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
        placeholder={tags.length === 0 ? 'Введите специализацию, Enter — добавить…' : ''}
        className="flex-1 min-w-24 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 text-foreground"
      />
    </div>
  );
}

// ─── Live star rating input ────────────────────────────────────────────────────

function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value;
  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <button
            key={i} type="button"
            onClick={() => onChange(i + 1)}
            onMouseEnter={() => setHovered(i + 1)}
            onMouseLeave={() => setHovered(null)}
            className="transition-transform hover:scale-125"
          >
            <Icon
              name="Star"
              size={20}
              className={i < display ? 'text-yellow-400 fill-yellow-400/80' : 'text-muted-foreground/25'}
            />
          </button>
        ))}
      </span>
      <Input
        type="number" min={0} max={5} step={0.1}
        value={value}
        onChange={e => onChange(Math.min(5, Math.max(0, parseFloat(e.target.value) || 0)))}
        className="w-20 h-8 bg-input border-border text-sm text-center font-mono"
      />
    </div>
  );
}

// ─── Create / Edit dialog ──────────────────────────────────────────────────────

interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Master>) => Promise<void>;
  master: Master | null;
  saving: boolean;
}

function EditDialog({ open, onClose, onSave, master, saving }: EditDialogProps) {
  const EMPTY: Partial<Master> = {
    name: '', email: '', phone: '', level: 'junior', status: 'available',
    rating: 5.0, completed_orders: 0, specialization: [],
    joined_at: new Date().toISOString().split('T')[0], bio: null,
  };

  const [form, setForm] = useState<Partial<Master>>(EMPTY);

  useEffect(() => {
    if (open) setForm(master ? { ...master } : EMPTY);
  }, [open, master]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Master>(k: K, v: Master[K]) => setForm(f => ({ ...f, [k]: v }));
  const str = (k: keyof Master) => String(form[k] ?? '');
  const lbl = 'text-[10px] font-mono text-muted-foreground uppercase tracking-wider';
  const inp = 'bg-input border-border text-sm h-9';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle className="font-orbitron text-sm text-foreground">
            {master ? `РЕДАКТИРОВАТЬ — ${master.name}` : 'НОВЫЙ МАСТЕР'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-5">

            {/* Name */}
            <div className="space-y-1.5">
              <Label className={lbl}>ФИО *</Label>
              <Input value={str('name')} onChange={e => set('name', e.target.value)}
                placeholder="Иванов Иван Иванович" className={inp} />
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={lbl}>Email</Label>
                <Input value={str('email')} onChange={e => set('email', e.target.value)}
                  placeholder="master@mail.ru" className={inp} />
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>Телефон</Label>
                <Input value={str('phone')} onChange={e => set('phone', e.target.value)}
                  placeholder="+7 (000) 000-00-00" className={inp} />
              </div>
            </div>

            {/* Level + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={lbl}>Уровень</Label>
                <Select value={str('level') || 'junior'}
                  onValueChange={v => set('level', v as Master['level'])}>
                  <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="junior">
                      <span className="text-blue-400 font-mono font-bold">Junior</span>
                    </SelectItem>
                    <SelectItem value="middle">
                      <span className="text-violet-400 font-mono font-bold">Middle</span>
                    </SelectItem>
                    <SelectItem value="senior">
                      <span className="text-neon-cyan font-mono font-bold">Senior</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>Статус</Label>
                <Select value={str('status') || 'available'}
                  onValueChange={v => set('status', v as Master['status'])}>
                  <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="available">Свободен</SelectItem>
                    <SelectItem value="busy">Занят</SelectItem>
                    <SelectItem value="vacation">В отпуске</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rating */}
            <div className="space-y-1.5">
              <Label className={lbl}>Рейтинг</Label>
              <RatingInput
                value={Number(form.rating ?? 5)}
                onChange={v => set('rating', v)}
              />
            </div>

            {/* Joined + Completed */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={lbl}>Дата в команде</Label>
                <Input type="date" value={str('joined_at').split('T')[0]}
                  onChange={e => set('joined_at', e.target.value)} className={inp} />
              </div>
              <div className="space-y-1.5">
                <Label className={lbl}>Выполнено заказов</Label>
                <Input type="number" min={0}
                  value={Number(form.completed_orders ?? 0)}
                  onChange={e => set('completed_orders', Number(e.target.value))} className={inp} />
              </div>
            </div>

            {/* Specialization tags */}
            <div className="space-y-1.5">
              <Label className={lbl}>Специализации</Label>
              <TagInput
                tags={Array.isArray(form.specialization) ? form.specialization : []}
                onChange={tags => set('specialization', tags)}
              />
              <p className="text-[10px] text-muted-foreground/60">
                Enter для добавления · Backspace для удаления последнего
              </p>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <Label className={lbl}>О мастере (bio)</Label>
              <Textarea
                value={str('bio')}
                onChange={e => set('bio', e.target.value || null)}
                rows={3}
                placeholder="Краткое описание, опыт, достижения…"
                className="bg-input border-border text-sm resize-none"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border/60 gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}
            className="border-border h-9 text-sm">
            Отмена
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={saving || !form.name?.trim()}
            className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium"
          >
            {saving && <Icon name="Loader2" size={13} className="animate-spin" />}
            {saving ? 'Сохранение…' : master ? 'Сохранить' : 'Создать мастера'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

type SortKey = 'name' | 'level' | 'status' | 'rating' | 'completed_orders' | 'joined_at';
type SortDir = 'asc' | 'desc';

export default function MastersSection() {
  const [masters, setMasters]       = useState<Master[]>([]);
  const [loading, setLoading]       = useState(true);

  // filters
  const [search,        setSearch]        = useState('');
  const [filterLevel,   setFilterLevel]   = useState<'all' | Master['level']>('all');
  const [filterStatus,  setFilterStatus]  = useState<'all' | Master['status']>('all');

  // table sort
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // sheet / dialog
  const [sheetMaster, setSheetMaster] = useState<Master | null>(null);
  const [sheetOpen,   setSheetOpen]   = useState(false);
  const [editMaster,  setEditMaster]  = useState<Master | null>(null);
  const [editOpen,    setEditOpen]    = useState(false);
  const [deleteId,    setDeleteId]    = useState<number | null>(null);
  const [saving,      setSaving]      = useState(false);

  const { toast } = useToast();

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(() => {
    return mastersApi.getAll().then(setMasters);
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  // ── Filtered + sorted list ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return masters.filter(m => {
      const matchSearch = !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.specialization.some(s => s.toLowerCase().includes(q));
      const matchLevel  = filterLevel  === 'all' || m.level  === filterLevel;
      const matchStatus = filterStatus === 'all' || m.status === filterStatus;
      return matchSearch && matchLevel && matchStatus;
    });
  }, [masters, search, filterLevel, filterStatus]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number = a[sortKey] as string | number;
      let bv: string | number = b[sortKey] as string | number;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  // ── Analytics ─────────────────────────────────────────────────────────────

  const analytics = useMemo(() => {
    const total     = masters.length;
    const available = masters.filter(m => m.status === 'available').length;
    const busy      = masters.filter(m => m.status === 'busy').length;
    const vacation  = masters.filter(m => m.status === 'vacation').length;
    const junior    = masters.filter(m => m.level === 'junior').length;
    const middle    = masters.filter(m => m.level === 'middle').length;
    const senior    = masters.filter(m => m.level === 'senior').length;
    const maxOrders = masters.reduce((mx, m) => Math.max(mx, m.completed_orders), 0);
    const avgRating = total > 0
      ? (masters.reduce((s, m) => s + m.rating, 0) / total).toFixed(2)
      : '0.00';

    const chartData = [...masters]
      .sort((a, b) => b.completed_orders - a.completed_orders)
      .slice(0, 10)
      .map(m => ({
        name:             m.name.split(' ')[0] + (m.name.split(' ')[1] ? ' ' + m.name.split(' ')[1][0] + '.' : ''),
        completed_orders: m.completed_orders,
        level:            m.level,
      }));

    return { total, available, busy, vacation, junior, middle, senior, maxOrders, avgRating, chartData };
  }, [masters]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openDetail = (m: Master) => { setSheetMaster(m); setSheetOpen(true); };
  const openCreate = () => { setEditMaster(null); setEditOpen(true); };
  const openEdit   = (m: Master) => { setEditMaster(m); setEditOpen(true); };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleSave = async (data: Partial<Master>) => {
    setSaving(true);
    try {
      if (editMaster) {
        await mastersApi.update(editMaster.id, data);
        toast({ title: 'Мастер обновлён', description: data.name });
      } else {
        await mastersApi.create(data);
        toast({ title: 'Мастер добавлен', description: data.name });
      }
      setEditOpen(false);
      await load();
    } catch (e: unknown) {
      toast({ title: 'Ошибка', description: (e as Error)?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await mastersApi.delete(deleteId);
      toast({ title: 'Мастер удалён', variant: 'destructive' });
      setDeleteId(null);
      await load();
    } catch (e: unknown) {
      toast({ title: 'Ошибка', description: (e as Error)?.message, variant: 'destructive' });
    }
  };

  // ── Sort indicator helper ─────────────────────────────────────────────────

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? null : (
      <Icon name={sortDir === 'asc' ? 'ChevronUp' : 'ChevronDown'} size={11} className="ml-1 inline" />
    );

  const thClass = 'font-mono text-[10px] text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors';

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-36 ml-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border bg-card/60">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-11 h-11 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <div className="flex gap-1">
                  {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-5 w-14 rounded-full" />)}
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-40 max-w-sm">
            <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Имя, email, специализация…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 bg-input border-border text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <Icon name="X" size={12} />
              </button>
            )}
          </div>

          <Select value={filterLevel} onValueChange={v => setFilterLevel(v as typeof filterLevel)}>
            <SelectTrigger className="w-36 h-9 bg-input border-border text-sm"><SelectValue placeholder="Уровень" /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Все уровни</SelectItem>
              <SelectItem value="junior"><span className="text-blue-400 font-mono">Junior</span></SelectItem>
              <SelectItem value="middle"><span className="text-violet-400 font-mono">Middle</span></SelectItem>
              <SelectItem value="senior"><span className="text-neon-cyan font-mono">Senior</span></SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={v => setFilterStatus(v as typeof filterStatus)}>
            <SelectTrigger className="w-36 h-9 bg-input border-border text-sm"><SelectValue placeholder="Статус" /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="available">Свободен</SelectItem>
              <SelectItem value="busy">Занят</SelectItem>
              <SelectItem value="vacation">В отпуске</SelectItem>
            </SelectContent>
          </Select>

          {(search || filterLevel !== 'all' || filterStatus !== 'all') && (
            <Button variant="ghost" size="sm"
              onClick={() => { setSearch(''); setFilterLevel('all'); setFilterStatus('all'); }}
              className="h-9 text-xs text-muted-foreground gap-1 px-2">
              <Icon name="FilterX" size={12} /> Сбросить
            </Button>
          )}

          <span className="text-[11px] font-mono text-muted-foreground self-center ml-1">
            {filtered.length} / {masters.length}
          </span>
        </div>

        <Button onClick={openCreate}
          className="bg-neon-cyan text-background hover:bg-neon-cyan/90 h-9 gap-2 text-sm font-medium flex-shrink-0">
          <Icon name="UserPlus" size={14} /> Добавить мастера
        </Button>
      </div>

      {/* ═══ TABS ═══════════════════════════════════════════════════════════ */}
      <Tabs defaultValue="cards" className="space-y-4">
        <TabsList className="bg-muted h-9">
          <TabsTrigger value="cards"     className="text-xs gap-1.5">
            <Icon name="LayoutGrid" size={12} /> Карточки
          </TabsTrigger>
          <TabsTrigger value="table"     className="text-xs gap-1.5">
            <Icon name="TableProperties" size={12} /> Таблица
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs gap-1.5">
            <Icon name="BarChart3" size={12} /> Аналитика
          </TabsTrigger>
        </TabsList>

        {/* ─────────────── TAB 1: КАРТОЧКИ ─────────────── */}
        <TabsContent value="cards" className="mt-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Icon name="UserX" size={40} className="opacity-20" />
              <p className="text-sm">Мастера не найдены</p>
              <p className="text-xs opacity-60">Измените параметры поиска или добавьте нового мастера</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(master => {
                const st = STATUS_MAP[master.status];
                const lv = LEVEL_MAP[master.level];
                return (
                  <Card
                    key={master.id}
                    onClick={() => openDetail(master)}
                    className={`border bg-card/60 hover:bg-card cursor-pointer transition-all duration-200 group hover:border-neon-cyan/20 hover:shadow-lg hover:shadow-neon-cyan/5 border-l-2 ${lv.border}`}
                  >
                    <CardContent className="p-5">
                      {/* Top row */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <MasterAvatar master={master} />
                          <div>
                            <p className="font-medium text-sm text-foreground leading-tight">{master.name}</p>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border mt-1 ${lv.border} ${lv.color} ${lv.bg}`}>
                              {lv.label}
                            </Badge>
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-xs border flex items-center gap-1.5 ${st.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </Badge>
                      </div>

                      {/* Contact */}
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Icon name="Mail" size={11} className="flex-shrink-0" />
                          <span className="truncate">{master.email || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Icon name="Phone" size={11} className="flex-shrink-0" />
                          <span>{master.phone || '—'}</span>
                        </div>
                      </div>

                      {/* Specializations */}
                      {master.specialization.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {master.specialization.slice(0, 3).map(s => (
                            <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                              {s}
                            </Badge>
                          ))}
                          {master.specialization.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                              +{master.specialization.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      <Separator className="bg-border/50 mb-3" />

                      {/* Stats */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Stars rating={master.rating} size={11} />
                          <span className="font-mono text-sm font-bold text-yellow-400">{master.rating.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Icon name="CheckCircle2" size={11} className="text-emerald-400" />
                          <span className="font-mono font-bold text-foreground">{master.completed_orders}</span>
                          <span>заказов</span>
                        </div>
                      </div>
                      <Progress value={(master.rating / 5) * 100} className="h-1.5 mb-3 [&>div]:bg-yellow-400/70" />

                      {/* Joined + actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                          <Icon name="CalendarDays" size={10} />
                          {fmtDate(master.joined_at)}
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="outline" size="sm"
                            onClick={e => { e.stopPropagation(); openEdit(master); }}
                            className="h-7 px-2.5 border-border text-xs gap-1">
                            <Icon name="Pencil" size={11} /> Изменить
                          </Button>
                          <Button variant="outline" size="sm"
                            onClick={e => { e.stopPropagation(); setDeleteId(master.id); }}
                            className="h-7 px-2 border-red-500/30 text-red-400 hover:bg-red-500/10">
                            <Icon name="Trash2" size={11} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─────────────── TAB 2: ТАБЛИЦА ─────────────── */}
        <TabsContent value="table" className="mt-0">
          <Card className="border-border bg-card/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className={thClass} onClick={() => handleSort('name')}>
                    Мастер <SortIcon k="name" />
                  </TableHead>
                  <TableHead className={thClass} onClick={() => handleSort('level')}>
                    Уровень <SortIcon k="level" />
                  </TableHead>
                  <TableHead className={thClass} onClick={() => handleSort('status')}>
                    Статус <SortIcon k="status" />
                  </TableHead>
                  <TableHead className={thClass} onClick={() => handleSort('rating')}>
                    Рейтинг <SortIcon k="rating" />
                  </TableHead>
                  <TableHead className={thClass} onClick={() => handleSort('completed_orders')}>
                    Заказы <SortIcon k="completed_orders" />
                  </TableHead>
                  <TableHead className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                    Специализации
                  </TableHead>
                  <TableHead className={`${thClass} hidden md:table-cell`} onClick={() => handleSort('joined_at')}>
                    В команде <SortIcon k="joined_at" />
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(master => {
                  const st = STATUS_MAP[master.status];
                  const lv = LEVEL_MAP[master.level];
                  const maxO = analytics.maxOrders || 1;
                  return (
                    <TableRow
                      key={master.id}
                      onClick={() => openDetail(master)}
                      className="border-border hover:bg-neon-cyan/[0.03] transition-colors cursor-pointer"
                    >
                      {/* Name + avatar */}
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <MasterAvatar master={master} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{master.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">{master.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Level */}
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${lv.border} ${lv.color} ${lv.bg}`}>
                          {lv.label}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border flex items-center gap-1 w-fit ${st.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </Badge>
                      </TableCell>

                      {/* Rating */}
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Stars rating={master.rating} size={10} />
                          <span className="font-mono text-xs font-bold text-yellow-400">{master.rating.toFixed(1)}</span>
                        </div>
                      </TableCell>

                      {/* Completed orders + bar */}
                      <TableCell className="py-2.5">
                        <div className="space-y-1">
                          <span className="font-orbitron text-sm font-bold text-foreground tabular-nums">
                            {master.completed_orders}
                          </span>
                          <Progress
                            value={Math.round((master.completed_orders / maxO) * 100)}
                            className="h-1 w-16 [&>div]:bg-neon-cyan/70"
                          />
                        </div>
                      </TableCell>

                      {/* Specializations */}
                      <TableCell className="py-2.5 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {master.specialization.slice(0, 2).map(s => (
                            <Badge key={s} variant="outline" className="text-[9px] px-1.5 py-0 border-border text-muted-foreground">
                              {s}
                            </Badge>
                          ))}
                          {master.specialization.length > 2 && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border text-muted-foreground/60">
                              +{master.specialization.length - 2}
                            </Badge>
                          )}
                          {master.specialization.length === 0 && (
                            <span className="text-[10px] text-muted-foreground/40 italic">—</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Joined */}
                      <TableCell className="py-2.5 hidden md:table-cell">
                        <span className="font-mono text-xs text-muted-foreground">{fmtDate(master.joined_at)}</span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon"
                            onClick={() => openEdit(master)}
                            className="w-7 h-7 text-muted-foreground hover:text-foreground">
                            <Icon name="Pencil" size={12} />
                          </Button>
                          <Button variant="ghost" size="icon"
                            onClick={() => setDeleteId(master.id)}
                            className="w-7 h-7 text-muted-foreground hover:text-red-400">
                            <Icon name="Trash2" size={12} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {sorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-14">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Icon name="SearchX" size={28} className="opacity-20" />
                        <p className="text-sm">Нет мастеров по заданным фильтрам</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ─────────────── TAB 3: АНАЛИТИКА ─────────────── */}
        <TabsContent value="analytics" className="mt-0 space-y-4">

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Всего мастеров',   value: analytics.total,     icon: 'Users',        color: 'text-neon-cyan',   border: 'border-neon-cyan/25',   bg: 'bg-neon-cyan/10' },
              { label: 'Свободных',        value: analytics.available, icon: 'UserCheck',    color: 'text-emerald-400', border: 'border-emerald-400/25', bg: 'bg-emerald-400/10' },
              { label: 'Занятых',          value: analytics.busy,      icon: 'Wrench',       color: 'text-orange-400',  border: 'border-orange-400/25',  bg: 'bg-orange-400/10' },
              { label: 'В отпуске',        value: analytics.vacation,  icon: 'Palmtree',     color: 'text-slate-400',   border: 'border-slate-400/25',   bg: 'bg-slate-400/10' },
            ].map(card => (
              <Card key={card.label} className={`border ${card.border} bg-card/60`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider leading-tight">{card.label}</p>
                    <div className={`w-8 h-8 rounded-lg ${card.bg} border ${card.border} flex items-center justify-center`}>
                      <Icon name={card.icon} size={14} className={card.color} />
                    </div>
                  </div>
                  <p className={`text-3xl font-orbitron font-bold ${card.color} tabular-nums`}>{card.value}</p>
                  {analytics.total > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                      {Math.round((Number(card.value) / analytics.total) * 100)}% от команды
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Bar chart */}
            <Card className="lg:col-span-2 border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                  <Icon name="BarChart3" size={14} className="text-neon-cyan" />
                  РЕЙТИНГ ПО ЗАКАЗАМ
                </CardTitle>
                <CardDescription className="text-xs">Топ мастеров по количеству выполненных заказов</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.chartData.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-muted-foreground">
                    <p className="text-xs">Нет данных</p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-52 w-full">
                    <BarChart data={analytics.chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
                        axisLine={false} tickLine={false}
                        allowDecimals={false} width={28}
                      />
                      <ChartTooltip content={<ChartTooltipContent formatter={(v) => [String(v), 'Заказов']} />} />
                      <Bar dataKey="completed_orders" radius={[3, 3, 0, 0]}>
                        {analytics.chartData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={
                              entry.level === 'senior' ? 'hsl(185 100% 50%)' :
                              entry.level === 'middle' ? 'hsl(270 80% 60%)' :
                              'hsl(220 80% 60%)'
                            }
                            opacity={0.85}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
                {/* Legend */}
                <div className="flex items-center gap-4 mt-2 justify-center">
                  {(['senior', 'middle', 'junior'] as const).map(lv => (
                    <div key={lv} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-sm`} style={{
                        background: lv === 'senior' ? 'hsl(185 100% 50%)' : lv === 'middle' ? 'hsl(270 80% 60%)' : 'hsl(220 80% 60%)'
                      }} />
                      <span className={`text-[10px] font-mono font-bold ${LEVEL_MAP[lv].color}`}>{LEVEL_MAP[lv].label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Level distribution */}
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                  <Icon name="Layers3" size={14} className="text-violet-400" />
                  УРОВНИ КОМАНДЫ
                </CardTitle>
                <CardDescription className="text-xs">Распределение мастеров по грейдам</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {([
                  { key: 'senior' as const, count: analytics.senior },
                  { key: 'middle' as const, count: analytics.middle },
                  { key: 'junior' as const, count: analytics.junior },
                ]).map(({ key, count }) => {
                  const lv = LEVEL_MAP[key];
                  const pct = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
                  return (
                    <div key={key} className={`rounded-lg border p-3 space-y-2 ${lv.border} bg-card/40`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs px-2 py-0.5 border font-mono font-bold ${lv.border} ${lv.color} ${lv.bg}`}>
                            {lv.label}
                          </Badge>
                          <span className={`text-2xl font-orbitron font-bold ${lv.color} tabular-nums`}>{count}</span>
                        </div>
                        <span className={`text-xs font-mono ${lv.color}`}>{pct}%</span>
                      </div>
                      <Progress value={pct} className={`h-1.5 ${
                        key === 'senior' ? '[&>div]:bg-neon-cyan' :
                        key === 'middle' ? '[&>div]:bg-violet-400' :
                        '[&>div]:bg-blue-400'
                      }`} />
                    </div>
                  );
                })}

                <Separator className="bg-border/50" />

                {/* Avg rating */}
                <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-3">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                    Средний рейтинг
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-orbitron text-2xl font-bold text-yellow-400">{analytics.avgRating}</p>
                    <Stars rating={parseFloat(analytics.avgRating)} size={14} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comparison table */}
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-orbitron text-foreground flex items-center gap-2">
                <Icon name="TableProperties" size={14} className="text-neon-cyan" />
                СРАВНИТЕЛЬНАЯ ТАБЛИЦА
              </CardTitle>
              <CardDescription className="text-xs">Все мастера по ключевым метрикам</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left font-mono text-[10px] text-muted-foreground uppercase tracking-wider px-4 py-2.5 bg-muted/30">Мастер</th>
                      <th className="text-center font-mono text-[10px] text-muted-foreground uppercase tracking-wider px-3 py-2.5 bg-muted/30">Грейд</th>
                      <th className="text-center font-mono text-[10px] text-muted-foreground uppercase tracking-wider px-3 py-2.5 bg-muted/30">Статус</th>
                      <th className="text-center font-mono text-[10px] text-muted-foreground uppercase tracking-wider px-3 py-2.5 bg-muted/30">Рейтинг</th>
                      <th className="text-center font-mono text-[10px] text-muted-foreground uppercase tracking-wider px-3 py-2.5 bg-muted/30">Выполнено</th>
                      <th className="text-center font-mono text-[10px] text-muted-foreground uppercase tracking-wider px-3 py-2.5 bg-muted/30 hidden sm:table-cell">Активных</th>
                      <th className="text-center font-mono text-[10px] text-muted-foreground uppercase tracking-wider px-3 py-2.5 bg-muted/30 hidden md:table-cell">Стаж</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...masters]
                      .sort((a, b) => b.completed_orders - a.completed_orders)
                      .map((master, idx) => {
                        const st = STATUS_MAP[master.status];
                        const lv = LEVEL_MAP[master.level];
                        const maxO = analytics.maxOrders || 1;
                        const joinedMs = master.joined_at ? Date.now() - new Date(master.joined_at).getTime() : 0;
                        const years  = Math.floor(joinedMs / (365.25 * 24 * 3600 * 1000));
                        const months = Math.floor((joinedMs % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000));
                        const tenure = years > 0 ? `${years} г. ${months} мес.` : months > 0 ? `${months} мес.` : '< 1 мес.';
                        return (
                          <tr
                            key={master.id}
                            onClick={() => openDetail(master)}
                            className={`border-b border-border/40 last:border-0 hover:bg-neon-cyan/[0.03] cursor-pointer transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/5'}`}
                          >
                            {/* Name */}
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-muted-foreground/50 w-4 text-right">{idx + 1}</span>
                                <MasterAvatar master={master} size="sm" />
                                <span className="font-medium text-foreground">{master.name}</span>
                              </div>
                            </td>
                            {/* Level */}
                            <td className="px-3 py-2.5 text-center">
                              <span className={`font-mono text-xs font-bold ${lv.color}`}>{lv.label}</span>
                            </td>
                            {/* Status */}
                            <td className="px-3 py-2.5 text-center">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-mono ${st.color.split(' ')[0]}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                {st.label}
                              </span>
                            </td>
                            {/* Rating */}
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Icon name="Star" size={10} className="text-yellow-400 fill-yellow-400/70" />
                                <span className="font-mono font-bold text-yellow-400">{master.rating.toFixed(1)}</span>
                              </div>
                            </td>
                            {/* Completed */}
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-orbitron font-bold text-sm text-foreground tabular-nums">
                                  {master.completed_orders}
                                </span>
                                <Progress
                                  value={Math.round((master.completed_orders / maxO) * 100)}
                                  className="h-1 w-14 [&>div]:bg-neon-cyan/60"
                                />
                              </div>
                            </td>
                            {/* Active */}
                            <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                              <span className={`font-orbitron font-bold text-sm tabular-nums ${(master.active_orders ?? 0) > 0 ? 'text-orange-400' : 'text-muted-foreground/40'}`}>
                                {master.active_orders ?? 0}
                              </span>
                            </td>
                            {/* Tenure */}
                            <td className="px-3 py-2.5 text-center hidden md:table-cell">
                              <span className="font-mono text-[10px] text-muted-foreground">{tenure}</span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ Detail Sheet ════════════════════════════════════════════════════ */}
      <DetailSheet
        master={sheetMaster}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onEdit={openEdit}
      />

      {/* ═══ Edit Dialog ═════════════════════════════════════════════════════ */}
      <EditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
        master={editMaster}
        saving={saving}
      />

      {/* ═══ Delete Confirm ══════════════════════════════════════════════════ */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-orbitron text-sm">Удалить мастера?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              Это действие необратимо. Мастер будет удалён из системы вместе с привязанными данными.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-sm h-9">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm h-9 gap-1.5"
            >
              <Icon name="Trash2" size={13} /> Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
