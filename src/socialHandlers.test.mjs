import assert from "node:assert/strict";
import { test } from "node:test";
import { SOCIAL } from "./siteMeta.js";
import {
  copyHandle,
  handleUsername,
  nativeAppUrl,
  openSocial,
  shareMediHome,
  sharePayload,
  socialById,
} from "./socialHandlers.js";

function mockEnv({ native = false, opened = true } = {}) {
  const calls = [];
  return {
    calls,
    env: {
      Capacitor: native
        ? { isNativePlatform: () => true, isNative: true }
        : undefined,
      open(url, target) {
        calls.push(["open", url, target]);
        return opened ? { opener: "set-me" } : null;
      },
      location: {
        assign(url) {
          calls.push(["assign", url]);
        },
      },
      navigator: {
        clipboard: {
          async writeText(text) {
            calls.push(["copy", text]);
          },
        },
      },
    },
  };
}

test("official handles map to native app URLs", () => {
  const instagram = socialById("instagram");
  const facebook = socialById("facebook");
  const youtube = socialById("youtube");
  const linkedin = socialById("linkedin");
  const x = socialById("x");
  const whatsapp = socialById("whatsapp");

  assert.equal(handleUsername(instagram.handle), "medihome.in");
  assert.equal(nativeAppUrl(instagram), "instagram://user?username=medihome.in");
  assert.match(nativeAppUrl(facebook), /^fb:\/\/facewebmodal\/f\?href=/);
  assert.equal(nativeAppUrl(youtube), "youtube://www.youtube.com/@MediHome");
  assert.equal(nativeAppUrl(linkedin), "linkedin://company/medihome");
  assert.equal(nativeAppUrl(x), "twitter://user?screen_name=medihome_in");
  assert.match(nativeAppUrl(whatsapp), /^whatsapp:\/\/send\?phone=917292094000/);
});

test("openSocial uses the https page in a browser", () => {
  const instagram = socialById("instagram");
  const { env, calls } = mockEnv();
  const opened = openSocial(instagram, env);
  assert.equal(opened, instagram.href);
  assert.equal(calls[0][0], "open");
  assert.equal(calls[0][1], instagram.href);
});

test("openSocial prefers the native app URL inside Capacitor", () => {
  const instagram = socialById("instagram");
  const { env, calls } = mockEnv({ native: true });
  const opened = openSocial(instagram, env);
  assert.equal(opened, nativeAppUrl(instagram));
  assert.equal(calls[0][1], nativeAppUrl(instagram));
});

test("copyHandle writes the official username", async () => {
  const x = socialById("x");
  const { env, calls } = mockEnv();
  assert.equal(await copyHandle(x, env), "@medihome_in");
  assert.deepEqual(calls[0], ["copy", "@medihome_in"]);
});

test("shareMediHome copies the site name and URL when share is unavailable", async () => {
  const { env, calls } = mockEnv();
  const payload = sharePayload();
  assert.equal(payload.url, "https://medihome.co.in");
  assert.equal(await shareMediHome(env), "copied");
  assert.equal(calls[0][0], "copy");
  assert.match(calls[0][1], /MediHome/);
  assert.match(calls[0][1], /medihome\.co\.in/);
});

test("every published social item has a handle and https link", () => {
  assert.equal(SOCIAL.length, 6);
  for (const item of SOCIAL) {
    assert.ok(item.id);
    assert.ok(item.label);
    assert.ok(item.handle);
    assert.match(item.href, /^https:\/\//);
  }
});
