import LogoMark from "./LogoMark";
import { openWelcomePage } from "./CustomerWelcome";
import { hasAccountSession, useLoginSession } from "./authSession";
import { goToHash } from "./hashRoute";

/** MediHome logo. Guests open the welcome page. A logged-in customer stays in the account. */
export default function MediHomeLogoLink({
  size = "md",
  className = "",
  markClassName = "",
  "aria-label": ariaLabel = "MediHome welcome",
} = {}) {
  const session = useLoginSession();
  const inAccount = hasAccountSession(session);
  return (
    <a
      className={className}
      href={inAccount ? "#profile" : "#home"}
      aria-label={inAccount ? "MediHome account" : ariaLabel}
      onClick={(event) => {
        event.preventDefault();
        if (inAccount) {
          goToHash("#profile");
          return;
        }
        openWelcomePage();
      }}
    >
      <LogoMark size={size} className={markClassName} />
    </a>
  );
}
