const LOGO_SRC = "/medihome-logo.jpg?v=7";

/** @param {{ size?: "sm" | "md" | "lg" | "xl" | "hero", className?: string }} props */
export default function LogoMark({ size = "md", className = "" } = {}) {
  return (
    <span
      className={`logo-mark logo-mark--${size}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      <img className="logo-mark-img" src={LOGO_SRC} alt="" decoding="async" />
    </span>
  );
}
