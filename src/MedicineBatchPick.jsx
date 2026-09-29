import { useMemo } from "react";
import {
  allCustomerBatches,
  batchesForProduct,
  openBatchReport,
  withPickedBatch,
} from "./batchStore";

export default function MedicineBatchPick({ item, onChange }) {
  const options = useMemo(
    () => batchesForProduct(item?.id, allCustomerBatches(), item),
    [item]
  );
  const current = options.find((row) => row.batchNo === item?.batchNo) || options[0];

  if (!item) return null;

  return (
    <div className="medicine-batch-pick">
      <label>
        Batch no
        <select
          value={current?.batchNo || ""}
          onChange={(event) => {
            const next = options.find((row) => row.batchNo === event.target.value) || current;
            onChange?.(withPickedBatch(item, next));
          }}
        >
          {options.map((row) => (
            <option key={row.id} value={row.batchNo}>
              {row.batchNo}
              {row.expiryDate ? ` · exp ${row.expiryDate}` : ""}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="medicine-batch-report" onClick={() => openBatchReport(current)}>
        Show batch report
      </button>
    </div>
  );
}
