import React, { useMemo, useState } from "react";

const LABS = [
  {
    id: "lab1",
    name: "MediHome Partner Lab - Gurgaon",
    tests: [
      { id: "cbc", name: "Complete Blood Count (CBC)", price: 499 },
      { id: "hba1c", name: "HbA1c - Diabetes Test", price: 599 },
      { id: "lipid", name: "Lipid Profile", price: 699 },
      { id: "lft", name: "Liver Function Test (LFT)", price: 799 },
      { id: "kft", name: "Kidney Function Test (KFT)", price: 799 },
    ],
  },
  {
    id: "lab2",
    name: "MediHome Partner Lab - Noida",
    tests: [
      { id: "cbc", name: "Complete Blood Count (CBC)", price: 449 },
      { id: "hba1c", name: "HbA1c - Diabetes Test", price: 549 },
      { id: "thyroid", name: "Thyroid Profile", price: 699 },
      { id: "vitd", name: "Vitamin D Test", price: 799 },
      { id: "lipid", name: "Lipid Profile", price: 649 },
    ],
  },
  {
    id: "lab3",
    name: "MediHome Partner Lab - Delhi",
    tests: [
      { id: "cbc", name: "Complete Blood Count (CBC)", price: 399 },
      { id: "hba1c", name: "HbA1c - Diabetes Test", price: 499 },
      { id: "lipid", name: "Lipid Profile", price: 599 },
      { id: "thyroid", name: "Thyroid Profile", price: 649 },
      { id: "urine", name: "Complete Urine Examination", price: 299 },
    ],
  },
];


const RADIOLOGY_PARTNERS = [
  {
    id: "rad1",
    name: "MediHome Imaging Centre - Gurgaon",
    tests: [
      { id: "mri-brain", name: "MRI Brain", price: 3500 },
      { id: "ct-chest", name: "CT Scan Chest", price: 2500 },
      { id: "usg-abdomen", name: "Ultrasound Abdomen", price: 900 },
      { id: "xray-chest", name: "X-Ray Chest", price: 450 },
      { id: "doppler-leg", name: "Doppler Lower Limb", price: 1800 },
    ],
  },
  {
    id: "rad2",
    name: "MediHome Imaging Centre - Noida",
    tests: [
      { id: "mri-brain", name: "MRI Brain", price: 3200 },
      { id: "ct-chest", name: "CT Scan Chest", price: 2300 },
      { id: "usg-abdomen", name: "Ultrasound Abdomen", price: 850 },
      { id: "xray-chest", name: "X-Ray Chest", price: 400 },
      { id: "mammography", name: "Mammography", price: 1400 },
    ],
  },
  {
    id: "rad3",
    name: "MediHome Imaging Centre - Delhi",
    tests: [
      { id: "mri-brain", name: "MRI Brain", price: 3000 },
      { id: "ct-chest", name: "CT Scan Chest", price: 2200 },
      { id: "usg-abdomen", name: "Ultrasound Abdomen", price: 800 },
      { id: "xray-chest", name: "X-Ray Chest", price: 350 },
      { id: "mammography", name: "Mammography", price: 1300 },
    ],
  },
];

const EMPTY_FORM = {
  patientName: "",
  mobile: "",
  address: "",
  pinCode: "",
  visitType: "home",
  date: "",
  timeSlot: "",
};

const PROFILE_KEYS = [
  "mediHomeUser",
  "medihomeUser",
  "currentUser",
  "loggedInUser",
  "userProfile",
  "profile",
  "userData",
  "user",
  "registeredUser",
  "account",
];

const firstValue = (obj, keys) => {
  if (!obj || typeof obj !== "object") return "";
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim()) {
      return String(obj[key]).trim();
    }
  }
  return "";
};

function normalizeProfile(raw) {
  if (!raw || typeof raw !== "object") return null;
  const source = raw.user && typeof raw.user === "object" ? raw.user : raw;
  const name = firstValue(source, ["name", "fullName", "userName", "username", "patientName"]);
  const mobile = firstValue(source, ["mobile", "mobileNumber", "phone", "phoneNumber", "contactNo", "contactNumber"]);
  const address = firstValue(source, ["address", "deliveryAddress", "savedAddress"]);
  const pinCode = firstValue(source, ["pinCode", "pincode", "pin", "zipCode", "postalCode"]);
  if (!name && !mobile && !address && !pinCode) return null;
  return { name, mobile, address, pinCode };
}

function getRegisteredProfile() {
  try {
    const candidates = [];
    PROFILE_KEYS.forEach((key) => {
      const value = localStorage.getItem(key);
      if (!value) return;
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) parsed.forEach((item) => candidates.push(item));
        else candidates.push(parsed);
      } catch {
        // Ignore non-JSON localStorage values.
      }
    });

    for (const candidate of candidates) {
      const profile = normalizeProfile(candidate);
      if (profile && (profile.name || profile.mobile || profile.address || profile.pinCode)) {
        return profile;
      }
    }

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !/user|profile|account|member|customer/i.test(key)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key));
        const profile = normalizeProfile(parsed);
        if (profile && (profile.name || profile.mobile || profile.address || profile.pinCode)) return profile;
      } catch {
        // Ignore unrelated values.
      }
    }
  } catch {
    // localStorage may be unavailable in restricted environments.
  }
  return null;
}

function LabTests() {
  const registeredProfile = useMemo(() => getRegisteredProfile(), []);
  const [serviceType, setServiceType] = useState("lab");
  const [selectedLabId, setSelectedLabId] = useState("");
  const [selectedTestId, setSelectedTestId] = useState("");
  const [selectedTests, setSelectedTests] = useState([]);
  const [selectedRadiologyPartnerId, setSelectedRadiologyPartnerId] = useState("");
  const [selectedImagingId, setSelectedImagingId] = useState("");
  const [selectedImagingTests, setSelectedImagingTests] = useState([]);
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...(registeredProfile
      ? {
          patientName: registeredProfile.name,
          mobile: registeredProfile.mobile,
          address: registeredProfile.address,
          pinCode: registeredProfile.pinCode,
        }
      : {}),
  }));
  const [errors, setErrors] = useState({});
  const [booking, setBooking] = useState(null);

  const selectedLab = useMemo(() => LABS.find((lab) => lab.id === selectedLabId), [selectedLabId]);
  const selectedRadiologyPartner = useMemo(
    () => RADIOLOGY_PARTNERS.find((partner) => partner.id === selectedRadiologyPartnerId),
    [selectedRadiologyPartnerId]
  );
  const selectedTest = useMemo(
    () => selectedLab?.tests.find((test) => test.id === selectedTestId) || null,
    [selectedLab, selectedTestId]
  );
  const selectedImaging = useMemo(
    () => selectedRadiologyPartner?.tests.find((test) => test.id === selectedImagingId) || null,
    [selectedRadiologyPartner, selectedImagingId]
  );
  const activeTests = serviceType === "lab" ? selectedTests : selectedImagingTests;
  const activePartner = serviceType === "lab" ? selectedLab : selectedRadiologyPartner;
  const labTotal = selectedTests.reduce((sum, test) => sum + test.price, 0);
  const radTotal = selectedImagingTests.reduce((sum, test) => sum + test.price, 0);
  const total = activeTests.reduce((sum, test) => sum + test.price, 0);
  const today = new Date().toISOString().split("T")[0];

  const handleServiceChange = (type) => {
    setServiceType(type);
    setErrors({});
  };

  const handleRadiologyPartnerChange = (e) => {
    setSelectedRadiologyPartnerId(e.target.value);
    setSelectedImagingId("");
    setSelectedImagingTests([]);
    setServiceType("radiology");
    setErrors((prev) => ({ ...prev, radiologyPartner: "", imaging: "" }));
  };

  const addImagingTest = () => {
    if (!selectedImaging) {
      setErrors((prev) => ({ ...prev, imaging: "Please select an imaging study first." }));
      return;
    }
    if (selectedImagingTests.some((test) => test.id === selectedImaging.id)) {
      setErrors((prev) => ({ ...prev, imaging: "This imaging study is already added." }));
      return;
    }
    setSelectedImagingTests((prev) => [...prev, selectedImaging]);
    setSelectedImagingId("");
    setServiceType("radiology");
    setErrors((prev) => ({ ...prev, imaging: "" }));
  };

  const toggleImagingTest = (test) => {
    setServiceType("radiology");
    if (!selectedRadiologyPartnerId) {
      setErrors((prev) => ({ ...prev, radiologyPartner: "Please select an imaging partner." }));
      return;
    }
    if (selectedImagingTests.some((item) => item.id === test.id)) {
      setSelectedImagingTests((prev) => prev.filter((item) => item.id !== test.id));
      setErrors((prev) => ({ ...prev, imaging: "" }));
      return;
    }
    setSelectedImagingTests((prev) => [...prev, test]);
    setSelectedImagingId(test.id);
    setErrors((prev) => ({ ...prev, imaging: "", radiologyPartner: "" }));
  };

  const removeImagingTest = (testId) => {
    setSelectedImagingTests((prev) => prev.filter((test) => test.id !== testId));
  };

  const clearImagingTests = () => {
    setSelectedImagingTests([]);
    setSelectedImagingId("");
  };

  const handleLabChange = (e) => {
    setSelectedLabId(e.target.value);
    setSelectedTestId("");
    setSelectedTests([]);
    setServiceType("lab");
    setErrors((prev) => ({ ...prev, lab: "", test: "" }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = name === "mobile" || name === "pinCode" ? value.replace(/\D/g, "") : value;
    setForm((prev) => ({ ...prev, [name]: next }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const addTest = () => {
    if (!selectedTest) {
      setErrors((prev) => ({ ...prev, test: "Please select a test first." }));
      return;
    }
    if (selectedTests.some((test) => test.id === selectedTest.id)) {
      setErrors((prev) => ({ ...prev, test: "This test is already added." }));
      return;
    }
    setSelectedTests((prev) => [...prev, selectedTest]);
    setSelectedTestId("");
    setServiceType("lab");
    setErrors((prev) => ({ ...prev, test: "" }));
  };

  const toggleLabTest = (test) => {
    setServiceType("lab");
    if (!selectedLabId) {
      setErrors((prev) => ({ ...prev, lab: "Please select a lab partner." }));
      return;
    }
    if (selectedTests.some((item) => item.id === test.id)) {
      setSelectedTests((prev) => prev.filter((item) => item.id !== test.id));
      setErrors((prev) => ({ ...prev, test: "" }));
      return;
    }
    setSelectedTests((prev) => [...prev, test]);
    setSelectedTestId(test.id);
    setErrors((prev) => ({ ...prev, test: "", lab: "" }));
  };

  const removeTest = (testId) => setSelectedTests((prev) => prev.filter((test) => test.id !== testId));

  const clearTests = () => {
    setSelectedTests([]);
    setSelectedTestId("");
  };

  const validate = () => {
    const newErrors = {};
    if (serviceType === "lab") {
      if (!selectedLabId) newErrors.lab = "Please select a lab partner.";
      if (selectedTests.length === 0) newErrors.test = "Please add at least one test.";
    } else {
      if (!selectedRadiologyPartnerId) newErrors.radiologyPartner = "Please select an imaging partner.";
      if (selectedImagingTests.length === 0) newErrors.imaging = "Please add at least one imaging study.";
    }

    if (!form.patientName.trim()) newErrors.patientName = "Patient name is required.";
    if (!/^[6-9]\d{9}$/.test(form.mobile)) newErrors.mobile = "Enter a valid 10-digit mobile number.";
    if (!form.address.trim()) newErrors.address = "Address is required.";
    if (!/^\d{6}$/.test(form.pinCode)) newErrors.pinCode = "Enter a valid 6-digit PIN Code.";
    if (!form.date) newErrors.date = "Please select a date.";
    if (!form.timeSlot) newErrors.timeSlot = "Please select a time slot.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBooking = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const bookingDetails = {
      bookingId:
        (serviceType === "lab" ? "MH-LAB-" : "MH-RAD-") +
        Math.floor(100000 + Math.random() * 900000),
      serviceType,
      partner: activePartner.name,
      tests: activeTests,
      total,
      ...form,
      visitType: serviceType === "radiology" ? "centre" : form.visitType,
      bookedAt: new Date().toLocaleString(),
      bookedAtMs: Date.now(),
    };

    setBooking(bookingDetails);

    try {
      const existing = JSON.parse(localStorage.getItem("mediHomeDiagnosticsBookings") || "[]");
      const list = Array.isArray(existing) ? existing : [];
      localStorage.setItem(
        "mediHomeDiagnosticsBookings",
        JSON.stringify([bookingDetails, ...list])
      );
    } catch {
      localStorage.setItem("mediHomeDiagnosticsBookings", JSON.stringify([bookingDetails]));
    }

    localStorage.setItem("mediHomeLabBooking", JSON.stringify(bookingDetails));
    localStorage.setItem("mediHomeLastBooking", JSON.stringify(bookingDetails));
  };

  const startNewBooking = () => {
    setBooking(null);
    setServiceType("lab");
    setSelectedLabId("");
    setSelectedTestId("");
    setSelectedTests([]);
    setSelectedRadiologyPartnerId("");
    setSelectedImagingId("");
    setSelectedImagingTests([]);
    setForm({
      ...EMPTY_FORM,
      ...(registeredProfile
        ? {
            patientName: registeredProfile.name,
            mobile: registeredProfile.mobile,
            address: registeredProfile.address,
            pinCode: registeredProfile.pinCode,
          }
        : {}),
    });
    setErrors({});
  };

  if (booking) {
    return (
      <div className="lab-page compact-page">
        <style>{styles}</style>
          <section className="lab-confirmation">
            <div className="success-icon">✓</div>
            <h1>Booking Confirmed</h1>
            <p className="confirmation-message">
              {booking.serviceType === "lab"
                ? "Your laboratory test booking has been successfully submitted to MediHome."
                : "Your radiology appointment booking has been successfully submitted to MediHome."}
            </p>
            <div className="booking-card">
              <div className="booking-header">
                <h2>Booking Details</h2>
                <span className="booking-id">{booking.bookingId}</span>
              </div>
              <div className="booking-row">
                <span>{booking.serviceType === "lab" ? "Lab Partner" : "Imaging Partner"}</span>
                <strong>{booking.partner}</strong>
              </div>
              <div className="tests-confirmation">
                <div className="booking-row-label">
                  {booking.serviceType === "lab" ? "Selected Laboratory Tests" : "Selected Imaging Studies"}
                </div>
                {booking.tests.map((test) => (
                  <div className="confirmation-test" key={test.id}>
                    <span>{test.name}</span>
                    <strong>₹{test.price}</strong>
                  </div>
                ))}
              </div>
              <div className="booking-row">
                <span>Patient</span>
                <strong>{booking.patientName}</strong>
              </div>
              <div className="booking-row">
                <span>Mobile</span>
                <strong>{booking.mobile}</strong>
              </div>
              <div className="booking-row">
                <span>{booking.serviceType === "lab" ? "Collection Type" : "Appointment Type"}</span>
                <strong>{booking.visitType === "home" ? "Home Collection" : "Centre Visit"}</strong>
              </div>
              <div className="booking-row">
                <span>Date</span>
                <strong>{booking.date}</strong>
              </div>
              <div className="booking-row">
                <span>Time Slot</span>
                <strong>{booking.timeSlot}</strong>
              </div>
              <div className="booking-row total-row">
                <span>Total</span>
                <strong>₹{booking.total}</strong>
              </div>
            </div>
            <div className="confirmation-note">
              <strong>What's next?</strong>
              <p>This booking ID can later be used for collection status and individual report/result tracking.</p>
            </div>
            <button type="button" className="primary-button" onClick={startNewBooking}>
              Book Another Test
            </button>
          </section>
      </div>
    );
  }

  return (
      <div className="lab-page compact-page">
        <style>{styles}</style>
        <form className="lab-form" onSubmit={handleBooking}>
          <section className="lab-top">
            <div className="lab-hero">
              <div>
                <span className="lab-label">MediHome Diagnostics</span>
                <h1>Tests at your convenience</h1>
              </div>
            </div>
          </section>

          <div className="lab-workspace">
            <div className="lab-select-stack">
              <section
                className={`workspace-card select-panel ${serviceType === "lab" ? "active-panel" : ""}`}
                onClick={() => handleServiceChange("lab")}
              >
                <div className="section-heading">
                  <h2>Laboratory Tests</h2>
                  <p>Blood, urine & pathology — click to book this service</p>
                </div>
                <div className="selection-grid">
                  <div className="field-group">
                    <label htmlFor="lab">
                      Lab partner <span>*</span>
                    </label>
                    <select
                      id="lab"
                      value={selectedLabId}
                      onChange={handleLabChange}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">Select lab</option>
                      {LABS.map((lab) => (
                        <option key={lab.id} value={lab.id}>
                          {lab.name}
                        </option>
                      ))}
                    </select>
                    {errors.lab && <small className="error">{errors.lab}</small>}
                  </div>
                  <div className="field-group">
                    <label htmlFor="test">
                      Test <span>*</span>
                    </label>
                    <div className="add-test-line">
                      <select
                        id="test"
                        value={selectedTestId}
                        onChange={(e) => setSelectedTestId(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={!selectedLab}
                      >
                        <option value="">
                          {selectedLab ? "Select test" : "Select lab first"}
                        </option>
                        {selectedLab?.tests.map((test) => (
                          <option key={test.id} value={test.id}>
                            {test.name} — ₹{test.price}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="add-test-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addTest();
                        }}
                      >
                        Add
                      </button>
                    </div>
                    {errors.test && <small className="error">{errors.test}</small>}
                  </div>
                </div>
                <div className="selected-tests-card">
                  <div className="selected-tests-header">
                    <div>
                      <span>Selected tests</span>
                      <strong>
                        {selectedTests.length} test{selectedTests.length === 1 ? "" : "s"}
                      </strong>
                    </div>
                    {selectedTests.length > 0 && (
                      <button
                        type="button"
                        className="clear-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearTests();
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {selectedTests.length === 0 ? (
                    <p className="empty-tests">No tests added yet.</p>
                  ) : (
                    <div className="test-list">
                      {selectedTests.map((test, index) => (
                        <div className="test-item" key={test.id}>
                          <div className="test-number">{index + 1}</div>
                          <div className="test-info">
                            <strong>{test.name}</strong>
                            <span>₹{test.price}</span>
                          </div>
                          <button
                            type="button"
                            className="remove-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTest(test.id);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="selected-tests-total">
                    <span>Total</span>
                    <strong>₹{labTotal}</strong>
                  </div>
                </div>
              </section>

              <section
                className={`workspace-card select-panel ${serviceType === "radiology" ? "active-panel" : ""}`}
                onClick={() => handleServiceChange("radiology")}
              >
                <div className="section-heading">
                  <h2>Radiology & Imaging</h2>
                  <p>MRI, CT, ultrasound & more — click to book this service</p>
                </div>
                <div className="selection-grid">
                  <div className="field-group">
                    <label htmlFor="radiologyPartner">
                      Imaging partner <span>*</span>
                    </label>
                    <select
                      id="radiologyPartner"
                      value={selectedRadiologyPartnerId}
                      onChange={handleRadiologyPartnerChange}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">Select imaging centre</option>
                      {RADIOLOGY_PARTNERS.map((partner) => (
                        <option key={partner.id} value={partner.id}>
                          {partner.name}
                        </option>
                      ))}
                    </select>
                    {errors.radiologyPartner && (
                      <small className="error">{errors.radiologyPartner}</small>
                    )}
                  </div>
                  <div className="field-group">
                    <label htmlFor="imaging">
                      Imaging study <span>*</span>
                    </label>
                    <div className="add-test-line">
                      <select
                        id="imaging"
                        value={selectedImagingId}
                        onChange={(e) => setSelectedImagingId(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={!selectedRadiologyPartner}
                      >
                        <option value="">
                          {selectedRadiologyPartner ? "Select imaging study" : "Select partner first"}
                        </option>
                        {selectedRadiologyPartner?.tests.map((test) => (
                          <option key={test.id} value={test.id}>
                            {test.name} — ₹{test.price}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="add-test-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addImagingTest();
                        }}
                      >
                        Add
                      </button>
                    </div>
                    {errors.imaging && <small className="error">{errors.imaging}</small>}
                  </div>
                </div>
                <div className="selected-tests-card">
                  <div className="selected-tests-header">
                    <div>
                      <span>Selected imaging studies</span>
                      <strong>
                        {selectedImagingTests.length} stud
                        {selectedImagingTests.length === 1 ? "y" : "ies"}
                      </strong>
                    </div>
                    {selectedImagingTests.length > 0 && (
                      <button
                        type="button"
                        className="clear-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearImagingTests();
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {selectedImagingTests.length === 0 ? (
                    <p className="empty-tests">No imaging studies added yet.</p>
                  ) : (
                    <div className="test-list">
                      {selectedImagingTests.map((test, index) => (
                        <div className="test-item" key={test.id}>
                          <div className="test-number">{index + 1}</div>
                          <div className="test-info">
                            <strong>{test.name}</strong>
                            <span>₹{test.price}</span>
                          </div>
                          <button
                            type="button"
                            className="remove-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImagingTest(test.id);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="selected-tests-total">
                    <span>Total</span>
                    <strong>₹{radTotal}</strong>
                  </div>
                </div>
              </section>
            </div>

            <section className="workspace-card booking-card">
              <div className="section-heading">
                <h2>Booking details</h2>
                <p>Enter patient and appointment details</p>
              </div>

              <div className="form-grid">
                <div className="field-group">
                  <label htmlFor="patientName">
                    Patient name <span>*</span>
                  </label>
                  <input
                    id="patientName"
                    name="patientName"
                    placeholder="Enter patient name"
                    value={form.patientName}
                    onChange={handleChange}
                  />
                  {errors.patientName && <small className="error">{errors.patientName}</small>}
                </div>
                <div className="field-group">
                  <label htmlFor="mobile">
                    Mobile number <span>*</span>
                  </label>
                  <input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    inputMode="numeric"
                    maxLength="10"
                    placeholder="10-digit mobile number"
                    value={form.mobile}
                    onChange={handleChange}
                  />
                  {errors.mobile && <small className="error">{errors.mobile}</small>}
                </div>
                <div className="field-group full-width">
                  <label htmlFor="address">
                    Address <span>*</span>
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    rows="1"
                    placeholder="Enter complete address"
                    value={form.address}
                    onChange={handleChange}
                  />
                  {errors.address && <small className="error">{errors.address}</small>}
                </div>
                <div className="field-group">
                  <label htmlFor="pinCode">
                    PIN code <span>*</span>
                  </label>
                  <input
                    id="pinCode"
                    name="pinCode"
                    inputMode="numeric"
                    maxLength="6"
                    placeholder="6-digit PIN code"
                    value={form.pinCode}
                    onChange={handleChange}
                  />
                  {errors.pinCode && <small className="error">{errors.pinCode}</small>}
                </div>
              </div>

              <div className="mini-section-title">
                {serviceType === "lab" ? "Collection" : "Appointment"} preference
              </div>
              {serviceType === "lab" ? (
                <div className="visit-options">
                  <label className={`visit-card ${form.visitType === "home" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="visitType"
                      value="home"
                      checked={form.visitType === "home"}
                      onChange={handleChange}
                    />
                    <span className="visit-icon" aria-hidden="true">
                      🏠
                    </span>
                    <span>
                      <strong>Home collection</strong>
                      <small>Sample at your address</small>
                    </span>
                  </label>
                  <label className={`visit-card ${form.visitType === "centre" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="visitType"
                      value="centre"
                      checked={form.visitType === "centre"}
                      onChange={handleChange}
                    />
                    <span className="visit-icon" aria-hidden="true">
                      🏥
                    </span>
                    <span>
                      <strong>Centre visit</strong>
                      <small>Visit partner lab</small>
                    </span>
                  </label>
                </div>
              ) : (
                <div className="radiology-note">
                  <span aria-hidden="true">🏥</span>
                  <div>
                    <strong>Centre appointment</strong>
                    <small>
                      MRI, CT, ultrasound and other imaging studies are booked at the selected centre.
                    </small>
                  </div>
                </div>
              )}

              <div className="mini-section-title">Date & time</div>
              <div className="form-grid appointment-grid">
                <div className="field-group">
                  <label htmlFor="date">
                    Date <span>*</span>
                  </label>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    min={today}
                    value={form.date}
                    onChange={handleChange}
                  />
                  {errors.date && <small className="error">{errors.date}</small>}
                </div>
                <div className="field-group">
                  <label htmlFor="timeSlot">
                    Time slot <span>*</span>
                  </label>
                  <select id="timeSlot" name="timeSlot" value={form.timeSlot} onChange={handleChange}>
                    <option value="">Select time</option>
                    <option value="7:00 AM - 9:00 AM">7:00 AM - 9:00 AM</option>
                    <option value="9:00 AM - 11:00 AM">9:00 AM - 11:00 AM</option>
                    <option value="11:00 AM - 1:00 PM">11:00 AM - 1:00 PM</option>
                    <option value="2:00 PM - 4:00 PM">2:00 PM - 4:00 PM</option>
                    <option value="4:00 PM - 6:00 PM">4:00 PM - 6:00 PM</option>
                  </select>
                  {errors.timeSlot && <small className="error">{errors.timeSlot}</small>}
                </div>
              </div>

              <section className="booking-summary">
                <div>
                  <span>{serviceType === "lab" ? "Lab partner" : "Imaging partner"}</span>
                  <strong>{activePartner ? activePartner.name : "Not selected"}</strong>
                </div>
                <div>
                  <span>{serviceType === "lab" ? "Tests" : "Studies"}</span>
                  <strong>
                    {activeTests.length
                      ? `${activeTests.length} selected`
                      : `No ${serviceType === "lab" ? "tests" : "studies"} selected`}
                  </strong>
                </div>
                <div className="summary-price">
                  <span>Total</span>
                  <strong>₹{total}</strong>
                </div>
                <button type="submit" className="primary-button">
                  {serviceType === "lab" ? "Confirm lab test booking" : "Confirm radiology booking"}
                </button>
              </section>
            </section>
          </div>
        </form>
      </div>
  );
}

const styles = `
.lab-page.compact-page {
  width: 100%;
  max-width: none;
  height: 100%;
  min-height: 0;
  margin: 0;
  background: #f5f7f8;
  color: #143246;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.lab-page .lab-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  min-width: 0;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
.lab-page .lab-top { flex: 0 0 auto; }
.lab-page .lab-hero {
  margin: 0;
  padding: 4px 10px;
  border-radius: 8px;
  background: linear-gradient(135deg, #e8f4f6, #f4fbf8);
  border: 1px solid #dce9ec;
  display: flex;
  align-items: center;
  gap: 8px;
}
.lab-page .lab-label {
  display: inline-block;
  margin: 0 8px 0 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2f7a7a;
}
.lab-page .lab-hero h1 {
  display: inline;
  margin: 0;
  font-size: 15px;
  line-height: 1.2;
  color: #143246;
}
.lab-page .lab-workspace {
  width: 100%;
  margin: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
  gap: 6px;
  align-items: stretch;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
.lab-page .lab-select-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  overflow: hidden;
}
.lab-page .workspace-card {
  background: #fff;
  border-radius: 8px;
  padding: 6px 8px;
  box-sizing: border-box;
  border: 1px solid #e4ecef;
  min-width: 0;
  min-height: 0;
}
.lab-page .lab-select-stack .workspace-card {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.lab-page .select-panel { cursor: pointer; }
.lab-page .select-panel.active-panel {
  border-color: #1a6b7a;
  box-shadow: 0 0 0 1px #1a6b7a;
}
.lab-page .workspace-card.booking-card {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.lab-page .section-heading { margin-bottom: 4px; flex: 0 0 auto; }
.lab-page .section-heading h2 {
  margin: 0;
  color: #143246;
  font-size: 13px;
  line-height: 1.2;
}
.lab-page .section-heading p {
  margin: 0;
  color: #7a8b96;
  font-size: 11px;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lab-page .selection-grid,
.lab-page .form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 8px;
  flex: 0 0 auto;
}
.lab-page .field-group { display: flex; flex-direction: column; min-width: 0; }
.lab-page .field-group.full-width { grid-column: 1 / -1; }
.lab-page .field-group label {
  margin-bottom: 2px;
  font-size: 11px;
  font-weight: 700;
  color: #34546b;
}
.lab-page .field-group label span { color: #d84b4b; }
.lab-page .field-group input,
.lab-page .field-group select,
.lab-page .field-group textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 4px 8px;
  border: 1px solid #d7e2e9;
  border-radius: 6px;
  background: #fff;
  color: #143246;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  min-height: 28px;
  height: 28px;
}
.lab-page .field-group textarea {
  min-height: 28px;
  height: 28px;
  resize: none;
  line-height: 1.2;
}
.lab-page .field-group input:focus,
.lab-page .field-group select:focus,
.lab-page .field-group textarea:focus {
  border-color: #1a6b7a;
}
.lab-page .field-group select:disabled {
  background: #f3f7f8;
  cursor: not-allowed;
}
.lab-page .error {
  margin-top: 1px;
  color: #d84b4b;
  font-size: 10px;
  line-height: 1.2;
}
.lab-page .add-test-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
}
.lab-page .add-test-button,
.lab-page .primary-button {
  border: none;
  border-radius: 6px;
  background: #1a6b7a;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}
.lab-page .add-test-button { padding: 0 10px; min-height: 28px; height: 28px; }
.lab-page .primary-button { padding: 6px 12px; min-height: 30px; }
.lab-page .selected-tests-card {
  margin-top: 4px;
  padding: 4px 6px;
  border-radius: 6px;
  background: #f7fbfc;
  border: 1px solid #e1ebf0;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.lab-page .selected-tests-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}
.lab-page .selected-tests-header span {
  display: inline;
  font-size: 11px;
  color: #5d7180;
  margin-right: 6px;
}
.lab-page .selected-tests-header strong {
  color: #143246;
  font-size: 12px;
}
.lab-page .clear-button {
  border: 1px solid #d8e3e9;
  background: #fff;
  color: #b64b4b;
  border-radius: 5px;
  padding: 2px 8px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  font-family: inherit;
}
.lab-page .empty-tests {
  margin: 4px 0;
  color: #7a8b96;
  font-size: 11px;
}
.lab-page .test-list {
  margin-top: 3px;
  display: grid;
  gap: 2px;
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.lab-page .test-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px;
  background: #fff;
  border-radius: 5px;
  border: 1px solid #e2ebef;
  min-height: 22px;
}
.lab-page .test-number {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #e8f4f6;
  color: #1a6b7a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 10px;
  flex-shrink: 0;
}
.lab-page .test-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.lab-page .test-info strong {
  color: #143246;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lab-page .test-info span {
  color: #159a8c;
  font-size: 11px;
  font-weight: 800;
  flex-shrink: 0;
}
.lab-page .remove-button {
  border: none;
  background: transparent;
  color: #c45151;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  font-family: inherit;
}
.lab-page .selected-tests-total {
  margin-top: 3px;
  padding-top: 3px;
  border-top: 1px solid #dfe8ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 0 0 auto;
}
.lab-page .selected-tests-total span {
  color: #5d7180;
  font-size: 11px;
  font-weight: 700;
}
.lab-page .selected-tests-total strong {
  color: #159a8c;
  font-size: 14px;
}
.lab-page .mini-section-title {
  margin: 4px 0 3px;
  color: #34546b;
  font-size: 11px;
  font-weight: 800;
  flex: 0 0 auto;
}
.lab-page .visit-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  flex: 0 0 auto;
}
.lab-page .visit-card {
  padding: 4px 8px;
  border: 1px solid #e4ecef;
  border-radius: 7px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.lab-page .visit-card.selected {
  border-color: #1a6b7a;
  background: #eff8f9;
}
.lab-page .visit-card input { accent-color: #1a6b7a; }
.lab-page .visit-icon { font-size: 14px; }
.lab-page .visit-card strong {
  display: block;
  color: #143246;
  font-size: 12px;
  margin-bottom: 0;
  line-height: 1.2;
}
.lab-page .visit-card small {
  color: #5d7180;
  font-size: 10px;
}
.lab-page .radiology-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border: 1px solid #e4ecef;
  border-radius: 7px;
  background: #f7fbfc;
  flex: 0 0 auto;
}
.lab-page .radiology-note > span { font-size: 16px; }
.lab-page .radiology-note strong {
  display: block;
  color: #143246;
  font-size: 12px;
}
.lab-page .radiology-note small {
  display: block;
  margin-top: 0;
  color: #5d7180;
  font-size: 11px;
  line-height: 1.25;
}
.lab-page .appointment-grid { margin-top: 0; }
.lab-page .booking-summary {
  margin: auto 0 0;
  padding: 5px 8px;
  background: #eff8f9;
  border: 1px solid #dce9ec;
  border-radius: 8px;
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.7fr) auto;
  gap: 4px 8px;
  align-items: center;
  box-sizing: border-box;
  flex: 0 0 auto;
}
.lab-page .booking-summary .primary-button {
  grid-column: 1 / -1;
}
.lab-page .booking-summary span {
  display: block;
  margin-bottom: 0;
  font-size: 10px;
  color: #5d7180;
}
.lab-page .booking-summary strong {
  color: #143246;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.lab-page .summary-price { text-align: right; }
.lab-page .summary-price strong {
  font-size: 15px;
  color: #159a8c;
}
.lab-page .lab-confirmation {
  flex: 1;
  min-height: 0;
  max-width: none;
  margin: 0;
  padding: 4px 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.lab-page .success-icon {
  width: 32px;
  height: 32px;
  margin: 0 auto 4px;
  border-radius: 50%;
  background: #e5f8ee;
  color: #1c9b61;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  flex: 0 0 auto;
}
.lab-page .lab-confirmation h1 {
  margin: 0 0 2px;
  color: #143246;
  font-size: 16px;
}
.lab-page .confirmation-message {
  margin: 0 auto 6px;
  color: #5d7180;
  font-size: 12px;
  line-height: 1.3;
}
.lab-page .lab-confirmation .booking-card {
  text-align: left;
  background: #fff;
  border-radius: 8px;
  padding: 8px 10px;
  border: 1px solid #e4ecef;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}
.lab-page .booking-header {
  grid-column: 1 / -1;
  padding-bottom: 4px;
  margin-bottom: 2px;
  border-bottom: 1px solid #e5edf1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.lab-page .booking-header h2 {
  margin: 0;
  color: #143246;
  font-size: 13px;
}
.lab-page .booking-id {
  padding: 3px 8px;
  border-radius: 5px;
  background: #e8f4f6;
  color: #1a6b7a;
  font-size: 11px;
  font-weight: 800;
}
.lab-page .booking-row {
  padding: 4px 0;
  border-bottom: 1px solid #edf1f3;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.lab-page .booking-row span { color: #5d7180; font-size: 11px; }
.lab-page .booking-row strong {
  color: #143246;
  font-size: 12px;
  text-align: right;
}
.lab-page .tests-confirmation {
  grid-column: 1 / -1;
  padding: 4px 0;
  border-bottom: 1px solid #edf1f3;
}
.lab-page .booking-row-label {
  margin-bottom: 2px;
  color: #5d7180;
  font-size: 11px;
}
.lab-page .confirmation-test {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 1px 0;
  font-size: 12px;
}
.lab-page .confirmation-test strong { color: #159a8c; }
.lab-page .booking-row.total-row { border-bottom: none; }
.lab-page .booking-row.total-row strong { color: #159a8c; font-size: 15px; }
.lab-page .confirmation-note {
  margin: 6px 0;
  padding: 6px 8px;
  border-radius: 7px;
  background: #fffaf0;
  border: 1px solid #f1e4c7;
  text-align: left;
  flex: 0 0 auto;
}
.lab-page .confirmation-note strong { color: #775d20; font-size: 12px; }
.lab-page .confirmation-note p {
  margin: 2px 0 0;
  color: #7c7059;
  font-size: 11px;
  line-height: 1.3;
}
.lab-page .lab-confirmation .primary-button {
  align-self: center;
  flex: 0 0 auto;
}
@media (max-width: 800px) {
  .lab-page .lab-hero-icon { display: none; }
  .lab-page .summary-price { text-align: left; }
}
`;

export default LabTests;
