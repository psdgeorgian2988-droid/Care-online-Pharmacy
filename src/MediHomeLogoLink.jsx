import LogoMark from "./LogoMark";
import { openWelcomePage } from "./CustomerWelcome";

/** MediHome logo control — always opens the welcome page. */
export default function MediHomeLogoLink({
  size = "md",
  className = "",
  markClassName = "",
  "aria-label": ariaLabel = "MediHome welcome",
} = {}) {
  return (
    <a
      className={className}
      href="#home"
      aria-label={ariaLabel}
      onClick={(event) => {
        event.preventDefault();
        openWelcomePage();
      }}
    >
      <LogoMark size={size} className={markClassName} />
    </a>
  );
}
