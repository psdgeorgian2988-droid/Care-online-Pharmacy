import { useMemo, useState } from "react";
import { addReview, REVIEW_SERVICES } from "./reviewStore";
import { noContactMobileProps, noContactNameProps } from "./noContactAutofill";

function readProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem("mediHomeUser") || "null");
    if (!parsed || typeof parsed !== "object") {
      return { name: "", mobile: "" };
    }
    return {
      name: String(parsed.name || parsed.fullName || "").trim(),
      mobile: String(parsed.mobile || parsed.mobileNumber || "").trim(),
    };
  } catch {
    return { name: "", mobile: "" };
  }
}

function Feedback() {
  const profile = useMemo(() => readProfile(), []);
  const [form, setForm] = useState({
    name: profile.name,
    mobile: profile.mobile,
    service: "medicines",
    rating: 5,
    comment: "",
    referenceId: "",
  });
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const next =
      name === "mobile"
        ? value.replace(/\D/g, "")
        : name === "rating"
          ? Number(value)
          : value;
    setForm((prev) => ({ ...prev, [name]: next }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (form.mobile && !/^[6-9]\d{9}$/.test(form.mobile)) {
      next.mobile = "Enter a valid 10-digit mobile number.";
    }
    if (!form.service) next.service = "Select a service.";
    if (!form.rating) next.rating = "Please rate your experience.";
    if (form.comment.trim().length < 12) {
      next.comment = "Please write at least a short review (12 characters).";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    const now = new Date();
    const review = {
      id: "MH-RV-" + Math.floor(100000 + Math.random() * 900000),
      name: form.name.trim(),
      mobile: form.mobile,
      service: form.service,
      rating: Number(form.rating),
      comment: form.comment.trim(),
      referenceId: form.referenceId.trim(),
      createdAt: now.toLocaleString(),
      createdAtMs: now.getTime(),
    };
    addReview(review);
    setSaved(review);
  };

  if (saved) {
    return (
      <>
        <style>{styles}</style>
        <div className="service-page info-page">
          <section className="service-confirm">
            <div className="success-icon">✓</div>
            <h1>Thank You For Your Feedback</h1>
            <p>Your review is saved on this device and listed on the Reviews page.</p>
            <div className="confirm-card">
              <div className="confirm-head">
                <h2>{saved.name}</h2>
                <span>{saved.rating} / 5</span>
              </div>
              <p className="review-quote">{saved.comment}</p>
            </div>
            <div className="confirm-actions">
              <a className="service-submit" href="#reviews">
                Read reviews
              </a>
              <button
                type="button"
                className="service-submit"
                onClick={() => {
                  setSaved(null);
                  setForm({
                    name: profile.name,
                    mobile: profile.mobile,
                    service: "medicines",
                    rating: 5,
                    comment: "",
                    referenceId: "",
                  });
                  setErrors({});
                }}
              >
                Write another
              </button>
            </div>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="service-page info-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">Customer feedback</span>
            <h1>Tell Us How MediHome Did</h1>
            <p>
              Rate medicines, diagnostics, Home Care, vaccination, psychologist, or ambulance.
              Published reviews appear on the Reviews page.
            </p>
          </div>
        </section>

        <form className="service-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fb-name">
              Your name <span>*</span>
            </label>
            <input
              id="fb-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full name"
              {...noContactNameProps}
            />
            {errors.name ? <small>{errors.name}</small> : null}
          </div>

          <div className="field">
            <label htmlFor="fb-mobile">Mobile</label>
            <input
              id="fb-mobile"
              name="mobile"
              maxLength="10"
              value={form.mobile}
              onChange={handleChange}
              placeholder="Optional 10-digit mobile"
              {...noContactMobileProps}
            />
            {errors.mobile ? <small>{errors.mobile}</small> : null}
          </div>

          <div className="field">
            <label htmlFor="fb-service">
              Service <span>*</span>
            </label>
            <select
              id="fb-service"
              name="service"
              value={form.service}
              onChange={handleChange}
            >
              {REVIEW_SERVICES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {errors.service ? <small>{errors.service}</small> : null}
          </div>

          <div className="field">
            <label htmlFor="fb-ref">Order / booking ID</label>
            <input
              id="fb-ref"
              name="referenceId"
              value={form.referenceId}
              onChange={handleChange}
              placeholder="Optional, e.g. from My Orders"
            />
          </div>

          <div className="field full">
            <span className="rating-label">
              Rating <span>*</span>
            </span>
            <div className="star-row" role="group" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={value <= form.rating ? "star is-on" : "star"}
                  onClick={() => {
                    setForm((prev) => ({ ...prev, rating: value }));
                    setErrors((prev) => ({ ...prev, rating: "" }));
                  }}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  aria-pressed={value === form.rating}
                >
                  ★
                </button>
              ))}
              <strong>{form.rating} / 5</strong>
            </div>
            {errors.rating ? <small>{errors.rating}</small> : null}
          </div>

          <div className="field full">
            <label htmlFor="fb-comment">
              Your review <span>*</span>
            </label>
            <textarea
              id="fb-comment"
              name="comment"
              rows="4"
              value={form.comment}
              onChange={handleChange}
              placeholder="What went well, and what we can improve"
            />
            {errors.comment ? <small>{errors.comment}</small> : null}
          </div>

          <button type="submit" className="service-submit">
            Submit feedback
          </button>
        </form>
        <p className="info-footnote">
          Read what others said on <a href="#reviews">Reviews</a>. Need help with
          an order? Use <a href="#contact">Contact Us</a>.
        </p>
      </div>
    </>
  );
}

const styles = `
.service-page{padding:16px 20px 24px 14px;box-sizing:border-box;color:#143246}
.service-hero{max-width:760px;margin:0 auto 12px;padding:14px 16px;border-radius:12px;background:linear-gradient(135deg,#eaf7ff,#f4fbf8)}
.service-kicker{display:block;margin-bottom:4px;font-size:11px;font-weight:800;letter-spacing:.6px;color:#1a6b7a}
.service-hero h1{margin:0 0 4px;font-size:22px}
.service-hero p{margin:0;color:#5d7180;font-size:13px;line-height:1.4}
.service-form{max-width:760px;margin:0 auto;padding:14px;background:#fff;border:1px solid #e4ecef;border-radius:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}
.service-form .field{display:flex;flex-direction:column;min-width:0}
.service-form .field.full{grid-column:1/-1}
.service-form label,.rating-label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.service-form label span,.rating-label span{color:#d84b4b}
.service-form input,.service-form select,.service-form textarea{width:100%;box-sizing:border-box;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;outline:none;height:38px;min-height:38px;background:#fff}
.service-form textarea{height:auto;min-height:88px;resize:vertical}
.service-form input:focus,.service-form select:focus,.service-form textarea:focus{border-color:#1a6b7a}
.service-form small{margin-top:4px;color:#d84b4b;font-size:12px}
.star-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.star{border:none;background:transparent;padding:0;font-size:26px;line-height:1;color:#d7e2e9;cursor:pointer}
.star.is-on{color:#e2a30b}
.star-row strong{margin-left:6px;font-size:13px;color:#1a6b7a}
.service-submit{grid-column:1/-1;border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:700;min-height:40px;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
.confirm-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.confirm-actions .service-submit{grid-column:auto;min-width:160px}
.service-confirm{max-width:640px;margin:12px auto;text-align:center}
.success-icon{width:52px;height:52px;margin:0 auto 10px;border-radius:50%;background:#e5f8ee;color:#1c9b61;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800}
.service-confirm h1{margin:0 0 6px;font-size:22px}
.service-confirm p{margin:0 0 14px;color:#5d7180;font-size:14px}
.confirm-card{text-align:left;background:#fff;border:1px solid #e4ecef;border-radius:12px;padding:14px;margin-bottom:14px}
.confirm-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid #e5edf1}
.confirm-head h2{margin:0;font-size:16px}
.confirm-head span{padding:5px 9px;border-radius:6px;background:#e8f4f6;color:#1a6b7a;font-size:12px;font-weight:800}
.review-quote{margin:0;color:#34546b;font-size:14px;line-height:1.5}
.info-footnote{max-width:760px;margin:12px auto 0;color:#5d7180;font-size:13px}
.info-footnote a{color:#1a6b7a;font-weight:700;text-decoration:none}
@media (max-width:800px){.service-page{padding:14px}.service-form{grid-template-columns:1fr}}
`;

export default Feedback;
