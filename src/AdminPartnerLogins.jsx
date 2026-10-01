import { Fragment, useState } from "react";
import {
  confirmStaffPartnerReset,
  confirmStaffPartnerSplit,
  createStaffPartner,
  requestStaffPartnerReset,
  requestStaffPartnerSplit,
  setStaffPartnerLogin,
} from "./adminApi";
import { kindLabel, partnerRole } from "./orderTracking";
import { defaultPartnerPercentFor } from "./paymentSplit";
import {
  PARTNER_CATEGORY_TABS,
  countPartnersInCategory,
  partnerCategoryLabel,
  partnerCreateLocation,
  partnerUpdateShowsSplit,
  partnersInCategory,
} from "./partnerAdmin";
import { partnerPasswordResetLabel, partnerResetDeliveryMessage } from "./partnerResetCopy";

const emptyCreate = (kind = "medicine") => ({
  name: "",
  role: partnerRole(kind),
  kinds: [kind],
  mobile: "",
  address: "",
  pin: "",
  password: "",
});

export default function AdminPartnerLogins({ partners, onChange }) {
  const [category, setCategory] = useState("");
  const [adding, setAdding] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [create, setCreate] = useState(() => emptyCreate("medicine"));
  const [busyId, setBusyId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [resetFor, setResetFor] = useState("");
  const [resetDraft, setResetDraft] = useState({
    password: "",
    otp: "",
    phase: "",
    info: "",
  });
  const [splitFor, setSplitFor] = useState("");
  const [splitDraft, setSplitDraft] = useState({
    partnerPercent: "",
    otp: "",
    phase: "",
    info: "",
  });

  const listed = partnersInCategory(partners, category);

  const draftFor = (partner) =>
    drafts[partner.id] || {
      loginId: partner.loginId || partner.mobile || "",
      password: "",
    };

  const saveLogin = async (partner) => {
    const draft = draftFor(partner);
    const loginId = String(draft.loginId || "").replace(/\D/g, "").slice(0, 10);
    const password = String(draft.password || "").replace(/\D/g, "").slice(0, 6);
    if (!/^\d{10}$/.test(loginId)) {
      setError("Login ID is the 10-digit mobile number.");
      return;
    }
    if (password ? !/^\d{6}$/.test(password) : !partner.hasLogin) {
      setError("Password must be exactly 6 digits.");
      return;
    }
    setBusyId(partner.id);
    setError("");
    setNote("");
    try {
      const data = await setStaffPartnerLogin(partner.id, {
        loginId,
        password,
      });
      onChange?.(data.partners || []);
      setDrafts((current) => ({
        ...current,
        [partner.id]: {
          loginId: data.partner?.loginId || draft.loginId,
          password: "",
        },
      }));
      setNote(`Login Saved For ${partner.name}.`);
    } catch (err) {
      setError(err.message || "Could Not Save Partner Login.");
    } finally {
      setBusyId("");
    }
  };

  const openSplit = (partner) => {
    setSplitFor(partner.id);
    setResetFor("");
    setSplitDraft({
      partnerPercent: String(
        partner.partnerPercent ?? defaultPartnerPercentFor(partner.kinds?.[0])
      ),
      otp: "",
      phase: "",
      info: "",
    });
    setError("");
    setNote("");
  };

  const sendSplitOtp = async (partner) => {
    const partnerPercent = Number(splitDraft.partnerPercent);
    if (!Number.isFinite(partnerPercent) || partnerPercent < 0 || partnerPercent > 100) {
      setError("Partner split must be between 0 and 100.");
      return;
    }
    setBusyId(`split-${partner.id}`);
    setError("");
    setNote("");
    try {
      const data = await requestStaffPartnerSplit(partner.id, partnerPercent);
      setSplitDraft((current) => ({
        ...current,
        partnerPercent: String(partnerPercent),
        phase: "otp",
        info: partnerResetDeliveryMessage(data),
      }));
    } catch (err) {
      setError(err.message || "Could not send the split OTP.");
    } finally {
      setBusyId("");
    }
  };

  const confirmSplit = async (partner) => {
    const otp = String(splitDraft.otp || "").replace(/\D/g, "").slice(0, 6);
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setBusyId(`split-${partner.id}`);
    setError("");
    setNote("");
    try {
      const data = await confirmStaffPartnerSplit(partner.id, otp);
      onChange?.(data.partners || []);
      setSplitFor("");
      setSplitDraft({ partnerPercent: "", otp: "", phase: "", info: "" });
      setNote(`Split updated for ${partner.name}: partner ${data.partner?.partnerPercent}%.`);
    } catch (err) {
      setError(err.message || "Could not update the partner split.");
    } finally {
      setBusyId("");
    }
  };

  const openReset = (partner) => {
    setResetFor(partner.id);
    setSplitFor("");
    setResetDraft({ password: "", otp: "", phase: "", info: "" });
    setError("");
    setNote("");
  };

  const sendResetOtp = async (partner) => {
    const password = String(resetDraft.password || "").replace(/\D/g, "").slice(0, 6);
    if (!/^\d{6}$/.test(password)) {
      setError("Password must be exactly 6 digits.");
      return;
    }
    setBusyId(`reset-${partner.id}`);
    setError("");
    setNote("");
    try {
      const data = await requestStaffPartnerReset(partner.id, password);
      setResetDraft((current) => ({
        ...current,
        password,
        phase: "otp",
        info: partnerResetDeliveryMessage(data),
      }));
    } catch (err) {
      setError(err.message || "Could not send the reset OTP.");
    } finally {
      setBusyId("");
    }
  };

  const confirmReset = async (partner) => {
    const otp = String(resetDraft.otp || "").replace(/\D/g, "").slice(0, 6);
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setBusyId(`reset-${partner.id}`);
    setError("");
    setNote("");
    try {
      const data = await confirmStaffPartnerReset(partner.id, otp);
      onChange?.(data.partners || []);
      setResetFor("");
      setResetDraft({ password: "", otp: "", phase: "", info: "" });
      setNote(`Password reset for ${partner.name}. They sign in with the new 6-digit password.`);
    } catch (err) {
      setError(err.message || "Could not reset the password.");
    } finally {
      setBusyId("");
    }
  };

  const setCreateKind = (kind) => {
    setCreate((current) => {
      const keepRole = current.role && current.role !== partnerRole(current.kinds[0]);
      return {
        ...current,
        kinds: [kind],
        role: keepRole ? current.role : partnerRole(kind),
      };
    });
  };

  const openAdd = () => {
    setAdding(true);
    setCreate(emptyCreate(category || "medicine"));
    setError("");
    setNote("");
  };

  const addPartner = async (event) => {
    event.preventDefault();
    const kind = create.kinds[0] || category;
    const location = partnerCreateLocation(create);
    if (!location.ok) {
      setError(location.error);
      return;
    }
    if (!/^\d{10}$/.test(create.mobile)) {
      setError("Login ID is the 10-digit mobile number.");
      return;
    }
    if (!/^\d{6}$/.test(create.password)) {
      setError("Password must be exactly 6 digits.");
      return;
    }
    setBusyId("new");
    setError("");
    setNote("");
    try {
      const payload = {
        ...create,
        kinds: [kind],
        role: create.role || partnerRole(kind),
        address: location.address,
        pin: location.pin,
        pinCode: location.pin,
        pins: location.pins,
      };
      delete payload.partnerPercent;
      const data = await createStaffPartner(payload);
      onChange?.(data.partners || []);
      setCategory(kind);
      setAdding(true);
      setCreate(emptyCreate(kind));
      setNote(
        `Partner Saved. Share the mobile number (login ID) and 6-digit password with ${data.partner?.name || "the partner"}.`
      );
    } catch (err) {
      setError(err.message || "Could Not Create Partner.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="admin-panel admin-feature-panel admin-partners-box" aria-label="Partners">
      <div className="admin-feature-head">
        <div>
          <h2>Partners</h2>
        </div>
        <button type="button" className="admin-feature-save" onClick={openAdd}>
          Add partner
        </button>
      </div>
      <div
        className="admin-switches admin-order-service-tiles"
        role="tablist"
        aria-label="Partner category"
      >
        {PARTNER_CATEGORY_TABS.map((tab) => {
          const count = countPartnersInCategory(partners, tab.value);
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={category === tab.value}
              className={category === tab.value ? "is-on" : ""}
              onClick={() => {
                setCategory(tab.value);
                setAdding(false);
              }}
            >
              <span>{tab.label}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
      {note ? <p className="admin-hint">{note}</p> : null}

      {adding ? (
        <form className="admin-partner-create" onSubmit={addPartner}>
          <h3>Add partner</h3>
          <div className="admin-partner-grid">
            <label>
              Partner category
              <select
                value={create.kinds[0] || category}
                onChange={(event) => setCreateKind(event.target.value)}
                required
              >
                {PARTNER_CATEGORY_TABS.map((tab) => (
                  <option key={tab.value} value={tab.value}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Name
              <input
                value={create.name}
                onChange={(event) => setCreate((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
            <label>
              Role
              <input
                value={create.role}
                onChange={(event) => setCreate((current) => ({ ...current, role: event.target.value }))}
                placeholder={partnerRole(create.kinds[0])}
              />
            </label>
            <label>
              Mobile
              <input
                inputMode="numeric"
                autoComplete="tel"
                value={create.mobile}
                onChange={(event) =>
                  setCreate((current) => ({
                    ...current,
                    mobile: event.target.value.replace(/\D/g, "").slice(0, 10),
                  }))
                }
                placeholder="10-digit mobile"
                required
                minLength={10}
                maxLength={10}
                pattern="\d{10}"
              />
              <span className="admin-outlet-area">Login ID</span>
            </label>
            <label>
              Password
              <input
                type="password"
                inputMode="numeric"
                value={create.password}
                onChange={(event) =>
                  setCreate((current) => ({
                    ...current,
                    password: event.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
                placeholder="6-digit password"
                autoComplete="new-password"
                required
                minLength={6}
                maxLength={6}
                pattern="\d{6}"
              />
            </label>
            <label>
              Address
              <input
                value={create.address}
                onChange={(event) =>
                  setCreate((current) => ({ ...current, address: event.target.value }))
                }
                placeholder="Street, area, city"
                required
              />
            </label>
            <label>
              PIN
              <input
                inputMode="numeric"
                value={create.pin}
                onChange={(event) =>
                  setCreate((current) => ({
                    ...current,
                    pin: event.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
                placeholder="6-digit PIN"
                required
                minLength={6}
                maxLength={6}
                pattern="\d{6}"
              />
            </label>
          </div>
          <div className="admin-feature-actions">
            <button type="submit" className="admin-feature-save" disabled={busyId === "new"}>
              {busyId === "new" ? "Saving…" : "Save partner"}
            </button>
            <button
              type="button"
              className="admin-feature-reset"
              onClick={() => {
                setAdding(false);
                setCreate(emptyCreate(category || "medicine"));
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : !category ? null : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Partner</th>
                <th>Category</th>
                <th>Login ID</th>
                <th>Password</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listed.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    No {partnerCategoryLabel(category)} partners yet.
                  </td>
                </tr>
              ) : (
                listed.map((partner) => {
                  const draft = draftFor(partner);
                  const resetLabel = partnerPasswordResetLabel(partner);
                  const resetOpen = resetFor === partner.id;
                  const splitOpen = splitFor === partner.id;
                  const columnCount = 6;
                  return (
                    <Fragment key={partner.id}>
                    <tr>
                      <td>
                        {partner.name}
                        {partner.mobile ? (
                          <>
                            <br />
                            <span className="admin-outlet-area">{partner.mobile}</span>
                          </>
                        ) : null}
                        {partner.role ? (
                          <>
                            <br />
                            <span className="admin-outlet-area">{partner.role}</span>
                          </>
                        ) : null}
                      </td>
                      <td>
                        {(partner.kinds || []).map((kind) => kindLabel(kind)).join(", ") ||
                          partnerCategoryLabel(category)}
                      </td>
                      <td>
                        <input
                          aria-label={`Login ID for ${partner.name}`}
                          inputMode="numeric"
                          maxLength={10}
                          value={draft.loginId}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [partner.id]: {
                                ...draft,
                                loginId: event.target.value.replace(/\D/g, "").slice(0, 10),
                              },
                            }))
                          }
                          placeholder="10-digit mobile"
                        />
                      </td>
                      <td>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={6}
                          aria-label={`Password for ${partner.name}`}
                          value={draft.password}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [partner.id]: {
                                ...draft,
                                password: event.target.value.replace(/\D/g, "").slice(0, 6),
                              },
                            }))
                          }
                          placeholder="6-digit password"
                          autoComplete="new-password"
                        />
                      </td>
                      <td>
                        {partner.hasLogin ? "Login Set" : "Needs First Login"}
                        {resetLabel ? (
                          <>
                            <br />
                            <span className="admin-outlet-area">{resetLabel}</span>
                          </>
                        ) : null}
                      </td>
                      <td>
                        <button
                          type="button"
                          disabled={busyId === partner.id}
                          onClick={() => saveLogin(partner)}
                        >
                          {busyId === partner.id ? "Saving…" : "Save Login"}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === `reset-${partner.id}`}
                          onClick={() => (resetOpen ? setResetFor("") : openReset(partner))}
                        >
                          {resetOpen ? "Cancel" : "Reset password"}
                        </button>
                        {partnerUpdateShowsSplit(category) ? (
                          <button
                            type="button"
                            disabled={busyId === `split-${partner.id}`}
                            onClick={() => (splitOpen ? setSplitFor("") : openSplit(partner))}
                          >
                            {splitOpen ? "Cancel" : "Update split"}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                    {resetOpen ? (
                      <tr>
                        <td colSpan={columnCount}>
                          <div className="admin-partner-reset">
                            <p className="admin-hint">
                              Enter the new 6-digit password. An OTP is texted to the partner&apos;s
                              registered mobile when an SMS gateway is configured. The password is saved
                              only after that OTP is entered.
                            </p>
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={6}
                              aria-label={`New password for ${partner.name}`}
                              placeholder="New 6-digit password"
                              autoComplete="new-password"
                              value={resetDraft.password}
                              onChange={(event) =>
                                setResetDraft((current) => ({
                                  ...current,
                                  password: event.target.value.replace(/\D/g, "").slice(0, 6),
                                  phase: current.phase === "otp" ? "" : current.phase,
                                  otp: current.phase === "otp" ? "" : current.otp,
                                  info: current.phase === "otp" ? "" : current.info,
                                }))
                              }
                            />
                            <button
                              type="button"
                              disabled={busyId === `reset-${partner.id}`}
                              onClick={() => sendResetOtp(partner)}
                            >
                              {busyId === `reset-${partner.id}` && resetDraft.phase !== "otp"
                                ? "Sending…"
                                : resetDraft.phase === "otp"
                                  ? "Send OTP again"
                                  : "Send OTP"}
                            </button>
                            {resetDraft.phase === "otp" ? (
                              <>
                                {resetDraft.info ? <p className="admin-hint">{resetDraft.info}</p> : null}
                                <input
                                  inputMode="numeric"
                                  maxLength={6}
                                  aria-label={`OTP for ${partner.name}`}
                                  placeholder="6-digit OTP"
                                  autoComplete="one-time-code"
                                  value={resetDraft.otp}
                                  onChange={(event) =>
                                    setResetDraft((current) => ({
                                      ...current,
                                      otp: event.target.value.replace(/\D/g, "").slice(0, 6),
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  disabled={busyId === `reset-${partner.id}`}
                                  onClick={() => confirmReset(partner)}
                                >
                                  {busyId === `reset-${partner.id}` ? "Saving…" : "Confirm reset"}
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                    {splitOpen ? (
                      <tr>
                        <td colSpan={columnCount}>
                          <div className="admin-partner-reset">
                            <p className="admin-hint">
                              Update split texts an OTP to the partner&apos;s registered mobile when an
                              SMS gateway is configured. The percent is saved only after that OTP is
                              entered. Without a gateway the code is stored but not texted.
                            </p>
                            <label>
                              Partner split %
                              <input
                                type="number"
                                min={0}
                                max={100}
                                aria-label={`Partner split percent for ${partner.name}`}
                                value={splitDraft.partnerPercent}
                                onChange={(event) =>
                                  setSplitDraft((current) => ({
                                    ...current,
                                    partnerPercent: event.target.value,
                                    phase: current.phase === "otp" ? "" : current.phase,
                                    otp: current.phase === "otp" ? "" : current.otp,
                                    info: current.phase === "otp" ? "" : current.info,
                                  }))
                                }
                              />
                            </label>
                            <span className="admin-outlet-area">
                              MediHome {100 - Number(splitDraft.partnerPercent || 0)}%
                            </span>
                            <button
                              type="button"
                              disabled={busyId === `split-${partner.id}`}
                              onClick={() => sendSplitOtp(partner)}
                            >
                              {busyId === `split-${partner.id}` && splitDraft.phase !== "otp"
                                ? "Sending…"
                                : splitDraft.phase === "otp"
                                  ? "Send OTP again"
                                  : "Send OTP"}
                            </button>
                            {splitDraft.phase === "otp" ? (
                              <>
                                {splitDraft.info ? <p className="admin-hint">{splitDraft.info}</p> : null}
                                <input
                                  inputMode="numeric"
                                  maxLength={6}
                                  aria-label={`Split OTP for ${partner.name}`}
                                  placeholder="6-digit OTP"
                                  autoComplete="one-time-code"
                                  value={splitDraft.otp}
                                  onChange={(event) =>
                                    setSplitDraft((current) => ({
                                      ...current,
                                      otp: event.target.value.replace(/\D/g, "").slice(0, 6),
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  disabled={busyId === `split-${partner.id}`}
                                  onClick={() => confirmSplit(partner)}
                                >
                                  {busyId === `split-${partner.id}` ? "Saving…" : "Update split"}
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
