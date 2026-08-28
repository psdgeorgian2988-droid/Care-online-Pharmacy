import { useState } from "react";
import SocialLinks from "./SocialLinks";
import {
  CARE_EMAIL,
  CARE_PHONE_DISPLAY,
  CARE_PHONE_TEL,
  CARE_WHATSAPP,
} from "./careChat";
import { noContactMobileProps, noContactNameProps } from "./noContactAutofill";

function openWhatsAppUrl(url, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const opened = window.open(url, "_blank");
  if (opened) {
    opened.opener = null;
    return;
  }
  window.location.assign(url);
}

function Contact() {
  const [form, setForm] = useState({ name: "", mobile: "", message: "" });
  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    const next = name === "mobile" ? value.replace(/\D/g, "") : value;
    setForm((prev) => ({ ...prev, [name]: next }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      next.mobile = "Enter a valid 10-digit mobile number.";
    }
    if (!form.message.trim()) next.message = "Please write a short message.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    const text = `Hi MediHome, I am ${form.name.trim()} (${form.mobile}). ${form.message.trim()}`;
    const url = `https://wa.me/${CARE_WHATSAPP}?text=${encodeURIComponent(text)}`;
    openWhatsAppUrl(url);
  };

  const careUrl = `https://wa.me/${CARE_WHATSAPP}?text=${encodeURIComponent(
    "Hi MediHome, I need help from customer care."
  )}`;

  return (
    <>
      <style>{styles}</style>
      <div className="service-page info-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">Support</span>
            <h1>Contact MediHome</h1>
            <p>
              Help with orders, lab bookings, Home Care, psychologist
              consultation, and ambulance requests. Hours: 8:00 AM – 10:00 PM
              IST, all days.
            </p>
          </div>
        </section>

        <div className="info-stack">
          <section className="info-panel contact-details">
            <div>
              <h2>Phone</h2>
              <p>
                <a href={`tel:${CARE_PHONE_TEL}`}>{CARE_PHONE_DISPLAY}</a>
              </p>
            </div>
            <div>
              <h2>Email</h2>
              <p>
                <a href={`mailto:${CARE_EMAIL}`}>{CARE_EMAIL}</a>
              </p>
            </div>
            <div>
              <h2>WhatsApp</h2>
              <p>
                <a
                  href={careUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => openWhatsAppUrl(careUrl, event)}
                >
                  {CARE_PHONE_DISPLAY}
                </a>
              </p>
            </div>
          </section>

          <section className="info-panel social-panel">
            <h2>Social Media</h2>
            <p>
              Follow MediHome for health tips, offers, and service updates. Open{" "}
              <a href="#social">Social Media</a> for ready captions and campaign
              links.
            </p>
            <SocialLinks className="contact-social" showHandles />
          </section>

          <form className="service-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="contact-name">
                Your name <span>*</span>
              </label>
              <input
                id="contact-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Full name"
                {...noContactNameProps}
              />
              {errors.name ? <small>{errors.name}</small> : null}
            </div>
            <div className="field">
              <label htmlFor="contact-mobile">
                Mobile <span>*</span>
              </label>
              <input
                id="contact-mobile"
                name="mobile"
                maxLength="10"
                value={form.mobile}
                onChange={handleChange}
                placeholder="10-digit mobile"
                {...noContactMobileProps}
              />
              {errors.mobile ? <small>{errors.mobile}</small> : null}
            </div>
            <div className="field full">
              <label htmlFor="contact-message">
                Message <span>*</span>
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows="3"
                value={form.message}
                onChange={handleChange}
                placeholder="Order ID, booking ID, or how we can help"
              />
              {errors.message ? <small>{errors.message}</small> : null}
            </div>
            <button type="submit" className="service-submit">
              Send on WhatsApp
            </button>
          </form>
          <p className="info-footnote">
            After an order or visit is complete, use the{" "}
            <a href="#feedback">feedback form</a> or read{" "}
            <a href="#reviews">reviews</a>.
          </p>
        </div>
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
.info-stack{max-width:760px;margin:0 auto}
.info-panel{background:#fff;border:1px solid #e4ecef;border-radius:12px;padding:14px 16px;margin-bottom:10px}
.contact-details{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.contact-details h2{margin:0 0 4px;font-size:12px;font-weight:700;color:#5d7180}
.contact-details p{margin:0;font-size:14px}
.contact-details a{color:#1a6b7a;font-weight:700;text-decoration:none}
.service-form{max-width:760px;margin:0 auto;padding:14px;background:#fff;border:1px solid #e4ecef;border-radius:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}
.service-form .field{display:flex;flex-direction:column;min-width:0}
.service-form .field.full{grid-column:1/-1}
.service-form label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.service-form label span{color:#d84b4b}
.service-form input,.service-form select,.service-form textarea{width:100%;box-sizing:border-box;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;outline:none;height:38px;min-height:38px;background:#fff}
.service-form textarea{height:auto;min-height:72px;resize:vertical}
.service-form input:focus,.service-form select:focus,.service-form textarea:focus{border-color:#1a6b7a}
.service-form small{margin-top:4px;color:#d84b4b;font-size:12px}
.service-submit{grid-column:1/-1;border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:700;min-height:40px;cursor:pointer;font-family:inherit}
.info-footnote{max-width:760px;margin:12px auto 0;color:#5d7180;font-size:13px}
.info-footnote a{color:#1a6b7a;font-weight:700;text-decoration:none}
.social-panel p{margin:0 0 10px;color:#5d7180;font-size:13px}
.social-panel p a{color:#1a6b7a;font-weight:700;text-decoration:none}
.contact-social{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.contact-social a{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e4ecef;border-radius:8px;color:#1a6b7a;font-size:13px;font-weight:700;text-decoration:none;background:#f7fbfe}
.contact-social a:hover{border-color:#1a6b7a}
.contact-social svg{width:18px;height:18px;flex:0 0 18px}
@media (max-width:800px){.service-page{padding:14px}.service-form,.contact-details,.contact-social{grid-template-columns:1fr}}
`;

export default Contact;
