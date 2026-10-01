import { useEffect, useState } from "react";
import { createStaffLabTest, fetchAddedLabTests, patchStaffLabTest } from "./adminApi";

const emptyTest = () => ({ name: "", price: "", partnerPercent: "" });

export default function AdminLabTests() {
  const [tests, setTests] = useState([]);
  const [draft, setDraft] = useState(emptyTest);
  const [editingId, setEditingId] = useState("");
  const [editPercent, setEditPercent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchAddedLabTests()
      .then((data) => {
        if (!cancelled) setTests(Array.isArray(data.tests) ? data.tests : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNote("");
    try {
      const data = await createStaffLabTest({
        name: draft.name,
        price: Number(draft.price),
        partnerPercent: Number(draft.partnerPercent),
        labId: "others",
      });
      setTests(data.tests || []);
      setDraft(emptyTest());
      setNote(`${data.test?.name || "Test"} saved with partner split ${data.test?.partnerPercent}%.`);
    } catch (err) {
      setError(err.message || "Could not save the lab test.");
    } finally {
      setBusy(false);
    }
  };

  const saveSplit = async (test) => {
    const partnerPercent = Number(editPercent);
    if (!Number.isFinite(partnerPercent) || partnerPercent < 0 || partnerPercent > 100) {
      setError("Partner split must be between 0 and 100.");
      return;
    }
    setBusy(true);
    setError("");
    setNote("");
    try {
      const data = await patchStaffLabTest(test.id, { partnerPercent });
      setTests(data.tests || []);
      setEditingId("");
      setNote(`${data.test?.name || test.name} split updated to ${data.test?.partnerPercent}%.`);
    } catch (err) {
      setError(err.message || "Could not update the lab test split.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-panel admin-feature-panel" aria-label="Lab tests">
      <div className="admin-feature-head">
        <div>
          <h2>Lab tests</h2>
          <p className="admin-hint">
            Partner split is set on the test, because it differs from test to test.
          </p>
        </div>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
      {note ? <p className="admin-hint">{note}</p> : null}
      <form className="admin-partner-create" onSubmit={save}>
        <h3>Add lab test</h3>
        <div className="admin-partner-grid">
          <label>
            Test name
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </label>
          <label>
            Price ₹
            <input
              type="number"
              min={1}
              step="0.01"
              value={draft.price}
              onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}
              required
            />
          </label>
          <label>
            Partner split %
            <input
              type="number"
              min={0}
              max={100}
              value={draft.partnerPercent}
              onChange={(event) =>
                setDraft((current) => ({ ...current, partnerPercent: event.target.value }))
              }
              required
            />
            <span className="admin-outlet-area">
              MediHome {100 - Number(draft.partnerPercent || 0)}%
            </span>
          </label>
        </div>
        <div className="admin-feature-actions">
          <button type="submit" className="admin-feature-save" disabled={busy}>
            {busy ? "Saving…" : "Save test"}
          </button>
        </div>
      </form>
      {tests.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Test</th>
                <th>Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => {
                const editing = editingId === test.id;
                return (
                  <tr key={test.id}>
                    <td>{test.name}</td>
                    <td>₹{test.price}</td>
                    <td>
                      {editing ? (
                        <div className="admin-split-row">
                          <label>
                            Partner split %
                            <input
                              type="number"
                              min={0}
                              max={100}
                              aria-label={`Partner split percent for ${test.name}`}
                              value={editPercent}
                              onChange={(event) => setEditPercent(event.target.value)}
                            />
                          </label>
                          <span className="admin-outlet-area">
                            MediHome {100 - Number(editPercent || 0)}%
                          </span>
                          <button type="button" disabled={busy} onClick={() => saveSplit(test)}>
                            {busy ? "Saving…" : "Update split"}
                          </button>
                          <button type="button" onClick={() => setEditingId("")}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(test.id);
                            setEditPercent(String(test.partnerPercent ?? ""));
                            setError("");
                          }}
                        >
                          Update split
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
