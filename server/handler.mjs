import { randomBytes } from "node:crypto";
import { listOrders, patchOrder, upsertOrder } from "./store.mjs";
import { splitPayment } from "../src/paymentSplit.js";
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
  listPartnerJobs,
  listPartners,
  partnerIdFromToken,
  partnerLogin,
} from "./partners.mjs";
import { readSettings, writeSettings } from "./settings.mjs";

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

function enrichOrder(body) {
  if (!body || typeof body !== "object") return body;
  const kind = body.kind || body.orderType || "medicine";
  const pin = body.pinCode || body.pin || "";
  const total = Number(body.total || body.charges || 0);
  const next = { ...body, kind };
  if (!next.split && total > 0) {
    next.split = splitPayment(kind, total, pin);
  }
  if (!next.paymentMethod) next.paymentMethod = "cod";
  if (!next.paymentStatus) {
    next.paymentStatus = next.paymentMethod === "online" ? "paid" : "cod";
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
      const split = splitPayment(kind, amountRupees, pin);
      const payment = {
        id: newPaymentId(),
        status: "created",
        kind,
        pin,
        reference: String(body.reference || ""),
        name: String(body.name || ""),
        mobile: String(body.mobile || ""),
        split,
        razorpayOrderId: "",
        razorpayPaymentId: "",
        createdAt: Date.now(),
      };

      if (razorpayEnabled()) {
        const transfers = split.razorpayAccountId
          ? [
              {
                account: split.razorpayAccountId,
                amount: split.partnerPaise,
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
      const result = await partnerLogin(body.mobile, body.pin);
      if (!result) {
        send(res, 401, { error: "Wrong partner mobile or PIN." });
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

    if (pathname === "/api/features" && req.method === "GET") {
      send(res, 200, await readSettings());
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
