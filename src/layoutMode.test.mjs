import assert from "node:assert/strict";
import { resolveLayoutMode } from "./layoutMode.js";

// Vertical / portrait → mobile
assert.equal(resolveLayoutMode({ width: 390, height: 844, aspect: 390 / 844 }), "phone");
assert.equal(resolveLayoutMode({ width: 820, height: 1180, aspect: 820 / 1180 }), "phone");
assert.equal(resolveLayoutMode({ width: 1080, height: 1920, aspect: 1080 / 1920 }), "phone");

// Horizontal / landscape → desktop
assert.equal(resolveLayoutMode({ width: 1440, height: 900, aspect: 1440 / 900 }), "laptop");
assert.equal(resolveLayoutMode({ width: 680, height: 400, aspect: 680 / 400 }), "laptop");
assert.equal(resolveLayoutMode({ width: 1280, height: 800, aspect: 1280 / 800 }), "laptop");

// Square / landscape-edge → desktop
assert.equal(resolveLayoutMode({ width: 1024, height: 1024, aspect: 1 }), "laptop");

console.log("layoutMode ok");
