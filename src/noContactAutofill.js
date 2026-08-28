/** Stop browsers and phones from filling names or numbers from contacts / saved autofill. */
export const noContactNameProps = {
  type: "text",
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "words",
  spellCheck: false,
  "data-lpignore": "true",
  "data-1p-ignore": "true",
  "data-form-type": "other",
};

export const noContactMobileProps = {
  type: "text",
  inputMode: "numeric",
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
  "data-lpignore": "true",
  "data-1p-ignore": "true",
  "data-form-type": "other",
};
