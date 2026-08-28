import { useMemo, useState } from "react";
import { RELATION_OPTIONS } from "./personFields";
import {
  POINT_VALUES,
  referralShareText,
  spendForReferral,
  useWallet,
} from "./pointsStore";

function readProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem("mediHomeUser") || "null");
    if (!parsed || typeof parsed !== "object") return { name: "" };
    return { name: String(parsed.name || parsed.fullName || "").trim() };
  } catch {
    return { name: "" };
  }
}

function ReferFamily() {
  const wallet = useWallet();
  const me = useMemo(() => readProfile(), []);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    relation: "spouse",
  });
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      next.mobile = "Enter a valid 10-digit mobile number.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    const result = spendForReferral({
      name: form.name.trim(),
      mobile: form.mobile,
      relation: form.relation,
    });
    if (!result.ok) {
      setErrors({
        points: `You need ${POINT_VALUES.referral} points to send an invite. Attend a webinar or attempt a quiz first.`,
      });
      return;
    }
    setDone(result.referral);
    setForm({ name: "", mobile: "", relation: "spouse" });
  };

  const shareHref = done
    ? `https://wa.me/91${done.mobile}?text=${encodeURIComponent(
        referralShareText(done, me.name)
      )}`
    : "";

  return (
    <>
    <article className="points-refer-card">
      <h2>Refer Family And Friends</h2>
      <p>
        Send a personal invite with a family code they can mention when they
        register.
      </p>

      {done ? (
        <div className="points-refer-done">
          <p>
            Invite ready for <strong>{done.name}</strong>. Family code{" "}
            <strong>{done.id}</strong>. {POINT_VALUES.referral} referral points
            used.
          </p>
          <a className="points-share-btn" href={shareHref} target="_blank" rel="noreferrer">
            Send on WhatsApp
          </a>
          <button type="button" className="points-ghost-btn" onClick={() => setDone(null)}>
            Refer someone else
          </button>
        </div>
      ) : (
        <form className="points-refer-form" onSubmit={handleSubmit}>
          {errors.points ? <p className="points-error">{errors.points}</p> : null}
          <label>
            Their name
            <input
              value={form.name}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, name: event.target.value }));
                setErrors((prev) => ({ ...prev, name: "", points: "" }));
              }}
            />
            {errors.name ? <span>{errors.name}</span> : null}
          </label>
          <label>
            Their mobile
            <input
              inputMode="numeric"
              maxLength={10}
              value={form.mobile}
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  mobile: event.target.value.replace(/\D/g, ""),
                }));
                setErrors((prev) => ({ ...prev, mobile: "", points: "" }));
              }}
            />
            {errors.mobile ? <span>{errors.mobile}</span> : null}
          </label>
          <label>
            Relation
            <select
              value={form.relation}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, relation: event.target.value }))
              }
            >
              <option value="">Select</option>
              {RELATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="points-share-btn"
            disabled={wallet.balance < POINT_VALUES.referral}
          >
            Use {POINT_VALUES.referral} of {wallet.balance} points to refer
          </button>
          {wallet.balance < POINT_VALUES.referral ? (
            <p className="points-hint">
              Earn points in <a href="#education">Health Education</a> by
              attending a webinar (+{POINT_VALUES.webinar}) or attempting a quiz
              (+{POINT_VALUES.quiz}).
            </p>
          ) : null}
        </form>
      )}

      {wallet.referrals.length ? (
        <ul className="points-refer-list">
          {wallet.referrals.map((row) => (
            <li key={row.id}>
              <strong>{row.name}</strong>
              <span>
                {row.relation} · {row.mobile} · {row.id}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
    <style>{referStyles}</style>
    </>
  );
}

const referStyles = `
.points-refer-card{padding:16px;border:1px solid #e4ecef;border-radius:14px;background:#fff;box-shadow:0 2px 8px rgba(20,50,70,.06);color:#143246}
.points-kicker{display:inline-block;margin:0 0 8px;padding:3px 8px;border-radius:999px;background:#e8f4f6;color:#1a6b7a;font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase}
.points-refer-card h2{margin:0 0 8px;font-size:18px}
.points-refer-card p{margin:0 0 12px;color:#5d7180;font-size:14px;line-height:1.45}
.points-balance-line{margin:0 0 14px;padding:10px 12px;border-radius:8px;background:#0639b8;color:#fff;font-size:14px}
.points-balance-line strong{font-size:20px}
.points-refer-form{display:grid;gap:10px}
.points-refer-form label{display:grid;gap:4px;font-size:12px;font-weight:700;color:#1a6b7a}
.points-refer-form input,.points-refer-form select{height:38px;min-height:38px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;font-weight:500;color:#143246;background:#fff}
.points-refer-form span,.points-error{color:#b42318;font-weight:700;font-size:12px}
.points-share-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:8px 16px;border:2px solid #0639b8;border-radius:10px;background:#0639b8;color:#fff;font:inherit;font-size:14px;font-weight:800;text-decoration:none;cursor:pointer}
.points-share-btn:disabled{opacity:.45;cursor:not-allowed}
.points-ghost-btn{appearance:none;min-height:40px;padding:8px 16px;border:2px solid #1a6b7a;border-radius:10px;background:#fff;color:#1a6b7a;font:inherit;font-weight:800;cursor:pointer}
.points-hint{margin:0;font-size:13px}
.points-hint a{color:#1a6b7a;font-weight:800;text-decoration:none}
.points-refer-done{display:grid;gap:10px}
.points-refer-list{margin:16px 0 0;padding:0;list-style:none}
.points-refer-list li{padding:8px 0;border-top:1px solid #edf1f3;display:flex;flex-direction:column;gap:2px;font-size:13px}
.points-refer-list span{color:#5d7180}
`;

export default ReferFamily;
