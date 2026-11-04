import { barcodeBars } from "./labAccession";

export function AccessionBarcode({ value }) {
  const bars = barcodeBars(value);
  if (!bars.length) return null;
  const width = bars.reduce((max, bar) => Math.max(max, bar.x + bar.width), 0);
  return (
    <svg
      className="lab-barcode"
      viewBox={`0 0 ${width} 42`}
      role="img"
      aria-label={`Accession ${value}`}
    >
      {bars.map((bar) => (
        <rect key={`${bar.x}-${bar.width}`} x={bar.x} y="0" width={bar.width} height="34" fill="#143246" />
      ))}
      <text x={width / 2} y="41" textAnchor="middle" fontSize="7" fill="#143246">
        {value}
      </text>
    </svg>
  );
}

export function LabResultTable({ rows = [] }) {
  const filled = rows.filter((row) => row?.name && String(row.value || "").trim());
  if (!filled.length) return null;
  return (
    <table className="lab-result-table">
      <thead>
        <tr>
          <th>Test</th>
          <th>Result</th>
          <th>Unit</th>
          <th>Reference</th>
        </tr>
      </thead>
      <tbody>
        {filled.map((row) => (
          <tr key={`${row.name}-${row.value}`}>
            <td>{row.name}</td>
            <td>
              {row.value}
              {row.flag && row.flag !== "normal" ? ` (${row.flag})` : ""}
            </td>
            <td>{row.unit || "—"}</td>
            <td>{row.reference || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function LabTrackFacts({ order }) {
  const accession = order?.accessionNo || order?.barcodeValue || "";
  const results = Array.isArray(order?.reportResults) ? order.reportResults : [];
  const live = Boolean(order?.collectorLive);
  if (!accession && !results.length && !live && !order?.analyzerRef) return null;
  return (
    <div className="lab-track-facts">
      {live ? <p>The collector is sharing a live location.</p> : null}
      {accession ? (
        <>
          <p>Accession {accession}</p>
          <AccessionBarcode value={accession} />
        </>
      ) : null}
      {Array.isArray(order?.samples) && order.samples.length ? (
        <ul>
          {order.samples.map((sample) => (
            <li key={sample.id || sample.barcode}>
              {sample.tube} · {sample.barcode} · {sample.status}
              {sample.reason ? ` · ${sample.reason}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {order?.analyzerRef ? (
        <p>
          Analyzer {order.analyzerName || "instrument"} · sample {order.analyzerRef}
        </p>
      ) : null}
      <LabResultTable rows={results} />
    </div>
  );
}
