import React, { useState, useEffect } from 'react';

interface DateInputProps {
  label: string;
  id: string;
  value: string; // Expected format: "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  required?: boolean;
}

const months = [
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 120 }, (_, i) => currentYear - i);
const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

const DateInput: React.FC<DateInputProps> = ({ label, id, value, onChange, required }) => {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  // Sync internal state from the parent's `value` prop.
  // This runs ONLY when the `value` prop itself changes from the outside.
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      setYear(y);
      setMonth(m);
      setDay(d);
    } else {
      // When the prop is cleared, clear the internal state.
      setYear('');
      setMonth('');
      setDay('');
    }
  }, [value]);

  // A single handler to update the date parts and notify the parent.
  const handleDateChange = (part: 'day' | 'month' | 'year', newValue: string) => {
    // Determine the next state of the date parts
    const nextDay = part === 'day' ? newValue : day;
    const nextMonth = part === 'month' ? newValue : month;
    const nextYear = part === 'year' ? newValue : year;
    
    // Update the internal state for the UI
    if (part === 'day') setDay(newValue);
    if (part === 'month') setMonth(newValue);
    if (part === 'year') setYear(newValue);
    
    // If all parts are now filled, notify the parent with the complete date string.
    // Otherwise, notify the parent that the date is incomplete (empty string).
    if (nextDay && nextMonth && nextYear) {
      onChange(`${nextYear}-${nextMonth}-${nextDay}`);
    } else {
      // Call onChange with empty string only if the current value is not already empty,
      // to avoid redundant state updates in the parent.
      if (value !== '') {
        onChange('');
      }
    }
  };

  return (
    <div className="w-full">
      <label id={`${id}-label`} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="grid grid-cols-3 gap-0 border border-slate-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500 transition duration-200">
        <select
          aria-label="Jour"
          name={`${id}-day`}
          value={day}
          onChange={(e) => handleDateChange('day', e.target.value)}
          required={required}
          className="block w-full px-2 py-1.5 bg-white border-0 rounded-l-lg placeholder:text-slate-400 focus:outline-none focus:ring-0 text-sm"
        >
          <option value="">Jour</option>
          {days.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          aria-label="Mois"
          name={`${id}-month`}
          value={month}
          onChange={(e) => handleDateChange('month', e.target.value)}
          required={required}
          className="block w-full px-2 py-1.5 bg-white border-0 border-x border-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-0 text-sm"
        >
          <option value="">Mois</option>
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select
          aria-label="Année"
          name={`${id}-year`}
          value={year}
          onChange={(e) => handleDateChange('year', e.target.value)}
          required={required}
          className="block w-full px-2 py-1.5 bg-white border-0 rounded-r-lg placeholder:text-slate-400 focus:outline-none focus:ring-0 text-sm"
        >
          <option value="">Année</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
};

export default DateInput;