import {
  changePct,
  formatInr,
  formatPct,
} from "./salesReport";
import { kindLabel } from "./orderTracking";

const KIND_COLORS = {
  medicine: "#1a6b7a",
  lab: "#2a7de1",
  radiology: "#6b5b95",
  homecare: "#3d8b6e",
  stepdown: "#c47a2c",
  ambulance: "#c44b4b",
};

function pctClass(pct) {
  if (pct == null) return "is-new";
  if (pct < 0) return "is-down";
  if (pct > 0) return "is-up";
  return "";
}

export function BarList({ title, caption, rows }) {
  const max = Math.max(...rows.map((row) => row.amount), 1);
  return (
    <section className="admin-chart">
      <h3>{title}</h3>
      {caption ? <p className="admin-chart-cap">{caption}</p> : null}
      {rows.length === 0 ? (
        <p className="admin-muted">No sales in this view yet.</p>
      ) : (
        <ul className="admin-bars">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="admin-bar-meta">
                <span>{row.label}</span>
                <strong>
                  {formatInr(row.amount)} · {row.count}
                </strong>
              </div>
              <div className="admin-bar-track">
                <div
                  className="admin-bar-fill"
                  style={{
                    width: `${Math.max(4, (row.amount / max) * 100)}%`,
                    background: KIND_COLORS[row.key] || "#1a6b7a",
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CompareBars({ title, caption, rows, currentLabel, previousLabel }) {
  const max = Math.max(...rows.flatMap((row) => [row.current, row.previous]), 1);
  return (
    <section className="admin-chart">
      <h3>{title}</h3>
      {caption ? <p className="admin-chart-cap">{caption}</p> : null}
      {rows.length === 0 ? (
        <p className="admin-muted">No sales in this view yet.</p>
      ) : (
        <ul className="admin-bars">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="admin-bar-meta">
                <span>{row.label}</span>
                <strong className={pctClass(row.pct)}>{formatPct(row.pct)}</strong>
              </div>
              <div className="admin-compare-tracks">
                <div className="admin-bar-track" title={`${previousLabel} ${formatInr(row.previous)}`}>
                  <div
                    className="admin-bar-fill is-prev"
                    style={{ width: `${Math.max(row.previous ? 4 : 0, (row.previous / max) * 100)}%` }}
                  />
                </div>
                <div className="admin-bar-track" title={`${currentLabel} ${formatInr(row.current)}`}>
                  <div
                    className="admin-bar-fill"
                    style={{
                      width: `${Math.max(row.current ? 4 : 0, (row.current / max) * 100)}%`,
                      background: KIND_COLORS[row.key] || "#1a6b7a",
                    }}
                  />
                </div>
              </div>
              <small className="admin-compare-cap">
                Prev {formatInr(row.previous)} · Now {formatInr(row.current)}
              </small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function MonthStackChart({ title, caption, months, kinds }) {
  const max = Math.max(...months.map((row) => row.amount), 1);
  const palette = kinds.length ? kinds : ["medicine"];
  return (
    <section className="admin-chart admin-chart-wide">
      <h3>{title}</h3>
      {caption ? <p className="admin-chart-cap">{caption}</p> : null}
      <div className="admin-stack-chart" role="img" aria-label={title}>
        {months.map((month) => (
          <div key={month.key} className="admin-stack-col">
            <div className="admin-stack-bars">
              {palette.map((kind) => {
                const value = month.byKind[kind] || 0;
                if (!value) return null;
                return (
                  <div
                    key={kind}
                    title={`${kindLabel(kind)} ${formatInr(value)}`}
                    style={{
                      height: `${(value / max) * 140}px`,
                      background: KIND_COLORS[kind] || "#5d7180",
                    }}
                  />
                );
              })}
            </div>
            <span>{month.label}</span>
          </div>
        ))}
      </div>
      <div className="admin-legend">
        {palette.map((kind) => (
          <span key={kind}>
            <i style={{ background: KIND_COLORS[kind] || "#5d7180" }} />
            {kindLabel(kind)}
          </span>
        ))}
      </div>
    </section>
  );
}

function heat(value, max) {
  if (!value) return "transparent";
  const t = max ? value / max : 0;
  return `rgba(26, 107, 122, ${0.08 + t * 0.42})`;
}

export function MonthMatrix({ title, caption, matrix, labelHeader, limit = 12 }) {
  const rows = matrix.rows.slice(0, limit);
  const max = Math.max(
    ...rows.flatMap((row) => matrix.months.map((month) => row.byMonth[month.key]?.amount || 0)),
    1
  );
  const lastKey = matrix.months.at(-1)?.key;
  const prevKey = matrix.months.at(-2)?.key;
  const display = matrix.totals ? [matrix.totals, ...rows] : rows;
  return (
    <section className="admin-chart admin-chart-wide">
      <h3>{title}</h3>
      {caption ? <p className="admin-chart-cap">{caption}</p> : null}
      {rows.length === 0 ? (
        <p className="admin-muted">No sales in the last 12 months yet.</p>
      ) : (
        <div className="admin-matrix-wrap">
          <table className="admin-matrix">
            <thead>
              <tr>
                <th>{labelHeader}</th>
                {matrix.months.map((month) => (
                  <th key={month.key}>{month.label}</th>
                ))}
                <th>Total</th>
                <th>MoM</th>
              </tr>
            </thead>
            <tbody>
              {display.map((row) => {
                const latest = row.byMonth[lastKey]?.amount || 0;
                const previous = row.byMonth[prevKey]?.amount || 0;
                const pct = changePct(latest, previous);
                return (
                  <tr key={row.key} className={row.key === "total" ? "is-total" : ""}>
                    <th scope="row">{row.label}</th>
                    {matrix.months.map((month) => {
                      const amount = row.byMonth[month.key]?.amount || 0;
                      return (
                        <td key={month.key} style={{ background: heat(amount, max) }}>
                          {amount ? formatInr(amount) : "—"}
                        </td>
                      );
                    })}
                    <td>{formatInr(row.amount)}</td>
                    <td className={pctClass(pct)}>{formatPct(pct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function GrowthTable({ title, caption, rows }) {
  return (
    <section className="admin-chart">
      <h3>{title}</h3>
      {caption ? <p className="admin-chart-cap">{caption}</p> : null}
      {rows.length === 0 ? (
        <p className="admin-muted">No rows for this period.</p>
      ) : (
        <table className="admin-growth-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Now</th>
              <th>Prev</th>
              <th>Change</th>
              <th>Orders</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td>{formatInr(row.current)}</td>
                <td>{formatInr(row.previous)}</td>
                <td className={pctClass(row.pct)}>{formatPct(row.pct)}</td>
                <td>
                  {row.count}
                  {row.previousCount ? ` / ${row.previousCount}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
