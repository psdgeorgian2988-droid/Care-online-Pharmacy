import { orderIdOf, scanHref, scanLinksForApp } from "./orderQr";

export default function ScanActions({
  order,
  app = "customer",
  partner,
  className = "",
}) {
  const id = orderIdOf(order);
  const links = scanLinksForApp(app, order || {}, partner);
  return (
    <>
      <style>{styles}</style>
      <div className={`scan-actions ${className}`.trim()}>
        {links.map((link) => (
          <a
            key={link.step}
            className="scan-action-link"
            href={scanHref({ id, step: link.step, order })}
          >
            {link.label}
          </a>
        ))}
      </div>
    </>
  );
}

const styles = `
.scan-actions{display:flex;flex-wrap:wrap;gap:8px}
.scan-action-link{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 12px;border-radius:8px;background:#1a6b7a;color:#fff;font-size:13px;font-weight:800;text-decoration:none}
`;
