import { randomBytes } from "node:crypto";
import { listOrders, patchOrder, upsertOrder } from "./store.mjs";
import { attachSettlement, resolveCollector, splitPayment } from "../src/paymentSplit.js";
import { isOnlinePayment } from "../src/paymentMethods.js";
import { openTrafficFromOrders } from "../src/partnerQueue.js";
import {
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
  createPartner,
  listPartnerJobs,
  listPartners,
  partnerIdFromToken,
  partnerLogin,
  setPartnerLogin,
} from "./partners.mjs";
import {
  appendCustomerMessage,
  getThread,
  listThreads,
  markCustomerRead,
  staffReply,
} from "./chats.mjs";
import { readSettings, writeSettings } from "./settings.mjs";
import { lookupPin, nearestPin } from "./pincodes.mjs";
import { RELEASE } from "./release.mjs";

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
    if (pathname === "/api/version" && req.method === "GET") {
      send(res, 200, {
        ok: true,
        app: "MediHome",
        release: RELEASE.id,
        partnerLogin: "loginId",
      });
      return true;
    }

    if (pathname === "/api/payments/config" && req.method === "GET") {
      send(res, 200, publicPaymentConfig());
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
      const partnerCollects = split.collector === "partner";
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
        split,
        razorpayOrderId: "",
        razorpayPaymentId: "",
        createdAt: Date.now(),
      };

      if (razorpayEnabled() && !partnerCollects) {
        const transfers = split.razorpayAccountId
          ? [
              {
                account: split.razorpayAccountId,
                amount: split.partnerTransferPaise ?? split.partnerPaise,
                currency: "INR",
                notes: { outlet: split.outletName, kind },
              },
            ]
          : undefined;
        const rzp = await createRazorpayOrder({
          amountPaise: split.totalPaise,
          receipt: payment.id,
          notes: { kind, pin, reference: payment.reference },
          transfers,
        });
        payment.razorpayOrderId = rzp.id;
        payment.status = "razorpay_created";
        await savePayment(payment);
        send(res, 200, {
          paymentId: payment.id,
          razorpayOrderId: rzp.id,
          amountPaise: split.totalPaise,
          keyId: publicPaymentConfig().keyId,
          split,
          testCheckout: false,
        });
        return true;
      }

      if (partnerCollects) {
        payment.status = isOnlinePayment(paymentMethod) ? "paid" : "created";
        payment.partnerCollected = true;
        payment.paidAt = isOnlinePayment(paymentMethod) ? Date.now() : undefined;
        await savePayment(payment);
        send(res, 200, {
          paymentId: payment.id,
          split,
          testCheckout: true,
          partnerCollected: true,
        });
        return true;
      }

      await savePayment(payment);
      send(res, 200, {
        paymentId: payment.id,
        split,
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
      await savePayment(payment);
      send(res, 200, {
        paymentId: payment.id,
        paymentStatus: "paid",
        razorpayPaymentId: payment.razorpayPaymentId,
        razorpayOrderId: payment.razorpayOrderId,
        split: payment.split,
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
      await savePayment(payment);
      send(res, 200, {
        paymentId: payment.id,
        paymentStatus: "paid",
        split: payment.split,
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
      const existing = (await listOrders()).find(
        (row) =>
          orderId(row) === decodeURIComponent(partnerJobMatch[1]) &&
          row.partnerId === partnerId
      );
      if (!existing) {
        send(res, 404, { error: "Job not found." });
        return true;
      }
      const patch = {};
      if (body.trackStatus) {
        patch.trackStatus = String(body.trackStatus);
        patch.trackCompleted = body.trackStatus === "done";
        patch.status =
          body.trackStatus === "done"
            ? "Completed"
            : String(body.status || existing.status || "Updated");
      }
      if (body.collectPayment) {
        const paymentMethod = isOnlinePayment(body.paymentMethod)
          ? String(body.paymentMethod)
          : "cod";
        const paidOn = "partner";
        const collector = resolveCollector({ method: paymentMethod, paidOn });
        const payable = Number(
          existing.split?.payableRupees ?? existing.total ?? existing.charges ?? 0
        );
        const kind = existing.kind || existing.orderType || "medicine";
        const pin = existing.pinCode || existing.pin || "";
        patch.paidOn = paidOn;
        patch.collector = collector;
        patch.paymentMethod = paymentMethod;
        patch.paymentStatus = "paid";
        patch.split = splitPayment(kind, payable, pin, {
          saleRupees:
            existing.split?.saleRupees ?? existing.saleRupees ?? payable,
          payableRupees: existing.split?.payableRupees ?? payable,
          couponCode: existing.split?.couponCode || existing.couponCode || "",
          paymentMethod,
          paidOn,
        });
      }
      const updated = await patchOrder(orderId(existing), patch);
      send(res, 200, { order: updated });
      return true;
    }

    if (pathname === "/api/orders" && req.method === "POST") {
      const body = await readJson(req);
      const saved = await upsertOrder(enrichOrder(body));
      if (!saved) {
        send(res, 400, { error: "Order id is required." });
        return true;
      }
      send(res, 200, { ok: true, id: saved.id || saved.bookingId || saved.requestId });
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
      if (Object.prototype.hasOwnProperty.call(body, "partnerId")) {
        if (!body.partnerId) {
          const updated = await patchOrder(decodeURIComponent(patchMatch[1]), {
            partnerId: "",
            partnerName: "",
            partnerMobile: "",
            partnerRole: "",
            partnerAssignedAt: 0,
          });
          if (!updated) {
            send(res, 404, { error: "Order not found." });
            return true;
          }
          send(res, 200, { order: updated });
          return true;
        }
        const assigned = await assignPartnerToOrder(
          decodeURIComponent(patchMatch[1]),
          body
        );
        if (!assigned) {
          send(res, 404, { error: "Order or partner not found." });
          return true;
        }
        send(res, 200, { order: assigned });
        return true;
      }
      const updated = await patchOrder(decodeURIComponent(patchMatch[1]), body);
      if (!updated) {
        send(res, 404, { error: "Order not found." });
        return true;
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
