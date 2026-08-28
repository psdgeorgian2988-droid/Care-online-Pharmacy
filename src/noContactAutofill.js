/** Stop browsers and phones from suggesting names, numbers, or contacts. */
const BLOCK_SUGGESTIONS = {
  autoComplete: "off",
  autoCorrect: "off",
  spellCheck: false,
  "aria-autocomplete": "none",
  "data-lpignore": "true",
  "data-1p-ignore": "true",
  "data-form-type": "other",
  "data-bwignore": "true",
};

/** Use on textareas or any field that must not inherit type="text". */
export const noContactFieldProps = {
  ...BLOCK_SUGGESTIONS,
  autoComplete: "mh-no-suggest",
};

export const noContactNameProps = {
  type: "text",
  autoCapitalize: "words",
  ...BLOCK_SUGGESTIONS,
  /** Unrecognised token — Chrome ignores autocomplete="off" on name fields. */
  autoComplete: "mh-no-suggest-name",
};

export const noContactMobileProps = {
  type: "text",
  inputMode: "numeric",
  autoCapitalize: "off",
  ...BLOCK_SUGGESTIONS,
  autoComplete: "mh-no-suggest-mobile",
};

export const noContactEmailProps = {
  type: "email",
  inputMode: "email",
  autoCapitalize: "off",
  ...BLOCK_SUGGESTIONS,
  autoComplete: "mh-no-suggest-email",
};

/** Dummy fields that soak up browser / contact autofill before the real inputs. */
export const autofillTrapStyle = `
.mh-autofill-trap{position:absolute;left:0;top:0;height:0;width:0;overflow:hidden;opacity:0;pointer-events:none}
.mh-autofill-trap input{height:0;width:0;border:0;padding:0;margin:0}
`;
