import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./apiBase";
import { partnerSession } from "./partnerApi";
import { catalogLabIdForPartner, withCommonLabPanel } from "./commonLabPanel";
import { mergeAddedLabTests } from "./labTestSplit";
import { defaultPartnerPercentFor } from "./paymentSplit";
import { watchLiveGps } from "./pinLocation";
import {
  buildSampleTubes,
  collectorLocationFields,
  normalizeReportResults,
  parseAnalyzerFeed,
  resultRowsFromOrder,
} from "./labAccession";
import { AccessionBarcode } from "./LabTrackFacts";
import { diagnosticKindOf } from "./labPipeline";

function partnerAuthHeaders() {
  const { token } = partnerSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export function LabPartnerCatalog({ partner }) {
  const labId = catalogLabIdForPartner(partner);
  const [added, setAdded] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    apiFetch("/api/lab-tests")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setAdded(Array.isArray(data?.tests) ? data.tests : []))
      .catch(() => {});
  };

  useEffect(load, []);

  const catalog = mergeAddedLabTests(withCommonLabPanel(), added).find((lab) => lab.id === labId);
  const tests = catalog?.tests || [];
  const own = added.filter((row) => row.labId === labId && !row.override);

  const save = async (event) => {
    event.preventDefault();
    setError("");
    setNote("");
    setBusy(true);
    try {
      const res = await apiFetch("/api/partner/lab-tests", {
        method: "POST",
        headers: partnerAuthHeaders(),
        body: JSON.stringify({
          name,
          price: Number(price),
          labId,
          partnerPercent: defaultPartnerPercentFor("lab"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not add the test.");
      setName("");
      setPrice("");
      setAdded(data.tests || []);
      setNote(`${data.test?.name || "Test"} is now on the customer lab list.`);
    } catch (err) {
      setError(err.message || "Could not add the test.");
    } finally {
      setBusy(false);
    }
  };

  const setPriceFor = async (test, nextPrice, hidden = false) => {
    setBusy(true);
    setError("");
    try {
      const owned = own.find((row) => row.id === test.id || row.code === test.id);
      const res = owned
        ? await apiFetch(`/api/partner/lab-tests/${encodeURIComponent(owned.id)}`, {
            method: "PATCH",
            headers: partnerAuthHeaders(),
            body: JSON.stringify({ name: test.name, price: Number(nextPrice), hidden }),
          })
        : await apiFetch("/api/partner/lab-prices", {
            method: "POST",
            headers: partnerAuthHeaders(),
            body: JSON.stringify({
              code: test.id,
              name: test.name,
              price: Number(nextPrice),
              hidden,
              partnerPercent: defaultPartnerPercentFor("lab"),
            }),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update the test.");
      setAdded(data.tests || []);
      setNote(hidden ? `${test.name} is hidden from customers.` : `${test.name} price updated.`);
    } catch (err) {
      setError(err.message || "Could not update the test.");
    } finally {
      setBusy(false);
    }
  };

  const removeOwned = async (test) => {
    const owned = own.find((row) => row.id === test.id);
    if (!owned) {
      await setPriceFor(test, test.price, true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/api/partner/lab-tests/${encodeURIComponent(owned.id)}`, {
        method: "DELETE",
        headers: partnerAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not remove the test.");
      setAdded(data.tests || []);
      setNote(`${test.name} was removed.`);
    } catch (err) {
      setError(err.message || "Could not remove the test.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="lab-partner-catalog" onSubmit={save}>
      <p className="partner-collect-title">Lab tests customers can book</p>
      <p className="partner-report-note">
        Set this lab's own price, hide a test, or add one. Prices are no longer only a copy of the shared panel.
      </p>
      <ul className="lab-catalog-edit">
        {tests.slice(0, 12).map((test) => (
          <li key={test.id || test.name}>
            <span>{test.name}</span>
            <input
              defaultValue={test.price}
              aria-label={`${test.name} price`}
              inputMode="decimal"
              onBlur={(event) => {
                const next = Number(event.target.value);
                if (next > 0 && next !== Number(test.price)) setPriceFor(test, next);
              }}
            />
            <button type="button" disabled={busy} onClick={() => removeOwned(test)}>
              {own.some((row) => row.id === test.id) ? "Remove" : "Hide"}
            </button>
          </li>
        ))}
      </ul>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="New test name"
        aria-label="Test name"
        disabled={busy}
      />
      <input
        value={price}
        onChange={(event) => setPrice(event.target.value.replace(/[^\d.]/g, ""))}
        placeholder="Price in rupees"
        aria-label="Test price"
        inputMode="decimal"
        disabled={busy}
      />
      <button type="submit" className="partner-accept" disabled={busy || !name.trim() || !price}>
        Add test
      </button>
      {error ? <small className="admin-error">{error}</small> : null}
      {note ? <p className="partner-report-note">{note}</p> : null}
    </form>
  );
}

export function SampleTubePanel({ job, onChange }) {
  const tubes = buildSampleTubes(job);
  const update = (id, patch) => {
    const next = tubes.map((row) => (row.id === id ? { ...row, ...patch } : row));
    onChange?.(next);
  };
  return (
    <div className="lab-tubes">
      <p className="partner-collect-title">Sample tubes</p>
      <ul>
        {tubes.map((tube) => (
          <li key={tube.id}>
            <strong>
              {tube.tube} · {tube.barcode}
            </strong>
            <span>{(tube.tests || []).join(", ")}</span>
            <span>{tube.status}</span>
            {tube.status === "collected" ? (
              <button
                type="button"
                onClick={() => {
                  const reason = window.prompt("Reason for rejection") || "";
                  if (!reason.trim()) return;
                  update(tube.id, { status: "rejected", reason: reason.trim() });
                }}
              >
                Reject
              </button>
            ) : null}
            {tube.status === "rejected" ? (
              <button type="button" onClick={() => update(tube.id, { status: "redraw", reason: tube.reason })}>
                Ask for redraw
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CollectorLiveShare({ job, busy, onShare }) {
  const [sharing, setSharing] = useState(Boolean(job?.collectorLive));
  const [message, setMessage] = useState("");
  const stopRef = useRef(null);
  const lastSent = useRef(0);

  useEffect(() => {
    return () => stopRef.current?.();
  }, []);

  const stop = () => {
    stopRef.current?.();
    stopRef.current = null;
    setSharing(false);
  };

  const start = () => {
    setMessage("");
    stopRef.current?.();
    setSharing(true);
    stopRef.current = watchLiveGps(
      (fix) => {
        const now = Date.now();
        if (now - lastSent.current < 8000) return;
        lastSent.current = now;
        const fields = collectorLocationFields(fix, now);
        if (fields) onShare(fields);
        setMessage("Live location is reaching the customer.");
      },
      (error) => {
        setSharing(false);
        setMessage(error?.message || "Could not read this phone's location.");
      }
    );
  };

  if (String(job?.visitType || "home") === "centre") return null;

  return (
    <div className="lab-live-share">
      <p className="partner-collect-title">Share collector location</p>
      <button type="button" className="partner-accept" disabled={busy || sharing} onClick={start}>
        {sharing ? "Sharing live location" : "Share live location"}
      </button>
      {sharing ? (
        <button type="button" className="partner-decline" disabled={busy} onClick={stop}>
          Stop sharing
        </button>
      ) : null}
      {message ? <p className="partner-report-note">{message}</p> : null}
    </div>
  );
}

export function AnalyzerLinkFields({ job, onChange }) {
  const radiology = diagnosticKindOf(job) === "radiology";
  const [name, setName] = useState(job?.analyzerName || "");
  const [ref, setRef] = useState(job?.analyzerRef || "");
  const emit = (nextName, nextRef) => onChange({ analyzerName: nextName, analyzerRef: nextRef });
  return (
    <div className="lab-analyzer">
      <p className="partner-collect-title">{radiology ? "PACS / machine id" : "Analyzer link"}</p>
      <p className="partner-report-note">
        Scan the accession barcode into the {radiology ? "imaging machine" : "analyzer"}, then enter the sample id it shows.
      </p>
      <input
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          emit(event.target.value, ref);
        }}
        placeholder={radiology ? "Machine name" : "Analyzer name"}
        aria-label="Analyzer name"
      />
      <input
        value={ref}
        onChange={(event) => {
          setRef(event.target.value);
          emit(name, event.target.value);
        }}
        placeholder="Sample id on the machine"
        aria-label="Analyzer sample id"
      />
    </div>
  );
}

export function ReportResultEditor({ job, rows, onChange }) {
  const list = rows?.length ? rows : resultRowsFromOrder(job);
  const [cableNote, setCableNote] = useState("");
  const update = (index, patch) => {
    const next = list.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(normalizeReportResults(next));
  };
  const applyFeed = (text) => {
    const parsed = parseAnalyzerFeed(text);
    if (parsed.length) {
      onChange(parsed);
      setCableNote(`Read ${parsed.length} result${parsed.length === 1 ? "" : "s"} from the analyzer.`);
      return;
    }
    setCableNote("No results were read. Check the cable, or import the analyzer CSV.");
  };
  const readCable = async () => {
    const serial = globalThis.navigator?.serial;
    if (!serial?.requestPort) {
      setCableNote("Open this desk in Chrome or Edge, then connect the analyzer cable.");
      return;
    }
    let port;
    try {
      port = await serial.requestPort();
      await port.open({ baudRate: 9600 });
      const reader = port.readable?.getReader();
      if (!reader) throw new Error("The analyzer port did not open.");
      const decoder = new TextDecoder();
      let text = "";
      const deadline = Date.now() + 8000;
      while (Date.now() < deadline) {
        const next = await Promise.race([
          reader.read(),
          new Promise((resolve) => setTimeout(() => resolve({ done: true }), 1200)),
        ]);
        if (next?.done) break;
        if (next?.value) text += decoder.decode(next.value, { stream: true });
      }
      text += decoder.decode();
      reader.releaseLock();
      applyFeed(text);
    } catch (err) {
      setCableNote(err?.message || "The analyzer cable could not be read.");
    } finally {
      try {
        await port?.close?.();
      } catch {
        /* the port may already be closed */
      }
    }
  };
  return (
    <div className="lab-result-editor">
      <p className="partner-collect-title">Result for each test</p>
      <p className="partner-report-note">
        Connect the analyzer cable in Chrome or Edge, or import the CSV it exported.
      </p>
      <button type="button" onClick={readCable}>Read from analyzer</button>
      <input
        type="file"
        accept=".csv,text/csv"
        aria-label="Analyzer CSV"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => applyFeed(String(reader.result || ""));
          reader.readAsText(file);
        }}
      />
      {cableNote ? <p className="partner-report-note">{cableNote}</p> : null}
      {list.map((row, index) => (
        <div className="lab-result-row" key={`${row.name}-${index}`}>
          <strong>{row.name}</strong>
          <input
            value={row.value}
            onChange={(event) => update(index, { value: event.target.value })}
            placeholder="Value"
            aria-label={`${row.name} value`}
          />
          <input
            value={row.unit}
            onChange={(event) => update(index, { unit: event.target.value })}
            placeholder="Unit"
            aria-label={`${row.name} unit`}
          />
          <input
            value={row.reference}
            onChange={(event) => update(index, { reference: event.target.value })}
            placeholder="Reference"
            aria-label={`${row.name} reference`}
          />
        </div>
      ))}
      <p className="lab-accession-label">
        {job.accessionNo ? `Accession ${job.accessionNo}` : "Accession is created when the sample or scan is marked."}
      </p>
      {job.accessionNo ? <AccessionBarcode value={job.accessionNo} /> : null}
    </div>
  );
}
