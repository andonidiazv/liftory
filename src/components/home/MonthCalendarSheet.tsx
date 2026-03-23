import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { CalendarDays } from "lucide-react";
import type { AllWorkoutDay } from "@/hooks/useNavigableHome";

interface MonthCalendarSheetProps {
  allWorkouts: AllWorkoutDay[];
  selectedDate: string;
  todayStr: string;
  minDate: string | null;
  maxDate: string | null;
  onSelectDay: (date: string) => void;
}

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export default function MonthCalendarSheet({
  allWorkouts,
  selectedDate,
  todayStr,
  minDate,
  maxDate,
  onSelectDay,
}: MonthCalendarSheetProps) {
  const [open, setOpen] = useState(false);
  const initDate = new Date(selectedDate + "T12:00:00");
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [viewYear, setViewYear] = useState(initDate.getFullYear());

  const workoutMap = useMemo(() => {
    const m = new Map<string, AllWorkoutDay>();
    allWorkouts.forEach((w) => m.set(w.date, w));
    return m;
  }, [allWorkouts]);

  const days = useMemo(() => getDaysInMonth(viewYear, viewMonth), [viewYear, viewMonth]);

  // Pad start to align with Monday
  const firstDayOfWeek = days[0].getDay(); // 0=Sun
  const padStart = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const handleSelect = (dateStr: string) => {
    onSelectDay(dateStr);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted">
          <CalendarDays className="h-4.5 w-4.5 text-muted-foreground" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="bg-[#1A1A1A] border-border rounded-t-2xl pb-8">
        <div className="px-5 pt-2 pb-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="font-display text-[15px] font-semibold text-foreground capitalize">
              {monthName}
            </span>
            <button onClick={nextMonth} className="p-2 text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAY_LABELS.map((l, i) => (
              <div key={i} className="text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {l}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: padStart }).map((_, i) => (
              <div key={`pad-${i}`} className="h-10" />
            ))}
            {days.map((d) => {
              const dateStr = formatDate(d);
              const w = workoutMap.get(dateStr);
              const isEnabled = (!minDate || dateStr >= minDate) && (!maxDate || dateStr <= maxDate);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const isCompleted = w?.isCompleted ?? false;

              // Dot color
              let dotColor: string | null = null;
              if (w) {
                if (w.isRestDay) dotColor = "hsl(var(--muted-foreground))";
                else if (w.workoutType === "flow" || w.workoutType === "mobility") dotColor = "#7A8B5C";
                else dotColor = "hsl(var(--primary))";
              }

              return (
                <button
                  key={dateStr}
                  disabled={!isEnabled}
                  onClick={() => isEnabled && handleSelect(dateStr)}
                  className="flex flex-col items-center justify-center h-10 rounded-full transition-all"
                  style={{
                    opacity: isEnabled ? 1 : 0.3,
                    background: isCompleted
                      ? "hsl(var(--primary))"
                      : isSelected
                      ? "hsl(var(--primary) / 0.15)"
                      : "transparent",
                    boxShadow: isToday && !isCompleted ? "inset 0 0 0 2px hsl(var(--primary))" : "none",
                  }}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                  ) : (
                    <span
                      className={`text-[12px] font-body ${
                        isSelected ? "text-primary font-semibold" : isToday ? "text-primary font-semibold" : "text-foreground"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  )}
                  {dotColor && !isCompleted && (
                    <span
                      className="block h-1 w-1 rounded-full mt-0.5"
                      style={{ background: dotColor }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
