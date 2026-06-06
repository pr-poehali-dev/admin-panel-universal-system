import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

const DEMO_ACCOUNTS = [
  { label: 'Администратор', email: 'admin@techservice.ru', role: 'admin', color: 'text-neon-cyan' },
  { label: 'Менеджер', email: 'manager@techservice.ru', role: 'manager', color: 'text-violet-400' },
  { label: 'Мастер', email: 'master@techservice.ru', role: 'master', color: 'text-emerald-400' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await login(email, password);
    if (!result.success) setError(result.error || 'Ошибка входа');
    setIsLoading(false);
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('1234');
    setError('');
  };

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Neon glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-neon-cyan/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-neon-cyan/40 bg-neon-cyan/10 mb-4 animate-glow">
            <Icon name="Cpu" size={32} className="text-neon-cyan" />
          </div>
          <h1 className="font-orbitron text-2xl font-bold text-neon-cyan tracking-widest">
            TECHSERVICE
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-mono tracking-wider">
            AIS v2.6.0 // SYSTEM ACCESS
          </p>
        </div>

        <Card className="border-border bg-card/80 backdrop-blur-xl shadow-2xl shadow-neon-cyan/5">
          <CardHeader className="pb-4">
            <CardTitle className="font-orbitron text-lg text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse-neon" />
              АВТОРИЗАЦИЯ
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Введите учётные данные для доступа к системе
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
                  Email
                </Label>
                <div className="relative">
                  <Icon name="Mail" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@techservice.ru"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-9 bg-input border-border focus:border-neon-cyan/50 focus:ring-neon-cyan/20 font-mono text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
                  Пароль
                </Label>
                <div className="relative">
                  <Icon name="Lock" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-9 bg-input border-border focus:border-neon-cyan/50 focus:ring-neon-cyan/20 font-mono text-sm"
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                  <Icon name="AlertCircle" size={16} />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-neon-cyan text-background hover:bg-neon-cyan/90 font-orbitron text-sm tracking-widest font-bold transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Icon name="Loader2" size={16} className="animate-spin" />
                    АВТОРИЗАЦИЯ...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Icon name="LogIn" size={16} />
                    ВОЙТИ В СИСТЕМУ
                  </span>
                )}
              </Button>
            </form>

            {/* Demo accounts */}
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-xs font-mono text-muted-foreground text-center uppercase tracking-widest">
                — ДЕМО-ДОСТУП —
              </p>
              <div className="grid gap-2">
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.email}
                    onClick={() => fillDemo(acc.email)}
                    className="flex items-center justify-between p-2.5 rounded-md border border-border/50 hover:border-neon-cyan/30 hover:bg-neon-cyan/5 transition-all duration-150 group text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="UserCircle" size={16} className={`${acc.color} transition-colors`} />
                      <span className="text-sm font-medium text-foreground">{acc.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{acc.email}</span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0 border-border/50 font-mono">
                        1234
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs font-mono text-muted-foreground/50 mt-6 tracking-wider">
          © 2026 TECHSERVICE AIS • SECURE ACCESS POINT
        </p>
      </div>
    </div>
  );
}
