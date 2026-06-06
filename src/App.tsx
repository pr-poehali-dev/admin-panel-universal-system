import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import LoginPage from '@/pages/LoginPage';
import Icon from '@/components/ui/icon';

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 flex items-center justify-center animate-glow">
            <Icon name="Cpu" size={24} className="text-neon-cyan" />
          </div>
          <div className="flex items-center gap-2">
            <Icon name="Loader2" size={16} className="text-neon-cyan animate-spin" />
            <span className="font-mono text-sm text-muted-foreground tracking-widest">ЗАГРУЗКА СИСТЕМЫ...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <AdminLayout />;
}

export default function App() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <AppContent />
        <Toaster />
      </AuthProvider>
    </TooltipProvider>
  );
}