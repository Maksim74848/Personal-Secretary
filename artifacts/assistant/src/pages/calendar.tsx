import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetEvents, useCreateEvent, useDeleteEvent, getGetEventsQueryKey } from "@workspace/api-client-react";
import { Plus, Trash2, X, MapPin, Clock, ChevronLeft, ChevronRight, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const MONTHS_RU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const DAYS_RU = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function pad(n: number) { return String(n).padStart(2, "0"); }

type EventForm = {
  title: string; description: string; startTime: string; endTime: string;
  location: string; allDay: boolean; recurring: boolean; reminder: string;
};
const EMPTY_FORM: EventForm = {
  title: "", description: "", startTime: "", endTime: "",
  location: "", allDay: false, recurring: false, reminder: ""
};

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string>(today.toISOString().split("T")[0]!);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const qc = useQueryClient();
  const { toast } = useToast();

  const from = new Date(year, month, 1).toISOString();
  const to = new Date(year, month + 1, 0, 23, 59).toISOString();
  const { data: events } = useGetEvents({ from, to }, { query: { queryKey: getGetEventsQueryKey({ from, to }) } });
  const create = useCreateEvent();
  const remove = useDeleteEvent();

  const byDay: Record<string, typeof events> = {};
  events?.forEach(ev => {
    const d = ev.startTime.split("T")[0]!;
    if (!byDay[d]) byDay[d] = [];
    byDay[d]!.push(ev);
  });
  const selectedEvents = byDay[selected] ?? [];

  function prevMonth() { month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1); }
  function nextMonth() { month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1); }

  function prefillForm(dateStr: string) {
    const d = dateStr;
    const startT = `${d}T08:00`;
    const endT = `${d}T09:00`;
    setForm({ ...EMPTY_FORM, startTime: startT, endTime: endT });
    setShowForm(true);
  }

  function handleCreate() {
    if (!form.title.trim() || !form.startTime || !form.endTime) {
      toast({ title: "Заполните название, начало и конец события" }); return;
    }
    create.mutate({
      data: {
        title: form.title, description: form.description,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        location: form.location, allDay: form.allDay, recurring: form.recurring,
        reminder: form.reminder ? parseInt(form.reminder) : undefined
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetEventsQueryKey() });
        setShowForm(false); setForm(EMPTY_FORM);
      },
      onError: () => toast({ title: "Не удалось создать событие", variant: "destructive" }),
    });
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const todayStr = today.toISOString().split("T")[0]!;

  return (
    <div className="flex flex-col h-full">
      {/* Calendar grid */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft size={16} className="text-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground">{MONTHS_RU[month]} {year}</span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <ChevronRight size={16} className="text-foreground" />
          </button>
        </div>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS_RU.map(d => <div key={d} className="text-center text-[10px] text-muted-foreground py-1 font-medium">{d}</div>)}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-1">
          {[...Array(firstDay)].map((_, i) => <div key={`e${i}`} />)}
          {[...Array(daysInMonth)].map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
            const isToday = dateStr === todayStr;
            const isSel = dateStr === selected;
            const hasEv = !!byDay[dateStr]?.length;
            return (
              <button
                key={day}
                onClick={() => setSelected(dateStr)}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all relative",
                  isSel ? "bg-primary text-white font-semibold shadow-sm"
                    : isToday ? "bg-primary/15 text-primary font-semibold"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {day}
                {hasEv && <span className={cn("absolute bottom-1 w-1 h-1 rounded-full", isSel ? "bg-white/80" : "bg-primary")} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border mx-4" />

      {/* Selected day events */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            {new Date(selected + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
          </h2>
          <button
            onClick={() => { prefillForm(selected); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={12} /> Добавить
          </button>
        </div>

        {selectedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="text-3xl mb-2">📅</span>
            <p className="text-sm text-muted-foreground">Событий нет</p>
            <button onClick={() => prefillForm(selected)} className="mt-3 text-sm text-primary hover:underline">
              + Добавить событие
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map(ev => (
              <div key={ev.id} className="bg-card border border-card-border rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{ev.title}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={10} />
                        {ev.allDay ? "Весь день" : `${new Date(ev.startTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} – ${new Date(ev.endTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`}
                      </span>
                      {ev.location && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={10} />{ev.location}</span>}
                      {ev.reminder && <span className="text-xs text-muted-foreground flex items-center gap-1"><Bell size={10} />{ev.reminder} мин.</span>}
                    </div>
                    {ev.description && <p className="text-xs text-muted-foreground mt-1">{ev.description}</p>}
                  </div>
                  <button
                    onClick={() => remove.mutate({ id: ev.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetEventsQueryKey() }) })}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create event sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-2xl mx-auto bg-background rounded-t-2xl p-4 pb-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Новое событие</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Название события *"
                autoFocus
                className="w-full bg-muted border-0 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 px-1">Начало *</label>
                  <input type="datetime-local" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 px-1">Конец *</label>
                  <input type="datetime-local" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Место (необязательно)"
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              <select value={form.reminder} onChange={e => setForm(f => ({ ...f, reminder: e.target.value }))}
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none">
                <option value="">Без напоминания</option>
                <option value="5">За 5 минут</option>
                <option value="15">За 15 минут</option>
                <option value="30">За 30 минут</option>
                <option value="60">За 1 час</option>
              </select>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.allDay} onChange={e => setForm(f => ({ ...f, allDay: e.target.checked }))} className="rounded" />
                  <span className="text-sm text-foreground">Весь день</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} className="rounded" />
                  <span className="text-sm text-foreground">Повторяется</span>
                </label>
              </div>
              <button
                onClick={handleCreate}
                disabled={create.isPending}
                className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {create.isPending ? "Создание..." : "Создать событие"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
