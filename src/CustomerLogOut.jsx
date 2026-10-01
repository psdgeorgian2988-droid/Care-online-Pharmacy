import { hasAccountSession, useLoginSession } from "./authSession";
import { logOutCustomer } from "./customerLogout";

/** Visible only for a registered customer who is logged in. */
export default function CustomerLogOut({ className = "" }) {
  const user = useLoginSession();
  if (!hasAccountSession(user)) return null;
  return (
    <button type="button" className={className} onClick={logOutCustomer}>
      Log out
    </button>
  );
}
