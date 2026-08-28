import { familyTreeLayout } from "./familyAccount";

function PersonNode({ person }) {
  if (!person) return null;
  return (
    <article
      className={`family-tree-node${person.isHolder ? " is-holder" : ""}`}
    >
      <strong>{person.name}</strong>
      <span>{person.relationLabel}</span>
      {person.age ? <small>{person.age} yrs</small> : null}
    </article>
  );
}

function Generation({ people, className = "" }) {
  if (!people?.length) return null;
  return (
    <div className={`family-tree-row ${className}`.trim()}>
      {people.map((person) => (
        <PersonNode key={person.id} person={person} />
      ))}
    </div>
  );
}

export default function FamilyTree({ profile = {} }) {
  const tree = familyTreeLayout(profile);
  const couple = [tree.holder, ...tree.spouse];

  return (
    <>
      <style>{styles}</style>
      <section className="family-tree" aria-label="Family tree">
        <Generation people={tree.grandparents} className="is-elders" />
        {tree.grandparents.length && tree.parents.length ? (
          <div className="family-tree-line" />
        ) : null}
        <Generation people={tree.parents} />
        {tree.parents.length ? <div className="family-tree-line" /> : null}
        <Generation people={couple} className="is-couple" />
        {tree.children.length ? <div className="family-tree-line" /> : null}
        <Generation people={tree.children} />
      </section>
    </>
  );
}

const styles = `
.family-tree{display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 12px;border:1px solid #d7e2e9;border-radius:14px;background:linear-gradient(#f7fbfc,#fff)}
.family-tree-row{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.family-tree-line{width:2px;height:16px;background:#b7c9d4}
.family-tree-node{min-width:132px;max-width:180px;padding:10px 12px;border:1px solid #d7e2e9;border-radius:10px;background:#fff;text-align:center;box-shadow:0 2px 8px rgba(20,50,70,.05)}
.family-tree-node.is-holder{border-color:#1a6b7a;background:#eef7f8}
.family-tree-node strong{display:block;font-size:13px;color:#143246}
.family-tree-node span{display:block;margin-top:3px;font-size:11px;font-weight:800;color:#1a6b7a}
.family-tree-node small{display:block;margin-top:2px;color:#5d7180;font-size:11px}
`;
