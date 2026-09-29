import { useState } from "react";
import PersonFields from "./PersonFields.jsx";
import {
  RELATION_OPTIONS,
  emptyFamilyMember,
  memberSummary,
  normalizeMobile,
} from "./personFields";
import { noContactMobileProps, noContactNameProps } from "./noContactAutofill";
import AutofillTrap from "./AutofillTrap";

function memberHasInput(member) {
  return Boolean(
    String(member?.name || "").trim() ||
      member?.relation ||
      member?.gender ||
      member?.dob ||
      (!member?.useAccountMobile && String(member?.mobile || "").trim())
  );
}

function MemberForm({
  idPrefix,
  member,
  index,
  errors,
  account,
  enforceRequired = true,
  onPatch,
}) {
  const usesAccount = Boolean(member.useAccountMobile);
  return (
    <>
      <label htmlFor={`${idPrefix}-${index}-name`}>
        Name <span>*</span>
      </label>
      <input
        id={`${idPrefix}-${index}-name`}
        value={member.name || ""}
        placeholder="Family member name"
        required={enforceRequired}
        onChange={(event) => onPatch({ name: event.target.value })}
        {...noContactNameProps}
      />
      {errors[`familyMembers.${index}.name`] ? (
        <small className="family-error">
          {errors[`familyMembers.${index}.name`]}
        </small>
      ) : null}
      <label htmlFor={`${idPrefix}-${index}-relation`}>
        Relation <span>*</span>
      </label>
      <select
        id={`${idPrefix}-${index}-relation`}
        value={member.relation || ""}
        required={enforceRequired}
        onChange={(event) => onPatch({ relation: event.target.value })}
      >
        <option value="">Select</option>
        {RELATION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {errors[`familyMembers.${index}.relation`] ? (
        <small className="family-error">
          {errors[`familyMembers.${index}.relation`]}
        </small>
      ) : null}
      <label htmlFor={`${idPrefix}-${index}-mobile`}>
        Mobile <span>*</span>
      </label>
      <input
        id={`${idPrefix}-${index}-mobile`}
        maxLength="10"
        placeholder="10-digit mobile"
        value={usesAccount ? account : member.mobile || ""}
        disabled={usesAccount}
        required={enforceRequired && !usesAccount}
        onChange={(event) =>
          onPatch({
            mobile: normalizeMobile(event.target.value),
            useAccountMobile: false,
          })
        }
        {...noContactMobileProps}
      />
      <label className="family-use-account">
        <input
          type="checkbox"
          checked={usesAccount}
          disabled={!account}
          onChange={(event) => {
            const on = event.target.checked;
            onPatch({
              useAccountMobile: on,
              mobile: on ? account : "",
            });
          }}
        />
        Use Account Creator&apos;s Mobile
        {account ? ` (${account})` : " — enter the account mobile first"}
      </label>
      {errors[`familyMembers.${index}.mobile`] ? (
        <small className="family-error">
          {errors[`familyMembers.${index}.mobile`]}
        </small>
      ) : null}
      <PersonFields
        idPrefix={`${idPrefix}-${index}`}
        values={member}
        required={enforceRequired}
        errors={{
          gender: errors[`familyMembers.${index}.gender`],
          dob: errors[`familyMembers.${index}.dob`],
        }}
        onChange={(event) => {
          const { name, value } = event.target;
          onPatch({ [name]: value });
        }}
      />
    </>
  );
}

export default function FamilyMembersFields({
  idPrefix = "family",
  members = [],
  errors = {},
  accountMobile = "",
  savedAs = "summary",
  collapseTick = 0,
  onChange,
}) {
  const list = Array.isArray(members) ? members : [];
  const [openIds, setOpenIds] = useState(() => new Set());
  const [draft, setDraft] = useState(emptyFamilyMember);
  const [showDraft, setShowDraft] = useState(false);
  const [seenTick, setSeenTick] = useState(collapseTick);
  const account = normalizeMobile(accountMobile);

  if (seenTick !== collapseTick) {
    setSeenTick(collapseTick);
    setOpenIds(new Set());
    setDraft(emptyFamilyMember());
  }

  const emit = (next) => {
    onChange?.({ target: { name: "familyMembers", value: next } });
  };

  const savedList = list.filter((member) => member.id !== draft.id);

  const emitDraft = (nextDraft) => {
    emit(memberHasInput(nextDraft) ? [...savedList, nextDraft] : savedList);
  };

  const addMember = () => {
    if (showDraft) return;
    const next = emptyFamilyMember();
    setDraft(next);
    setShowDraft(true);
  };

  const updateDraft = (patch) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    emitDraft(next);
  };

  const cancelDraft = () => {
    setShowDraft(false);
    setDraft(emptyFamilyMember());
    emit(savedList);
  };

  const updateMember = (index, patch) => {
    emit(list.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const removeMember = (index) => {
    const id = list[index]?.id;
    if (id) {
      setOpenIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
    emit(list.filter((_, rowIndex) => rowIndex !== index));
  };

  const setOpen = (id, open) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const isOpen = (member, index) => {
    const id = member.id || String(index);
    if (openIds.has(id)) return true;
    return Boolean(
      errors[`familyMembers.${index}.name`] ||
        errors[`familyMembers.${index}.relation`] ||
        errors[`familyMembers.${index}.mobile`] ||
        errors[`familyMembers.${index}.gender`] ||
        errors[`familyMembers.${index}.dob`]
    );
  };

  const draftIndex = list.findIndex((member) => member.id === draft.id);
  const draftErrorIndex = draftIndex >= 0 ? draftIndex : savedList.length;

  return (
    <>
      <style>{styles}</style>
      <div className="family-fields">
        <AutofillTrap />
        <div className="family-head">
          <p className="family-title">Family Members</p>
          <button type="button" className="family-add" onClick={addMember}>
            Add Member
          </button>
        </div>

        {savedList.map((member) => {
          const index = list.findIndex((row) => row.id === member.id);
          const id = member.id || String(index);
          const editing = isOpen(member, index);
          if (!editing && savedAs === "hidden") return null;
          return (
            <article key={id} className="family-card">
              <div className="family-card-top">
                <strong>
                  {member.name
                    ? memberSummary(member, account)
                    : `Family Member ${index + 1}`}
                </strong>
                <div className="family-card-actions">
                  {editing ? (
                    member.name ? (
                      <button
                        type="button"
                        className="family-edit"
                        onClick={() => setOpen(id, false)}
                      >
                        Done
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="family-edit"
                        onClick={() => removeMember(index)}
                      >
                        Cancel
                      </button>
                    )
                  ) : savedAs === "summary" ? (
                    <button
                      type="button"
                      className="family-edit"
                      onClick={() => setOpen(id, true)}
                    >
                      Edit
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="family-remove"
                    onClick={() => removeMember(index)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              {editing ? (
                <MemberForm
                  idPrefix={idPrefix}
                  member={member}
                  index={index}
                  errors={errors}
                  account={account}
                  onPatch={(patch) => updateMember(index, patch)}
                />
              ) : null}
            </article>
          );
        })}

        {showDraft ? (
          <article className="family-card">
            <div className="family-card-top">
              <strong>New family member</strong>
              <div className="family-card-actions">
                <button type="button" className="family-edit" onClick={cancelDraft}>
                  Cancel
                </button>
              </div>
            </div>
            <MemberForm
              key={draft.id}
              idPrefix={`${idPrefix}-draft`}
              member={draft}
              index={draftErrorIndex}
              errors={errors}
              account={account}
              enforceRequired={false}
              onPatch={updateDraft}
            />
          </article>
        ) : null}
      </div>
    </>
  );
}

const styles = `
.family-fields{display:grid;gap:10px;width:100%;grid-column:1/-1}
.family-head{display:flex;justify-content:space-between;align-items:center;gap:10px}
.family-title{margin:0;font-size:13px;font-weight:800;color:#29455a}
.family-add,.family-remove,.family-edit{appearance:none;border-radius:8px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
.family-add{padding:8px 10px;border:1px solid #1a6b7a;background:#1a6b7a;color:#fff;white-space:nowrap}
.family-remove,.family-edit{padding:6px 8px;border:1px solid #d7e2e9;background:#fff}
.family-edit{color:#1a6b7a}
.family-remove{color:#b64b4b}
.family-card-actions{display:flex;gap:6px;flex-shrink:0}
.family-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px 12px;padding:12px;border:1px solid #d7e2e9;border-radius:10px;background:#fff}
.family-card-top,.family-card .person-fields,.family-use-account{grid-column:1/-1}
.family-card-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.family-card-top strong{font-size:12px;color:#29455a}
.family-card label{font-size:12px;font-weight:700;color:#34546b}
.family-card label span{color:#e34d4d}
.family-card input:not([type="checkbox"]),.family-card select{width:100%;box-sizing:border-box;height:38px;min-height:38px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#143246;font:inherit;font-size:14px}
.family-card input:disabled{background:#f7fbfd;color:#5d7180}
.family-use-account{display:flex;align-items:center;gap:8px;margin:0;font-size:12px;font-weight:700;color:#34546b}
.family-use-account input{width:16px;height:16px;margin:0;accent-color:#1a6b7a}
.family-error{color:#d84b4b;font-size:11px}
`;
