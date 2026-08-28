function About() {
  return (
    <>
      <style>{styles}</style>
      <div className="service-page info-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">About MediHome</span>
            <h1>Trusted Chronic Care At Your Doorstep</h1>
            <p>
              Affordable medicines, diagnostics, Home Care, psychologist
              consultation, and ambulance support for patients across Delhi NCR.
            </p>
          </div>
        </section>

        <div className="info-stack">
          <section className="info-panel">
            <h2>Vision</h2>
            <p>
              To be the neighbourhood health partner families rely on for
              long-term conditions — not only a one-time order.
            </p>
          </section>

          <section className="info-panel">
            <h2>Mission</h2>
            <p>
              Reliable delivery, better medicine compliance, and trusted
              laboratory and radiology bookings, with human support on phone
              and WhatsApp.
            </p>
          </section>

          <section className="info-panel">
            <h2>What We Do</h2>
            <ul>
              <li>Generic and MediHome-brand medicines with cash on delivery.</li>
              <li>Home sample collection and partner-centre radiology slots.</li>
              <li>Nurse, Caregiver, and Physiotherapy visits at Home.</li>
              <li>Vaccination on the Government of India schedule, with a saved record and due-date reminders.</li>
              <li>Psychologist consultation on video or as a home visit.</li>
              <li>Step-down recovery centres for post-ICU and post-surgery care.</li>
              <li>Emergency and planned ambulance pickup.</li>
              <li>A simple place to keep lab PDFs on this device.</li>
            </ul>
          </section>

          <p className="info-footnote">
            Questions? Open <a href="#contact">Contact Us</a> for phone, WhatsApp,
            and social handles. Read{" "}
            <a href="#reviews">patient reviews</a> or{" "}
            <a href="#feedback">share feedback</a>.
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
.info-panel h2{margin:0 0 6px;font-size:16px}
.info-panel p,.info-panel li{margin:0;color:#34546b;font-size:14px;line-height:1.5}
.info-panel ul{margin:8px 0 0;padding-left:18px}
.info-panel li{margin-bottom:6px}
.info-panel li:last-child{margin-bottom:0}
.info-footnote{margin:4px 2px 0;color:#5d7180;font-size:13px}
.info-footnote a{color:#1a6b7a;font-weight:700;text-decoration:none}
@media (max-width:800px){.service-page{padding:14px}}
`;

export default About;
