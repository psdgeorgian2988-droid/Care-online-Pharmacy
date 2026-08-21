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
  const [bookingFor, setBookingFor] = useState(registeredProfile ? "myself" : "someoneElse");
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
  const total = activeTests.reduce((sum, test) => sum + test.price, 0);
  const today = new Date().toISOString().split("T")[0];

  const handleServiceChange = (type) => {
    setServiceType(type);
    setSelectedLabId("");
    setSelectedTestId("");
    setSelectedTests([]);
    setSelectedRadiologyPartnerId("");
    setSelectedImagingId("");
    setSelectedImagingTests([]);
    setErrors({});
  };

  const handleRadiologyPartnerChange = (e) => {
    setSelectedRadiologyPartnerId(e.target.value);
    setSelectedImagingId("");
    setSelectedImagingTests([]);
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
    setErrors((prev) => ({ ...prev, imaging: "" }));
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
    setErrors((prev) => ({ ...prev, lab: "", test: "" }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleBookingForChange = (value) => {
    setBookingFor(value);
    setErrors({});
    if (value === "myself" && registeredProfile) {
      setForm((prev) => ({
        ...prev,
        patientName: registeredProfile.name,
        mobile: registeredProfile.mobile,
        address: registeredProfile.address,
        pinCode: registeredProfile.pinCode,
      }));
    } else if (value === "someoneElse") {
      setForm((prev) => ({ ...prev, patientName: "", mobile: "", address: "", pinCode: "" }));
    }
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
    setErrors((prev) => ({ ...prev, test: "" }));
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
      bookingFor,
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
    setBookingFor(registeredProfile ? "myself" : "someoneElse");
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
      <>
        <style>{styles}</style>
        <main className="lab-page compact-page">
          <section className="lab-confirmation">
            <div className="success-icon">✓</div>
            <h1>Booking Confirmed</h1>
            <p className="confirmation-message">
              {booking.serviceType === "lab"
                ? "Your laboratory test booking has been successfully submitted to MediHome."
                : "Your radiology appointment booking has been successfully submitted to MediHome."}
            </p>
            <div className="booking-card">
              <div className="booking-header"><h2>Booking Details</h2><span className="booking-id">{booking.bookingId}</span></div>
              <div className="booking-row">
                <span>{booking.serviceType === "lab" ? "Lab Partner" : "Imaging Partner"}</span>
                <strong>{booking.partner}</strong>
              </div>
              <div className="tests-confirmation">
                <div className="booking-row-label">
                  {booking.serviceType === "lab" ? "Selected Laboratory Tests" : "Selected Imaging Studies"}
                </div>
                {booking.tests.map((test) => <div className="confirmation-test" key={test.id}><span>{test.name}</span><strong>₹{test.price}</strong></div>)}
              </div>
              <div className="booking-row"><span>Booking For</span><strong>{booking.bookingFor === "myself" ? "Myself" : "Someone Else"}</strong></div>
              <div className="booking-row"><span>Patient</span><strong>{booking.patientName}</strong></div>
              <div className="booking-row"><span>Mobile</span><strong>{booking.mobile}</strong></div>
              <div className="booking-row">
                <span>{booking.serviceType === "lab" ? "Collection Type" : "Appointment Type"}</span>
                <strong>{booking.visitType === "home" ? "Home Collection" : "Centre Visit"}</strong>
              </div>
              <div className="booking-row"><span>Date</span><strong>{booking.date}</strong></div>
              <div className="booking-row"><span>Time Slot</span><strong>{booking.timeSlot}</strong></div>
              <div className="booking-row total-row"><span>Total</span><strong>₹{booking.total}</strong></div>
            </div>
            <div className="confirmation-note"><strong>What's next?</strong><p>This booking ID can later be used for collection status and individual report/result tracking.</p></div>
            <button className="primary-button" onClick={startNewBooking}>Book Another Test</button>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <main className="lab-page compact-page">
        <form onSubmit={handleBooking}>
        <section className="lab-hero">
          <div>
            <span className="lab-label">MEDIHOME DIAGNOSTICS</span>
            <h1>{serviceType === "lab" ? "Diagnostic Lab Tests at Your Convenience" : "Radiology & Imaging at Your Convenience"}</h1>
            <p>
              {serviceType === "lab"
                ? "Choose a laboratory partner and add multiple tests to one booking."
                : "Choose an imaging partner and add multiple scans or studies to one appointment."}
            </p>
          </div>
          <div className="lab-hero-icon">{serviceType === "lab" ? "🧪" : "🩻"}</div>
        </section>

        <section className="service-switch">
          <button type="button" className={`service-tab ${serviceType === "lab" ? "active" : ""}`} onClick={() => handleServiceChange("lab")}>
            🧪 Laboratory Tests <small>Blood, urine & pathology</small>
          </button>
          <button type="button" className={`service-tab ${serviceType === "radiology" ? "active" : ""}`} onClick={() => handleServiceChange("radiology")}>
            🩻 Radiology & Imaging <small>MRI, CT, Ultrasound & more</small>
          </button>
        </section>

        <section className="lab-benefits">
          <div className="benefit-card">
            <span>{serviceType === "lab" ? "🏠" : "🏥"}</span>
            <div>
              <strong>{serviceType === "lab" ? "Home Collection" : "Centre Appointment"}</strong>
              <p>{serviceType === "lab" ? "Samples collected at your doorstep." : "Imaging studies at partner centres."}</p>
            </div>
          </div>
          <div className="benefit-card">
            <span>🏥</span>
            <div>
              <strong>{serviceType === "lab" ? "Centre Visit" : "Trusted Partners"}</strong>
              <p>{serviceType === "lab" ? "Visit a convenient partner lab." : "Choose from MediHome imaging partners."}</p>
            </div>
          </div>
          <div className="benefit-card">
            <span>📋</span>
            <div>
              <strong>Multiple {serviceType === "lab" ? "Tests" : "Studies"}</strong>
              <p>Add several {serviceType === "lab" ? "tests" : "imaging studies"} to one booking.</p>
            </div>
          </div>
        </section>

        <div className="lab-workspace">
          <section className="workspace-card">
            <div className="section-heading compact-heading">
  <div>
    <h2>{serviceType === "lab" ? "Select Lab & Add Tests" : "Select Imaging Partner & Add Studies"}</h2>
    <p>{serviceType === "lab" ? "Choose one lab. Its tests appear automatically." : "Choose one imaging centre. Its studies appear automatically."}</p>
  </div>
</div>

            {serviceType === "lab" ? (
              <>
                <div className="selection-grid">
                  <div className="field-group">
                    <label htmlFor="lab">Select Lab Partner <span>*</span></label>
                    <select id="lab" value={selectedLabId} onChange={handleLabChange}>
                      <option value="">-- Select Lab --</option>
                      {LABS.map((lab) => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
                    </select>
                    {errors.lab && <small className="error">{errors.lab}</small>}
                  </div>
                  <div className="field-group">
                    <label htmlFor="test">Select Test <span>*</span></label>
                    <div className="add-test-line">
                      <select id="test" value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)} disabled={!selectedLab}>
                        <option value="">{selectedLab ? "-- Select Test --" : "-- Select Lab First --"}</option>
                        {selectedLab?.tests.map((test) => <option key={test.id} value={test.id}>{test.name} - ₹{test.price}</option>)}
                      </select>
                      <button type="button" className="add-test-button" onClick={addTest}>+ Add</button>
                    </div>
                    {errors.test && <small className="error">{errors.test}</small>}
                  </div>
                </div>

                <div className="selected-tests-card">
                  <div className="selected-tests-header">
                    <div><span>Selected Tests</span><strong>{selectedTests.length} test{selectedTests.length === 1 ? "" : "s"}</strong></div>
                    {selectedTests.length > 0 && <button type="button" className="clear-button" onClick={clearTests}>Clear All</button>}
                  </div>
                  {selectedTests.length === 0 ? (
                    <p className="empty-tests">No tests added yet.</p>
                  ) : (
                    <div className="test-list">
                      {selectedTests.map((test, index) => (
                        <div className="test-item" key={test.id}>
                          <div className="test-number">{index + 1}</div>
                          <div className="test-info"><strong>{test.name}</strong><span>₹{test.price}</span></div>
                          <button type="button" className="remove-button" onClick={() => removeTest(test.id)}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="selected-tests-total"><span>Total</span><strong>₹{total}</strong></div>
                </div>
              </>
            ) : (
              <>
                <div className="selection-grid">
                  <div className="field-group">
                    <label htmlFor="radiologyPartner">Select Imaging Partner <span>*</span></label>
                    <select id="radiologyPartner" value={selectedRadiologyPartnerId} onChange={handleRadiologyPartnerChange}>
                      <option value="">-- Select Imaging Centre --</option>
                      {RADIOLOGY_PARTNERS.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
                    </select>
                    {errors.radiologyPartner && <small className="error">{errors.radiologyPartner}</small>}
                  </div>
                  <div className="field-group">
                    <label htmlFor="imaging">Select Imaging Study <span>*</span></label>
                    <div className="add-test-line">
                      <select id="imaging" value={selectedImagingId} onChange={(e) => setSelectedImagingId(e.target.value)} disabled={!selectedRadiologyPartner}>
                        <option value="">{selectedRadiologyPartner ? "-- Select Imaging Study --" : "-- Select Partner First --"}</option>
                        {selectedRadiologyPartner?.tests.map((test) => <option key={test.id} value={test.id}>{test.name} - ₹{test.price}</option>)}
                      </select>
                      <button type="button" className="add-test-button" onClick={addImagingTest}>+ Add</button>
                    </div>
                    {errors.imaging && <small className="error">{errors.imaging}</small>}
                  </div>
                </div>

                <div className="selected-tests-card">
                  <div className="selected-tests-header">
                    <div><span>Selected Imaging Studies</span><strong>{selectedImagingTests.length} stud{selectedImagingTests.length === 1 ? "y" : "ies"}</strong></div>
                    {selectedImagingTests.length > 0 && <button type="button" className="clear-button" onClick={clearImagingTests}>Clear All</button>}
                  </div>
                  {selectedImagingTests.length === 0 ? (
                    <p className="empty-tests">No imaging studies added yet.</p>
                  ) : (
                    <div className="test-list">
                      {selectedImagingTests.map((test, index) => (
                        <div className="test-item" key={test.id}>
                          <div className="test-number">{index + 1}</div>
                          <div className="test-info"><strong>{test.name}</strong><span>₹{test.price}</span></div>
                          <button type="button" className="remove-button" onClick={() => removeImagingTest(test.id)}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="selected-tests-total"><span>Total</span><strong>₹{total}</strong></div>
                </div>
              </>
            )}
          </section>

          <section className="workspace-card">
            <div className="section-heading compact-heading">
  <div>
    <h2>Booking Details</h2>
    <p>Who is taking the {serviceType === "lab" ? "test" : "study"}?</p>
  </div>
</div>

            <div className="booking-for-toggle">
              <button type="button" className={`toggle-option ${bookingFor === "myself" ? "active" : ""}`} onClick={() => handleBookingForChange("myself")} disabled={!registeredProfile}>Myself</button>
              <button type="button" className={`toggle-option ${bookingFor === "someoneElse" ? "active" : ""}`} onClick={() => handleBookingForChange("someoneElse")}>Someone Else</button>
            </div>

            {bookingFor === "myself" && registeredProfile ? (
              <div className="saved-profile-card">
                <div className="saved-profile-title"><strong>Your Registered Details</strong><span>✓ Saved</span></div>
                <div className="saved-profile-grid">
                  <div><small>Name</small><strong>{form.patientName || "—"}</strong></div>
                  <div><small>Mobile</small><strong>{form.mobile || "—"}</strong></div>
                  <div><small>Address</small><strong>{form.address || "—"}</strong></div>
                  <div><small>PIN Code</small><strong>{form.pinCode || "—"}</strong></div>
                </div>
              </div>
            ) : (
              <div className="form-grid">
                <div className="field-group"><label htmlFor="patientName">Patient Name <span>*</span></label><input id="patientName" name="patientName" placeholder="Enter patient name" value={form.patientName} onChange={handleChange} />{errors.patientName && <small className="error">{errors.patientName}</small>}</div>
                <div className="field-group"><label htmlFor="mobile">Mobile Number <span>*</span></label><input id="mobile" name="mobile" type="tel" maxLength="10" placeholder="10-digit mobile number" value={form.mobile} onChange={handleChange} />{errors.mobile && <small className="error">{errors.mobile}</small>}</div>
                <div className="field-group full-width"><label htmlFor="address">Address <span>*</span></label><textarea id="address" name="address" rows="2" placeholder="Enter complete address" value={form.address} onChange={handleChange} />{errors.address && <small className="error">{errors.address}</small>}</div>
                <div className="field-group"><label htmlFor="pinCode">PIN Code <span>*</span></label><input id="pinCode" name="pinCode" maxLength="6" placeholder="6-digit PIN Code" value={form.pinCode} onChange={handleChange} />{errors.pinCode && <small className="error">{errors.pinCode}</small>}</div>
              </div>
            )}

            <div className="mini-section-title">{serviceType === "lab" ? "Collection" : "Appointment"} Preference</div>
            {serviceType === "lab" ? (
              <div className="visit-options">
                <label className={`visit-card ${form.visitType === "home" ? "selected" : ""}`}><input type="radio" name="visitType" value="home" checked={form.visitType === "home"} onChange={handleChange}/><span className="visit-icon">🏠</span><span><strong>Home Collection</strong><small>Sample at your address</small></span></label>
                <label className={`visit-card ${form.visitType === "centre" ? "selected" : ""}`}><input type="radio" name="visitType" value="centre" checked={form.visitType === "centre"} onChange={handleChange}/><span className="visit-icon">🏥</span><span><strong>Centre Visit</strong><small>Visit partner lab</small></span></label>
              </div>
            ) : (
              <div className="radiology-note"><span>🏥</span><div><strong>Centre Appointment</strong><small>MRI, CT, ultrasound and other imaging studies are booked at the selected centre.</small></div></div>
            )}

            <div className="mini-section-title">Select Date & Time</div>
            <div className="form-grid appointment-grid">
              <div className="field-group"><label htmlFor="date">Date <span>*</span></label><input id="date" name="date" type="date" min={today} value={form.date} onChange={handleChange}/>{errors.date && <small className="error">{errors.date}</small>}</div>
              <div className="field-group"><label htmlFor="timeSlot">Time Slot <span>*</span></label><select id="timeSlot" name="timeSlot" value={form.timeSlot} onChange={handleChange}><option value="">-- Select Time --</option><option value="7:00 AM - 9:00 AM">7:00 AM - 9:00 AM</option><option value="9:00 AM - 11:00 AM">9:00 AM - 11:00 AM</option><option value="11:00 AM - 1:00 PM">11:00 AM - 1:00 PM</option><option value="2:00 PM - 4:00 PM">2:00 PM - 4:00 PM</option><option value="4:00 PM - 6:00 PM">4:00 PM - 6:00 PM</option></select>{errors.timeSlot && <small className="error">{errors.timeSlot}</small>}</div>
            </div>
          </section>
        </div>

        <section className="booking-summary">
            <div><span>{serviceType === "lab" ? "Lab Partner" : "Imaging Partner"}</span><strong>{activePartner ? activePartner.name : "Not selected"}</strong></div>
            <div><span>{serviceType === "lab" ? "Tests" : "Studies"}</span><strong>{activeTests.length ? `${activeTests.length} selected` : `No ${serviceType === "lab" ? "tests" : "studies"} selected`}</strong></div>
            <div className="summary-price"><span>Total</span><strong>₹{total}</strong></div>
            <button type="submit" className="primary-button">{serviceType === "lab" ? "Confirm Lab Test Booking" : "Confirm Radiology Booking"}</button>
          </section>
        </form>
      </main>
    </>
  );
}

const styles = `
  .lab-page{min-height:100vh;padding:14px 3%;background:#f5f9fc;color:#17324d;box-sizing:border-box;font-family:inherit}
  .lab-hero{max-width:1180px;margin:0 auto 10px;padding:14px 22px;border-radius:14px;background:linear-gradient(135deg,#eaf7ff,#f4fbf8);display:flex;justify-content:space-between;align-items:center;gap:18px;box-shadow:0 3px 12px rgba(30,100,140,.07)}
  .lab-label{display:inline-block;margin-bottom:3px;font-size:10px;font-weight:800;letter-spacing:1.3px;color:#1686b8}.lab-hero h1{margin:0 0 3px;font-size:25px;line-height:1.15;color:#123b59}.lab-hero p{margin:0;color:#607589;font-size:12px}.lab-hero-icon{width:54px;height:54px;border-radius:50%;background:#fff;display:flex;justify-content:center;align-items:center;font-size:27px;box-shadow:0 3px 10px rgba(0,0,0,.07);flex-shrink:0}
  .service-switch{max-width:1180px;margin:0 auto 10px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .service-tab{border:1px solid #d8e4ea;border-radius:9px;background:#fff;padding:8px 12px;text-align:left;color:#4b6678;font-size:11px;font-weight:800;cursor:pointer}
  .service-tab small{display:block;margin-top:2px;font-size:8px;font-weight:500;color:#7a8b99}
  .service-tab.active{border-color:#2aa2ca;background:#effaff;color:#1686b8;box-shadow:0 2px 8px rgba(22,134,184,.08)}
  .radiology-note{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #e0e8ed;border-radius:8px;background:#f8fbfd}
  .radiology-note>span{font-size:20px}.radiology-note strong{display:block;color:#244d68;font-size:10px}.radiology-note small{display:block;margin-top:2px;color:#718394;font-size:8px;line-height:1.35}
  .lab-benefits{max-width:1180px;margin:0 auto 10px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.benefit-card{background:#fff;border-radius:10px;padding:8px 12px;display:flex;gap:9px;align-items:center;box-shadow:0 2px 9px rgba(0,0,0,.05)}.benefit-card>span{font-size:20px}.benefit-card strong{display:block;color:#16486a;font-size:12px}.benefit-card p{margin:2px 0 0;font-size:10px;color:#718394}
.lab-workspace{
  width:100%;
  max-width:none;
  margin:0 0 10px;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:4px;
  align-items:stretch;
}  .selection-grid,.form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.field-group{display:flex;flex-direction:column}.field-group.full-width{grid-column:1/-1}.field-group label{margin-bottom:4px;font-size:11px;font-weight:700;color:#34546b}.field-group label span{color:#e34d4d}.field-group input,.field-group select,.field-group textarea{width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid #d7e2e9;border-radius:7px;background:#fff;color:#29455a;font-size:11px;outline:none;height:32px}.field-group input:focus,.field-group select:focus{border-color:#35a8d2;box-shadow:0 0 0 2px rgba(53,168,210,.1)}.field-group select:disabled{background:#f1f4f6;cursor:not-allowed}.error{margin-top:3px;color:#d84b4b;font-size:9px}
  .add-test-line{display:grid;grid-template-columns:1fr auto;gap:5px}.add-test-button{border:none;border-radius:7px;padding:0 10px;background:#1686b8;color:#fff;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap}.selected-tests-card{margin-top:8px;padding:9px;border-radius:9px;background:#f8fbfd;border:1px solid #e1ebf0}.selected-tests-header{display:flex;justify-content:space-between;align-items:center;gap:8px}.selected-tests-header span{display:block;font-size:9px;color:#718394}.selected-tests-header strong{color:#17496b;font-size:11px}.clear-button{border:1px solid #d8e3e9;background:#fff;color:#b64b4b;border-radius:6px;padding:4px 7px;cursor:pointer;font-size:9px;font-weight:700}.empty-tests{margin:8px 0 3px;color:#7b8c99;font-size:10px}.test-list{margin-top:6px;display:grid;gap:4px;max-height:78px;overflow:auto}.test-item{display:flex;align-items:center;gap:6px;padding:5px 6px;background:#fff;border-radius:7px;border:1px solid #e2ebef}.test-number{width:20px;height:20px;border-radius:50%;background:#e8f6fc;color:#1686b8;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:9px;flex-shrink:0}.test-info{flex:1}.test-info strong{display:block;color:#29485d;font-size:10px}.test-info span{color:#16885c;font-size:9px;font-weight:800}.remove-button{border:none;background:transparent;color:#c45151;cursor:pointer;font-size:9px;font-weight:700}.selected-tests-total{margin-top:6px;padding-top:6px;border-top:1px solid #dfe8ed;display:flex;justify-content:space-between;align-items:center}.selected-tests-total span{color:#607589;font-size:10px;font-weight:700}.selected-tests-total strong{color:#16885c;font-size:16px}
  .booking-for-toggle{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px}.toggle-option{height:30px;border:1px solid #d7e2e9;border-radius:7px;background:#fff;color:#4b6678;font-size:11px;font-weight:800;cursor:pointer}.toggle-option.active{border-color:#2aa2ca;background:#effaff;color:#1686b8}.toggle-option:disabled{opacity:.45;cursor:not-allowed}.saved-profile-card{padding:8px 9px;border-radius:8px;background:#f4fbf8;border:1px solid #d6eee4}.saved-profile-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:10px;color:#17496b}.saved-profile-title span{color:#16885c;font-weight:800;font-size:9px}.saved-profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px}.saved-profile-grid>div{min-width:0}.saved-profile-grid small{display:block;color:#718394;font-size:8px;margin-bottom:1px}.saved-profile-grid strong{display:block;color:#29485d;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mini-section-title{margin:9px 0 5px;color:#34546b;font-size:10px;font-weight:800}.visit-options{display:grid;grid-template-columns:1fr 1fr;gap:6px}.visit-card{padding:7px;border:1px solid #e0e8ed;border-radius:8px;display:flex;align-items:center;gap:7px;cursor:pointer}.visit-card.selected{border-color:#31a7d0;background:#f1fbff}.visit-card input{accent-color:#1686b8}.visit-icon{font-size:18px}.visit-card strong{display:block;color:#244d68;font-size:10px;margin-bottom:1px}.visit-card small{color:#718394;font-size:8px}.appointment-grid{margin-top:7px}
  .booking-summary{max-width:1180px;margin:0 auto;padding:9px 12px;background:#edf8fc;border:1px solid #d7edf5;border-radius:10px;display:grid;grid-template-columns:1.4fr .6fr .45fr auto;gap:12px;align-items:center;box-sizing:border-box}.booking-summary span{display:block;margin-bottom:2px;font-size:8px;color:#718394}.booking-summary strong{color:#17496b;font-size:10px}.summary-price{text-align:right}.summary-price strong{font-size:18px;color:#16885c}.primary-button{border:none;border-radius:7px;padding:9px 14px;background:linear-gradient(135deg,#1686b8,#22a77a);color:#fff;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap}
  .lab-confirmation{max-width:760px;margin:20px auto;text-align:center}.success-icon{width:58px;height:58px;margin:0 auto 8px;border-radius:50%;background:#e5f8ee;color:#1c9b61;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800}.lab-confirmation h1{margin:0 0 5px;color:#17496b;font-size:25px}.confirmation-message{margin:0 auto 12px;color:#6f8190;font-size:12px}.booking-card{text-align:left;background:#fff;border-radius:12px;padding:14px;box-shadow:0 3px 12px rgba(0,0,0,.06)}.booking-header{padding-bottom:8px;margin-bottom:2px;border-bottom:1px solid #e5edf1;display:flex;justify-content:space-between;align-items:center;gap:10px}.booking-header h2{margin:0;color:#17496b;font-size:16px}.booking-id{padding:5px 7px;border-radius:6px;background:#eaf7ff;color:#1686b8;font-size:9px;font-weight:800}.booking-row{padding:7px 0;border-bottom:1px solid #edf1f3;display:flex;justify-content:space-between;gap:12px}.booking-row span{color:#718394;font-size:10px}.booking-row strong{color:#29485d;font-size:10px;text-align:right}.tests-confirmation{padding:7px 0;border-bottom:1px solid #edf1f3}.booking-row-label{margin-bottom:4px;color:#718394;font-size:10px}.confirmation-test{display:flex;justify-content:space-between;gap:10px;padding:3px 0;font-size:10px}.confirmation-test strong{color:#16885c}.booking-row.total-row{border-bottom:none;margin-top:2px}.booking-row.total-row strong{color:#16885c;font-size:17px}.confirmation-note{margin:10px 0;padding:9px;border-radius:8px;background:#fffaf0;border:1px solid #f1e4c7;text-align:left}.confirmation-note strong{color:#775d20;font-size:10px}.confirmation-note p{margin:3px 0 0;color:#7c7059;font-size:9px;line-height:1.35}
  @media (min-width:801px) and (max-height:850px){.lab-page{padding-top:9px}.lab-hero{padding:10px 18px}.lab-benefits{margin-bottom:7px}.benefit-card{padding:6px 10px}.workspace-card{padding:10px 12px}.selected-tests-card{margin-top:6px}.lab-workspace{margin-bottom:7px}.booking-summary{padding:7px 10px}}
  @media (max-width:800px){.lab-page{padding:12px 10px}.lab-hero{padding:14px;align-items:flex-start}.lab-hero h1{font-size:22px}.lab-hero-icon{display:none}.lab-benefits,.lab-workspace,.selection-grid,.form-grid,.visit-options,.booking-summary{grid-template-columns:1fr}.workspace-card{padding:12px}.booking-summary{text-align:left}.summary-price{text-align:left}.primary-button{width:100%}.test-list{max-height:none}.saved-profile-grid{grid-template-columns:1fr 1fr}}
.lab-benefits {
  display: none !important;
  /* FINAL FULL-WIDTH LAB LAYOUT */
.lab-page.compact-page,
.lab-page.compact-page > form {
  width: 100% !important;
  max-width: none !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  padding-left: 4px !important;
  padding-right: 4px !important;
  box-sizing: border-box !important;
}

.lab-page.compact-page .lab-hero,
.lab-page.compact-page .service-switch,
.lab-page.compact-page .lab-workspace,
.lab-page.compact-page .booking-summary {
  width: 100% !important;
  max-width: none !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  box-sizing: border-box !important;
}

.lab-page.compact-page .lab-workspace {
  grid-template-columns: 1fr 1fr !important;
  gap: 2px !important;
}

.lab-page.compact-page .workspace-card {
  width: 100% !important;
  margin: 0 !important;
}


.lab-page.compact-page {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}

.lab-page.compact-page .lab-hero,
.lab-page.compact-page .service-switch,
.lab-page.compact-page .lab-workspace,
.lab-page.compact-page .booking-summary {
  width: 100% !important;
  max-width: none !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  box-sizing: border-box !important;
}
  `;

export default LabTests;
