import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "./apiBase.js";
import { staffToken } from "./adminApi";
import { orderMobileDigits } from "./labCustomerActions";
import { genderLabel, relationLabel } from "./personFields";
import {
  orderAddress,
  orderPatientName,
  orderRecordId,
  orderTestName,
} from "./orderFullFields";

const CUSTOMER_TABS = [
  { id: "orders", label: "Orders" },
  { id: "reports", label: "Reports" },
  { id: "prescriptions", label: "Prescriptions" },
];

async function loadRegisteredAccounts() {
  const response = await apiFetch("/api/admin/accounts", {
    headers: { Authorization: `Bearer ${staffToken()}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { accounts: [], removed: [] };
  return {
    accounts: Array.isArray(data.accounts) ? data.accounts : [],
    removed: Array.isArray(data.removed) ? data.removed : [],
  };
}

function customersFromActivity(accounts, orders, removed = []) {
  const hidden = new Set(removed.map((mobile) => orderMobileDigits({ mobile })).filter(Boolean));
  const byMobile = new Map();
  for (const account of accounts) {
    const mobile = orderMobileDigits(account);
    if (!mobile || hidden.has(mobile)) continue;
    byMobile.set(mobile, {
      ...account,
      mobile,
      orders: [],
    });
  }
  for (const order of orders) {
    const mobile = orderMobileDigits(order);
    if (mobile && hidden.has(mobile)) continue;
    const key = mobile || `order-${orderRecordId(order)}`;
    const current = byMobile.get(key) || {
      mobile,
      name: "",
      email: "",
      gender: "",
      dob: "",
      age: "",
      address: "",
      pinCode: "",
      familyMembers: [],
      orders: [],
    };
    const name = orderPatientName(order);
    if (name && (!current.name || current.name === "Customer")) current.name = name;
    if (!current.email) current.email = order.email || order.mailId || "";
    if (!current.gender && order.gender) current.gender = order.gender;
    if (!current.dob && order.dob) current.dob = order.dob;
    if (!current.age && order.age) current.age = order.age;
    const nextAddress = orderAddress(order);
    if (nextAddress && (!current.address || nextAddress.length > String(current.address).length)) {
      current.address = nextAddress;
    }
    if (!current.pinCode) current.pinCode = String(order.pinCode || order.pin || "");
    current.orders = [...(current.orders || []), order];
    byMobile.set(key, current);
  }
  return [...byMobile.values()].sort((a, b) =>
    String(a.name || "Customer").localeCompare(String(b.name || "Customer"))
  );
}

function reportRows(order) {
  const listed = Array.isArray(order.reportFiles) ? order.reportFiles : [];
  const files = listed.filter((file) => file?.fileName || file?.fileData);
  if (files.length) return files.map((file) => ({ ...file, order }));
  if (order.reportFileName || order.reportFileData) {
    return [
      {
        fileName: order.reportFileName,
        fileData: order.reportFileData,
        testName: order.reportTestName,
        order,
      },
    ];
  }
  return [];
}

function prescriptionRows(order) {
  const rows = [];
  if (order.prescriptionName || order.prescriptionFile || order.prescriptionFileData || order.prescription) {
    rows.push({
      name: order.prescriptionName || order.prescription || "Prescription",
      href: order.prescriptionFile || order.prescriptionFileData || "",
      order,
    });
  }
  const doctor = order.doctorPrescription;
  if (doctor && (doctor.note || doctor.symptoms || doctor.medicines)) {
    const text = [
      Array.isArray(doctor.symptoms) ? doctor.symptoms.join(", ") : doctor.symptoms,
      doctor.note,
      Array.isArray(doctor.medicines) ? doctor.medicines.map((item) => item.name || item.brand || item).join(", ") : "",
    ].filter(Boolean).join(" · ");
    rows.push({ name: text || "Doctor prescription", href: "", order });
  }
  return rows;
}

function fileLink(label, href) {
  if (!href) return label || "File";
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {label || "Open"}
    </a>
  );
}

export default function AdminAccounts({ orders = [] }) {
  const [accounts, setAccounts] = useState([]);
  const [removed, setRemoved] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [tab, setTab] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadRegisteredAccounts()
      .then((next) => {
        if (cancelled) return;
        setAccounts(next.accounts);
        setRemoved(next.removed);
      })
      .catch(() => {
        if (!cancelled) {
          setAccounts([]);
          setRemoved([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(
    () => customersFromActivity(accounts, orders, removed),
    [accounts, orders, removed]
  );
  const selected = rows.find((row, index) => (row.mobile || `customer-${index}`) === selectedKey) || null;
  const customerOrders = selected?.orders || [];
  const reports = customerOrders.flatMap(reportRows);
  const prescriptions = customerOrders.flatMap(prescriptionRows);

  const openCustomer = (key) => {
    setSelectedKey((current) => (current === key ? "" : key));
    setTab("");
  };

  const openTab = (id) => {
    setTab((current) => (current === id ? "" : id));
  };

  return (
    <section className="admin-accounts" aria-label="Customers">
      <style>{`
        .admin-customer-name{border:0;background:transparent;padding:0;color:#1a6b7a;font:inherit;font-weight:800;cursor:pointer;text-align:left}
        .admin-customer-card{display:grid;gap:8px;margin-top:12px;padding:14px;border:1px solid #e4ecef;border-radius:12px;background:#fff}
        .admin-customer-card h3{margin:0;color:#143246;font-size:16px}
        .admin-customer-card dl{display:grid;grid-template-columns:9rem 1fr;gap:6px 10px;margin:0}
        .admin-customer-card dt{color:#5d7180;font-size:12px;font-weight:800}
        .admin-customer-card dd{margin:0;color:#143246;font-size:14px}
        .admin-customer-tabs{display:flex;flex-wrap:wrap;gap:8px}
        .admin-customer-tabs button{min-height:34px;padding:6px 12px;border:1px solid #d7e2e9;border-radius:999px;background:#f4fafb;color:#1a6b7a;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
        .admin-customer-tabs button.is-on{background:#1a6b7a;color:#fff;border-color:#1a6b7a}
        .admin-customer-panel{display:grid;gap:8px}
        .admin-customer-panel p,.admin-customer-panel li{margin:0;color:#143246;font-size:14px}
        .admin-customer-panel ul,.admin-customer-panel ol{display:grid;gap:6px;margin:0;padding-left:18px}
        .admin-customer-remove{justify-self:start;min-height:34px;padding:6px 12px;border:1px solid #e3b4b4;border-radius:999px;background:#fff6f6;color:#8a3b3b;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
        .admin-customer-remove:disabled{opacity:.6;cursor:wait}
      `}</style>
      {rows.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Name</th>
                <th>Mobile no</th>
                <th>Mail ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((customer, index) => {
                const key = customer.mobile || `customer-${index}`;
                const open = key === selectedKey;
                return (
                  <tr key={key}>
                    <td>{index + 1}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-customer-name"
                        aria-expanded={open}
                        onClick={() => openCustomer(key)}
                      >
                        {customer.name || "Customer"}
                      </button>
                    </td>
                    <td>{customer.mobile || "—"}</td>
                    <td>{customer.email || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="admin-hint">No customers yet.</p>
      )}
      {selected ? (
        <article className="admin-customer-card" aria-label={`${selected.name || "Customer"} details`}>
          <h3>{selected.name || "Customer"}</h3>
          {selected.mobile ? (
            <button
              type="button"
              className="admin-customer-remove"
              disabled={removing}
              onClick={async () => {
                const name = selected.name || "this customer";
                if (!window.confirm(`Remove ${name} from the customer list?`)) return;
                setRemoving(true);
                setRemoveError("");
                try {
                  const response = await apiFetch("/api/admin/accounts/remove", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${staffToken()}`,
                    },
                    body: JSON.stringify({ mobile: selected.mobile }),
                  });
                  const data = await response.json().catch(() => ({}));
                  if (!response.ok) throw new Error(data.error || "Could not remove this customer.");
                  setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
                  setRemoved(Array.isArray(data.removed) ? data.removed : [...removed, selected.mobile]);
                  setSelectedKey("");
                  setTab("");
                } catch (err) {
                  setRemoveError(err.message || "Could not remove this customer.");
                } finally {
                  setRemoving(false);
                }
              }}
            >
              {removing ? "Removing…" : "Remove customer"}
            </button>
          ) : null}
          {removeError ? <p className="admin-error">{removeError}</p> : null}
          <dl>
            <dt>Name</dt>
            <dd>{selected.name || "—"}</dd>
            <dt>Sex</dt>
            <dd>{genderLabel(selected.gender) || "—"}</dd>
            <dt>Age</dt>
            <dd>{selected.age ? `${selected.age} years` : "—"}</dd>
            <dt>Date of birth</dt>
            <dd>{selected.dob || "—"}</dd>
            <dt>Mobile no</dt>
            <dd>{selected.mobile || "—"}</dd>
            <dt>Mail ID</dt>
            <dd>{selected.email || "—"}</dd>
            <dt>Address</dt>
            <dd>{selected.address || "—"}</dd>
            <dt>PIN code</dt>
            <dd>{selected.pinCode || "—"}</dd>
          </dl>
          {(selected.familyMembers || []).length ? (
            <div>
              <p>Family members</p>
              <ol>
                {selected.familyMembers.map((member, index) => (
                  <li key={`${selected.mobile}-family-${index}`}>
                    {[
                      member.name,
                      relationLabel(member.relation),
                      genderLabel(member.gender),
                      member.age ? `${member.age} years` : "",
                      member.mobile,
                      member.email,
                    ].filter(Boolean).join(" · ")}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          <div className="admin-customer-tabs" role="tablist" aria-label="Customer records">
            {CUSTOMER_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={tab === item.id ? "is-on" : ""}
                onClick={() => openTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {tab ? (
          <div className="admin-customer-panel" role="tabpanel">
            {tab === "orders" ? (
              customerOrders.length ? (
                <ul>
                  {customerOrders.map((order) => (
                    <li key={orderRecordId(order)}>
                      {`${orderTestName(order)} · #${orderRecordId(order)}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No orders yet.</p>
              )
            ) : null}
            {tab === "reports" ? (
              reports.length ? (
                <ul>
                  {reports.map((file, index) => (
                    <li key={`${orderRecordId(file.order)}-report-${index}`}>
                      {fileLink(file.testName || file.fileName || "Report", file.fileData || "")}
                      {file.fileName ? ` · ${file.fileName}` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No reports yet.</p>
              )
            ) : null}
            {tab === "prescriptions" ? (
              prescriptions.length ? (
                <ul>
                  {prescriptions.map((file, index) => (
                    <li key={`${orderRecordId(file.order)}-rx-${index}`}>
                      {fileLink(file.name, file.href)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No prescriptions yet.</p>
              )
            ) : null}
          </div>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
