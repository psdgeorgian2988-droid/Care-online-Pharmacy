import { useEffect, useMemo, useState } from "react";
import {
  MONTH_OPTIONS,
  daysInMonth,
  isoDateToday,
  isoDateYearsAgo,
  joinIsoDate,
  splitIsoDate,
} from "./personFields";

function yearRange(minIso, maxIso) {
  const maxYear = Number(splitIsoDate(maxIso).year || new Date().getFullYear());
  const minYear = Number(splitIsoDate(minIso).year || maxYear - 120);
  const years = [];
  for (let year = maxYear; year >= minYear; year -= 1) years.push(year);
  return years;
}

export default function DateMonthYearFields({
  idPrefix = "date",
  name = "dob",
  value = "",
  onChange,
  max = isoDateToday(),
  min = isoDateYearsAgo(120),
  error = "",
  label = "Date Of Birth",
  required = false,
}) {
  const [parts, setParts] = useState(() => splitIsoDate(value));
  const years = useMemo(() => yearRange(min, max), [min, max]);
  const dayCount = daysInMonth(parts.month, parts.year);

  useEffect(() => {
    if (!value) return;
    const next = splitIsoDate(value);
    setParts((prev) =>
      prev.day === next.day && prev.month === next.month && prev.year === next.year
        ? prev
        : next
    );
  }, [value]);

  const emit = (patch) => {
    const next = { ...parts, ...patch };
    const maxDay = daysInMonth(next.month, next.year);
    if (next.day && Number(next.day) > maxDay) next.day = String(maxDay);
    setParts(next);
    onChange?.({
      target: {
        name,
        value: joinIsoDate(next.day, next.month, next.year),
      },
    });
  };

  return (
    <>
      <style>{styles}</style>
      <div className="dmy-fields">
        {label ? (
          <label className="dmy-label" htmlFor={`${idPrefix}-day`}>
            {label}
            {required ? <span> *</span> : null}
          </label>
        ) : null}
        <div className="dmy-row">
          <select
            id={`${idPrefix}-day`}
            aria-label="Date"
            value={parts.day}
            required={required}
            onChange={(event) => emit({ day: event.target.value })}
          >
            <option value="">Date</option>
            {Array.from({ length: dayCount }, (_, index) => index + 1).map((day) => (
              <option key={day} value={String(day)}>
                {day}
              </option>
            ))}
          </select>
          <select
            id={`${idPrefix}-month`}
            aria-label="Month"
            value={parts.month}
            required={required}
            onChange={(event) => emit({ month: event.target.value })}
          >
            <option value="">Month</option>
            {MONTH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            id={`${idPrefix}-year`}
            aria-label="Year"
            value={parts.year}
            required={required}
            onChange={(event) => emit({ year: event.target.value })}
          >
            <option value="">Year</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </div>
        {error ? <small className="dmy-error">{error}</small> : null}
      </div>
    </>
  );
}

const styles = `
.dmy-fields{display:flex;flex-direction:column;min-width:0;width:100%}
.dmy-label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.dmy-label span{color:#d84b4b}
.dmy-row{display:grid;grid-template-columns:minmax(72px,0.7fr) minmax(0,1.2fr) minmax(88px,0.9fr);gap:8px}
.dmy-row select{width:100%;box-sizing:border-box;min-height:38px;padding:8px 10px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#143246;font:inherit;font-size:14px}
.dmy-row select:focus{outline:none;border-color:#1a6b7a}
.dmy-error{margin-top:4px;color:#d84b4b;font-size:12px}
@media (max-width:800px){.dmy-row{grid-template-columns:1fr}}
`;
