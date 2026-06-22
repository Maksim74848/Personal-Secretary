import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto">
      <header className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <Link href="/">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft size={16} />
          </button>
        </Link>
        <h1 className="text-base font-semibold text-foreground">Политика конфиденциальности</h1>
      </header>
      <div className="px-5 py-6 space-y-5 text-sm text-foreground">
        <p className="text-muted-foreground">Последнее обновление: июнь 2026</p>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Что мы собираем</h2>
          <p className="text-muted-foreground leading-relaxed">
            JARVIS собирает только данные, которые вы явно предоставляете: сообщения в чате, задачи, события календаря, контакты и файлы. Данные привязаны к вашей учётной записи.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Как мы используем данные</h2>
          <p className="text-muted-foreground leading-relaxed">
            Данные используются исключительно для предоставления функций ассистента: ответы на вопросы, управление расписанием и задачами. Мы не передаём данные третьим лицам.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Хранение данных</h2>
          <p className="text-muted-foreground leading-relaxed">
            Все данные хранятся в защищённой базе данных PostgreSQL. Сессии хранятся в куки с флагами httpOnly и Secure.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">Ваши права</h2>
          <p className="text-muted-foreground leading-relaxed">
            Вы можете удалить свои данные в любой момент через раздел Настройки. При выходе из аккаунта сессия очищается немедленно.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">ИИ и обработка</h2>
          <p className="text-muted-foreground leading-relaxed">
            Сообщения обрабатываются через Groq API. Мы не контролируем политику хранения данных провайдера ИИ. Не отправляйте в чат личные и конфиденциальные данные.
          </p>
        </section>
      </div>
    </div>
  );
}
