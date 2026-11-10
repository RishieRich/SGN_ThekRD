import {Check, Minus, X} from 'lucide-react';
import {fromISODate} from '@/domain/dates';
import type {CalendarStatus} from '@/domain/history';
import styles from './charts.module.css';

interface CalendarHeatProps {
  cells: Array<{date: string; status: CalendarStatus}>;
  todayISO: string;
  todayStatus?: 'present' | 'absent' | null;
  weekdayLabels: string[];
  legend: {present: string; absent: string; off: string; today: string};
  describe: (date: string, status: CalendarStatus | 'today') => string;
}

/** Month-style attendance calendar: weeks as rows, Monday first. Icons back up the colours. */
export function CalendarHeat({cells, todayISO, todayStatus, weekdayLabels, legend, describe}: CalendarHeatProps) {
  const all = [...cells, {date: todayISO, status: (todayStatus ?? 'none') as CalendarStatus}];
  const leading = (fromISODate(all[0].date).getDay() + 6) % 7;
  const padded: Array<{date: string; status: CalendarStatus} | null> = [...Array(leading).fill(null), ...all];
  return (
    <div className={styles.calendar}>
      <div className={styles.calendarGrid}>
        {weekdayLabels.map((label, index) => <span className={styles.weekday} key={`${label}-${index}`}>{label}</span>)}
        {padded.map((cell, index) => {
          if (!cell) return <span className={styles.calendarEmpty} key={`pad-${index}`} />;
          const isToday = cell.date === todayISO;
          const day = Number(cell.date.slice(8, 10));
          return (
            <span
              aria-label={describe(cell.date, isToday ? 'today' : cell.status)}
              className={styles.calendarCell}
              data-status={cell.status}
              data-today={isToday ? 'true' : undefined}
              key={cell.date}
              role="img"
              title={describe(cell.date, isToday ? 'today' : cell.status)}
            >
              {day}
            </span>
          );
        })}
      </div>
      <div className={styles.calendarLegend}>
        <span><i data-status="present"><Check size={10} /></i>{legend.present}</span>
        <span><i data-status="absent"><X size={10} /></i>{legend.absent}</span>
        <span><i data-status="off"><Minus size={10} /></i>{legend.off}</span>
        <span><i data-today="true" />{legend.today}</span>
      </div>
    </div>
  );
}
