import { autofillTrapStyle } from "./noContactAutofill";

/** Hidden decoys so Chrome / Safari do not suggest names or mobile numbers. */
export default function AutofillTrap() {
  return (
    <>
      <style>{autofillTrapStyle}</style>
      <div className="mh-autofill-trap" aria-hidden="true">
        <label>
          Name
          <input
            type="text"
            name="mh_trap_name"
            autoComplete="name"
            tabIndex={-1}
            defaultValue=""
          />
        </label>
        <label>
          Mobile
          <input
            type="text"
            name="mh_trap_mobile"
            autoComplete="tel"
            tabIndex={-1}
            defaultValue=""
          />
        </label>
      </div>
    </>
  );
}
