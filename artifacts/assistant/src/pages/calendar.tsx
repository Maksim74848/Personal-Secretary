import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetEvents, useCreateEvent, useDeleteEvent, getGetEventsQueryKey } from "@workspace/api-client-react";
import { Plus, Trash2, X, MapPin, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDay(year: number, month: number) { return new Date(year, month, 1).getDay(); }

export default function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(today.toISOString().split("T")[0]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", startTime: "", endTime: "", location: "", allDay: false, recurring: false, reminder: "" });
  const qc = useQueryClient();
  const { toast } = useToast();

  const monthStart = new Date(year, month, 1).toISOString();
  const monthEnd = new Date(year, month + 1, 0, 23, 59).toISOString();
  const { data: events } = useGetEvents({ from: monthStart, to: monthEnd }, { query: { queryKey: getGetEventsQueryKey({ from: monthStart, to: monthEnd }) } });
  const create = useCreateEvent();
  const remove = useDeleteEvent();

  const eventsByDay: Record<string, typeof events> = {};
  events?.forEach(ev => {
    const d = ev.startTime.split("T")[0];
    if (!eventsByDay[d]) eventsByDay[d] = [];
    eventsByDay[d]!.push(ev);
  });

  const selectedEvents = selected ? (eventsByDay[selected] ?? []) : [];

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }

  function handleCreate() {
    if (!form.title || !form.startTime || !form.endTime) { toast({ title: "Title, start and end time required" }); return; }
    create.mutate({
      data: {
        title: form.title, description: form.description, startTime: form.startTime, endTime: form.endTime,
        location: form.location, allDay: form.allDay, recurring: form.recurring,
        reminder: form.reminder ? parseInt(form.reminder) : undefined
      }
    }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetEventsQueryKey() }); setShowForm(false); setForm({ title: "", description: "", startTime: "", endTime: "", location: "", allDay: false, recurring: false, reminder: "" }); },
      onError: () => toast({ title: "Failed to create event", variant: "destructive" }),
    });
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-foreground">Calendar</h1>
        <button data-testid="button-add-event" onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus size={14} /> Add Event
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">New Event</h3>
            <button onClick={() => setShowForm(false)}><X size={14} className="text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title *"
                data-testid="input-event-title"
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Start time *</label>
              <input type="datetime-local" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                data-testid="input-event-start"
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">End time *</label>
              <input type="datetime-local" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                data-testid="input-event-end"
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location (optional)"
              className="bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none" />
            <select value={form.reminder} onChange={e => setForm(f => ({ ...f, reminder: e.target.value }))}
              className="bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none">
              <option value="">No reminder</option>
              <option value="5">5 minutes before</option>
              <option value="15">15 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="60">1 hour before</option>
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.allDay} onChange={e => setForm(f => ({ ...f, allDay: e.target.checked }))} />
              <span className="text-sm text-foreground">All day</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} />
              <span className="text-sm text-foreground">Recurring</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-muted-foreground">Cancel</button>
            <button data-testid="button-submit-event" onClick={handleCreate} disabled={create.isPending}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">
              {create.isPending ? "Creating..." : "Create Event"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted text-foreground">‹</button>
            <span className="text-sm font-semibold">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted text-foreground">›</button>
          </div>
          <div className="grid grid-cols-7 gap-px mb-1">
            {DAYS.map(d => <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {[...Array(firstDay)].map((_, i) => <div key={`e${i}`} />)}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isToday = dateStr === today.toISOString().split("T")[0];
              const isSelected = dateStr === selected;
              const hasEvents = !!eventsByDay[dateStr]?.length;
              return (
                <button key={day} data-testid={`calendar-day-${dateStr}`} onClick={() => setSelected(dateStr)}
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors relative",
                    isSelected ? "bg-primary text-white" : isToday ? "bg-primary/15 text-primary font-semibold" : "hover:bg-muted text-foreground"
                  )}>
                  {day}
                  {hasEvents && <span className={cn("absolute bottom-1 w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-primary")} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Events for selected day */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">
            {selected ? new Date(selected + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Select a day"}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No events</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map(ev => (
                <div key={ev.id} data-testid={`event-card-${ev.id}`} className="bg-muted/40 rounded-lg p-2.5 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{ev.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock size={10} />
                        {ev.allDay ? "All day" : `${new Date(ev.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} – ${new Date(ev.endTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                      {ev.location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin size={10} />{ev.location}</p>}
                      {ev.recurring && <p className="text-xs text-purple-500 flex items-center gap-1 mt-0.5"><RefreshCw size={10} />Recurring</p>}
                    </div>
                    <button data-testid={`button-delete-event-${ev.id}`}
                      onClick={() => remove.mutate({ id: ev.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetEventsQueryKey() }) })}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
