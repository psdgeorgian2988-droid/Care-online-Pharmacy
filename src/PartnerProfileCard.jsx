function DocLink({ label, fileName, fileData }) {
  if (!fileData) return <p><strong>{label}:</strong> Not added</p>;
  const isImage = String(fileData).startsWith("data:image/");
  return (
    <div className="partner-profile-doc">
      <p>
        <strong>{label}:</strong> {fileName || "Attached"}
      </p>
      {isImage ? (
        <img src={fileData} alt={label} />
      ) : (
        <a href={fileData} download={fileName || `${label}.pdf`}>
          Open {label}
        </a>
      )}
    </div>
  );
}

export default function PartnerProfileCard({ profile, fallback = {} }) {
  const row = profile || {};
  const name = row.name || fallback.name || fallback.org || "Assigned partner";
  const mobile = row.mobile || fallback.mobile || "";
  const address = [row.address, row.pinCode].filter(Boolean).join(", ");
  return (
    <section className="partner-profile-card" aria-label="Assigned partner">
      <p className="order-full-kicker">Assigned partner</p>
      <div className="partner-profile-head">
        {row.photoData ? (
          <img className="partner-profile-photo" src={row.photoData} alt="" />
        ) : (
          <span className="partner-profile-photo is-empty">Photo</span>
        )}
        <div>
          <strong>{name}</strong>
          {row.role || fallback.role ? <p>{row.role || fallback.role}</p> : null}
        </div>
      </div>
      <p><strong>Mobile:</strong> {mobile || "Not added"}</p>
      <p><strong>Email:</strong> {row.email || "Not added"}</p>
      <p><strong>Address:</strong> {address || "Not added"}</p>
      <p><strong>Qualification:</strong> {row.qualification || "Not added"}</p>
      <p><strong>Aadhaar:</strong> {row.aadhaarNumber || "Not added"}</p>
      <DocLink label="Aadhaar card" fileName={row.aadhaarFileName} fileData={row.aadhaarFileData} />
      <DocLink label="Police verification" fileName={row.policeFileName} fileData={row.policeFileData} />
      <div className="partner-profile-doc">
        <p><strong>Certificates:</strong></p>
        {row.certificates?.length ? (
          row.certificates.map((item, index) => (
            <DocLink
              key={`${item.fileName || item.name}-${index}`}
              label={item.name || "Certificate"}
              fileName={item.fileName}
              fileData={item.fileData}
            />
          ))
        ) : (
          <p>Not added</p>
        )}
      </div>
      <style>{`
        .partner-profile-card{margin-top:8px;padding:12px;border:1px solid #d2e8ef;border-radius:12px;background:#f7fbfd;display:grid;gap:6px}
        .partner-profile-card p{margin:0;font-size:13px;line-height:1.4;color:#143246}
        .partner-profile-head{display:flex;align-items:center;gap:10px}
        .partner-profile-head strong{display:block;font-size:15px}
        .partner-profile-head p{color:#34546b}
        .partner-profile-photo{width:64px;height:64px;border-radius:10px;object-fit:cover;background:#e8f1f6}
        .partner-profile-photo.is-empty{display:grid;place-items:center;font-size:11px;font-weight:800;color:#5d7180}
        .partner-profile-doc img{display:block;max-width:160px;max-height:120px;margin-top:4px;border-radius:8px;border:1px solid #d7e2e9}
        .partner-profile-doc a{font-size:13px;font-weight:700;color:#1a6b7a}
      `}</style>
    </section>
  );
}
