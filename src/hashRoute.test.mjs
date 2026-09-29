import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  catalogParentHash,
  educationRouteFromHash,
  goBackHash,
  goToChildHash,
  goToHash,
  hashesMatch,
  homeCatalogSectionKeys,
  isHomeSectionKey,
  isLabsNavActive,
  isMedicalRecordNavActive,
  isVaccinationNavActive,
  LABS_HOME_HASH,
  labBookingHash,
  MEDICAL_RECORD_HOME_HASH,
  parentHashFor,
  parseAppHash,
  sectionParentHash,
} from "./hashRoute.js";

test("empty and home hashes open the home page", () => {
  for (const hash of ["", "#", "#home", "#/home", "#HOME", "#/Home"]) {
    assert.equal(parseAppHash(hash).route, "#home", hash);
  }
});

test("social aliases and desk pages resolve correctly", () => {
  assert.equal(parseAppHash("#social").route, "#contact");
  assert.equal(parseAppHash("#staff").route, "#staff");
  assert.equal(parseAppHash("#ops").route, "#admin");
  assert.equal(parseAppHash("#partners").route, "#partner");
  assert.equal(parseAppHash("#partner-desk").route, "#partner-desk");
  assert.equal(parseAppHash("#partnerdesk").route, "#partner-desk");
  assert.equal(parseAppHash("#pharmacy").route, "#pharmacy-desk");
  assert.equal(parseAppHash("#delivery").route, "#delivery-desk");
  assert.equal(parseAppHash("#lab-desk").route, "#lab-desk");
  assert.equal(parseAppHash("#customer").route, "#customer");
  assert.equal(parseAppHash("#app").route, "#portals");
  assert.equal(parseAppHash("#apps").route, "#portals");
});

test("login, register and forgot hashes open their own pages", () => {
  assert.equal(parseAppHash("#login").route, "#login");
  assert.equal(parseAppHash("#register").route, "#register");
  assert.equal(parseAppHash("#forgot").route, "#forgot");
});

test("service hashes stay on their own pages", () => {
  assert.equal(parseAppHash("#labs").route, "#labs");
  assert.equal(parseAppHash("#medicine-search?q=dolo").route, "#medicine-search");
  assert.equal(parseAppHash("#medicine-search?q=dolo").q, "dolo");
  assert.equal(parseAppHash("#scan?step=deliver").step, "deliver");
  assert.equal(parseAppHash("#homecare?service=nurse&plan=vaccination").route, "#homecare");
  assert.equal(parseAppHash("#homecare?service=nurse&plan=vaccination").service, "nurse");
  assert.equal(parseAppHash("#homecare?service=nurse&plan=vaccination-child").plan, "vaccination-child");
  assert.equal(parseAppHash("#reports").route, "#reports");
  assert.equal(parseAppHash("#medical-record").route, "#reports");
  assert.equal(parseAppHash("#vaccination").route, "#home");
  assert.equal(parseAppHash("#vaccination").service, "vaccination");
  assert.equal(parseAppHash("#reports?service=vaccination").route, "#reports");
  assert.equal(parseAppHash("#reports?service=vaccination").service, "vaccination");
  assert.equal(parseAppHash("#home?service=reports").route, "#home");
  assert.equal(parseAppHash("#home?service=reports").service, "reports");
  assert.equal(parseAppHash("#home?section=records").route, "#home");
  assert.equal(parseAppHash("#home?section=records").service, "reports");
  assert.equal(parseAppHash("#home-records").route, "#home");
  assert.equal(parseAppHash("#home-records").service, "reports");
  assert.equal(parseAppHash("#home?service=education").route, "#home");
  assert.equal(parseAppHash("#home?service=education").service, "education");
  assert.equal(parseAppHash("#education?service=guides").service, "guides");
  assert.equal(parseAppHash("#home?service=labs").route, "#home");
  assert.equal(parseAppHash("#home?service=labs").service, "labs");
  assert.equal(parseAppHash("#home?service=records").service, "reports");
  assert.equal(parseAppHash("#home?service=medicines").service, "medicine");
});

test("education child hashes map back to the Health Education section", () => {
  assert.equal(parentHashFor("#education?service=guides"), "#home?service=education");
  assert.equal(parentHashFor("#education?service=quiz"), "#home?service=education");
  assert.equal(parentHashFor("#education?service=webinars&id=w1"), "#home?service=education");
  assert.equal(educationRouteFromHash("#education?service=guides").tab, "guides");
  assert.equal(educationRouteFromHash("#education").tab, "");
  assert.equal(educationRouteFromHash("#education?service=quiz&id=quiz-bp").quizId, "quiz-bp");
});

test("other customer child hashes map back to their parent section", () => {
  assert.equal(labBookingHash("metropolis", "lab"), "#labs?service=lab&lab=metropolis");
  assert.equal(labBookingHash("rad-delhi", "radiology"), "#labs?service=radiology&lab=rad-delhi");
  assert.equal(labBookingHash(""), "#labs");
  assert.equal(parentHashFor("#labs?service=lab&lab=metropolis"), "#labs");
  assert.equal(parentHashFor("#labs?service=radiology&lab=rad-delhi"), "#labs");
  assert.equal(parentHashFor("#homecare?service=nurse"), "#home?service=homecare");
  assert.equal(
    parentHashFor("#homecare?service=nurse&plan=vaccination"),
    "#home?service=vaccination"
  );
  assert.equal(parentHashFor("#reports?service=lab"), "#home?service=reports");
  assert.equal(parentHashFor("#reports"), "#home?service=reports");
  assert.equal(parentHashFor("#reports?service=vaccination"), "#home?service=reports");
  assert.equal(isVaccinationNavActive("#home", "vaccination"), true);
  assert.equal(isVaccinationNavActive("#reports", "vaccination"), false);
  assert.equal(isMedicalRecordNavActive("#reports", "vaccination"), true);
  assert.equal(sectionParentHash("reports"), "#home?service=reports");
  assert.equal(MEDICAL_RECORD_HOME_HASH, "#home?service=reports");
  assert.equal(isMedicalRecordNavActive("#home", "reports"), true);
  assert.equal(isMedicalRecordNavActive("#reports", ""), true);
  assert.equal(isMedicalRecordNavActive("#home", ""), false);
  assert.equal(parentHashFor("#doctor?service=gp"), "#home?service=doctor");
  assert.equal(parentHashFor("#psychologist?service=video"), "#home?service=psychologist");
  assert.equal(parentHashFor("#stepdown?service=post-icu"), "#home?service=stepdown");
  assert.equal(parentHashFor("#ambulance?service=emergency"), "#home?service=ambulance");
  assert.equal(parentHashFor("#medicine-search?service=Diabetes"), "#home?service=medicine");
  assert.equal(parentHashFor("#myorders?id=MH-1"), "#myorders");
  assert.equal(parentHashFor("#myorders?service=lab"), "#myorders");
  assert.equal(parentHashFor("#myorders?service=lab&id=MH-1"), "#myorders?service=lab");
  assert.equal(parentHashFor("#myorders?service=radiology&id=IMG-1"), "#myorders?service=radiology");
  assert.equal(parseAppHash("#myorders?service=radiology").service, "radiology");
  assert.equal(parseAppHash("#myorders").service, "");
  assert.equal(parentHashFor("#profile?service=points"), "#profile");
  assert.equal(sectionParentHash("education"), "#home?service=education");
  assert.equal(catalogParentHash("education", "#home"), "#home?service=education");
  assert.equal(catalogParentHash("lab", "#labs"), "#labs");
  assert.equal(catalogParentHash("lab", "#home?service=labs"), LABS_HOME_HASH);
  assert.equal(catalogParentHash("radiology", "#home?service=labs"), LABS_HOME_HASH);
  assert.deepEqual(homeCatalogSectionKeys("labs"), ["lab", "radiology"]);
  assert.deepEqual(homeCatalogSectionKeys("medicine"), ["medicine"]);
  assert.deepEqual(homeCatalogSectionKeys("reports"), ["reports"]);
  assert.equal(isHomeSectionKey("labs"), true);
  assert.equal(isLabsNavActive("#home", "labs"), true);
  assert.equal(isLabsNavActive("#labs", ""), true);
  assert.equal(sectionParentHash("labs"), LABS_HOME_HASH);
  assert.ok(hashesMatch("#education?service=guides", "education?service=guides"));
});

test("home catalog children keep a distinct hash for each tile", () => {
  const tree = readFileSync(new URL("./homeServiceTree.js", import.meta.url), "utf8");
  assert.match(tree, /edu-guides[\s\S]*#education\?service=guides/);
  assert.match(tree, /edu-quiz[\s\S]*#education\?service=quiz/);
  assert.match(tree, /edu-refer[\s\S]*#education\?service=refer/);
  assert.match(tree, /rep-lab[\s\S]*#reports\?service=lab/);
  assert.match(tree, /rep-vax[\s\S]*#reports\?service=vaccination/);
  assert.match(tree, /vax-adult[\s\S]*#homecare\?service=nurse&plan=vaccination/);
  assert.doesNotMatch(tree, /vax-record/);
  assert.match(tree, /psy-video[\s\S]*#psychologist\?service=video/);
  assert.match(tree, /labBookingHash\(lab\.id, "lab"\)/);
  assert.match(tree, /labBookingHash\(centre\.id, "radiology"\)/);
});

function installHashWindow(startHash = "#home") {
  const entries = [startHash];
  let index = 0;
  const previous = {
    window: globalThis.window,
    HashChangeEvent: globalThis.HashChangeEvent,
  };
  const win = {
    location: {
      pathname: "/",
      search: "",
      get hash() {
        return entries[index] || "#home";
      },
      set hash(value) {
        entries[index] = value;
      },
    },
    history: {
      get length() {
        return index + 1;
      },
      pushState(_state, _title, url) {
        const hash = String(url).includes("#")
          ? `#${String(url).split("#").slice(1).join("#")}`
          : "";
        entries.splice(index + 1);
        entries.push(hash);
        index = entries.length - 1;
      },
      back() {
        if (index > 0) index -= 1;
      },
    },
    dispatchEvent() {
      return true;
    },
  };
  globalThis.window = win;
  return {
    hash: () => win.location.hash,
    stack: () => entries.slice(0, index + 1),
    restore() {
      globalThis.window = previous.window;
      globalThis.HashChangeEvent = previous.HashChangeEvent;
    },
  };
}

test("goToChildHash seeds the parent section so Back restores it", () => {
  const session = installHashWindow("#home");
  try {
    goToChildHash("#education?service=guides", "#home?service=education");
    assert.deepEqual(session.stack(), [
      "#home",
      "#home?service=education",
      "#education?service=guides",
    ]);
    goBackHash();
    assert.equal(session.hash(), "#home?service=education");
    goBackHash();
    assert.equal(session.hash(), "#home");
  } finally {
    session.restore();
  }
});

test("goToChildHash from the parent section only pushes the child", () => {
  const session = installHashWindow("#home?service=education");
  try {
    goToChildHash("#education?service=guides", "#home?service=education");
    assert.deepEqual(session.stack(), [
      "#home?service=education",
      "#education?service=guides",
    ]);
    goToHash("#education?service=guides");
    assert.deepEqual(session.stack(), [
      "#home?service=education",
      "#education?service=guides",
    ]);
  } finally {
    session.restore();
  }
});
