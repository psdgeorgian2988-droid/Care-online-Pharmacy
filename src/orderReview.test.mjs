import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  feedbackHashForOrder,
  findReviewForOrder,
  orderFeedbackActions,
  reviewHashForOrder,
  reviewServiceForOrder,
} from "./orderReview.js";

const completed = {
  id: "LAB-DONE-1",
  kind: "lab",
  trackStatus: "done",
  trackCompleted: true,
  split: { partnerPercent: 75, platformPercent: 25 },
};

const ongoing = {
  id: "LAB-OPEN-1",
  kind: "lab",
  trackStatus: "confirmed",
};

const review = {
  id: "MH-RV-9",
  orderId: "LAB-DONE-1",
  service: "labs",
  rating: 5,
  comment: "Home collection was on time and the report was clear.",
};

test("a completed customer order offers share feedback until a review is saved", () => {
  const actions = orderFeedbackActions(completed, "customer", []);
  assert.equal(actions.share, true);
  assert.equal(actions.read, false);
  assert.equal(actions.review, null);
  assert.equal(feedbackHashForOrder(completed), "#feedback?id=LAB-DONE-1");
  assert.equal("split" in actions, false);
  assert.equal("partnerPercent" in actions, false);
});

test("a completed customer order offers read review when that order has one", () => {
  const actions = orderFeedbackActions(completed, "customer", [review]);
  assert.equal(actions.share, false);
  assert.equal(actions.read, true);
  assert.equal(actions.review.comment, review.comment);
  assert.equal(reviewHashForOrder(completed), "#reviews?id=LAB-DONE-1");
  assert.equal(findReviewForOrder([ { referenceId: "LAB-DONE-1", comment: "Saved" } ], completed).comment, "Saved");
});

test("ongoing orders and partner or admin audiences do not offer order reviews", () => {
  assert.deepEqual(orderFeedbackActions(ongoing, "customer", []), {
    share: false,
    read: false,
    review: null,
  });
  assert.equal(orderFeedbackActions(completed, "partner", [review]).share, false);
  assert.equal(orderFeedbackActions(completed, "partner", [review]).read, false);
  assert.equal(orderFeedbackActions(completed, "staff", [review]).read, false);
  assert.equal(orderFeedbackActions(completed, "admin", [review]).read, false);
  assert.equal(
    orderFeedbackActions(
      { id: "MED-1", kind: "medicine", trackStatus: "on_the_way" },
      "customer",
      [review]
    ).share,
    false
  );
});

test("review service follows the order kind and ignores unrelated reviews", () => {
  assert.equal(reviewServiceForOrder(completed), "labs");
  assert.equal(reviewServiceForOrder({ kind: "medicine", trackStatus: "done" }), "medicines");
  assert.equal(findReviewForOrder([review], "OTHER-1"), null);
  assert.equal(
    orderFeedbackActions(
      { id: "MED-9", kind: "medicine", qrReceivedAt: 1 },
      "customer",
      []
    ).share,
    true
  );
});

test("review actions stay on the customer completed receipt and off partner and admin tools", () => {
  const read = (name) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
  const view = read("OrderFullView.jsx");
  const live = read("LiveTracking.jsx");
  const partner = read("Partner.jsx");
  const admin = read("Admin.jsx");
  const scan = read("ScanPage.jsx");
  const stepdown = read("StepDownDesk.jsx");
  const cta = read("OrderFeedbackCta.jsx");

  assert.match(view, /completedCustomer \? \([\s\S]*<OrderFeedbackCta order=\{order\} audience="customer" \/>/);
  assert.match(view, /showOrderPartnerBlock/);
  assert.match(live, /fromAdmin \? "staff" : "customer"/);
  assert.match(live, /String\(audience\)\.toLowerCase\(\) === "customer"/);
  assert.match(scan, /audience=\{app\}/);
  assert.match(cta, /Share feedback/);
  assert.match(cta, /Read review/);
  assert.doesNotMatch(cta, /partnerPercent|collection split|Staff split/i);
  assert.doesNotMatch(partner, /OrderFeedbackCta|Share feedback|Read review/);
  assert.doesNotMatch(admin, /OrderFeedbackCta|Share feedback|Read review/);
  assert.doesNotMatch(stepdown, /OrderFeedbackCta|Share feedback|Read review/);
});
