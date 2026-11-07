import assert from "node:assert/strict";
import { test } from "node:test";
import { DOSE_ALARM_EVENT, announceDoseAlarm } from "./doseAlarm.js";

test("an alarm opens on screen with the medicine, salt, and photo", () => {
  const events = [];
  const item = {
    slot: { plain: "Before breakfast" },
    time: "07:00",
    stamp: "2026-11-07|ante-jentaculum|07:00",
    medicines: [
      {
        id: "glycomet-500",
        name: "Glycomet 500",
        brand: "Glycomet",
        salt: "Metformin",
        image: "/meds/pack-green.svg",
      },
    ],
  };
  const shown = announceDoseAlarm(item, {
    dispatchEvent(event) {
      events.push(event);
    },
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
  });
  assert.equal(shown.title, "Before breakfast");
  assert.equal(events.length, 1);
  assert.equal(events[0].type, DOSE_ALARM_EVENT);
  assert.equal(events[0].detail.medicines[0].brand, "Glycomet");
  assert.equal(events[0].detail.medicines[0].salt, "Metformin");
  assert.equal(events[0].detail.medicines[0].image, "/meds/pack-green.svg");
});
