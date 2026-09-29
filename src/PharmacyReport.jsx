import {
  buildPharmacyReport,
  formatPharmacyReportValue,
} from "./pharmacyReport";

export default function PharmacyReport({ orders = [], loading = false }) {
  const report = buildPharmacyReport(orders);
  return (
    <div className="admin-table-wrap pharmacy-report">
      <style>{styles}</style>
      <p className="partner-retention-note">
        Day-wise order count and till-date value for this pharmacy. Declined
        requests are left out.
      </p>
      <div className="pharmacy-report-cards">
        <article>
          <span>Today — orders</span>
          <strong>{report.today.count}</strong>
        </article>
        <article>
          <span>Today — value</span>
          <strong>{formatPharmacyReportValue(report.today.value)}</strong>
        </article>
        <article>
          <span>Till date — orders</span>
          <strong>{report.tillDate.count}</strong>
        </article>
        <article>
          <span>Till date — value</span>
          <strong>{formatPharmacyReportValue(report.tillDate.value)}</strong>
        </article>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Orders</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {report.days.length === 0 ? (
            <tr>
              <td colSpan={3}>{loading ? "Loading…" : "No orders to report yet."}</td>
            </tr>
          ) : (
            report.days.map((row) => (
              <tr key={row.day} className={row.day === report.todayKey ? "is-today" : ""}>
                <td>
                  <strong>{row.label}</strong>
                  {row.day === report.todayKey ? <div className="pharmacy-report-today">Today</div> : null}
                </td>
                <td>{row.count}</td>
                <td>{formatPharmacyReportValue(row.value)}</td>
              </tr>
            ))
          )}
        </tbody>
        {report.days.length ? (
          <tfoot>
            <tr>
              <th>Till date</th>
              <th>{report.tillDate.count}</th>
              <th>{formatPharmacyReportValue(report.tillDate.value)}</th>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

const styles = `
.pharmacy-report{padding:4px 0}
.pharmacy-report-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0 10px 12px}
.pharmacy-report-cards article{padding:10px;border:1px solid #d2e8ef;border-radius:10px;background:#f7fbfd}
.pharmacy-report-cards span{display:block;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#5d7180}
.pharmacy-report-cards strong{display:block;margin-top:4px;font-size:18px;color:#143246}
.pharmacy-report-today{font-size:11px;font-weight:700;color:#1a6b7a}
.pharmacy-report .is-today td{background:#f3fbfc}
.pharmacy-report tfoot th{background:#eef6f8;color:#143246;font-size:13px;letter-spacing:0;text-transform:none}
@media (max-width:800px){.pharmacy-report-cards{grid-template-columns:1fr 1fr}}
`;
