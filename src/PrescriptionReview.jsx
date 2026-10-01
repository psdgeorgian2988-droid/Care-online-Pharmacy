import { useEffect, useMemo, useRef, useState } from "react";
import { goToHash } from "./hashRoute";
import {
  clearPrescriptionDraft,
  prescriptionDraftIsImage,
  prescriptionDraftIsPdf,
  readPrescriptionDraft,
  PRESCRIPTION_EVENT,
} from "./prescriptionDraft";
import {
  clearPrescriptionParse,
  digitizePrescription,
  readPrescriptionParse,
  setPrescriptionMedicinesConfirmed,
  updatePrescriptionMedicine,
  PRESCRIPTION_PARSE_EVENT,
} from "./prescriptionAi";
import { lookupPrescriptionMedicine } from "./Medicines";
import { addMedicineToCart, addTestToCart, cartHasMedicine, openShopCart, writeRxLabCheckout } from "./medicineCartStore";
import {
  cheapestMatch,
  checkoutPayloadForTests,
  matchPrescriptionTest,
  splitRxTestNames,
  suggestedPacks,
} from "./prescriptionShop";

function durationLabel(med) {
  return med?.durationDays || med?.duration || "Not specified";
}

function timesADayLabel(med) {
  return med?.timesPerDay || med?.frequency || med?.timing || "Not specified";
}

export default function PrescriptionReview() {
  const [draft, setDraft] = useState(() => readPrescriptionDraft());
  const [parsed, setParsed] = useState(() => readPrescriptionParse());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState("");
  const [added, setAdded] = useState({});
  const [labPick, setLabPick] = useState({});
  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const actionsRef = useRef(null);

  useEffect(() => {
    const refresh = () => {
      setDraft(readPrescriptionDraft());
      setParsed(readPrescriptionParse());
    };
    window.addEventListener(PRESCRIPTION_EVENT, refresh);
    window.addEventListener(PRESCRIPTION_PARSE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PRESCRIPTION_EVENT, refresh);
      window.removeEventListener(PRESCRIPTION_PARSE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!draft?.fileName) return;
    const staleDemo = parsed?.aiMode === "demo" || parsed?.aiMode === "demo-fallback";
    const already =
      !staleDemo &&
      parsed?.fileName === draft.fileName &&
      parsed?.sourceSavedAt === draft.savedAt &&
      (Array.isArray(parsed?.medicines) || Array.isArray(parsed?.tests));
    if (already) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError("");
      try {
        const result = await digitizePrescription(draft);
        if (!cancelled) setParsed(result);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Could not read this prescription.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draft?.fileName, draft?.savedAt]);

  const rerun = async () => {
    if (!draft?.fileName || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await digitizePrescription(draft);
      setParsed(result);
    } catch (err) {
      setError(err?.message || "Could not read this prescription.");
    } finally {
      setBusy(false);
    }
  };

  const removePrescription = () => {
    clearPrescriptionParse();
    clearPrescriptionDraft();
    setDraft(null);
    setParsed(null);
    setError("");
    setMenu("");
    setEditingId("");
    setEditName("");
  };

  const startNameEdit = (med) => {
    setEditingId(med.id);
    setEditName(med.name || "");
    setMenu("");
  };

  const cancelNameEdit = () => {
    setEditingId("");
    setEditName("");
  };

  const saveNameEdit = (med) => {
    const nextName = editName.trim();
    if (!nextName) return;
    const next = updatePrescriptionMedicine(med.id, {
      name: nextName,
      asWritten: med.asWritten || med.name,
    });
    if (next) setParsed(next);
    setEditingId("");
    setEditName("");
  };

  const toggleMedicinesConfirmed = (checked) => {
    const next = setPrescriptionMedicinesConfirmed(checked);
    if (next) setParsed(next);
  };

  const showImage = draft && prescriptionDraftIsImage(draft) && draft.fileData;
  const showPdf = draft && prescriptionDraftIsPdf(draft) && draft.fileData;
  const medicines = parsed?.medicines || [];
  const tests = parsed?.tests || [];
  const medOffers = useMemo(
    () => medicines.map((med) => lookupPrescriptionMedicine(med)),
    [medicines]
  );
  const testOffers = useMemo(
    () =>
      tests.flatMap((test) => {
        const parts = splitRxTestNames(test.name);
        if (parts.length <= 1) return [matchPrescriptionTest(test)];
        return parts.map((name) =>
          matchPrescriptionTest({
            ...test,
            id: `${test.id}-${name}`,
            name,
          })
        );
      }),
    [tests]
  );

  useEffect(() => {
    if (!menu) return undefined;
    const onDoc = (event) => {
      if (!actionsRef.current?.contains(event.target)) setMenu("");
    };
    document.addEventListener("mousedown", onDoc);
    const panel = actionsRef.current?.querySelector(".rx-menu-panel");
    panel?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  const addOffer = (row) => {
    if (!row?.offer) return;
    const qty = suggestedPacks(row.rx, row.offer.packSize);
    addMedicineToCart(
      {
        ...row.offer,
        prescribedBrand: row.prescribed
          ? {
              brand: row.prescribed.brand,
              name: row.prescribed.name,
              mrp: row.prescribed.mrp,
              price: row.offer.price,
              save: Math.max(0, Number(row.prescribed.mrp || 0) - Number(row.offer.price || 0)),
            }
          : null,
      },
      qty
    );
    setAdded((prev) => ({ ...prev, [row.offer.id]: true }));
  };

  const addAllMedicines = () => {
    medOffers.forEach((row) => {
      if (row.offer) addOffer(row);
    });
  };

  const pickChosenTests = () =>
    testOffers
      .map((offer) => {
        const pickedId = labPick[offer.rx.id];
        return (
          offer.matches.find((row) => row.partnerId === pickedId) ||
          cheapestMatch(offer.matches)
        );
      })
      .filter(Boolean);

  const startTestCheckout = (chosen) => {
    if (!chosen.length) return false;
    const counts = {};
    for (const row of chosen) {
      counts[row.partnerId] = (counts[row.partnerId] || 0) + 1;
    }
    const partnerId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const kind = chosen.find((row) => row.partnerId === partnerId)?.kind || "lab";
    const testsForPartner = chosen.filter((row) => row.partnerId === partnerId);
    testsForPartner.forEach((row) =>
      addTestToCart(
        {
          id: row.testId || row.id,
          name: row.testName || row.name,
          price: row.price,
          code: row.code,
        },
        { kind, partnerId, partnerName: row.partnerName || "" },
        undefined,
        { open: false }
      )
    );
    writeRxLabCheckout(
      checkoutPayloadForTests({ kind, partnerId, tests: testsForPartner })
    );
    setMenu("");
    goToHash(
      `#labs?service=${encodeURIComponent(kind)}&lab=${encodeURIComponent(partnerId)}`
    );
    return true;
  };

  const buySelectedTests = () => {
    startTestCheckout(pickChosenTests());
  };

  const availableMeds = medOffers.filter((row) => row.offer).length;
  const availableTests = testOffers.filter((offer) => offer.matches.length).length;
  const medicinesConfirmed = Boolean(parsed?.medicinesConfirmed) || medicines.length === 0;

  const orderAllAvailable = () => {
    const chosen = pickChosenTests();
    if (!availableMeds && !chosen.length) return;
    if (availableMeds) {
      medOffers.forEach((row) => {
        if (!row.offer) return;
        const qty = suggestedPacks(row.rx, row.offer.packSize);
        addMedicineToCart(
          {
            ...row.offer,
            prescribedBrand: row.prescribed
              ? {
                  brand: row.prescribed.brand,
                  name: row.prescribed.name,
                  mrp: row.prescribed.mrp,
                  price: row.offer.price,
                  save: Math.max(
                    0,
                    Number(row.prescribed.mrp || 0) - Number(row.offer.price || 0)
                  ),
                }
              : null,
          },
          qty,
          undefined,
          { open: false }
        );
        setAdded((prev) => ({ ...prev, [row.offer.id]: true }));
      });
    }
    chosen.forEach((row) =>
      addTestToCart(
        {
          id: row.testId || row.id,
          name: row.testName || row.name,
          price: row.price,
          code: row.code,
        },
        {
          kind: row.kind || "lab",
          partnerId: row.partnerId,
          partnerName: row.partnerName || "",
        },
        undefined,
        { open: false }
      )
    );
    setMenu("");
    openShopCart();
  };

  if (!draft?.fileName) {
    return (
      <div className="rx-page">
        <header className="rx-head">
          <p className="rx-kicker">Prescription</p>
          <h1>Digital prescription</h1>
          <p className="rx-lead">Upload a prescription on Home to digitize medicines and tests.</p>
        </header>
        <div className="rx-empty-card">
          <p>No prescription uploaded yet.</p>
          <button type="button" className="rx-primary" onClick={() => goToHash("#home")}>
            Go to Home upload
          </button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="rx-page">
      <header className="rx-head">
        <p className="rx-kicker">Prescription</p>
        <h1>Digital prescription</h1>
        <p className="rx-lead">
          Left: preview of the uploaded Rx. Right: AI list of medicines and tests, including how
          many days and how many times a day.
        </p>
      </header>

      <div className="rx-split">
        <section className="rx-pane rx-pane-left" aria-label="Uploaded prescription">
          <div className="rx-pane-head">
            <h2>Uploaded Rx</h2>
            <div className="rx-pane-head-tools">
              <span>{draft.fileName}</span>
              <button
                type="button"
                className="rx-remove"
                aria-label="Remove uploaded prescription"
                title="Remove prescription"
                onClick={removePrescription}
              >
                ×
              </button>
            </div>
          </div>
          <div className="rx-preview">
            {showImage ? (
              <img src={draft.fileData} alt="Uploaded prescription" />
            ) : showPdf ? (
              <iframe title="Uploaded prescription PDF" src={draft.fileData} />
            ) : (
              <div className="rx-pdf">
                <strong>File saved</strong>
                <p>{draft.fileName}</p>
                <p className="rx-pdf-hint">Preview is unavailable for this file type.</p>
              </div>
            )}
          </div>
        </section>

        <section className="rx-pane rx-pane-right" aria-label="Digitized medicines and tests">
          <div className="rx-pane-head">
            <h2>Recognized list</h2>
            <button type="button" className="rx-rerun" disabled={busy} onClick={rerun}>
              {busy ? "Reading…" : "Re-run AI"}
            </button>
          </div>

          {busy && !medicines.length && !tests.length ? (
            <p className="rx-status">AI is reading the prescription…</p>
          ) : null}
          {error ? <p className="rx-error">{error}</p> : null}
          {parsed?.warning ? <p className="rx-warn">{parsed.warning}</p> : null}

          {(parsed?.patientName || parsed?.doctorName || parsed?.date) && (
            <div className="rx-meta">
              {parsed.patientName ? (
                <p>
                  <span>Patient</span>
                  <strong>{parsed.patientName}</strong>
                </p>
              ) : null}
              {parsed.doctorName ? (
                <p>
                  <span>Doctor</span>
                  <strong>{parsed.doctorName}</strong>
                </p>
              ) : null}
              {parsed.date ? (
                <p>
                  <span>Date</span>
                  <strong>{parsed.date}</strong>
                </p>
              ) : null}
            </div>
          )}

          <div className="rx-list-block">
            <h3>Medicines</h3>
            {medicines.length === 0 && !busy ? (
              <p className="rx-empty">No medicines detected yet.</p>
            ) : (
              <ol className="rx-med-list">
                {medicines.map((med) => {
                  const offer = medOffers.find((row) => row.rx.id === med.id);
                  const editing = editingId === med.id;
                  return (
                  <li key={med.id}>
                    <div className="rx-med-title">
                      <strong>{med.name}</strong>
                      {med.strength ? <em>{med.strength}</em> : null}
                      {med.form ? <span className="rx-chip">{med.form}</span> : null}
                      {med.userCorrected ? (
                        <span className="rx-chip">Corrected</span>
                      ) : med.verified === false ? (
                        <span className="rx-chip is-warn">As written — confirm</span>
                      ) : null}
                    </div>
                    {editing ? (
                      <div className="rx-name-edit">
                        <label>
                          Correct medicine name
                          <input
                            type="text"
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                saveNameEdit(med);
                              }
                              if (event.key === "Escape") cancelNameEdit();
                            }}
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </label>
                        <div className="rx-name-edit-actions">
                          <button
                            type="button"
                            className="rx-chip-btn"
                            disabled={!editName.trim()}
                            onClick={() => saveNameEdit(med)}
                          >
                            Save name
                          </button>
                          <button type="button" className="rx-rerun" onClick={cancelNameEdit}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rx-name-tools">
                        <button type="button" className="rx-correct" onClick={() => startNameEdit(med)}>
                          Make correction
                        </button>
                        {offer?.offer ? (
                          <span className="rx-match">Catalogue: {offer.offer.brand || offer.offer.name}</span>
                        ) : (
                          <span className="rx-match is-miss">Not in catalogue — correct the name if needed</span>
                        )}
                      </div>
                    )}
                    {med.asWritten && med.asWritten !== med.name ? (
                      <p className="rx-salt">Read as {med.asWritten}</p>
                    ) : null}
                    {med.salt ? <p className="rx-salt">{med.salt}</p> : null}
                    <div className="rx-med-stats">
                      <div>
                        <span>For how many days</span>
                        <strong>{durationLabel(med)}</strong>
                      </div>
                      <div>
                        <span>Times a day</span>
                        <strong>{timesADayLabel(med)}</strong>
                      </div>
                    </div>
                    {(med.timing || med.instructions || med.quantity) && (
                      <dl className="rx-med-grid">
                        {med.timing ? (
                          <>
                            <dt>Timing</dt>
                            <dd>{med.timing}</dd>
                          </>
                        ) : null}
                        {med.quantity ? (
                          <>
                            <dt>Qty</dt>
                            <dd>{med.quantity}</dd>
                          </>
                        ) : null}
                        {med.instructions ? (
                          <>
                            <dt>Notes</dt>
                            <dd>{med.instructions}</dd>
                          </>
                        ) : null}
                      </dl>
                    )}
                  </li>
                  );
                })}
              </ol>
            )}
          </div>

          {medicines.length > 0 ? (
            <div className="rx-confirm-box">
              <h3>Confirm medicines</h3>
              <p>Are all medicine names on this digital prescription correct?</p>
              <button
                type="button"
                className={`rx-confirm-tick${parsed?.medicinesConfirmed ? " is-on" : ""}`}
                aria-pressed={Boolean(parsed?.medicinesConfirmed)}
                onClick={() => toggleMedicinesConfirmed(!parsed?.medicinesConfirmed)}
              >
                <span className="rx-tick" aria-hidden="true">
                  {parsed?.medicinesConfirmed ? "✓" : ""}
                </span>
                <span>I confirm all medicines are correct</span>
              </button>
              {parsed?.medicinesConfirmed ? (
                <p className="rx-confirm-ok">Medicines confirmed. You can order now.</p>
              ) : (
                <p className="rx-confirm-wait">Tick the box above, then order.</p>
              )}
            </div>
          ) : null}

          <div className="rx-list-block">
            <h3>Tests</h3>
            {tests.length === 0 && !busy ? (
              <p className="rx-empty">No lab/radiology tests detected.</p>
            ) : (
              <ul className="rx-test-list">
                {tests.map((test) => (
                  <li key={test.id}>
                    <strong>{test.name}</strong>
                    {test.verified === false ? (
                      <span className="rx-chip is-warn">As written — confirm</span>
                    ) : null}
                    {test.notes ? <span>{test.notes}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {parsed?.notes && parsed.aiMode === "live" ? (
            <p className="rx-general-notes">{parsed.notes}</p>
          ) : null}

          <div className="rx-actions" ref={actionsRef}>
            <div className="rx-action-row">
              <button
                type="button"
                className="rx-primary"
                disabled={!medicinesConfirmed || (!availableMeds && !availableTests)}
                onClick={orderAllAvailable}
              >
                Order all available
              </button>
              <button
                type="button"
                className="rx-secondary"
                disabled={!medicinesConfirmed}
                aria-expanded={menu === "meds"}
                onClick={() => setMenu((cur) => (cur === "meds" ? "" : "meds"))}
              >
                Order medicines
              </button>
              <button
                type="button"
                className="rx-secondary"
                aria-expanded={menu === "tests"}
                onClick={() => setMenu((cur) => (cur === "tests" ? "" : "tests"))}
              >
                Book tests
              </button>
              <button type="button" className="rx-secondary" onClick={() => goToHash("#home")}>
                Back to Home
              </button>
            </div>
            {medicines.length > 0 && !parsed?.medicinesConfirmed ? (
              <p className="rx-all-hint">Confirm all medicine names with the tick above before ordering.</p>
            ) : availableMeds || availableTests ? (
              <p className="rx-all-hint">
                {`One click adds ${availableMeds} medicine${availableMeds === 1 ? "" : "s"} from the catalogue${
                  availableTests
                    ? ` and ${availableTests} test${availableTests === 1 ? "" : "s"}`
                    : ""
                } to the cart.`}
              </p>
            ) : null}

            {menu === "meds" ? (
              <div className="rx-menu-panel" role="region" aria-label="Prescribed medicines">
                <p className="rx-menu-title">Medicines on this Rx</p>
                {medOffers.length === 0 ? (
                  <p className="rx-menu-empty">No medicines to order yet.</p>
                ) : (
                  medOffers.map((row) => {
                    const offer = row.offer;
                    const qty = offer ? suggestedPacks(row.rx, offer.packSize) : 1;
                    const inCart = offer && (added[offer.id] || cartHasMedicine(offer.id));
                    const composition = offer?.composition || offer?.salt || "";
                    return (
                      <article key={row.rx.id} className="rx-menu-item">
                        <div>
                          <strong>{offer?.name || row.rx.name}</strong>
                          {offer?.brand ? <span>{offer.brand}</span> : null}
                          <span>
                            {[
                              row.rx.strength || offer?.strength,
                              row.rx.form || offer?.form,
                              offer?.packSize,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                          {composition ? <span>{composition}</span> : null}
                          <span>
                            {durationLabel(row.rx)} · {timesADayLabel(row.rx)}
                          </span>
                        </div>
                        <div className="rx-menu-buy">
                          {offer ? (
                            <>
                              <em>
                                {offer.mrp && offer.mrp > offer.price ? (
                                  <s>₹{offer.mrp}</s>
                                ) : null}{" "}
                                ₹{offer.price}
                              </em>
                              <small>{qty > 1 ? `${qty} packs` : "1 pack"}</small>
                              <button
                                type="button"
                                className="rx-chip-btn"
                                disabled={inCart}
                                onClick={() => addOffer(row)}
                              >
                                {inCart ? "In cart" : "Add to cart"}
                              </button>
                            </>
                          ) : (
                            <small>Not in catalogue</small>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
                {medOffers.some((row) => row.offer) ? (
                  <button type="button" className="rx-menu-all" onClick={addAllMedicines}>
                    Add all listed medicines to cart
                  </button>
                ) : null}
              </div>
            ) : null}

            {menu === "tests" ? (
              <div className="rx-menu-panel" role="region" aria-label="Prescribed tests">
                <p className="rx-menu-title">Tests and partner labs</p>
                {testOffers.length === 0 ? (
                  <p className="rx-menu-empty">No tests to book yet.</p>
                ) : (
                  testOffers.map((offer) => (
                    <article key={offer.rx.id} className="rx-menu-item is-test">
                      <div>
                        <strong>{offer.rx.name}</strong>
                        {offer.rx.notes ? <span>{offer.rx.notes}</span> : null}
                      </div>
                      {offer.matches.length === 0 ? (
                        <small>No partner lab lists this test yet.</small>
                      ) : (
                        <ul className="rx-lab-picks">
                          {offer.matches.map((row) => {
                            const selectedId =
                              labPick[offer.rx.id] || cheapestMatch(offer.matches)?.partnerId;
                            return (
                              <li key={`${offer.rx.id}-${row.partnerId}`}>
                                <label>
                                  <input
                                    type="radio"
                                    name={`lab-${offer.rx.id}`}
                                    checked={selectedId === row.partnerId}
                                    onChange={() =>
                                      setLabPick((prev) => ({
                                        ...prev,
                                        [offer.rx.id]: row.partnerId,
                                      }))
                                    }
                                  />
                                  <span>
                                    {row.partnerName}
                                    {row.partnerArea ? ` · ${row.partnerArea}` : ""}
                                  </span>
                                  <em>₹{row.price}</em>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </article>
                  ))
                )}
                {testOffers.some((offer) => offer.matches.length) ? (
                  <button type="button" className="rx-menu-all" onClick={buySelectedTests}>
                    Buy tests and pay
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
.rx-page{width:100%;max-width:none;margin:0;padding:16px 16px 140px;box-sizing:border-box}
.rx-head{margin:0 0 16px}
.rx-kicker{margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#1a6b7a}
.rx-head h1{margin:0 0 6px;font-size:clamp(22px,4vw,28px);font-weight:800;color:#143246}
.rx-lead{margin:0;font-size:14px;line-height:1.45;color:#5d7180}
.rx-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}
.rx-pane{background:#fff;border:1px solid #e4ecef;border-radius:14px;overflow:visible;min-width:0}
.rx-pane-left{overflow:hidden}
.rx-pane-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid #eef3f6;background:#f7fbfd}
.rx-pane-head h2{margin:0;font-size:15px;font-weight:800;color:#143246}
.rx-pane-head span{font-size:12px;font-weight:600;color:#5d7180;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:46vw}
.rx-pane-head-tools{display:flex;align-items:center;gap:8px;min-width:0;max-width:70%}
.rx-preview{position:relative;padding:12px;min-height:320px;display:flex;align-items:center;justify-content:center;background:#f3f7f9}
.rx-remove{flex:0 0 auto;width:28px;height:28px;border:1px solid #d7c3c3;border-radius:50%;background:#fff;color:#b64b4b;font:inherit;font-size:20px;line-height:1;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0}
.rx-remove:hover,.rx-remove:focus-visible{background:#fdeeee;border-color:#e8b4b4}
.rx-preview img{max-width:100%;max-height:min(70vh,640px);object-fit:contain;border-radius:8px;box-shadow:0 4px 18px rgba(20,50,70,.12)}
.rx-preview iframe{width:100%;height:min(70vh,640px);border:0;background:#fff;border-radius:8px}
.rx-pdf{text-align:center;padding:28px 16px;color:#34546b}
.rx-pdf strong{display:inline-block;padding:8px 12px;border-radius:8px;background:#1a6b7a;color:#fff;font-size:13px}
.rx-pdf-hint{margin:10px 0 0;font-size:12px;color:#5d7180}
.rx-pane-right{padding-bottom:14px}
.rx-rerun,.rx-primary,.rx-secondary{border:0;border-radius:8px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:0 14px}
.rx-rerun{background:#fff;color:#1a6b7a;border:1px solid #c5d8e0}
.rx-rerun:disabled{opacity:.65;cursor:wait}
.rx-status,.rx-empty{margin:12px 14px;font-size:13px;color:#5d7180}
.rx-error{margin:10px 14px;padding:10px 12px;border-radius:8px;background:#fdeeee;color:#b64b4b;font-size:13px;font-weight:600}
.rx-warn{margin:10px 14px;padding:10px 12px;border-radius:8px;background:#fff7e8;color:#8a5a12;font-size:12px;line-height:1.4}
.rx-meta{display:grid;gap:6px;margin:12px 14px;padding:10px 12px;border-radius:10px;background:#f7fbfd;border:1px solid #e4ecef}
.rx-meta p{margin:0;display:flex;justify-content:space-between;gap:10px;font-size:13px}
.rx-meta span{color:#5d7180}
.rx-meta strong{color:#143246;text-align:right}
.rx-list-block{padding:4px 14px 8px}
.rx-list-block h3{margin:10px 0 8px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#1a6b7a}
.rx-med-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px}
.rx-med-list li{padding:12px;border:1px solid #e8eef2;border-radius:10px;background:#fff}
.rx-med-title{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;margin-bottom:10px}
.rx-med-title strong{font-size:15px;color:#143246}
.rx-med-title em{font-style:normal;font-size:13px;font-weight:700;color:#1a6b7a}
.rx-chip{font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:#e8f4f6;color:#1a6b7a}
.rx-chip.is-warn{background:#fff3e6;color:#8a5a12}
.rx-salt{margin:0 0 8px;font-size:12px;color:#5d7180}
.rx-name-tools{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 8px}
.rx-correct{border:1px solid #c5d8e0;border-radius:999px;background:#fff;color:#1a6b7a;font:inherit;font-size:12px;font-weight:700;cursor:pointer;min-height:28px;padding:0 10px}
.rx-correct:hover,.rx-correct:focus-visible{background:#eef7f9}
.rx-match{font-size:12px;color:#1a6b7a;font-weight:650}
.rx-match.is-miss{color:#8a5a12}
.rx-name-edit{display:grid;gap:8px;margin:0 0 10px;padding:10px;border-radius:8px;background:#f7fbfd;border:1px solid #d7e8ec}
.rx-name-edit label{display:grid;gap:4px;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#5d7180}
.rx-name-edit input{min-height:38px;border:1px solid #c5d8e0;border-radius:8px;padding:0 10px;font:inherit;font-size:14px;font-weight:700;color:#143246}
.rx-name-edit-actions{display:flex;flex-wrap:wrap;gap:8px}
.rx-confirm-box{margin:8px 14px 4px;padding:12px;border:1px solid #c5d8e0;border-radius:10px;background:#f3fafb;position:relative;z-index:5;scroll-margin-bottom:140px}
.rx-confirm-box h3{margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#1a6b7a}
.rx-confirm-box p{margin:0 0 10px;font-size:13px;color:#34546b;line-height:1.4}
.rx-confirm-tick{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1px solid #c5d8e0;border-radius:10px;background:#fff;color:#143246;font:inherit;font-size:14px;font-weight:700;cursor:pointer;padding:10px 12px}
.rx-confirm-tick.is-on{border-color:#1a6b7a;background:#e8f4f6}
.rx-tick{flex:0 0 auto;width:22px;height:22px;border:2px solid #1a6b7a;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:14px;line-height:1;color:#1a6b7a;background:#fff}
.rx-confirm-ok{margin:10px 0 0 !important;color:#1a6b7a !important;font-weight:700}
.rx-confirm-wait{margin:10px 0 0 !important;color:#8a5a12 !important}
.rx-med-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 8px}
.rx-med-stats > div{padding:8px 10px;border-radius:8px;background:#f3fafb;border:1px solid #d7e8ec}
.rx-med-stats span{display:block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#5d7180;margin-bottom:2px}
.rx-med-stats strong{font-size:14px;color:#143246}
.rx-med-grid{margin:0;display:grid;grid-template-columns:88px minmax(0,1fr);gap:4px 10px;font-size:13px}
.rx-med-grid dt{margin:0;color:#5d7180;font-weight:600}
.rx-med-grid dd{margin:0;color:#143246;font-weight:650}
.rx-test-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.rx-test-list li{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border:1px solid #e8eef2;border-radius:10px}
.rx-test-list strong{font-size:14px;color:#143246}
.rx-test-list strong{font-size:14px;color:#143246}
.rx-test-list span{font-size:12px;color:#5d7180}
.rx-general-notes{margin:8px 14px 0;font-size:12px;color:#5d7180;line-height:1.4}
.rx-actions{display:flex;flex-direction:column;gap:10px;padding:14px;position:relative;z-index:6;scroll-margin-bottom:140px}
.rx-action-row{display:flex;flex-wrap:wrap;gap:8px}
.rx-all-hint{margin:0;font-size:12px;color:#5d7180;line-height:1.4}
.rx-primary:disabled,.rx-secondary:disabled{opacity:.55;cursor:not-allowed}
.rx-menu-panel{width:100%;max-height:min(52vh,460px);overflow:auto;background:#fff;border:1px solid #d7e8ec;border-radius:12px;box-shadow:0 8px 24px rgba(20,50,70,.12);padding:10px;margin-bottom:8px}
.rx-menu-title{margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#1a6b7a}
.rx-menu-empty{margin:0;font-size:13px;color:#5d7180}
.rx-menu-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:10px;border:1px solid #eef3f6;border-radius:10px;margin-bottom:8px}
.rx-menu-item.is-test{grid-template-columns:1fr}
.rx-menu-item strong{display:block;font-size:14px;color:#143246}
.rx-menu-item span,.rx-menu-item small{display:block;font-size:12px;color:#5d7180;line-height:1.35}
.rx-menu-buy{text-align:right}
.rx-menu-buy em{display:block;font-style:normal;font-size:14px;font-weight:800;color:#143246}
.rx-menu-buy s{color:#8aa0ad;font-weight:600;margin-right:4px}
.rx-chip-btn,.rx-menu-all{border:0;border-radius:8px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;min-height:32px;padding:0 10px;background:#1a6b7a;color:#fff}
.rx-chip-btn:disabled{opacity:.7;background:#5d8a94;cursor:default}
.rx-menu-all{width:100%;margin-top:4px;min-height:38px}
.rx-lab-picks{margin:8px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}
.rx-lab-picks label{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;font-size:13px;color:#143246}
.rx-lab-picks em{font-style:normal;font-weight:800}
.rx-primary{background:#1a6b7a;color:#fff}
.rx-secondary{background:#fff;color:#1a6b7a;border:1px solid #c5d8e0}
.rx-empty-card{padding:28px 18px;text-align:center;border:1px solid #e4ecef;border-radius:14px;background:#fff}
.rx-empty-card p{margin:0 0 14px;color:#5d7180}
@media (max-width:900px){
  .rx-split{grid-template-columns:1fr}
  .rx-preview{min-height:240px}
}
`;
