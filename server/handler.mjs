import { randomBytes } from "node:crypto";
import { listOrders, patchOrder, upsertOrder } from "./store.mjs";
import { applyPartnerMedicineCorrection } from "../src/rxPartnerShare.js";
import {
  attachSettlement,
  clampSplitPercent,
  resplitOrder,
  resolveCollector,
  splitPayment,
} from "../src/paymentSplit.js";
import { isOnlinePayment } from "../src/paymentMethods.js";
import { publicSplit } from "../src/payeeBank.js";
import { partnerCollectPatch } from "../src/partnerCollect.js";
import {
  customerAcceptSlotFields,
  customerDeclineOfferedSlotFields,
  initialOrderStatus,
  isAwaitingCustomerSlotConfirm,
  isAwaitingPartnerConfirm,
  medicineAwaitingPharmacyFields,
  needsPartnerConfirm,
} from "../src/orderConfirm.js";
import {
  listCustomerNotifications,
  markCustomerNotificationsRead,
  notifyCustomerRefund,
  notifyCustomerSlotOffer,
  notifyCustomerStepdownAccount,
  notifyCustomerStepdownCharge,
  notifyCustomerStepdownDecision,
  notifyCustomerStepdownDischarge,
} from "./customerNotify.mjs";
import { openTrafficFromOrders } from "../src/partnerQueue.js";
import {
  clientPayment,
  createRazorpayOrder,
  findPayment,
  newPaymentId,
  publicPaymentConfig,
  razorpayEnabled,
  savePayment,
  verifySignature,
} from "./payments.mjs";
import {
  assignPartnerToOrder,
  attachConcernedPharmacy,
  attachDeliveryActor,
  createPartner,
  findPartner,
  listPartnerJobs,
  listPartners,
  partnerCanAccessJob,
  partnerIdFromToken,
  partnerLogin,
  setPartnerLogin,
  updatePartner,
} from "./partners.mjs";
import { deductOrderStock, listPartnerInventory } from "./stock.mjs";
import { findBatch, publicCatalog, readCatalog } from "./catalog.mjs";
import {
  isDeliveryPartner,
  isPharmacyStorePartner,
} from "../src/partnerRetention.js";
import {
  appendCustomerMessage,
  getThread,
  listThreads,
  markCustomerRead,
  staffReply,
} from "./chats.mjs";
import { readSettings, writeSettings } from "./settings.mjs";
import { lookupPin, nearestPin, resolvePinFromLocation } from "./pincodes.mjs";
import { parsePrescriptionPayload } from "./prescriptionAi.mjs";
import { withDeliveryOutlet } from "../src/deliveryOutlets.js";
import { notifyDeliveryPartnersForReturn, notifyPartnersForOrder } from "./partnerNotify.mjs";
import {
  isReturnPhoto,
  returnCollectError,
  returnRequestError,
} from "../src/pharmacyTrack.js";

const ADMIN_USER = process.env.MEDIHOME_ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.MEDIHOME_ADMIN_PASSWORD || "MediHome@26";
const tokens = new Set();

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.end(payload);
}

function readToken(req) {
  const header = String(req.headers.authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function requireStaff(req, res) {
  const token = readToken(req);
  if (!token || !tokens.has(token)) {
    send(res, 401, { error: "Staff login required." });
    return false;
  }
  return true;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function orderMobile(row) {
  return String(row.mobile || row.mobileNumber || "").replace(/\D/g, "");
}

function orderId(row) {
  return String(row.id || row.bookingId || row.requestId || "");
}

function splitFromOrderBody(kind, pin, body, payable) {
  const sale = Number(
    body.saleRupees ?? body.mrpTotal ?? body.split?.saleRupees ?? payable
  );
  const paymentMethod = body.paymentMethod || "";
  const paidOn = body.paidOn || body.split?.paidOn || "";
  return splitPayment(kind, payable, pin, {
    saleRupees: sale,
    payableRupees: payable,
    couponCode: body.couponCode || body.split?.couponCode || "",
    couponLabel: body.split?.couponLabel || "",
    paymentMethod,
    paidOn,
  });
}

function enrichOrder(body) {
  if (!body || typeof body !== "object") return body;
  const kind = body.kind || body.orderType || "medicine";
  const pin = body.pinCode || body.pin || "";
  const total = Number(body.total || body.charges || 0);
  const next = { ...body, kind };
  if (!next.paymentMethod) next.paymentMethod = "cod";
  const paidOn = next.paidOn || next.split?.paidOn || "";
  next.collector = resolveCollector({
    method: next.paymentMethod,
    paidOn,
    collector: next.collector || next.split?.collector,
  });
  next.paidOn = next.collector === "partner" ? "partner" : "customer";
  if (next.split && !next.split.splitMode) {
    next.split = attachSettlement(next.split, {
      collector: next.collector,
      paymentMethod: next.paymentMethod,
      paidOn: next.paidOn,
    });
  } else if (!next.split && total > 0) {
    next.split = splitFromOrderBody(kind, pin, next, total);
    next.collector = next.split.collector;
    next.paidOn = next.split.paidOn;
  }
  if (!next.paymentStatus) {
    next.paymentStatus = isOnlinePayment(next.paymentMethod) ? "paid" : "cod";
  }
  // Partner-confirmed services cannot be stored as confirmed until Accept.
  if (needsPartnerConfirm(kind) && isAwaitingPartnerConfirm(next)) {
    const confirm = String(next.partnerConfirmStatus || "").toLowerCase();
    if (!confirm || confirm === "pending") {
      Object.assign(next, initialOrderStatus(kind));
    }
  }
  Object.assign(next, withDeliveryOutlet(next));
  if (kind === "medicine") {
    const confirm = String(next.partnerConfirmStatus || "").toLowerCase();
    if (confirm !== "accepted" && confirm !== "declined") {
      Object.assign(next, medicineAwaitingPharmacyFields(next));
    }
  }
  return next;
}

export async function handleApi(req, res) {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true;
  }

  try {
    if (pathname === "/api/catalog" && req.method === "GET") {
      send(res, 200, publicCatalog(await readCatalog()));
      return true;
    }

    const batchReport = pathname.match(/^\/api\/catalog\/batches\/([^/]+)\/report$/);
    if (batchReport && req.method === "GET") {
      const batch = await findBatch(decodeURIComponent(batchReport[1]));
      if (!batch) {
        send(res, 404, { error: "Batch report not found." });
        return true;
      }
      send(res, 200, {
        id: batch.id,
        productName: batch.productName,
        batchNo: batch.batchNo,
        mfgDate: batch.mfgDate,
        expiryDate: batch.expiryDate,
        notes: batch.notes,
        fileName: batch.fileName,
        fileType: batch.fileType,
        fileData: batch.fileData || "",
      });
      return true;
    }

    if (pathname === "/api/payments/config" && req.method === "GET") {
      send(res, 200, publicPaymentConfig());
      return true;
    }

    if (pathname === "/api/prescription/parse" && req.method === "POST") {
      const body = await readJson(req);
      const result = await parsePrescriptionPayload({
        fileData: body.fileData || "",
        fileName: body.fileName || "",
        fileType: body.fileType || "",
      });
      send(res, 200, result);
      return true;
    }

    if (pathname === "/api/payments/create-order" && req.method === "POST") {
      const body = await readJson(req);
      const amountRupees = Number(body.amountRupees);
      if (!Number.isFinite(amountRupees) || amountRupees <= 0) {
        send(res, 400, { error: "A payable amount is required." });
        return true;
      }
      const kind = String(body.kind || "medicine");
      const pin = String(body.pin || "");
      const paymentMethod = String(body.paymentMethod || "online");
      const paidOn = body.paidOn === "partner" ? "partner" : "customer";
      const collector = resolveCollector({ method: paymentMethod, paidOn });
      const split = splitPayment(kind, amountRupees, pin, {
        saleRupees: body.saleRupees ?? amountRupees,
        payableRupees: amountRupees,
        couponCode: body.couponCode || "",
        collector,
        paymentMethod,
        paidOn,
      });
      const digital = isOnlinePayment(paymentMethod);
      const payment = {
        id: newPaymentId(),
        status: "created",
        kind,
        pin,
        reference: String(body.reference || ""),
        name: String(body.name || ""),
        mobile: String(body.mobile || ""),
        collector: split.collector,
        paidOn: split.paidOn,
        paymentMethod,
        split: publicSplit(split),
        razorpayOrderId: "",
        razorpayPaymentId: "",
        createdAt: Date.now(),
      };

      if (razorpayEnabled() && digital) {
        const rzp = await createRazorpayOrder({
          amountPaise: split.totalPaise,
          receipt: payment.id,
          notes: {
            kind,
            pin,
            reference: payment.reference,
            dest: "settlement_bank",
          },
        });
        payment.razorpayOrderId = rzp.id;
        payment.status = "razorpay_created";
        const saved = await savePayment(payment);
        send(res, 200, {
          paymentId: saved.id,
          razorpayOrderId: rzp.id,
          amountPaise: split.totalPaise,
          keyId: publicPaymentConfig().keyId,
          split: publicSplit(saved.split),
          testCheckout: false,
        });
        return true;
      }

      const saved = await savePayment(payment);
      send(res, 200, {
        paymentId: saved.id,
        split: publicSplit(saved.split),
        testCheckout: true,
      });
      return true;
    }

    if (pathname === "/api/payments/verify" && req.method === "POST") {
      const body = await readJson(req);
      const payment = await findPayment(body.paymentId);
      if (!payment) {
        send(res, 404, { error: "Payment not found." });
        return true;
      }
      if (
        !verifySignature(
          body.razorpay_order_id,
          body.razorpay_payment_id,
          body.razorpay_signature
        )
      ) {
        send(res, 400, { error: "Payment signature did not match." });
        return true;
      }
      payment.status = "paid";
      payment.razorpayOrderId = body.razorpay_order_id;
      payment.razorpayPaymentId = body.razorpay_payment_id;
      payment.paidAt = Date.now();
      const verified = await savePayment(payment);
      send(res, 200, {
        ...clientPayment(verified),
        paymentStatus: "paid",
      });
      return true;
    }

    if (pathname === "/api/payments/test-confirm" && req.method === "POST") {
      const body = await readJson(req);
      const payment = await findPayment(body.paymentId);
      if (!payment) {
        send(res, 404, { error: "Payment not found." });
        return true;
      }
      if (razorpayEnabled()) {
        send(res, 400, { error: "Use Razorpay checkout. Test confirm is off." });
        return true;
      }
      payment.status = "paid";
      payment.paidAt = Date.now();
      payment.testPaid = true;
      const confirmed = await savePayment(payment);
      send(res, 200, {
        ...clientPayment(confirmed),
        paymentStatus: "paid",
      });
      return true;
    }

    if (pathname === "/api/partner/login" && req.method === "POST") {
      const body = await readJson(req);
      const result = await partnerLogin(body.loginId || body.user, body.password);
      if (!result) {
        send(res, 401, { error: "Wrong login ID or password. Ask MediHome staff to create your first login." });
        return true;
      }
      send(res, 200, result);
      return true;
    }

    if (pathname === "/api/partner/jobs" && req.method === "GET") {
      const token = readToken(req) || url.searchParams.get("token") || "";
      const partnerId =
        url.searchParams.get("partnerId") || partnerIdFromToken(token) || "";
      const jobs = await listPartnerJobs(partnerId, token);
      if (!jobs) {
        send(res, 401, { error: "Partner login required." });
        return true;
      }
      send(res, 200, { jobs });
      return true;
    }

    if (pathname === "/api/partner/stock" && req.method === "GET") {
      const token = readToken(req) || url.searchParams.get("token") || "";
      const partnerId =
        url.searchParams.get("partnerId") || partnerIdFromToken(token) || "";
      const allowed = partnerIdFromToken(token);
      if (!allowed || allowed !== partnerId) {
        send(res, 401, { error: "Partner login required." });
        return true;
      }
      const partner = await findPartner(partnerId);
      if (!partner || !isPharmacyStorePartner(partner)) {
        send(res, 403, { error: "Inventory is only on the pharmacy partner desk." });
        return true;
      }
      const jobs = await listPartnerJobs(partnerId, token);
      const inventory = await listPartnerInventory(partner, jobs || []);
      send(res, 200, inventory);
      return true;
    }

    if (pathname === "/api/admin/partners" && req.method === "GET") {
      if (!requireStaff(req, res)) return true;
      send(res, 200, { partners: await listPartners() });
      return true;
    }

    if (pathname === "/api/admin/partners" && req.method === "POST") {
      if (!requireStaff(req, res)) return true;
      const body = await readJson(req);
      const created = await createPartner(body);
      if (!created.ok) {
        send(res, 400, { error: created.error });
        return true;
      }
      send(res, 200, { partner: created.partner, partners: await listPartners() });
      return true;
    }

    const partnerLoginMatch = pathname.match(/^\/api\/admin\/partners\/([^/]+)\/login$/);
    if (partnerLoginMatch && req.method === "PATCH") {
      if (!requireStaff(req, res)) return true;
      const body = await readJson(req);
      const updated = await setPartnerLogin(decodeURIComponent(partnerLoginMatch[1]), body);
      if (!updated.ok) {
        send(res, 400, { error: updated.error });
        return true;
      }
      send(res, 200, { partner: updated.partner, partners: await listPartners() });
      return true;
    }

    const partnerUpdateMatch = pathname.match(/^\/api\/admin\/partners\/([^/]+)$/);
    if (partnerUpdateMatch && req.method === "PATCH") {
      if (!requireStaff(req, res)) return true;
      const body = await readJson(req);
      const updated = await updatePartner(decodeURIComponent(partnerUpdateMatch[1]), body);
      if (!updated.ok) {
        send(res, 400, { error: updated.error });
        return true;
      }
      send(res, 200, { partner: updated.partner, partners: await listPartners() });
      return true;
    }

    if (pathname === "/api/care/thread" && req.method === "GET") {
      const sessionId = String(url.searchParams.get("sessionId") || "");
      const thread = await getThread(sessionId);
      if (thread && url.searchParams.get("ack") === "1") {
        await markCustomerRead(sessionId);
      }
      send(res, 200, { thread: (await getThread(sessionId)) || thread });
      return true;
    }

    if (pathname === "/api/care/messages" && req.method === "POST") {
      const body = await readJson(req);
      const thread = await appendCustomerMessage(body);
      if (!thread) {
        send(res, 400, { error: "A chat message is required." });
        return true;
      }
      send(res, 200, { thread });
      return true;
    }

    if (pathname === "/api/admin/chats" && req.method === "GET") {
      if (!requireStaff(req, res)) return true;
      send(res, 200, { threads: await listThreads() });
      return true;
    }

    const chatReply = pathname.match(/^\/api\/admin\/chats\/([^/]+)$/);
    if (chatReply && req.method === "PATCH") {
      if (!requireStaff(req, res)) return true;
      const body = await readJson(req);
      const thread = await staffReply(decodeURIComponent(chatReply[1]), body.text);
      if (!thread) {
        send(res, 404, { error: "Chat not found." });
        return true;
      }
      send(res, 200, { thread });
      return true;
    }

    if (pathname === "/api/features" && req.method === "GET") {
      send(res, 200, await readSettings());
      return true;
    }

    if (pathname === "/api/pincode/near" && req.method === "GET") {
      const found = nearestPin(url.searchParams.get("lat"), url.searchParams.get("lng"));
      if (!found) {
        send(res, 404, { error: "No PIN Code was found for this location." });
        return true;
      }
      send(res, 200, found);
      return true;
    }

    if (pathname === "/api/pincode/resolve" && req.method === "GET") {
      const found = resolvePinFromLocation(
        url.searchParams.get("lat"),
        url.searchParams.get("lng"),
        {
          postcode: url.searchParams.get("postcode") || url.searchParams.get("pin"),
          area: url.searchParams.get("area"),
          suburb: url.searchParams.get("suburb"),
          neighbourhood: url.searchParams.get("neighbourhood"),
          village: url.searchParams.get("village"),
          locality: url.searchParams.get("locality"),
        }
      );
      if (!found) {
        send(res, 404, { error: "No PIN Code was found for this location." });
        return true;
      }
      send(res, 200, found);
      return true;
    }

    const pinMatch = pathname.match(/^\/api\/pincode\/(\d{6})$/);
    if (pinMatch && req.method === "GET") {
      const found = lookupPin(pinMatch[1]);
      if (!found) {
        send(res, 404, { error: "PIN Code was not found." });
        return true;
      }
      send(res, 200, found);
      return true;
    }

    if (pathname === "/api/traffic" && req.method === "GET") {
      send(res, 200, { open: openTrafficFromOrders(await listOrders()) });
      return true;
    }

    if (pathname === "/api/admin/settings" && req.method === "GET") {
      if (!requireStaff(req, res)) return true;
      send(res, 200, await readSettings());
      return true;
    }

    if (pathname === "/api/admin/settings" && req.method === "PATCH") {
      if (!requireStaff(req, res)) return true;
      const body = await readJson(req);
      send(res, 200, await writeSettings(body));
      return true;
    }

    if (pathname === "/api/orders/lookup" && req.method === "GET") {
      const id = decodeURIComponent(String(url.searchParams.get("id") || "")).trim();
      if (!id) {
        send(res, 400, { error: "Order id is required." });
        return true;
      }
      const found = (await listOrders()).find((row) => orderId(row) === id);
      if (!found) {
        send(res, 404, { error: "Order not found." });
        return true;
      }
      send(res, 200, { order: found });
      return true;
    }

    if (pathname === "/api/orders/mine" && req.method === "GET") {
      const mobile = String(url.searchParams.get("mobile") || "").replace(/\D/g, "");
      if (mobile.length !== 10) {
        send(res, 400, { error: "A 10-digit mobile number is required." });
        return true;
      }
      const orders = (await listOrders()).filter(
        (row) => orderMobile(row) === mobile
      );
      send(res, 200, { orders });
      return true;
    }

    const partnerJobMatch = pathname.match(/^\/api\/partner\/jobs\/([^/]+)$/);
    if (partnerJobMatch && req.method === "PATCH") {
      const token = readToken(req);
      const partnerId = partnerIdFromToken(token);
      if (!partnerId) {
        send(res, 401, { error: "Partner login required." });
        return true;
      }
      const body = await readJson(req);
      const partner = await findPartner(partnerId);
      if (!partner) {
        send(res, 401, { error: "Partner login required." });
        return true;
      }
      const existing = (await listOrders()).find(
        (row) =>
          orderId(row) === decodeURIComponent(partnerJobMatch[1]) &&
          partnerCanAccessJob(partner, row)
      );
      if (!existing) {
        send(res, 404, { error: "Job not found." });
        return true;
      }
      const patch = {};
      if (body.trackStatus) {
        patch.trackStatus = String(body.trackStatus);
        patch.trackCompleted =
          body.trackStatus === "done" ||
          body.trackStatus === "declined" ||
          Boolean(body.trackCompleted);
        patch.status =
          body.trackStatus === "done"
            ? "Completed"
            : body.trackStatus === "declined"
              ? "Declined By Partner"
              : body.trackStatus === "confirmed"
                ? String(body.status || "Confirmed")
                : body.trackStatus === "assigned"
                  ? String(body.status || "Partner Assigned")
                  : body.trackStatus === "sample_collected"
                    ? String(body.status || "Sample Collected")
                    : body.trackStatus === "report_ready"
                      ? String(body.status || "Report Ready")
                      : body.trackStatus === "slot_offered"
                        ? String(body.status || "Awaiting Customer Slot Confirmation")
                      : String(body.status || existing.status || "Updated");
      }
      if (Object.prototype.hasOwnProperty.call(body, "partnerConfirmed")) {
        patch.partnerConfirmed = Boolean(body.partnerConfirmed);
      }
      if (body.partnerConfirmStatus) {
        patch.partnerConfirmStatus = String(body.partnerConfirmStatus);
      }
      if (body.partnerConfirmedAt) {
        patch.partnerConfirmedAt = Number(body.partnerConfirmedAt) || Date.now();
      }
      if (body.technicianName != null) {
        patch.technicianName = String(body.technicianName || "").trim().slice(0, 80);
      }
      if (body.technicianMobile != null) {
        patch.technicianMobile = String(body.technicianMobile || "")
          .replace(/\D/g, "")
          .slice(0, 10);
      }
      if (body.technicianAssignedAt) {
        patch.technicianAssignedAt = Number(body.technicianAssignedAt) || Date.now();
      }
      if (body.sampleCollectedAt) {
        patch.sampleCollectedAt = Number(body.sampleCollectedAt) || Date.now();
      }
      if (body.reportUploadedAt) {
        patch.reportUploadedAt = Number(body.reportUploadedAt) || Date.now();
      }
      if (body.reportFileName != null) {
        patch.reportFileName = String(body.reportFileName || "").trim().slice(0, 160);
      }
      if (body.reportFileType != null) {
        patch.reportFileType = String(body.reportFileType || "").trim().slice(0, 80);
      }
      if (body.reportFileData != null) {
        const data = String(body.reportFileData || "");
        patch.reportFileData = data.slice(0, 2_000_000);
      }
      if (body.reportTestName != null) {
        patch.reportTestName = String(body.reportTestName || "").trim().slice(0, 120);
      }
      if (body.reportNotes != null) {
        patch.reportNotes = String(body.reportNotes || "").trim().slice(0, 400);
      }
      if (body.completedAt) {
        patch.completedAt = Number(body.completedAt) || Date.now();
      }
      if (body.rxMedicineCorrection) {
        const corrected = applyPartnerMedicineCorrection(
          existing,
          body.rxMedicineCorrection,
          partner
        );
        if (!corrected.ok) {
          send(res, 400, { error: corrected.error });
          return true;
        }
        Object.assign(patch, corrected.patch);
      }
      if (body.timeSlot != null) patch.timeSlot = String(body.timeSlot).slice(0, 40);
      if (body.date != null) patch.date = String(body.date).slice(0, 12);
      if (body.requestedTimeSlot != null) {
        patch.requestedTimeSlot = String(body.requestedTimeSlot).slice(0, 40);
      }
      if (body.requestedDate != null) {
        patch.requestedDate = String(body.requestedDate).slice(0, 12);
      }
      if (body.offeredTimeSlot != null) {
        patch.offeredTimeSlot = String(body.offeredTimeSlot).slice(0, 40);
      }
      if (body.offeredDate != null) {
        patch.offeredDate = String(body.offeredDate).slice(0, 12);
      }
      if (Object.prototype.hasOwnProperty.call(body, "slotConfirmed")) {
        patch.slotConfirmed = Boolean(body.slotConfirmed);
      }
      if (body.slotConfirmStatus) {
        patch.slotConfirmStatus = String(body.slotConfirmStatus);
      }
      if (body.slotOfferedAt) {
        patch.slotOfferedAt = Number(body.slotOfferedAt) || Date.now();
      }
      if (body.slotConfirmedAt) {
        patch.slotConfirmedAt = Number(body.slotConfirmedAt) || Date.now();
      }
      if (body.slotRejectedAt) {
        patch.slotRejectedAt = Number(body.slotRejectedAt) || Date.now();
      }
      if (
        body.trackStatus === "confirmed" ||
        body.trackStatus === "assigned" ||
        body.trackStatus === "slot_offered" ||
        body.partnerConfirmStatus === "accepted" ||
        body.partnerConfirmStatus === "slot_offered"
      ) {
        patch.partnerId = partner.id;
        patch.partnerName = partner.name;
        patch.partnerMobile = partner.mobile;
        patch.partnerRole = partner.role;
        patch.partner = partner.name;
        patch.partnerAssignedAt = Date.now();
        if (!existing.split?.staffSet) {
          patch.split = {
            ...resplitOrder(
              { ...existing, ...patch },
              { partnerPercent: partner.partnerPercent }
            ),
            staffSet: false,
          };
        }
        if (isPharmacyStorePartner(partner)) {
          patch.pharmacyPartnerId = partner.id;
          patch.pharmacyPartnerName = partner.name;
        }
      }
      if (Array.isArray(body.stayCharges)) patch.stayCharges = body.stayCharges;
      if (Array.isArray(body.extendedDays)) patch.extendedDays = body.extendedDays;
      if (body.total != null) patch.total = Number(body.total) || 0;
      if (body.saleRupees != null) patch.saleRupees = Number(body.saleRupees) || 0;
      if (body.dayRate != null) patch.dayRate = Number(body.dayRate) || 0;
      if (body.billingStarted != null) patch.billingStarted = Boolean(body.billingStarted);
      if (body.roomNo != null) patch.roomNo = String(body.roomNo || "").trim().slice(0, 20);
      if (body.bedNo != null) patch.bedNo = String(body.bedNo || "").trim().slice(0, 20);
      if (body.admitted != null) patch.admitted = Boolean(body.admitted);
      if (body.admittedAt) patch.admittedAt = Number(body.admittedAt) || Date.now();
      if (body.discharged != null) patch.discharged = Boolean(body.discharged);
      if (body.dischargedAt) patch.dischargedAt = Number(body.dischargedAt) || Date.now();
      if (body.billFinalized != null) patch.billFinalized = Boolean(body.billFinalized);
      if (body.billFinalizedAt) patch.billFinalizedAt = Number(body.billFinalizedAt) || Date.now();
      if (Array.isArray(body.headingTotals)) patch.headingTotals = body.headingTotals;
      if (Array.isArray(body.billLines)) patch.billLines = body.billLines;
      if (body.paid != null) patch.paid = Boolean(body.paid);
      if (body.paymentStatus) patch.paymentStatus = String(body.paymentStatus).slice(0, 24);
      if (body.paymentMethod) patch.paymentMethod = String(body.paymentMethod).slice(0, 20);
      if (body.paidOn) patch.paidOn = String(body.paidOn).slice(0, 20);
      if (body.paidAt) patch.paidAt = Number(body.paidAt) || Date.now();
      if (body.patientReached != null) patch.patientReached = Boolean(body.patientReached);
      if (body.patientAccountId) patch.patientAccountId = String(body.patientAccountId).slice(0, 40);
      if (body.patientAccountName != null) {
        patch.patientAccountName = String(body.patientAccountName || "").trim().slice(0, 80);
      }
      if (body.patientAccountMobile != null) {
        patch.patientAccountMobile = String(body.patientAccountMobile || "").replace(/\D/g, "").slice(-10);
      }
      if (body.patientAccountOpened != null) {
        patch.patientAccountOpened = Boolean(body.patientAccountOpened);
      }
      if (body.patientAccountCreatedAt) {
        patch.patientAccountCreatedAt = Number(body.patientAccountCreatedAt) || Date.now();
      }
      if (body.inchargeName != null) patch.inchargeName = String(body.inchargeName || "").trim().slice(0, 80);
      if (body.inchargeMobile != null) {
        patch.inchargeMobile = String(body.inchargeMobile || "").replace(/\D/g, "").slice(-10);
      }
      if (body.inchargeRole != null) patch.inchargeRole = String(body.inchargeRole || "").trim().slice(0, 80);
      if (body.agentName != null) patch.agentName = String(body.agentName || "").trim().slice(0, 80);
      if (body.agentMobile != null) {
        patch.agentMobile = String(body.agentMobile || "").replace(/\D/g, "").slice(-10);
      }
      if (body.agentRole != null) patch.agentRole = String(body.agentRole || "").trim().slice(0, 80);
      if (body.status && !patch.status) patch.status = String(body.status).slice(0, 80);
      for (const key of [
        "checkPackAt",
        "checkPickupAt",
        "checkDeliverAt",
        "qrPickedAt",
        "qrReceivedAt",
        "qrPackedAt",
        "qrLastScan",
        "trackStartedAt",
        "returnStatus",
        "returnRequestedAt",
        "returnCollectedAt",
        "returnReceivedAt",
        "returnReason",
        "returnCustomerPhotoName",
        "returnCustomerPhotoType",
        "returnCollectPhotoName",
        "returnCollectPhotoType",
      ]) {
        if (body[key] != null) patch[key] = body[key];
      }
      if (body.returnCustomerPhoto != null) {
        patch.returnCustomerPhoto = String(body.returnCustomerPhoto || "").slice(0, 2_000_000);
      }
      if (body.returnCollectPhoto != null) {
        patch.returnCollectPhoto = String(body.returnCollectPhoto || "").slice(0, 2_000_000);
      }
      if (body.returnStatus === "requested") {
        const err = returnRequestError({
          returnCustomerPhoto: patch.returnCustomerPhoto || existing.returnCustomerPhoto,
        });
        if (err) {
          send(res, 400, { error: err });
          return true;
        }
        patch.status = String(body.status || "Return requested");
      }
      if (body.returnStatus === "collected") {
        const err = returnCollectError({
          returnCollectPhoto: patch.returnCollectPhoto || existing.returnCollectPhoto,
        });
        if (err) {
          send(res, 400, { error: err });
          return true;
        }
        patch.status = String(body.status || "Return collected");
        if (isDeliveryPartner(partner)) {
          Object.assign(patch, attachDeliveryActor(partner));
        }
      }
      if (body.returnStatus === "received") {
        patch.status = String(body.status || "Returned");
      }
      if (
        isDeliveryPartner(partner) &&
        (body.checkPickupAt ||
          body.qrPickedAt ||
          body.qrLastScan === "pickup" ||
          body.qrLastScan === "deliver" ||
          body.trackStatus === "picked_up" ||
          body.trackStatus === "on_the_way" ||
          body.trackStatus === "done")
      ) {
        Object.assign(patch, attachDeliveryActor(partner));
      }
      if (body.collectPayment) {
        const collected = partnerCollectPatch(existing, body);
        if (!collected.ok) {
          send(res, 400, { error: collected.error });
          return true;
        }
        Object.assign(patch, collected.patch);
        if (!existing.partnerId && !patch.partnerId) {
          patch.partnerId = partner.id;
          patch.partnerName = partner.name;
          patch.partnerMobile = partner.mobile;
          patch.partnerRole = partner.role;
          patch.partner = partner.name;
          patch.partnerAssignedAt = Date.now();
        }
      }
      if (
        isPharmacyStorePartner(partner) &&
        !existing.stockDeducted &&
        (body.partnerConfirmStatus === "accepted" || body.trackStatus === "confirmed")
      ) {
        const deducted = await deductOrderStock({
          ...existing,
          ...patch,
          outletId: partner.outletId || existing.outletId,
        });
        if (deducted?.stockDeducted) patch.stockDeducted = true;
      }
      const updated = await patchOrder(orderId(existing), patch);
      if (
        updated &&
        (updated.partnerConfirmStatus === "slot_offered" ||
          updated.slotConfirmStatus === "offered")
      ) {
        try {
          await notifyCustomerSlotOffer(updated);
        } catch {
          /* keep the partner offer even if the notice store fails */
        }
      }
      if (
        updated &&
        updated.returnStatus === "requested" &&
        existing.returnStatus !== "requested"
      ) {
        try {
          await notifyDeliveryPartnersForReturn(updated);
        } catch {
          /* keep the return even if the notice store fails */
        }
      }
      if (
        updated &&
        updated.refundStatus &&
        updated.refundStatus !== existing.refundStatus
      ) {
        try {
          await notifyCustomerRefund(updated);
        } catch {
          /* keep the refund even if the notice store fails */
        }
      }
      if (
        updated &&
        String(updated.kind || updated.orderType || "") === "stepdown" &&
        updated.partnerConfirmStatus &&
        updated.partnerConfirmStatus !== existing.partnerConfirmStatus &&
        (updated.partnerConfirmStatus === "accepted" ||
          updated.partnerConfirmStatus === "declined")
      ) {
        try {
          await notifyCustomerStepdownDecision(updated);
        } catch {
          /* keep the decision even if the notice store fails */
        }
      }
      if (
        updated &&
        String(updated.kind || updated.orderType || "") === "stepdown" &&
        updated.patientAccountId &&
        updated.patientAccountId !== existing.patientAccountId
      ) {
        try {
          await notifyCustomerStepdownAccount(updated);
        } catch {
          /* keep the account even if the notice store fails */
        }
      }
      if (
        updated &&
        String(updated.kind || updated.orderType || "") === "stepdown" &&
        (updated.stayCharges || []).length > (existing.stayCharges || []).length
      ) {
        try {
          await notifyCustomerStepdownCharge(updated);
        } catch {
          /* keep the charge even if the notice store fails */
        }
      }
      if (
        updated &&
        String(updated.kind || updated.orderType || "") === "stepdown" &&
        updated.discharged &&
        !existing.discharged
      ) {
        try {
          await notifyCustomerStepdownDischarge(updated);
        } catch {
          /* keep the discharge even if the notice store fails */
        }
      }
      send(res, 200, { order: updated });
      return true;
    }

    if (pathname === "/api/customer/notifications" && req.method === "GET") {
      const mobile = String(url.searchParams.get("mobile") || "").replace(/\D/g, "");
      send(res, 200, { notifications: await listCustomerNotifications(mobile) });
      return true;
    }

    const slotReply = pathname.match(/^\/api\/orders\/([^/]+)\/slot-reply$/);
    if (slotReply && req.method === "POST") {
      const body = await readJson(req);
      const wanted = decodeURIComponent(slotReply[1]);
      const mobile = String(body.mobile || "").replace(/\D/g, "").slice(-10);
      const found = (await listOrders()).find((row) => orderId(row) === wanted);
      if (!found) {
        send(res, 404, { error: "Booking not found." });
        return true;
      }
      const orderDigits = String(orderMobile(found) || "").slice(-10);
      if (!mobile || mobile.length !== 10 || orderDigits !== mobile) {
        send(res, 403, { error: "Use the mobile number on this booking." });
        return true;
      }
      if (!isAwaitingCustomerSlotConfirm(found)) {
        send(res, 409, { error: "There is no offered time slot to confirm." });
        return true;
      }
      const decision = String(body.decision || "").toLowerCase();
      const fields =
        decision === "accept"
          ? customerAcceptSlotFields(found)
          : decision === "decline"
            ? customerDeclineOfferedSlotFields(found)
            : null;
      if (!fields) {
        send(res, 400, { error: "Choose accept or decline." });
        return true;
      }
      const updated = await patchOrder(orderId(found), fields);
      try {
        const notices = await listCustomerNotifications(mobile);
        const ids = notices
          .filter((row) => row.orderId === orderId(found) && row.type === "slot_offer")
          .map((row) => row.id);
        if (ids.length) await markCustomerNotificationsRead(mobile, ids);
      } catch {
        /* ignore */
      }
      send(res, 200, { order: updated });
      return true;
    }

    if (pathname === "/api/orders" && req.method === "POST") {
      const body = await readJson(req);
      const incoming = enrichOrder(body);
      const wanted = orderId(incoming);
      const existing = wanted
        ? (await listOrders()).find((row) => orderId(row) === wanted)
        : null;
      if (
        existing &&
        String(existing.partnerConfirmStatus || "").toLowerCase() === "accepted"
      ) {
        incoming.partnerConfirmStatus = "accepted";
        incoming.partnerConfirmed = true;
        incoming.partnerId = existing.partnerId || incoming.partnerId;
        incoming.partnerName = existing.partnerName || incoming.partnerName;
        if (!incoming.trackStatus || incoming.trackStatus === "requested") {
          incoming.trackStatus = existing.trackStatus || "confirmed";
          incoming.status = existing.status || "Confirmed";
        }
      }
      if (existing) {
        incoming.pharmacyPartnerId =
          incoming.pharmacyPartnerId || existing.pharmacyPartnerId;
        incoming.pharmacyPartnerName =
          incoming.pharmacyPartnerName || existing.pharmacyPartnerName;
        incoming.deliveryPartnerId =
          incoming.deliveryPartnerId || existing.deliveryPartnerId;
        incoming.deliveryPartnerName =
          incoming.deliveryPartnerName || existing.deliveryPartnerName;
        incoming.returnStatus = incoming.returnStatus || existing.returnStatus;
        incoming.returnRequestedAt = incoming.returnRequestedAt || existing.returnRequestedAt;
        incoming.returnCollectedAt = incoming.returnCollectedAt || existing.returnCollectedAt;
        incoming.returnReceivedAt = incoming.returnReceivedAt || existing.returnReceivedAt;
        incoming.returnReason = incoming.returnReason || existing.returnReason;
        incoming.returnCustomerPhoto =
          incoming.returnCustomerPhoto || existing.returnCustomerPhoto;
        incoming.returnCustomerPhotoName =
          incoming.returnCustomerPhotoName || existing.returnCustomerPhotoName;
        incoming.returnCollectPhoto =
          incoming.returnCollectPhoto || existing.returnCollectPhoto;
        incoming.returnCollectPhotoName =
          incoming.returnCollectPhotoName || existing.returnCollectPhotoName;
        incoming.refundStatus = incoming.refundStatus || existing.refundStatus;
        incoming.refundAmount = incoming.refundAmount || existing.refundAmount;
        incoming.refundNote = incoming.refundNote || existing.refundNote;
        incoming.refundUpdatedAt = incoming.refundUpdatedAt || existing.refundUpdatedAt;
      }
      if (incoming.returnStatus === "requested") {
        const err = returnRequestError(incoming);
        if (err) {
          send(res, 400, { error: err });
          return true;
        }
      }
      if (incoming.returnCustomerPhoto && !isReturnPhoto(incoming.returnCustomerPhoto)) {
        incoming.returnCustomerPhoto = "";
      }
      if (String(incoming.kind || incoming.orderType || "") === "medicine") {
        Object.assign(
          incoming,
          attachConcernedPharmacy(incoming, await listPartners())
        );
      }
      const token = readToken(req);
      const actorId = partnerIdFromToken(token);
      if (actorId && (incoming.checkPickupAt || incoming.qrPickedAt || incoming.checkDeliverAt)) {
        const actor = await findPartner(actorId);
        Object.assign(incoming, attachDeliveryActor(actor));
      }
      const saved = await upsertOrder(incoming);
      if (!saved) {
        send(res, 400, { error: "Order id is required." });
        return true;
      }
      try {
        await notifyPartnersForOrder(saved);
      } catch {
        /* keep the order even if partner notify fails */
      }
      if (
        saved.returnStatus === "requested" &&
        existing?.returnStatus !== "requested"
      ) {
        try {
          await notifyDeliveryPartnersForReturn(saved);
        } catch {
          /* keep the return even if the notice store fails */
        }
      }
      send(res, 200, {
        ok: true,
        id: saved.id || saved.bookingId || saved.requestId,
        order: saved,
      });
      return true;
    }

    if (pathname === "/api/admin/login" && req.method === "POST") {
      const body = await readJson(req);
      const user = String(body.user || body.username || "").trim();
      const password = String(body.password || "");
      if (user !== ADMIN_USER || password !== ADMIN_PASSWORD) {
        send(res, 401, { error: "Wrong staff user or password." });
        return true;
      }
      const token = randomBytes(24).toString("hex");
      tokens.add(token);
      send(res, 200, { token, user });
      return true;
    }

    if (pathname === "/api/admin/orders" && req.method === "GET") {
      if (!requireStaff(req, res)) return true;
      send(res, 200, { orders: await listOrders() });
      return true;
    }

    const patchMatch = pathname.match(/^\/api\/admin\/orders\/([^/]+)$/);
    if (patchMatch && req.method === "PATCH") {
      if (!requireStaff(req, res)) return true;
      const body = await readJson(req);
      const orderKey = decodeURIComponent(patchMatch[1]);
      let current = null;
      if (Object.prototype.hasOwnProperty.call(body, "partnerId")) {
        if (!body.partnerId) {
          current = await patchOrder(orderKey, {
            partnerId: "",
            partnerName: "",
            partnerMobile: "",
            partnerRole: "",
            partnerAssignedAt: 0,
          });
          if (!current) {
            send(res, 404, { error: "Order not found." });
            return true;
          }
        } else {
          current = await assignPartnerToOrder(orderKey, body);
          if (!current) {
            send(res, 404, { error: "Order or partner not found." });
            return true;
          }
        }
      }
      if (body.partnerPercent != null || body.platformPercent != null) {
        current =
          current ||
          (await listOrders()).find(
            (row) =>
              String(row.id) === orderKey ||
              String(row.bookingId) === orderKey ||
              String(row.requestId) === orderKey
          );
        if (!current) {
          send(res, 404, { error: "Order not found." });
          return true;
        }
        const partnerShare = clampSplitPercent(body.partnerPercent);
        const split = {
          ...resplitOrder(current, {
            partnerPercent: body.partnerPercent,
            platformPercent: body.platformPercent,
          }),
          staffSet: true,
        };
        current = await patchOrder(orderKey, {
          split,
          staffPartnerPercent:
            partnerShare != null ? partnerShare : split.partnerPercent,
        });
        if (!current) {
          send(res, 404, { error: "Order not found." });
          return true;
        }
      }
      if (current && (body.partnerId != null || body.partnerPercent != null || body.platformPercent != null)) {
        const leftover = { ...body };
        delete leftover.partnerId;
        delete leftover.partnerPercent;
        delete leftover.platformPercent;
        if (Object.keys(leftover).length) {
          current = (await patchOrder(orderKey, leftover)) || current;
        }
        send(res, 200, { order: current });
        return true;
      }
      const existingAdmin = (await listOrders()).find(
        (row) =>
          String(row.id) === orderKey ||
          String(row.bookingId) === orderKey ||
          String(row.requestId) === orderKey
      );
      const updated = await patchOrder(orderKey, body);
      if (!updated) {
        send(res, 404, { error: "Order not found." });
        return true;
      }
      if (body.refundStatus && updated.refundStatus !== existingAdmin?.refundStatus) {
        try {
          await notifyCustomerRefund(updated);
        } catch {
          /* keep the refund even if the notice store fails */
        }
      }
      send(res, 200, { order: updated });
      return true;
    }
  } catch (error) {
    send(res, 400, { error: error.message || "Bad request." });
    return true;
  }

  return false;
}
