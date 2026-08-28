import { useState } from "react";
import SocialLinks from "./SocialLinks";
import { shareMediHome } from "./socialHandlers";
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
  const [shareNote, setShareNote] = useState("");

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
            <h2>Follow MediHome</h2>
            <p>
              Official handles for health tips, offers, and service updates.
              Tap a card to open that page, or copy the handle.
            </p>
            <SocialLinks className="contact-social" layout="cards" />
            <div className="social-share-row">
              <button
                type="button"
                className="social-share-btn"
                onClick={async () => {
                  try {
                    const result = await shareMediHome();
                    setShareNote(
                      result === "shared"
                        ? "Opened the share sheet."
                        : result === "copied"
                          ? "Copied the MediHome link."
                          : "Copy a handle from the cards above."
                    );
                  } catch {
                    setShareNote("Copy a handle from the cards above.");
                  }
                }}
              >
                Share MediHome
              </button>
              {shareNote ? <small>{shareNote}</small> : null}
            </div>
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
.social-panel h2{margin:0 0 4px;font-size:16px;color:#123b59}
.social-panel p{margin:0 0 12px;color:#5d7180;font-size:13px;line-height:1.4}
.contact-social{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.contact-social .social-handle-card{display:flex;align-items:center;gap:8px;min-height:72px;padding:10px 12px;border:1px solid #e4ecef;border-radius:12px;background:#f7fbfe;color:#143246}
.contact-social .social-handle-card:hover{border-color:#1a6b7a;background:#fff}
.contact-social .social-handle-open{display:flex;align-items:center;gap:10px;min-width:0;flex:1;color:inherit;text-decoration:none}
.contact-social .social-copy-handle{flex:0 0 auto;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#1a6b7a;font:inherit;font-size:11px;font-weight:800;min-height:32px;padding:0 8px;cursor:pointer}
.contact-social .social-handle-icon{display:flex;align-items:center;justify-content:center;width:40px;height:40px;flex:0 0 40px;border-radius:10px;background:#e8f4f6;color:#1a6b7a}
.social-share-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:12px}
.social-share-btn{border:none;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-size:14px;font-weight:700;min-height:40px;padding:0 16px;cursor:pointer}
.social-share-row small{color:#1a6b7a;font-size:13px;font-weight:700}
.contact-social .social-handle-icon svg{width:20px;height:20px}
.contact-social .social-handle-copy{display:flex;flex-direction:column;gap:2px;min-width:0}
.contact-social .social-handle-copy strong{font-size:13px;font-weight:800;color:#123b59}
.contact-social .social-handle-copy em{font-style:normal;font-size:13px;font-weight:700;color:#1a6b7a}
.contact-social .social-handle-card[data-network="instagram"] .social-handle-icon{background:#fdeef6;color:#c13584}
.contact-social .social-handle-card[data-network="facebook"] .social-handle-icon{background:#e8f1fb;color:#1877f2}
.contact-social .social-handle-card[data-network="youtube"] .social-handle-icon{background:#fdecec;color:#e11d2e}
.contact-social .social-handle-card[data-network="linkedin"] .social-handle-icon{background:#e8f3f8;color:#0a66c2}
.contact-social .social-handle-card[data-network="x"] .social-handle-icon{background:#ececec;color:#111}
.contact-social .social-handle-card[data-network="whatsapp"] .social-handle-icon{background:#e8f8ee;color:#1fa855}
@media (max-width:800px){.service-page{padding:14px}.service-form,.contact-details,.contact-social{grid-template-columns:1fr}}
`;

export default Contact;
