import React, { useState } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays 
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PremiumCalendarProps {
  value: Date | null;
  onChange: (date: Date) => void;
}

export const PremiumCalendar: React.FC<PremiumCalendarProps> = ({ value, onChange }) => {
  const [currentMonth, setCurrentMonth] = useState(value || new Date());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";
  const rows = [];

  let days = [];
  let day = startDate;
  let formattedDate = "";

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      
      const isSelected = value ? isSameDay(day, value) : false;
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isToday = isSameDay(day, new Date());

      days.push(
        <button
          key={day.toString()}
          onClick={() => onChange(cloneDay)}
          disabled={!isCurrentMonth}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            fontSize: 13,
            fontWeight: isSelected ? 600 : 400,
            cursor: isCurrentMonth ? 'pointer' : 'default',
            color: isSelected ? '#0A1628' : isCurrentMonth ? (isToday ? '#38bdf8' : 'rgba(255,255,255,0.8)') : 'rgba(255,255,255,0.2)',
            background: isSelected 
              ? 'linear-gradient(160deg, #38bdf8 0%, #0ea5e9 100%)' 
              : 'transparent',
            boxShadow: isSelected ? '0 2px 8px rgba(56,189,248,0.3)' : 'none',
            border: isToday && !isSelected ? '1px solid rgba(56,189,248,0.5)' : 'none',
            transition: 'all 0.2s',
          }}
          className={isCurrentMonth && !isSelected ? "hover:bg-white/10" : ""}
        >
          {formattedDate}
        </button>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div key={day.toString()} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        {days}
      </div>
    );
    days = [];
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: 16,
      width: '100%',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={prevMonth} type="button" className="p-1 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
          {format(currentMonth, "MMMM yyyy")}
        </div>
        <button onClick={nextMonth} type="button" className="p-1 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        {weekDays.map(wd => (
          <div key={wd} style={{ width: 32, textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
            {wd}
          </div>
        ))}
      </div>

      <div>{rows}</div>
    </div>
  );
};
