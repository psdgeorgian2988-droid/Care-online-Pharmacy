import { useState } from "react";
import { createStaffPartner, patchStaffPartner, setStaffPartnerLogin } from "./adminApi";
import { kindLabel, partnerRole } from "./orderTracking";
import { defaultPartnerPercentFor } from "./paymentSplit";
import {
  PARTNER_CATEGORY_TABS,
  countPartnersInCategory,
  partnerCategoryLabel,
  partnerCreateLocation,
  partnerServicePins,
  partnersInCategory,
} from "./partnerAdmin";

const emptyCreate = (kind = "medicine") => ({
  name: "",
  role: partnerRole(kind),
  kinds: [kind],
  mobile: "",
  address: "",
  pin: "",
  loginId: "",
  password: "",
  partnerPercent: defaultPartnerPercentFor(kind),
});

export default function AdminPartnerLogins({ partners, onChange }) {
  const [category, setCategory] = useState("");
  const [adding, setAdding] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [create, setCreate] = useState(() => emptyCreate("medicine"));
  const [busyId, setBusyId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const listed = partnersInCategory(partners, category);

  const draftFor = (partner) =>
    drafts[partner.id] || {
      loginId: partner.loginId || "",
      password: "",
      partnerPercent:
        partner.partnerPercent ?? defaultPartnerPercentFor(partner.kinds?.[0]),
    };

  const saveLogin = async (partner) => {
    const draft = draftFor(partner);
    setBusyId(partner.id);
    setError("");
    setNote("");
    try {
      const data = await setStaffPartnerLogin(partner.id, {
        loginId: draft.loginId,
        password: draft.password,
      });
      onChange?.(data.partners || []);
      setDrafts((current) => ({
        ...current,
        [partner.id]: {
          loginId: data.partner?.loginId || draft.loginId,
          password: "",
          partnerPercent: draft.partnerPercent,
        },
      }));
      setNote(`Login Saved For ${partner.name}.`);
    } catch (err) {
      setError(err.message || "Could Not Save Partner Login.");
    } finally {
      setBusyId("");
    }
  };

  const saveSplit = async (partner) => {
    const draft = draftFor(partner);
    setBusyId(`split-${partner.id}`);
    setError("");
    setNote("");
    try {
      const data = await patchStaffPartner(partner.id, {
        partnerPercent: Number(draft.partnerPercent),
      });
      onChange?.(data.partners || []);
      setNote(`Split saved for ${partner.name}: partner ${data.partner?.partnerPercent}%.`);
    } catch (err) {
      setError(err.message || "Could not save partner split.");
    } finally {
      setBusyId("");
    }
  };

  const setCreateKind = (kind) => {
    setCreate((current) => {
      const prevDefault = defaultPartnerPercentFor(current.kinds[0]);
      const keepRole = current.role && current.role !== partnerRole(current.kinds[0]);
      return {
        ...current,
        kinds: [kind],
        role: keepRole ? current.role : partnerRole(kind),
        partnerPercent:
          Number(current.partnerPercent) === prevDefault
            ? defaultPartnerPercentFor(kind)
            : current.partnerPercent,
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
    setBusyId("new");
    setError("");
    setNote("");
    try {
      const data = await createStaffPartner({
        ...create,
        kinds: [kind],
        role: create.role || partnerRole(kind),
        address: location.address,
        pin: location.pin,
        pinCode: location.pin,
        pins: location.pins,
      });
      onChange?.(data.partners || []);
      setCategory(kind);
      setCreate(emptyCreate(kind));
      setAdding(false);
      setNote(`Partner Saved. Share The Login ID And Password With ${data.partner?.name || "The Partner"}.`);
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
                value={create.mobile}
                onChange={(event) =>
                  setCreate((current) => ({
                    ...current,
                    mobile: event.target.value.replace(/\D/g, "").slice(0, 10),
                  }))
                }
              />
            </label>
            <label>
              Login ID
              <input
                value={create.loginId}
                onChange={(event) => setCreate((current) => ({ ...current, loginId: event.target.value }))}
                placeholder="First login ID"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={create.password}
                onChange={(event) => setCreate((current) => ({ ...current, password: event.target.value }))}
                placeholder="First password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </label>
            <label>
              Partner split %
              <input
                type="number"
                min={0}
                max={100}
                required
                value={create.partnerPercent}
                onChange={(event) =>
                  setCreate((current) => ({
                    ...current,
                    partnerPercent: event.target.value,
                  }))
                }
              />
              <span className="admin-outlet-area">
                MediHome {100 - Number(create.partnerPercent || 0)}%
              </span>
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
                <th>Partner %</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listed.length === 0 ? (
                <tr>
                  <td colSpan="7">No {partnerCategoryLabel(category)} partners yet.</td>
                </tr>
              ) : (
                listed.map((partner) => {
                  const draft = draftFor(partner);
                  return (
                    <tr key={partner.id}>
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
                          value={draft.loginId}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [partner.id]: { ...draft, loginId: event.target.value },
                            }))
                          }
                          placeholder="Create login ID"
                        />
                      </td>
                      <td>
                        <input
                          type="password"
                          aria-label={`Password for ${partner.name}`}
                          value={draft.password}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [partner.id]: { ...draft, password: event.target.value },
                            }))
                          }
                          placeholder={partner.hasLogin ? "New password" : "First password"}
                          autoComplete="new-password"
                        />
                      </td>
                      <td>
                        <div className="admin-split-row">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            aria-label={`Partner split percent for ${partner.name}`}
                            value={draft.partnerPercent}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [partner.id]: {
                                  ...draft,
                                  partnerPercent: event.target.value,
                                },
                              }))
                            }
                          />
                          <span className="admin-outlet-area">
                            MediHome {100 - Number(draft.partnerPercent || 0)}%
                          </span>
                          <button
                            type="button"
                            disabled={busyId === `split-${partner.id}`}
                            onClick={() => saveSplit(partner)}
                          >
                            {busyId === `split-${partner.id}` ? "Saving…" : "Save Split"}
                          </button>
                        </div>
                      </td>
                      <td>{partner.hasLogin ? "Login Set" : "Needs First Login"}</td>
                      <td>
                        <button
                          type="button"
                          disabled={busyId === partner.id}
                          onClick={() => saveLogin(partner)}
                        >
                          {busyId === partner.id ? "Saving…" : "Save Login"}
                        </button>
                      </td>
                    </tr>
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
