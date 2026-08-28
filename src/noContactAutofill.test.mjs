import assert from "node:assert/strict";
import { test } from "node:test";
import {
  noContactFieldProps,
  noContactMobileProps,
  noContactNameProps,
} from "./noContactAutofill.js";

test("name and mobile fields do not ask the browser for suggestions", () => {
  assert.equal(noContactNameProps.autoComplete, "mh-no-suggest-name");
  assert.equal(noContactMobileProps.autoComplete, "mh-no-suggest-mobile");
  assert.equal(noContactNameProps["aria-autocomplete"], "none");
  assert.equal(noContactMobileProps["aria-autocomplete"], "none");
  assert.equal(noContactFieldProps.autoComplete, "mh-no-suggest");
  assert.notEqual(noContactNameProps.autoComplete, "name");
  assert.notEqual(noContactMobileProps.autoComplete, "tel");
});
