import { useCallback, useEffect, useMemo, useState } from "react";
import DateMonthYearFields from "./DateMonthYearFields";
import RecordViewer from "./RecordViewer";
import { isoDateToday, isoDateYearsAgo } from "./personFields";
import { readUserProfile } from "./addressFields";
import { hasAccountSession, rememberReturnHash, useLoginSession } from "./authSession";
import {
  goBackHash,
  goToChildHash,
  goToHash,
  MEDICAL_RECORD_HOME_HASH,
  parseAppHash,
} from "./hashRoute";
import {
  defaultReportPatientId,
  householdReportPeople,
  personLabel,
} from "./reportPeople";
import {
  isDiagnosticKind,
  mergeOrderReportIntoStore,
} from "./labPipeline";
import { loadAllOrders } from "./orderTracking";
import {
  ADD_UNLISTED_TEST,
  LABORATORY_TESTS,
  RADIOLOGY_TESTS,
  correctTestSpelling,
  loadCustomReportTests,
  saveCustomReportTest,
} from "./healthTestNames";
import {
  MEDICAL_RECORD_TABS,
  buildCustomerMedicalRecord,
  collectMedicalRecords,
  emptyMedicalUploadForm,
  loadMedicalRecords,
  medicalRecordFileCard,
  medicalRecordForViewer,
  medicalRecordIsKindPage,
  medicalRecordKindHref,
  medicalRecordPatientCard,
  medicalRecordTabKind,
  medicalRecordTabLabel,
  patientsForActiveTab,
  recordsForActiveTab,
  visibleMedicalRecordTabs,
  saveMedicalRecords,
  validateMedicalUploadDetails,
  validateMedicalUploadFile,
} from "./medicalRecord";
import { ALL_VACCINES } from "./vaccinationSchedule";
import {
  RECORD_EVENT,
  loadVaccinationStore,
} from "./vaccinationRecord";
import ServiceIcon from "./serviceIcons";

const MAX_FILE_BYTES = 1.5 * 1024 * 1024;

function reportsHash({ tab = "", patientId = "" } = {}) {
  return medicalRecordKindHref(tab, patientId);
}

function TestNameOptions({
  kind = "",
  placeholder = "Select test name",
  customTests = [],
  allowAdd = false,
}) {
  const showLab = kind !== "radiology";
  const showImaging = kind !== "lab";
  return (
    <>
      <option value="">{placeholder}</option>
      {showLab ? (
        <optgroup label="Laboratory">
          {LABORATORY_TESTS.map((name) => (
            <option key={`lab-${name}`} value={name}>
              {name}
            </option>
          ))}
        </optgroup>
      ) : null}
      {showImaging ? (
        <optgroup label="Radiology">
          {RADIOLOGY_TESTS.map((name) => (
            <option key={`rad-${name}`} value={name}>
              {name}
            </option>
          ))}
        </optgroup>
      ) : null}
      {customTests.length ? (
        <optgroup label="Added Tests">
          {customTests.map((name) => (
            <option key={`custom-${name}`} value={name}>
              {name}
            </option>
          ))}
        </optgroup>
      ) : null}
      {allowAdd ? (
        <option value={ADD_UNLISTED_TEST}>Add Test If Not Listed</option>
      ) : null}
    </>
  );
}

function VaccineNameOptions({ customTests = [], allowAdd = false }) {
  return (
    <>
      <option value="">Select vaccine name</option>
      <optgroup label="Vaccines">
        {ALL_VACCINES.map((row) => (
          <option key={row.id} value={row.name}>
            {row.name}
          </option>
        ))}
      </optgroup>
      {customTests.length ? (
        <optgroup label="Added vaccines">
          {customTests.map((name) => (
            <option key={`custom-${name}`} value={name}>
              {name}
            </option>
          ))}
        </optgroup>
      ) : null}
      {allowAdd ? (
        <option value={ADD_UNLISTED_TEST}>Add vaccine if not listed</option>
      ) : null}
    </>
  );
}

function applyChosenFile(file, event, setForm, setErrors, setStatus) {
  setErrors((prev) => ({ ...prev, file: "" }));
  setStatus("");

  if (!file) {
    setForm((prev) => ({
      ...prev,
      fileName: "",
      fileType: "",
      fileData: "",
    }));
    return;
  }

  const isAllowed =
    file.type.startsWith("image/") ||
    file.type === "application/pdf" ||
    /\.(pdf|png|jpe?g|webp)$/i.test(file.name);

  if (!isAllowed) {
    setErrors((prev) => ({ ...prev, file: "Upload a PDF or image file." }));
    event.target.value = "";
    return;
  }

  if (file.size > MAX_FILE_BYTES) {
    setForm((prev) => ({
      ...prev,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileData: "",
    }));
    setStatus("File is over 1.5 MB, so only the filename will be saved.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    setForm((prev) => ({
      ...prev,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileData: typeof reader.result === "string" ? reader.result : "",
    }));
  };
  reader.onerror = () => {
    setErrors((prev) => ({
      ...prev,
      file: "Could not read this file. Filename will still be saved if you submit.",
    }));
    setForm((prev) => ({
      ...prev,
      fileName: file.name,
      fileType: file.type || "",
      fileData: "",
    }));
  };
  reader.readAsDataURL(file);
}

function Reports({ initialTab = "" } = {}) {
  const today = isoDateToday();
  const minReport = isoDateYearsAgo(20);
  const session = useLoginSession();
  const household = useMemo(
    () => householdReportPeople(readUserProfile(), session),
    [session]
  );
  const [reports, setReports] = useState(() => loadMedicalRecords());
  const [vaxStore, setVaxStore] = useState(() => loadVaccinationStore());
  const [vaxOrders, setVaxOrders] = useState(() => loadAllOrders());
  const combinedRecords = useMemo(
    () =>
      collectMedicalRecords(reports, {
        vaxStore,
        orders: vaxOrders,
        people: household,
      }),
    [reports, vaxStore, vaxOrders, household]
  );
  const [customTests, setCustomTests] = useState(() => loadCustomReportTests());
  const [sectionTab, setSectionTab] = useState(() => {
    const { service } = parseAppHash(
      typeof window !== "undefined" ? window.location.hash : ""
    );
    return medicalRecordTabKind(initialTab || service);
  });
  const kindPage = medicalRecordIsKindPage(sectionTab);
  const people = useMemo(
    () =>
      kindPage
        ? patientsForActiveTab(combinedRecords, sectionTab, household)
        : household,
    [combinedRecords, sectionTab, household, kindPage]
  );
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState("details");
  const [form, setForm] = useState(() =>
    emptyMedicalUploadForm(today, { tab: "lab", memberId: defaultReportPatientId(people) })
  );
  const [filterMember, setFilterMember] = useState(() => defaultReportPatientId(people));
  const [openPatientId, setOpenPatientId] = useState(() =>
    parseAppHash(typeof window !== "undefined" ? window.location.hash : "").id
  );
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [addingTest, setAddingTest] = useState(false);
  const [draftTest, setDraftTest] = useState("");
  const [viewer, setViewer] = useState(null);
  const closeViewer = useCallback(() => setViewer(null), []);
  const openRecord = (item) => setViewer(medicalRecordForViewer(item));
  const patientRows = people;

  useEffect(() => {
    const orders = loadAllOrders();
    setVaxOrders(orders);
    orders.forEach((order) => {
      const kind = order?.kind || order?.orderType;
      if (
        (isDiagnosticKind(kind) || kind === "vaccination") &&
        (order.reportFileData || order.reportFileName)
      ) {
        mergeOrderReportIntoStore(order, globalThis.localStorage, household);
      }
    });
    const kept = loadMedicalRecords();
    saveMedicalRecords(kept);
    setReports(kept);
    const refresh = () => {
      setReports(loadMedicalRecords());
      setVaxOrders(loadAllOrders());
    };
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("medihome-reports", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("medihome-reports", refresh);
    };
  }, [household]);

  useEffect(() => {
    const wanted = medicalRecordTabKind(initialTab);
    if (wanted) setSectionTab(wanted);
  }, [initialTab]);

  useEffect(() => {
    const syncHash = () => {
      const { service, id } = parseAppHash(window.location.hash);
      const nextTab = medicalRecordTabKind(service);
      setSectionTab((current) => (current === nextTab ? current : nextTab));
      setOpenPatientId((current) => (current === (id || "") ? current : id || ""));
      if (id) {
        setFilterMember((current) => (current === id ? current : id));
      }
      setViewer((current) => (current ? null : current));
    };
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [initialTab]);

  useEffect(() => {
    const refresh = () => setVaxStore(loadVaccinationStore());
    window.addEventListener(RECORD_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(RECORD_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    const fallback = defaultReportPatientId(people);
    if (!filterMember || !people.some((row) => row.id === filterMember)) {
      setFilterMember(fallback);
    }
    if (!form.memberId || !people.some((row) => row.id === form.memberId)) {
      const nextId = filterMember || fallback;
      setForm((prev) => (prev.memberId === nextId ? prev : { ...prev, memberId: nextId }));
    }
  }, [people, form.memberId, filterMember]);

  const sectionKind = medicalRecordTabKind(sectionTab);
  const landingTabs = visibleMedicalRecordTabs(sectionTab);
  const sectionRows = useMemo(() => {
    if (!sectionKind) return [];
    const list = recordsForActiveTab(
      combinedRecords,
      sectionKind,
      openPatientId,
      people
    );
    return [...list].sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || ""))
    );
  }, [combinedRecords, sectionKind, openPatientId, people]);
  const filterPerson =
    people.find((row) => row.id === (openPatientId || filterMember)) ||
    patientRows.find((row) => row.id === openPatientId) ||
    null;
  const isRxTab = sectionKind === "prescription";
  const isImaging = sectionKind === "radiology";
  const isVaxTab = sectionKind === "vaccination";
  const uploadTab = sectionKind || "lab";
  const sectionLabel = sectionKind ? medicalRecordTabLabel(sectionKind) : "Medical Record";

  const persist = (next) => {
    setReports(next);
    saveMedicalRecords(next);
  };

  const resetUpload = (tab = uploadTab, patientId = filterMember) => {
    setUploading(false);
    setUploadStep("details");
    setForm(emptyMedicalUploadForm(today, { tab, memberId: patientId }));
    setErrors({});
    setStatus("");
    setAddingTest(false);
    setDraftTest("");
  };

  const selectSection = (tab) => {
    const next = medicalRecordTabKind(tab);
    if (!next) return;
    setSectionTab(next);
    setOpenPatientId("");
    goToChildHash(reportsHash({ tab: next }), MEDICAL_RECORD_HOME_HASH);
    resetUpload(next);
  };

  const closeKindPage = () => {
    goBackHash();
    resetUpload(sectionTab, filterMember);
  };

  const startUpload = () => {
    setUploading(true);
    setUploadStep("details");
    setForm(emptyMedicalUploadForm(today, { tab: uploadTab, memberId: filterMember }));
    setErrors({});
    setStatus("");
    setAddingTest(false);
    setDraftTest("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "testName" && value === ADD_UNLISTED_TEST) {
      setAddingTest(true);
      setDraftTest("");
      setForm((prev) => ({ ...prev, testName: "" }));
      setErrors((prev) => ({ ...prev, testName: "" }));
      setStatus("");
      return;
    }
    if (name === "testName") setAddingTest(false);
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setStatus("");
  };

  const addUnlistedTest = () => {
    const result = correctTestSpelling(draftTest, customTests);
    if (!result.ok) {
      setErrors((prev) => ({ ...prev, testName: result.error }));
      return;
    }
    const listed =
      LABORATORY_TESTS.includes(result.name) ||
      RADIOLOGY_TESTS.includes(result.name);
    const nextCustom = listed
      ? customTests
      : saveCustomReportTest(result.name, customTests);
    setCustomTests(nextCustom);
    setForm((prev) => ({ ...prev, testName: result.name }));
    setAddingTest(false);
    setDraftTest("");
    setErrors((prev) => ({ ...prev, testName: "" }));
    if (listed) {
      setStatus(
        result.corrected
          ? `Selected ${result.name} after spelling check.`
          : `${result.name} is already on this list.`
      );
      return;
    }
    setStatus(
      result.corrected
        ? `Added as ${result.name} after spelling check.`
        : `${result.name} added to this page.`
    );
  };

  const handleFile = (event) => {
    applyChosenFile(event.target.files?.[0], event, setForm, setErrors, setStatus);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (uploadStep === "details") {
      const next = validateMedicalUploadDetails(uploadTab, form, {
        people,
        addingTest,
      });
      setErrors(next);
      if (Object.keys(next).length) return;
      setUploadStep("file");
      setStatus("");
      return;
    }

    const fileErrors = validateMedicalUploadFile(form);
    setErrors(fileErrors);
    if (Object.keys(fileErrors).length) return;

    const person =
      people.find((row) => row.id === form.memberId) ||
      people.find((row) => row.id === filterMember) ||
      (people.length === 1 ? people[0] : null);
    const record = buildCustomerMedicalRecord(uploadTab, {
      ...form,
      reportKind: sectionKind === "prescription" ? form.reportKind : sectionKind,
    }, { person, people });
    persist([record, ...reports]);
    const savedPatient = person?.id || form.memberId || filterMember;
    if (savedPatient) {
      setFilterMember(savedPatient);
      setOpenPatientId(savedPatient);
    }
    resetUpload(uploadTab, savedPatient);
    setStatus(
      isRxTab
        ? "Prescription uploaded to Prescription."
        : isImaging
          ? "Imaging report uploaded to Imaging report."
          : isVaxTab
            ? "Vaccination record uploaded to Vaccination."
            : "Lab report uploaded to Lab report."
    );
    event.target.reset?.();
  };

  const selectPatient = (id) => {
    goToHash(reportsHash({ tab: sectionTab, patientId: id }));
    setFilterMember(id);
    setUploading(false);
    setUploadStep("details");
    setForm(emptyMedicalUploadForm(today, { tab: uploadTab, memberId: id }));
    setErrors({});
    setStatus("");
  };

  const closePatientFolder = () => {
    goBackHash();
    resetUpload(sectionTab, filterMember);
  };

  const emptyFor = () => {
    if (!filterPerson) {
      return `No ${sectionLabel.toLowerCase()}s saved yet.`;
    }
    return `No ${sectionLabel.toLowerCase()}s saved yet for ${filterPerson.name}.`;
  };

  if (!hasAccountSession(session)) {
    return (
      <>
        <style>{styles}</style>
        <div className="service-page reports-page">
          <section className="service-hero">
            <div>
              <span className="service-kicker">MediHome Medical Record</span>
              <h1>Medical Record is in your account</h1>
              <p>Log in to see lab reports, imaging reports, prescriptions, and vaccination records for your family.</p>
              <a
                className="service-submit"
                href="#login"
                onClick={() => rememberReturnHash(MEDICAL_RECORD_HOME_HASH)}
              >
                Login to open Medical Record
              </a>
            </div>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="service-page reports-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">MediHome Medical Record</span>
            <h1>{kindPage ? sectionLabel : "Medical Record"}</h1>
            <p>
              {!kindPage
                ? "Choose lab reports, imaging reports, prescriptions, or vaccination records."
                : openPatientId
                  ? `Open a ${sectionLabel.toLowerCase()} file to view it here. Save and Print are on the opened report.`
                  : `One record per patient. Tap a name to open that patient’s ${sectionLabel.toLowerCase()} files.`}
            </p>
          </div>
        </section>

        {!kindPage ? (
          <section className="medical-record-panel" aria-label="Medical Record types">
            <div className="report-list">
              <div className="report-list-head">
                <h2>Choose a record type</h2>
              </div>
              <ul>
                {landingTabs.map((tab) => (
                  <li key={tab.id}>
                    <a
                      className="record-card"
                      href={reportsHash({ tab: tab.id })}
                      onClick={(event) => {
                        event.preventDefault();
                        selectSection(tab.id);
                      }}
                    >
                      <ServiceIcon type={tab.id} title={tab.label} />
                      <strong>{tab.label}</strong>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : !openPatientId ? (
          <>
          <div className="medical-record-folder-bar">
            <button type="button" className="record-back" onClick={closeKindPage}>
              Medical Record
            </button>
          </div>
          <section className="medical-record-panel" aria-label="Patients">
            <div className="report-list">
              <div className="report-list-head">
                <h2>Patients</h2>
              </div>
              {patientRows.length === 0 ? (
                <p className="empty">No patient records yet. Upload a report to start a folder.</p>
              ) : (
                <ul>
                  {patientRows.map((person) => {
                    const card = medicalRecordPatientCard(person);
                    return (
                      <li key={person.id}>
                        <button
                          type="button"
                          className="record-card"
                          onClick={() => selectPatient(person.id)}
                        >
                          <strong>{card.primary}</strong>
                          {card.secondary ? <span>{card.secondary}</span> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
          </>
        ) : (
          <>
        <div className="medical-record-folder-bar">
          <button type="button" className="record-back" onClick={closePatientFolder}>
            All patients
          </button>
          <div className="medical-record-folder-title">
            <strong>{filterPerson?.name || "Patient"}</strong>
            {filterPerson?.mobile ? <span>{filterPerson.mobile}</span> : null}
          </div>
        </div>

        <section className="medical-record-panel" aria-label={sectionLabel}>
          <div className="report-filters medical-record-filters">
            {!uploading && sectionKind ? (
              <button type="button" className="record-upload-start" onClick={startUpload}>
                {isRxTab
                  ? "Upload prescription"
                  : isImaging
                    ? "Upload imaging report"
                    : isVaxTab
                      ? "Upload vaccination record"
                      : "Upload lab report"}
              </button>
            ) : null}
          </div>

          {uploading ? (
            <form
              className="service-form"
              aria-label={
                isRxTab
                  ? "Upload prescription"
                  : isImaging
                    ? "Upload imaging report"
                    : isVaxTab
                      ? "Upload vaccination record"
                      : "Upload lab report"
              }
              onSubmit={handleSubmit}
            >
              <h2 className="upload-report-title">
                {isRxTab
                  ? "Upload prescription"
                  : isImaging
                    ? "Upload imaging report"
                    : isVaxTab
                      ? "Upload vaccination record"
                      : "Upload lab report"}
              </h2>
              <p className="upload-step-hint">
                {uploadStep === "details"
                  ? "First add the details, then you will choose the file."
                  : "Details saved. Now choose a PDF or photo."}
              </p>

              {uploadStep === "details" ? (
                <>
                  {people.length > 1 ? (
                    <div className="field full">
                      <label htmlFor="rpt-member">
                        {isRxTab
                          ? "Whose prescription"
                          : isVaxTab
                            ? "Whose vaccination record"
                            : "Whose report"}{" "}
                        <span>*</span>
                      </label>
                      <select
                        id="rpt-member"
                        name="memberId"
                        value={form.memberId}
                        onChange={handleChange}
                      >
                        <option value="">Select name</option>
                        {people.map((person) => (
                          <option key={person.id} value={person.id}>
                            {personLabel(person)}
                          </option>
                        ))}
                      </select>
                      {errors.memberId && <small>{errors.memberId}</small>}
                    </div>
                  ) : null}

                  {!isRxTab ? (
                    <div className="field full">
                      <label htmlFor="rpt-test-name">
                        {isVaxTab ? "Vaccine name" : isImaging ? "Scan name" : "Test name"}{" "}
                        <span>*</span>
                      </label>
                      <select
                        id="rpt-test-name"
                        name="testName"
                        value={addingTest ? ADD_UNLISTED_TEST : form.testName}
                        onChange={handleChange}
                      >
                        {isVaxTab ? (
                          <VaccineNameOptions customTests={customTests} allowAdd />
                        ) : (
                          <TestNameOptions
                            kind={sectionKind}
                            placeholder={isImaging ? "Select scan name" : "Select test name"}
                            customTests={customTests}
                            allowAdd
                          />
                        )}
                      </select>
                      {addingTest ? (
                        <>
                          <div className="add-test-row">
                            <input
                              id="rpt-new-test"
                              value={draftTest}
                              autoComplete="off"
                              placeholder={
                                isVaxTab
                                  ? "Type the vaccine name"
                                  : isImaging
                                    ? "Type the scan name"
                                    : "Type the test name"
                              }
                              aria-label={
                                isVaxTab
                                  ? "New vaccine name"
                                  : isImaging
                                    ? "New scan name"
                                    : "New test name"
                              }
                              onChange={(event) => {
                                setDraftTest(event.target.value);
                                setErrors((prev) => ({ ...prev, testName: "" }));
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  addUnlistedTest();
                                }
                              }}
                            />
                            <button type="button" onClick={addUnlistedTest}>
                              Add Test
                            </button>
                            <button
                              type="button"
                              className="add-test-cancel"
                              onClick={() => {
                                setAddingTest(false);
                                setDraftTest("");
                                setErrors((prev) => ({ ...prev, testName: "" }));
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                          <p className="add-test-hint">
                            Spelling is checked, then the test is added to this list.
                          </p>
                        </>
                      ) : null}
                      {errors.testName && <small>{errors.testName}</small>}
                    </div>
                  ) : null}

                  <div className="field full">
                    <DateMonthYearFields
                      idPrefix="rpt-date"
                      name="date"
                      value={form.date}
                      min={minReport}
                      max={today}
                      required
                      error={errors.date || ""}
                      label={
                        isRxTab
                          ? "Prescription date"
                          : isVaxTab
                            ? "Vaccination date"
                            : "Report date"
                      }
                      onChange={handleChange}
                    />
                  </div>

                  <div className="field full">
                    <label htmlFor="rpt-clinic">
                      {isRxTab
                        ? "Doctor or clinic name (optional)"
                        : isVaxTab
                          ? "Clinic or centre name (optional)"
                          : "Lab or centre name (optional)"}
                    </label>
                    <input
                      id="rpt-clinic"
                      name="clinicName"
                      value={form.clinicName}
                      onChange={handleChange}
                      placeholder={
                        isRxTab
                          ? "e.g. Dr Sharma Clinic"
                          : isVaxTab
                            ? "e.g. City Clinic"
                            : "e.g. City Path Lab"
                      }
                    />
                  </div>

                  <div className="field full">
                    <label htmlFor="rpt-notes">Notes (optional)</label>
                    <textarea
                      id="rpt-notes"
                      name="notes"
                      rows="2"
                      value={form.notes}
                      onChange={handleChange}
                      placeholder={
                        isRxTab
                          ? "Pharmacy, refill date"
                          : isVaxTab
                            ? "Dose, batch, follow-up"
                            : "Findings, follow-up"
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="upload-details-summary field full">
                    <p>
                      <strong>{sectionLabel}</strong>
                      {form.testName ? ` · ${form.testName}` : ""}
                      {form.clinicName && isRxTab ? ` · ${form.clinicName}` : ""}
                    </p>
                    <p>
                      {form.date}
                      {form.clinicName && !isRxTab ? ` · ${form.clinicName}` : ""}
                    </p>
                  </div>

                  <div className="field full">
                    <label htmlFor="rpt-file">
                      {isRxTab
                        ? "Prescription file (PDF or photo)"
                        : isVaxTab
                          ? "Vaccination record file (PDF or photo)"
                          : "Report file (PDF or photo)"}{" "}
                      <span>*</span>
                    </label>
                    <input
                      id="rpt-file"
                      name="file"
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={handleFile}
                    />
                    {form.fileName && (
                      <p className="file-meta">
                        {form.fileName}
                        {form.fileData ? " · stored on this device" : " · metadata only"}
                      </p>
                    )}
                    {errors.file && <small>{errors.file}</small>}
                  </div>

                  <button
                    type="button"
                    className="upload-back"
                    onClick={() => {
                      setUploadStep("details");
                      setErrors((prev) => ({ ...prev, file: "" }));
                    }}
                  >
                    Back to details
                  </button>
                </>
              )}

              {status && <p className="form-status">{status}</p>}

              <div className="upload-form-actions">
                <button type="button" className="upload-back" onClick={() => resetUpload()}>
                  Cancel
                </button>
                <button type="submit" className="service-submit">
                  {uploadStep === "details"
                    ? "Continue — choose file"
                    : isRxTab
                      ? "Save prescription"
                      : isImaging
                        ? "Save imaging report"
                        : isVaxTab
                          ? "Save vaccination record"
                          : "Save lab report"}
                </button>
              </div>
            </form>
          ) : status ? (
            <p className="form-status is-inline">{status}</p>
          ) : null}

          <div className="report-list">
            <div className="report-list-head">
              <h2>{sectionLabel}</h2>
            </div>
            {sectionRows.length === 0 ? (
              <p className="empty">{emptyFor()}</p>
            ) : (
              <ul>
                {sectionRows.map((item) => {
                  const card = medicalRecordFileCard(item);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="record-card"
                        onClick={() => openRecord(item)}
                      >
                        <strong>{card.primary}</strong>
                        {card.secondary ? <span>{card.secondary}</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
          </>
        )}
      </div>
      {viewer ? <RecordViewer record={viewer} onClose={closeViewer} /> : null}
    </>
  );
}

const styles = `
.service-page{padding:16px 20px 24px 14px;box-sizing:border-box;color:#143246}
.service-hero{max-width:760px;margin:0 auto 12px;padding:14px 16px;border-radius:12px;background:linear-gradient(135deg,#eaf7ff,#f4fbf8)}
.service-kicker{display:block;margin-bottom:4px;font-size:11px;font-weight:800;letter-spacing:.6px;color:#1a6b7a}
.service-hero h1{margin:0 0 4px;font-size:22px}
.service-hero p{margin:0;color:#5d7180;font-size:13px;line-height:1.4}
.medical-record-patient{max-width:760px;margin:0 auto 12px}
.medical-record-folder-bar{max-width:760px;margin:0 auto 12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.record-back{border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#34546b;font:inherit;font-size:13px;font-weight:700;padding:8px 12px;cursor:pointer}
.medical-record-folder-title{display:flex;flex-direction:column;gap:2px;min-width:0}
.medical-record-folder-title strong{font-size:16px}
.medical-record-folder-title span{color:#5d7180;font-size:12px}
.medical-record-tabs{max-width:760px;margin:0 auto 12px;display:flex;flex-wrap:wrap;gap:4px}
.medical-record-tabs button{flex:1 1 120px}
.medical-record-panel{max-width:760px;margin:0 auto}
.service-form{max-width:760px;margin:0 auto 12px;padding:14px;background:#fff;border:1px solid #e4ecef;border-radius:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}
.upload-report-title{grid-column:1/-1;margin:0 0 2px;font-size:16px}
.upload-step-hint{grid-column:1/-1;margin:0;color:#5d7180;font-size:12px}
.upload-details-summary{padding:10px 12px;border-radius:8px;background:#f4fbf8;color:#34546b}
.upload-details-summary p{margin:0;font-size:13px;line-height:1.4}
.upload-details-summary p + p{margin-top:4px;color:#5d7180}
.upload-back{border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#34546b;font:inherit;font-size:13px;font-weight:700;padding:8px 12px;cursor:pointer}
.upload-form-actions{grid-column:1/-1;display:flex;gap:8px;align-items:center}
.upload-form-actions .service-submit{flex:1;margin:0}
.service-form .field{display:flex;flex-direction:column;min-width:0}
.service-form .field.full{grid-column:1/-1}
.service-form label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.service-form label span{color:#d84b4b}
.service-form input,.service-form select,.service-form textarea{width:100%;box-sizing:border-box;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;outline:none;height:38px;min-height:38px;background:#fff}
.service-form input[type="file"]{height:auto;min-height:38px;overflow:visible;padding:6px 8px}
.service-form textarea{height:auto;min-height:56px;resize:vertical}
.service-form input:focus,.service-form select:focus,.service-form textarea:focus{border-color:#1a6b7a}
.service-form small{margin-top:4px;color:#d84b4b;font-size:12px}
.add-test-row{display:flex;gap:8px;margin-top:8px}
.add-test-row input{flex:1;min-width:0}
.add-test-row button{border:1px solid #1a6b7a;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:800;padding:8px 12px;cursor:pointer;white-space:nowrap;height:38px}
.add-test-row button.add-test-cancel{background:#fff;color:#34546b;border-color:#d7e2e9}
.add-test-hint{margin:6px 0 0;color:#5d7180;font-size:12px}
.file-meta{margin:6px 0 0;color:#5d7180;font-size:12px}
.form-status{grid-column:1/-1;margin:0;padding:8px 10px;border-radius:8px;background:#e5f8ee;color:#1c9b61;font-size:13px;font-weight:600}
.form-status.is-inline{margin:0 0 10px}
.service-submit{grid-column:1/-1;border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:700;min-height:40px;cursor:pointer;font-family:inherit}
.medical-record-filters{margin:0 0 10px;display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap}
.record-upload-start{border:0;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-size:13px;font-weight:800;min-height:38px;padding:0 14px;cursor:pointer}
.report-list{margin:8px 0 0}
.report-list-head{margin-bottom:8px}
.report-list h2{margin:0;font-size:16px}
.report-list .filter-field,.medical-record-filters .filter-field,.medical-record-patient .filter-field{min-width:200px;flex:1;max-width:280px}
.report-list .filter-field label,.medical-record-filters .filter-field label,.medical-record-patient .filter-field label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.report-list .filter-field select,.medical-record-filters .filter-field select,.medical-record-patient .filter-field select{width:100%;box-sizing:border-box;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;outline:none;height:38px;min-height:38px;background:#fff}
.report-list .empty{margin:0;color:#7a8b96;font-size:14px}
.report-list ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.report-list li{margin:0;padding:0}
.record-card{width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:12px;background:#fff;border:1px solid #e4ecef;border-radius:10px;text-align:left;cursor:pointer;font:inherit;color:#143246}
.report-list .record-card{flex-direction:row;align-items:center;gap:10px}
.report-list .record-card .service-icon{width:40px;height:40px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}
.report-list .record-card .service-icon svg{width:22px;height:22px}
.record-card strong{font-size:14px}
.record-card span{color:#5d7180;font-size:12px}
.record-card.is-static{cursor:default}
.report-list .record-upload-start{margin-top:10px}
@media (max-width:800px){.service-page{padding:14px}.service-form{grid-template-columns:1fr}}
`;

export default Reports;
