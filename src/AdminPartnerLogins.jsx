import { useState } from "react";
import { createStaffPartner, setStaffPartnerLogin } from "./adminApi";
import { kindLabel } from "./orderTracking";

const KIND_OPTIONS = [
  "medicine",
  "lab",
  "radiology",
  "homecare",
  "psychologist",
  "ambulance",
  "stepdown",
];

const emptyCreate = {
  name: "",
  role: "",
  kinds: ["medicine"],
  mobile: "",
  loginId: "",
  password: "",
};

export default function AdminPartnerLogins({ partners, onChange }) {
  const [drafts, setDrafts] = useState({});
  const [create, setCreate] = useState(emptyCreate);
  const [busyId, setBusyId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const draftFor = (partner) =>
    drafts[partner.id] || { loginId: partner.loginId || "", password: "" };

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
        [partner.id]: { loginId: data.partner?.loginId || draft.loginId, password: "" },
      }));
      setNote(`Login Saved For ${partner.name}.`);
    } catch (err) {
      setError(err.message || "Could Not Save Partner Login.");
    } finally {
      setBusyId("");
    }
  };

  const addPartner = async (event) => {
    event.preventDefault();
    setBusyId("new");
    setError("");
    setNote("");
    try {
      const data = await createStaffPartner(create);
      onChange?.(data.partners || []);
      setCreate(emptyCreate);
      setNote(`Partner Saved. Share The Login ID And Password With ${data.partner?.name || "The Partner"}.`);
    } catch (err) {
      setError(err.message || "Could Not Create Partner.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="admin-panel" aria-label="Partner Logins">
      <h2>Partner Logins</h2>
      <p>
        Create The First Login ID And Password Here. Partners Sign In With Those
        Details. Passwords Are Not Shown After You Save.
      </p>
      {error ? <p className="admin-error">{error}</p> : null}
      {note ? <p className="admin-hint">{note}</p> : null}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Partner</th>
              <th>Role / Service</th>
              <th>Login ID</th>
              <th>Password</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 ? (
              <tr>
                <td colSpan="6">No Partners Yet. Add One Below.</td>
              </tr>
            ) : (
              partners.map((partner) => {
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
                    </td>
                    <td>
                      {partner.role}
                      <br />
                      <span className="admin-outlet-area">
                        {(partner.kinds || []).map((kind) => kindLabel(kind)).join(", ") || "—"}
                      </span>
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

      <form className="admin-partner-create" onSubmit={addPartner}>
        <h3>Add Partner</h3>
        <div className="admin-partner-grid">
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
              placeholder="Medicine rider"
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
          <fieldset>
            <legend>Service</legend>
            <div className="admin-partner-kinds">
              {KIND_OPTIONS.map((kind) => (
                <label key={kind}>
                  <input
                    type="checkbox"
                    checked={create.kinds.includes(kind)}
                    onChange={() =>
                      setCreate((current) => {
                        const on = current.kinds.includes(kind);
                        const kinds = on
                          ? current.kinds.filter((row) => row !== kind)
                          : [...current.kinds, kind];
                        return { ...current, kinds: kinds.length ? kinds : [kind] };
                      })
                    }
                  />
                  {kindLabel(kind)}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <button type="submit" disabled={busyId === "new"}>
          {busyId === "new" ? "Saving…" : "Save Partner And Login"}
        </button>
      </form>
    </section>
  );
}
