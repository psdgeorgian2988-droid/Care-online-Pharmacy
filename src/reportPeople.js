import { normalizeMobile, pickFamilyMembers, relationLabel } from "./personFields.js";
import { MEMBER_ROLE } from "./familyAccount.js";

export const HOLDER_REPORT_ID = "self";
export const OTHER_PATIENT_PREFIX = "other:";

export function normalizePatientName(name = "") {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Seed / QA bookings such as "COD Collect Verify" stay off Medical Record. */
export function isHiddenMedicalRecordSource(source = {}) {
  const name = normalizePatientName(
    source.patientName || source.name || source.memberName || source.bookedForName || ""
  );
  if (/(^|\s)collect\s+verify(\s|$)/.test(name) || name === "cod collect verify") {
    return true;
  }
  const id = String(source.orderId || source.id || source.bookingId || "").toUpperCase();
  return id.includes("LAB-VERIFY") || id.includes("COLLECT-VERIFY");
}

export function normalizePatientMobile(mobile = "") {
  return normalizeMobile(mobile);
}

export function otherPatientId(name = "", mobile = "") {
  const n =
    normalizePatientName(name)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "patient";
  const m = normalizePatientMobile(mobile);
  return m ? `${OTHER_PATIENT_PREFIX}${n}:${m}` : `${OTHER_PATIENT_PREFIX}${n}`;
}

function personMobile(person = {}, fallback = "") {
  return normalizePatientMobile(person.mobile || person.mobileNumber || fallback);
}

export function householdReportPeople(profile = {}, session = null) {
  const holderName = String(profile.name || "").trim();
  const holderMobile = personMobile(profile);
  const holder = {
    id: HOLDER_REPORT_ID,
    name: holderName || "Account Holder",
    relationLabel: "Account Holder",
    mobile: holderMobile,
  };
  const members = pickFamilyMembers(profile)
    .filter((row) => String(row.name || "").trim())
    .map((row) => ({
      id: String(row.id),
      name: String(row.name).trim(),
      relationLabel: relationLabel(row.relation) || "Family Member",
      mobile: personMobile(row, holderMobile),
    }));

  if (session?.accountRole === MEMBER_ROLE && session.accountMemberId) {
    const mine =
      members.find((row) => row.id === session.accountMemberId) || {
        id: String(session.accountMemberId),
        name: String(session.name || "").trim() || "Family Member",
        relationLabel: relationLabel(session.accountRelation) || "Family Member",
        mobile: personMobile(session, holderMobile),
      };
    return [mine];
  }

  const list = [];
  if (holderName || members.length) list.push(holder);
  list.push(...members);
  if (!list.length) {
    return [{ id: HOLDER_REPORT_ID, name: "Myself", relationLabel: "", mobile: holderMobile }];
  }
  return list;
}

export function personLabel(person) {
  if (!person) return "";
  return person.relationLabel
    ? `${person.name} (${person.relationLabel})`
    : person.name;
}

export function defaultReportPatientId(people = []) {
  return people[0]?.id || HOLDER_REPORT_ID;
}

export function recordPatientId(record = {}) {
  return String(record.patientId || record.memberId || record.bookedFor || "").trim();
}

export function recordPatientName(record = {}) {
  return String(
    record.patientName ||
      record.memberName ||
      record.bookedForName ||
      record.name ||
      ""
  ).trim();
}

function matchPersonByName(people, name, mobile = "") {
  const wantedName = normalizePatientName(name);
  if (!wantedName) return null;
  const wantedMobile = normalizePatientMobile(mobile);
  return (
    people.find((row) => {
      if (normalizePatientName(row.name) !== wantedName) return false;
      if (wantedMobile && row.mobile && personMobile(row) !== wantedMobile) return false;
      return true;
    }) || null
  );
}

export function patientIdentityFromSource(source = {}, people = []) {
  const bookedFor = String(
    source.bookedFor || source.patientId || source.memberId || ""
  ).trim();
  const name = recordPatientName(source);
  const mobile = normalizePatientMobile(source.mobile || source.patientMobile);
  const list = Array.isArray(people) ? people : [];

  if (bookedFor && bookedFor !== "other" && !bookedFor.startsWith(OTHER_PATIENT_PREFIX)) {
    const byId = list.find((row) => row.id === bookedFor);
    return {
      patientId: bookedFor,
      patientName: byId?.name || name,
      mobile: byId ? personMobile(byId, mobile) : mobile,
    };
  }

  const byName = matchPersonByName(list, name, mobile);
  if (byName) {
    return {
      patientId: byName.id,
      patientName: byName.name,
      mobile: personMobile(byName, mobile),
    };
  }

  if (bookedFor === "other" || bookedFor.startsWith(OTHER_PATIENT_PREFIX) || name) {
    return {
      patientId:
        bookedFor.startsWith(OTHER_PATIENT_PREFIX) && bookedFor !== "other"
          ? bookedFor
          : otherPatientId(name, mobile),
      patientName: name,
      mobile,
    };
  }

  return {
    patientId: HOLDER_REPORT_ID,
    patientName: name,
    mobile,
  };
}

export function attachPatientIdentity(record = {}, source = {}, people = []) {
  const identity = patientIdentityFromSource({ ...record, ...source }, people);
  return {
    ...record,
    patientId: identity.patientId,
    patientName: identity.patientName,
    memberId: identity.patientId,
    memberName: identity.patientName,
    mobile: identity.mobile,
  };
}

export function reportBelongsTo(item, memberId, people = []) {
  const wanted = String(memberId || "");
  if (!wanted) return true;
  const list = Array.isArray(people) ? people : [];
  const wantedPerson = list.find((row) => row.id === wanted) || null;
  const savedId = recordPatientId(item);
  const savedName = normalizePatientName(recordPatientName(item));
  const savedMobile = normalizePatientMobile(item?.mobile || item?.patientMobile);
  const wantedName = normalizePatientName(wantedPerson?.name || "");
  const wantedMobile = normalizePatientMobile(wantedPerson?.mobile || "");

  if (savedId && savedId === wanted) {
    if (savedName && wantedName && savedName !== wantedName) return false;
    return true;
  }

  if (savedName && wantedName && savedName === wantedName) {
    if (savedMobile && wantedMobile && savedMobile !== wantedMobile) return false;
    return true;
  }

  if (!savedId) return wanted === HOLDER_REPORT_ID;
  return false;
}

export function medicalRecordPeople(people = [], records = []) {
  const list = Array.isArray(people) ? [...people] : [];
  const seen = new Set(list.map((row) => String(row.id)));
  for (const row of Array.isArray(records) ? records : []) {
    if (isHiddenMedicalRecordSource(row)) continue;
    const identity = patientIdentityFromSource(row, list);
    if (!identity.patientId || seen.has(identity.patientId)) continue;
    if (isHiddenMedicalRecordSource(identity)) continue;
    seen.add(identity.patientId);
    list.push({
      id: identity.patientId,
      name: identity.patientName || "Patient",
      relationLabel: "Patient",
      mobile: identity.mobile,
    });
  }
  return list;
}

export function partnerPatientKey(order = {}, people = []) {
  return patientIdentityFromSource(order, people).patientId || HOLDER_REPORT_ID;
}

export function uniquePartnerPatients(jobs = [], people = []) {
  const seen = new Set();
  const list = [];
  for (const job of Array.isArray(jobs) ? jobs : []) {
    const identity = patientIdentityFromSource(job, people);
    const key = identity.patientId;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    list.push(identity);
  }
  return list;
}

export function jobsForPartnerPatient(jobs, order, people = []) {
  const key = partnerPatientKey(order, people);
  return (Array.isArray(jobs) ? jobs : []).filter(
    (row) => partnerPatientKey(row, people) === key
  );
}

export function partnerPatientRecords(jobs, order, people = []) {
  const seen = new Set();
  return jobsForPartnerPatient(jobs, order, people)
    .filter((row) =>
      Boolean(
        row.reportFileName ||
          row.reportFileData ||
          row.fileName ||
          row.fileData
      )
    )
    .map((row) => {
      const id = String(row.id || row.bookingId || row.requestId || row.orderId || "");
      const identity = patientIdentityFromSource(row, people);
      const tests = Array.isArray(row.tests)
        ? row.tests.map((item) => item?.name || item?.testName).filter(Boolean).join(", ")
        : "";
      const items = Array.isArray(row.items)
        ? row.items.map((item) => item?.name || item?.testName).filter(Boolean).join(", ")
        : "";
      return {
        ...row,
        id,
        orderId: row.orderId || id,
        patientId: identity.patientId,
        patientName: identity.patientName,
        memberName: identity.patientName,
        mobile: identity.mobile,
        fileName: row.reportFileName || row.fileName || "",
        fileData: row.reportFileData || row.fileData || "",
        fileType: row.reportFileType || row.fileType || "",
        testName: row.reportTestName || row.testName || tests || items || "",
      };
    })
    .filter((row) => {
      const key = row.orderId || row.id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Generated reports across lab jobs — one card per attached file. */
export function partnerCompletedReports(jobs = [], people = []) {
  const seen = new Set();
  const list = [];
  for (const job of Array.isArray(jobs) ? jobs : []) {
    for (const row of partnerPatientRecords([job], job, people)) {
      const key = row.orderId || row.id;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      list.push(row);
    }
  }
  return list;
}

/** Completed reports grouped as one patient record each. */
export function partnerCompletedPatients(jobs = [], people = []) {
  const files = partnerCompletedReports(jobs, people);
  const seen = new Set();
  const list = [];
  for (const row of files) {
    const identity = patientIdentityFromSource(row, people);
    const key = identity.patientId;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    list.push({
      ...identity,
      files: files.filter((file) => partnerPatientKey(file, people) === key),
    });
  }
  return list;
}

export function completedReportsForPatient(jobs, patientId, people = []) {
  const wanted = String(patientId || "");
  return partnerCompletedReports(jobs, people).filter(
    (row) => partnerPatientKey(row, people) === wanted
  );
}
