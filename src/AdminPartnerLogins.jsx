import { Fragment, useState } from "react";
import { AdminSectionGuard } from "./adminLeave";
import {
  confirmStaffPartnerReset,
  confirmStaffPartnerSplit,
  createStaffPartner,
  deleteStaffPartner,
  patchStaffPartner,
  requestStaffPartnerReset,
  requestStaffPartnerSplit,
  setStaffPartnerLogin,
} from "./adminApi";
import { kindLabel, partnerRole } from "./orderTracking";
import { teamDocumentSummary, teamFrom, teamStatusLabel } from "./partnerTeam.js";
import { defaultPartnerPercentFor } from "./paymentSplit";
import {
  PARTNER_CATEGORY_TABS,
  countPartnersInCategory,
  partnerCategoryLabel,
  partnerCreateLocation,
  partnerPrimaryKind,
  partnerServicePins,
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
  const [editingId, setEditingId] = useState("");
  const [edit, setEdit] = useState(() => emptyCreate("medicine"));
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
      return false;
    }
    if (password ? !/^\d{6}$/.test(password) : !partner.hasLogin) {
      setError("Password must be exactly 6 digits.");
      return false;
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
      return true;
    } catch (err) {
      setError(err.message || "Could Not Save Partner Login.");
      return false;
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
      return false;
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
      return false;
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
      return true;
    } catch (err) {
      setError(err.message || "Could not update the partner split.");
      return false;
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
      return false;
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
      return true;
    } catch (err) {
      setError(err.message || "Could not reset the password.");
      return false;
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
    setEditingId("");
    setCreate(emptyCreate(category || "medicine"));
    setError("");
    setNote("");
  };

  const openEdit = (partner) => {
    const kind = partnerPrimaryKind(partner);
    setAdding(false);
    setResetFor("");
    setSplitFor("");
    setEditingId(partner.id);
    setEdit({
      name: partner.name || "",
      role: partner.role || partnerRole(kind),
      kinds: [kind],
      mobile: partner.mobile || partner.loginId || "",
      address: partner.address || "",
      pin: partnerServicePins(partner)[0] || "",
      password: "",
    });
    setError("");
    setNote("");
  };

  const saveEdit = async (event) => {
    event?.preventDefault?.();
    const partner = listed.find((row) => row.id === editingId);
    if (!partner) return false;
    const kind = edit.kinds[0] || partnerPrimaryKind(partner);
    const location = partnerCreateLocation(edit);
    if (!location.ok) {
      setError(location.error);
      return false;
    }
    if (!/^\d{10}$/.test(edit.mobile)) {
      setError("Login ID is the 10-digit mobile number.");
      return false;
    }
    setBusyId(`edit-${partner.id}`);
    setError("");
    setNote("");
    try {
      const data = await patchStaffPartner(partner.id, {
        name: edit.name,
        role: edit.role || partnerRole(kind),
        kinds: [kind],
        mobile: edit.mobile,
        address: location.address,
        pin: location.pin,
        pins: location.pins,
      });
      onChange?.(data.partners || []);
      setDrafts((current) => ({
        ...current,
        [partner.id]: {
          loginId: data.partner?.loginId || edit.mobile,
          password: "",
        },
      }));
      setEditingId("");
      setNote(`Details saved for ${data.partner?.name || partner.name}.`);
      return true;
    } catch (err) {
      setError(err.message || "Could not save partner details.");
      return false;
    } finally {
      setBusyId("");
    }
  };

  const removePartner = async (partner) => {
    const ok = window.confirm(
      `Remove ${partner.name}? They will no longer be able to sign in.`
    );
    if (!ok) return;
    setBusyId(`remove-${partner.id}`);
    setError("");
    setNote("");
    try {
      const data = await deleteStaffPartner(partner.id);
      onChange?.(data.partners || []);
      if (editingId === partner.id) setEditingId("");
      setNote(`${partner.name} removed.`);
    } catch (err) {
      setError(err.message || "Could not remove the partner.");
    } finally {
      setBusyId("");
    }
  };

  const addPartner = async (event) => {
    event?.preventDefault?.();
    const kind = create.kinds[0] || category;
    const location = partnerCreateLocation(create);
    if (!location.ok) {
      setError(location.error);
      return false;
    }
    if (!/^\d{10}$/.test(create.mobile)) {
      setError("Login ID is the 10-digit mobile number.");
      return false;
    }
    if (!/^\d{6}$/.test(create.password)) {
      setError("Password must be exactly 6 digits.");
      return false;
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
      setAdding(false);
      setCreate(emptyCreate(kind));
      setNote(
        `Partner Saved. Share the mobile number (login ID) and 6-digit password with ${data.partner?.name || "the partner"}.`
      );
      return true;
    } catch (err) {
      setError(err.message || "Could Not Create Partner.");
      return false;
    } finally {
      setBusyId("");
    }
  };

  const loginChanged = (partner) => {
    const draft = drafts[partner.id];
    if (!draft) return false;
    const saved = String(partner.loginId || partner.mobile || "");
    return String(draft.loginId || "") !== saved || Boolean(draft.password);
  };

  const detailsDirty =
    adding || Boolean(editingId) || Boolean(resetFor) || Boolean(splitFor) || partners.some(loginChanged);

  const savePending = async () => {
    if (adding) return addPartner();
    if (editingId) return saveEdit();
    const changed = partners.find(loginChanged);
    if (changed) return saveLogin(changed);
    if (resetFor) {
      const partner = partners.find((row) => row.id === resetFor);
      if (partner && resetDraft.phase === "otp") return confirmReset(partner);
      setError("Finish the password reset before closing this section.");
      return false;
    }
    if (splitFor) {
      const partner = partners.find((row) => row.id === splitFor);
      if (partner && splitDraft.phase === "otp") return confirmSplit(partner);
      setError("Finish the split update before closing this section.");
      return false;
    }
    return true;
  };

  return (
    <section className="admin-panel admin-feature-panel admin-partners-box" aria-label="Partners">
      <AdminSectionGuard dirty={detailsDirty} save={savePending} />
      <div className="admin-feature-head">
        <div>
          <h2>Partners</h2>
        </div>
      </div>
      {adding ? null : (
      <div className="lab-tabs" role="tablist" aria-label="Partners">
        <button
          type="button"
          role="tab"
          className="is-on"
          aria-selected={true}
          onClick={() => setAdding(false)}
        >
          Partners
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={false}
          onClick={openAdd}
        >
          Add partner
        </button>
      </div>
      )}
      {adding ? null : (
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
                setEditingId("");
              }}
            >
              <span>{tab.label}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>
      )}
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
        <div className="admin-partner-sheet">
          <div className="admin-partner-line is-head">
            <span>Partner name</span>
            <span>Category</span>
            <span>Login ID</span>
            <span>Password</span>
            <span>Save</span>
            <span>Edit</span>
            <span>Delete</span>
          </div>
              {listed.length === 0 ? (
                <p className="admin-hint">No {partnerCategoryLabel(category)} partners yet.</p>
              ) : (
                listed.map((partner) => {
                  const draft = draftFor(partner);
                  const resetLabel = partnerPasswordResetLabel(partner);
                  const resetOpen = resetFor === partner.id;
                  const splitOpen = splitFor === partner.id;
                  const editOpen = editingId === partner.id;
                  const teamLine = teamFrom(partner.team);
                  return (
                    <Fragment key={partner.id}>
                    <div className="admin-partner-line">
                      <strong title={partner.role || partner.name}>{partner.name}</strong>
                      <span>
                        {(partner.kinds || []).map((kind) => kindLabel(kind)).join(", ") ||
                          partnerCategoryLabel(category)}
                      </span>
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
                        <button
                          type="button"
                          className="is-save"
                          disabled={busyId === partner.id}
                          onClick={() => saveLogin(partner)}
                        >
                          {busyId === partner.id ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === `edit-${partner.id}`}
                          onClick={() => (editOpen ? setEditingId("") : openEdit(partner))}
                        >
                          {editOpen ? "Close" : "Edit"}
                        </button>
                        <button
                          type="button"
                          className="is-delete"
                          disabled={busyId === `remove-${partner.id}`}
                          onClick={() => removePartner(partner)}
                        >
                          {busyId === `remove-${partner.id}` ? "…" : "Delete"}
                        </button>
                    </div>
                    {teamLine.length ? (
                      <div className="admin-partner-team-sheet">
                        <div className="admin-partner-team-line is-head">
                          <span>Name</span>
                          <span>Category</span>
                          <span>Login ID</span>
                          <span>Qualification</span>
                          <span>Email</span>
                          <span>Aadhaar</span>
                          <span>Documents</span>
                          <span>Status</span>
                        </div>
                        {teamLine.map((member) => {
                          const profile = member.profile || {};
                          return (
                            <div key={member.id} className="admin-partner-team-line">
                              <strong>{member.name}</strong>
                              <span>{member.role || "—"}</span>
                              <span>{member.mobile || "—"}</span>
                              <span>{profile.qualification || "—"}</span>
                              <span>{profile.email || "—"}</span>
                              <span>{profile.aadhaarNumber || "—"}</span>
                              <span>{teamDocumentSummary(profile) || "—"}</span>
                              <span className={`partner-team-status is-${member.status}`}>
                                {teamStatusLabel(member.status)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                    {editOpen ? (
                          <form className="admin-partner-create" onSubmit={saveEdit}>
                            <h3>Edit details</h3>
                            <div className="admin-partner-grid">
                              <label>
                                Partner category
                                <select
                                  value={edit.kinds[0] || category}
                                  onChange={(event) =>
                                    setEdit((current) => {
                                      const kind = event.target.value;
                                      const keepRole =
                                        current.role && current.role !== partnerRole(current.kinds[0]);
                                      return {
                                        ...current,
                                        kinds: [kind],
                                        role: keepRole ? current.role : partnerRole(kind),
                                      };
                                    })
                                  }
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
                                  value={edit.name}
                                  onChange={(event) =>
                                    setEdit((current) => ({ ...current, name: event.target.value }))
                                  }
                                  required
                                />
                              </label>
                              <label>
                                Role
                                <input
                                  value={edit.role}
                                  onChange={(event) =>
                                    setEdit((current) => ({ ...current, role: event.target.value }))
                                  }
                                />
                              </label>
                              <label>
                                Mobile
                                <input
                                  inputMode="numeric"
                                  autoComplete="tel"
                                  value={edit.mobile}
                                  onChange={(event) =>
                                    setEdit((current) => ({
                                      ...current,
                                      mobile: event.target.value.replace(/\D/g, "").slice(0, 10),
                                    }))
                                  }
                                  required
                                  minLength={10}
                                  maxLength={10}
                                  pattern="\d{10}"
                                />
                              </label>
                              <label>
                                Address
                                <input
                                  value={edit.address}
                                  onChange={(event) =>
                                    setEdit((current) => ({ ...current, address: event.target.value }))
                                  }
                                  required
                                />
                              </label>
                              <label>
                                PIN
                                <input
                                  inputMode="numeric"
                                  value={edit.pin}
                                  onChange={(event) =>
                                    setEdit((current) => ({
                                      ...current,
                                      pin: event.target.value.replace(/\D/g, "").slice(0, 6),
                                    }))
                                  }
                                  required
                                  minLength={6}
                                  maxLength={6}
                                  pattern="\d{6}"
                                />
                              </label>
                            </div>
                            <div className="admin-feature-actions">
                              <button
                                type="submit"
                                className="admin-feature-save"
                                disabled={busyId === `edit-${partner.id}`}
                              >
                                {busyId === `edit-${partner.id}` ? "Saving…" : "Save details"}
                              </button>
                              <button
                                type="button"
                                className="admin-feature-reset"
                                onClick={() => setEditingId("")}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="admin-feature-reset"
                                onClick={() => (resetOpen ? setResetFor("") : openReset(partner))}
                              >
                                {resetOpen ? "Close reset" : "Reset password"}
                              </button>
                              {partnerUpdateShowsSplit(category) ? (
                                <button
                                  type="button"
                                  className="admin-feature-reset"
                                  onClick={() => (splitOpen ? setSplitFor("") : openSplit(partner))}
                                >
                                  {splitOpen ? "Close split" : "Update split"}
                                </button>
                              ) : null}
                            </div>
                          </form>
                    ) : null}
                    {resetOpen ? (
                          <div className="admin-partner-reset">
                            {resetLabel ? <p className="admin-hint">{resetLabel}</p> : null}
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
                    ) : null}
                    {splitOpen ? (
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
                    ) : null}
                    </Fragment>
                  );
                })
              )}
        </div>
      )}
    </section>
  );
}
