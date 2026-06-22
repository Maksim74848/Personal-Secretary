import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto">
      <header className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <Link href="/">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft size={16} />
          </button>
        </Link>
        <h1 className="text-base font-semibold text-foreground">Условия использования</h1>
      </header>
      <div className="px-5 py-6 space-y-5 text-sm text-foreground">
        <p className="text-muted-foreground">Последнее обновление: июнь 2026</p>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Принятие условий</h2>
          <p className="text-muted-foreground leading-relaxed">
            Используя JARVIS, вы принимаете настоящие условия использования. Если вы не согласны с ними — пожалуйста, не используйте сервис.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Описание сервиса</h2>
          <p className="text-muted-foreground leading-relaxed">
            JARVIS — персональный ИИ-ассистент, который помогает управлять расписанием, задачами, контактами и получать ответы на вопросы.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Допустимое использование</h2>
          <p className="text-muted-foreground leading-relaxed">
            Запрещается использование сервиса для незаконных действий, генерации вредоносного контента или обхода ограничений безопасности. Один аккаунт — для одного пользователя.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Ограничение ответственности</h2>
          <p className="text-muted-foreground leading-relaxed">
            ИИ-ответы могут содержать ошибки. JARVIS предоставляется «как есть», без гарантий точности. Принимайте важные решения самостоятельно, не полагаясь только на ассистента.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Изменения условий</h2>
          <p className="text-muted-foreground leading-relaxed">
            Условия могут обновляться. Об изменениях вы узнаете через дату обновления вверху страницы.
          </p>
        </section>
      </div>
    </div>
  );
}
