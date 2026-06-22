import { useAuth } from "@workspace/replit-auth-web";
import { Zap, LogIn } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap size={20} className="text-primary animate-pulse" />
          </div>
          <span className="text-sm text-muted-foreground">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-6 max-w-xs w-full px-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <Zap size={28} className="text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">JARVIS</h1>
              <p className="text-sm text-muted-foreground mt-1">Персональный ИИ-ассистент</p>
            </div>
          </div>

          <div className="w-full space-y-3">
            <a
              href={`${BASE}/api/login?returnTo=/`}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm"
            >
              <LogIn size={16} />
              Войти
            </a>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Войдите, чтобы начать работу с JARVIS. Ваши данные хранятся приватно.
            </p>
          </div>

          <div className="flex gap-4 text-xs text-muted-foreground">
            <a href={`${BASE}/privacy`} className="hover:text-foreground transition-colors">Конфиденциальность</a>
            <span>·</span>
            <a href={`${BASE}/terms`} className="hover:text-foreground transition-colors">Условия</a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
