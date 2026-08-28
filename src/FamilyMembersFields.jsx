import PersonFields from "./PersonFields";
import {
  RELATION_OPTIONS,
  emptyFamilyMember,
  memberSummary,
} from "./personFields";

export default function FamilyMembersFields({
  idPrefix = "family",
  members = [],
  errors = {},
  onChange,
}) {
  const list = Array.isArray(members) ? members : [];

  const emit = (next) => {
    onChange?.({ target: { name: "familyMembers", value: next } });
  };

  const addMember = () => {
    emit([...list, emptyFamilyMember()]);
  };

  const updateMember = (index, patch) => {
    emit(list.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const removeMember = (index) => {
    emit(list.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <>
      <style>{styles}</style>
      <div className="family-fields">
        <div className="family-head">
          <p className="family-title">Add Family Members</p>
          <button type="button" className="family-add" onClick={addMember}>
            Add Family Member
          </button>
        </div>

        {list.length === 0 ? (
          <p className="family-empty">No family members added yet.</p>
        ) : (
          list.map((member, index) => (
            <article key={member.id || index} className="family-card">
              <div className="family-card-top">
                <strong>
                  {member.name
                    ? memberSummary(member)
                    : `Family Member ${index + 1}`}
                </strong>
                <button
                  type="button"
                  className="family-remove"
                  onClick={() => removeMember(index)}
                >
                  Remove
                </button>
              </div>
              <label htmlFor={`${idPrefix}-${index}-name`}>
                Name <span>*</span>
              </label>
              <input
                id={`${idPrefix}-${index}-name`}
                value={member.name || ""}
                placeholder="Family member name"
                required
                onChange={(event) =>
                  updateMember(index, { name: event.target.value })
                }
              />
              {errors[`familyMembers.${index}.name`] ? (
                <small className="family-error">
                  {errors[`familyMembers.${index}.name`]}
                </small>
              ) : null}
              <label htmlFor={`${idPrefix}-${index}-relation`}>Relation</label>
              <select
                id={`${idPrefix}-${index}-relation`}
                value={member.relation || "family"}
                onChange={(event) =>
                  updateMember(index, { relation: event.target.value })
                }
              >
                {RELATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <PersonFields
                idPrefix={`${idPrefix}-${index}`}
                values={member}
                errors={{
                  gender: errors[`familyMembers.${index}.gender`],
                  dob: errors[`familyMembers.${index}.dob`],
                }}
                onChange={(event) => {
                  const { name, value } = event.target;
                  updateMember(index, { [name]: value });
                }}
              />
            </article>
          ))
        )}
      </div>
    </>
  );
}

const styles = `
.family-fields{display:grid;gap:10px;width:100%}
.family-head{display:flex;justify-content:space-between;align-items:center;gap:10px}
.family-title{margin:0;font-size:13px;font-weight:800;color:#29455a}
.family-add,.family-remove{appearance:none;border-radius:8px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
.family-add{padding:8px 10px;border:1px solid #1e8a73;background:#1e8a73;color:#fff;white-space:nowrap}
.family-remove{padding:6px 8px;border:1px solid #d7e2e9;background:#fff;color:#b64b4b}
.family-empty{margin:0;padding:10px 12px;border:1px dashed #d7e2e9;border-radius:8px;background:#f7fbfc;color:#5d7180;font-size:12px}
.family-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px 12px;padding:12px;border:1px solid #d7e2e9;border-radius:10px;background:#fff}
.family-card-top,.family-card .person-fields{grid-column:1/-1}
.family-card-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.family-card-top strong{font-size:12px;color:#29455a}
.family-card label{font-size:12px;font-weight:700;color:#34546b}
.family-card label span{color:#e34d4d}
.family-card input,.family-card select{width:100%;box-sizing:border-box;min-height:38px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#29455a;font:inherit;font-size:13px}
.family-error{color:#d84b4b;font-size:11px}
`;
