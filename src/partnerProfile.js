const FILE_LIMIT = 900000;

export function emptyPartnerProfile() {
  return {
    photoName: "",
    photoType: "",
    photoData: "",
    qualification: "",
    email: "",
    certificates: [],
    aadhaarNumber: "",
    aadhaarFileName: "",
    aadhaarFileType: "",
    aadhaarFileData: "",
    policeFileName: "",
    policeFileType: "",
    policeFileData: "",
  };
}

function clip(value, max = 160) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function acceptedFile(value) {
  const fileData = String(value?.fileData || "");
  const fileType = clip(value?.fileType, 80).toLowerCase();
  const allowed =
    !fileData ||
    /^data:image\/[a-z0-9.+-]+;base64,/i.test(fileData) ||
    /^data:application\/pdf;base64,/i.test(fileData);
  if (!allowed || fileData.length > FILE_LIMIT) {
    return { fileName: "", fileType: "", fileData: "" };
  }
  return {
    fileName: clip(value?.fileName, 120),
    fileType: fileType || (fileData.startsWith("data:application/pdf") ? "application/pdf" : ""),
    fileData,
  };
}

export function partnerProfileFrom(partner = {}) {
  const raw = partner?.profile && typeof partner.profile === "object" ? partner.profile : {};
  const photo = acceptedFile({
    fileName: raw.photoName,
    fileType: raw.photoType,
    fileData: raw.photoData,
  });
  const aadhaar = acceptedFile({
    fileName: raw.aadhaarFileName,
    fileType: raw.aadhaarFileType,
    fileData: raw.aadhaarFileData,
  });
  const police = acceptedFile({
    fileName: raw.policeFileName,
    fileType: raw.policeFileType,
    fileData: raw.policeFileData,
  });
  const certificates = (Array.isArray(raw.certificates) ? raw.certificates : [])
    .slice(0, 6)
    .map((row) => {
      const file = acceptedFile(row);
      return {
        name: clip(row?.name, 80),
        ...file,
      };
    })
    .filter((row) => row.name || row.fileData);
  return {
    photoName: photo.fileName,
    photoType: photo.fileType,
    photoData: photo.fileData,
    qualification: clip(raw.qualification, 400),
    email: clip(raw.email || partner?.email, 120),
    certificates,
    aadhaarNumber: String(raw.aadhaarNumber || "").replace(/\D/g, "").slice(0, 12),
    aadhaarFileName: aadhaar.fileName,
    aadhaarFileType: aadhaar.fileType,
    aadhaarFileData: aadhaar.fileData,
    policeFileName: police.fileName,
    policeFileType: police.fileType,
    policeFileData: police.fileData,
  };
}

const CENTRE_VISITS = new Set(["centre", "center", "clinic", "lab", "hospital", "facility"]);
const HOME_SERVICE_KINDS = new Set(["lab", "radiology", "homecare", "vaccination", "ambulance"]);

/** Partner id of the person coming to this customer's home. Empty when nobody is assigned for a home visit. */
export function homeVisitingPartnerId(order = {}) {
  if (!order || typeof order !== "object") return "";
  const kind = String(order.kind || order.orderType || order.serviceType || "").toLowerCase();
  const visit = String(order.visitType || order.place || "").toLowerCase();
  if (CENTRE_VISITS.has(visit)) return "";
  if (kind === "medicine" || kind === "cart") {
    return String(order.deliveryPartnerId || "").trim();
  }
  if (kind === "doctor" || kind === "psychologist") {
    if (visit !== "home") return "";
    return String(order.partnerId || "").trim();
  }
  if (HOME_SERVICE_KINDS.has(kind) || visit === "home") {
    return String(order.partnerId || "").trim();
  }
  return "";
}

/** Profile already stored on this order, and only when it is the home visitor. */
export function visitingPartnerProfile(order = {}) {
  const id = homeVisitingPartnerId(order);
  const profile = order?.partnerProfile;
  if (!id || !profile || String(profile.id || "") !== id) return null;
  return profile;
}

/** Details a customer can see for the partner assigned to their order. */
export function customerPartnerProfile(partner = {}) {
  const profile = partnerProfileFrom(partner);
  return {
    id: clip(partner?.id, 40),
    name: clip(partner?.name, 80),
    role: clip(partner?.role, 80),
    mobile: String(partner?.mobile || "").replace(/\D/g, "").slice(0, 10),
    email: profile.email,
    address: clip(partner?.address, 160),
    pinCode: String(partner?.pinCode || partner?.pins?.[0] || "").replace(/\D/g, "").slice(0, 6),
    ...profile,
  };
}
