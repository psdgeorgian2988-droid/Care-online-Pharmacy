import { useState } from "react";
import SocialLinks from "./SocialLinks";
import { SITE, SOCIAL } from "./siteMeta";

const HASHTAGS =
  "#MediHome #DelhiNCR #MedicinesAtHome #HomeCare #LabTests #ChronicCare";

const CAMPAIGNS = [
  {
    id: "medicines",
    title: "Medicines At Your Doorstep",
    href: "#medicine-search",
    platforms: "Instagram · Facebook · WhatsApp",
    caption: `Order genuine medicines from a GMP-certified manufacturer at an affordable price. Cash on delivery and live PIN tracking.

Search your brand, compare with MediHome, and order from home.

${SITE.url}/#medicine-search
${HASHTAGS}`,
  },
  {
    id: "labs",
    title: "Lab Tests At Home",
    href: "#labs",
    platforms: "Facebook · Instagram · LinkedIn",
    caption: `Home sample collection / booking from your trusted lab.

Book laboratory tests or radiology from MediHome. Reports stay with you for clinic visits.

${SITE.url}/#labs
${HASHTAGS} #Diagnostics`,
  },
  {
    id: "homecare",
    title: "Nurse, Caregiver, Physiotherapy",
    href: "#homecare",
    platforms: "Instagram · Facebook · YouTube",
    caption: `Nurse, Caregiver or Physiotherapy at Home.

Book a visit when a parent or patient needs skilled help without a hospital stay.

${SITE.url}/#homecare
${HASHTAGS}`,
  },
  {
    id: "ambulance",
    title: "Emergency Or Planned Transfer",
    href: "#ambulance",
    platforms: "Facebook · WhatsApp · X",
    caption: `Emergency or Planned Transfer in Delhi NCR.

Request an ambulance with MediHome. Track the unit live toward your PIN.

${SITE.url}/#ambulance
${HASHTAGS} #Ambulance`,
  },
  {
    id: "education",
    title: "Health Education",
    href: "#education",
    platforms: "YouTube · LinkedIn · Instagram",
    caption: `Short, Plain-Language notes for Patients. Attend a webinar or attempt a quiz. Earn MediHome points and refer family and friends.

${SITE.url}/#education
${HASHTAGS} #HealthEducation`,
  },
  {
    id: "about",
    title: "Why MediHome",
    href: "#about",
    platforms: "LinkedIn · Facebook · X",
    caption: `MediHome is your complete health partner at your doorstep — medicines, diagnostics, Home Care, step-down recovery, and ambulance in Delhi NCR.

${SITE.url}/#about
${HASHTAGS}`,
  },
];

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const area = document.createElement("textarea");
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
  return Promise.resolve();
}

function Social() {
  const [copied, setCopied] = useState("");

  const handleCopy = (id, text) => {
    copyText(text).then(() => {
      setCopied(id);
      window.setTimeout(() => setCopied(""), 1800);
    });
  };

  return (
    <>
      <style>{styles}</style>
      <div className="service-page info-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">Social Media Marketing</span>
            <h1>MediHome On Social Media</h1>
            <p>
              Follow, share, and post these ready captions. Each card links to a
              page you can use in ads and stories.
            </p>
          </div>
        </section>

        <div className="info-stack">
          <section className="info-panel">
            <h2>Official Pages</h2>
            <p>
              Open Instagram, Facebook, YouTube, LinkedIn, X, or WhatsApp. Use
              the same handles on every campaign so patients recognise MediHome.
            </p>
            <SocialLinks className="social-page-links" showHandles />
          </section>

          <div className="social-grid">
            {SOCIAL.map((item) => (
              <a
                key={item.id}
                className="social-channel-card"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>{item.label}</strong>
                <span>{item.handle}</span>
                <em>Open page</em>
              </a>
            ))}
          </div>

          <section className="info-panel">
            <h2>Campaign Posts</h2>
            <p>
              Copy a caption, paste it on the platform listed, and attach the
              page link. Hashtags are included.
            </p>
          </section>

          {CAMPAIGNS.map((campaign) => {
            const fullUrl = `${SITE.url}/${campaign.href}`;
            return (
              <article key={campaign.id} className="info-panel social-campaign">
                <h2>{campaign.title}</h2>
                <p className="social-platforms">{campaign.platforms}</p>
                <pre>{campaign.caption}</pre>
                <div className="social-campaign-actions">
                  <button
                    type="button"
                    onClick={() => handleCopy(campaign.id, campaign.caption)}
                  >
                    {copied === campaign.id ? "Copied" : "Copy caption"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(`${campaign.id}-url`, fullUrl)}
                  >
                    {copied === `${campaign.id}-url` ? "Copied" : "Copy page link"}
                  </button>
                  <a href={campaign.href}>Open page</a>
                </div>
              </article>
            );
          })}

          <p className="info-footnote">
            Need help posting?{" "}
            <a href="#contact">Contact customer care</a> or message WhatsApp.
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
.info-panel p{margin:0;color:#34546b;font-size:14px;line-height:1.5}
.social-page-links{margin-top:12px;display:flex;flex-wrap:wrap;gap:10px}
.social-page-links a{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:6px 12px;border:1px solid #d7e2e9;border-radius:10px;color:#143246;text-decoration:none;font-size:13px;font-weight:700}
.social-page-links svg{width:18px;height:18px}
.social-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:10px}
.social-channel-card{display:flex;flex-direction:column;gap:4px;padding:14px 16px;border:1px solid #e4ecef;border-radius:12px;background:#fff;text-decoration:none;color:#143246}
.social-channel-card strong{font-size:15px}
.social-channel-card span{color:#1a6b7a;font-size:13px;font-weight:700}
.social-channel-card em{margin-top:4px;font-style:normal;color:#5d7180;font-size:12px;font-weight:700}
.social-campaign pre{margin:10px 0;padding:10px 12px;border-radius:8px;background:#f7fafc;color:#34546b;font:inherit;font-size:13px;line-height:1.45;white-space:pre-wrap}
.social-platforms{margin:0 0 4px!important;color:#1a6b7a!important;font-size:12px!important;font-weight:800}
.social-campaign-actions{display:flex;flex-wrap:wrap;gap:8px}
.social-campaign-actions button,.social-campaign-actions a{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:6px 12px;border-radius:9px;font:inherit;font-size:13px;font-weight:800;text-decoration:none;cursor:pointer}
.social-campaign-actions button{border:2px solid #0639b8;background:#0639b8;color:#fff}
.social-campaign-actions a{border:2px solid #1a6b7a;background:#fff;color:#1a6b7a}
.info-footnote{margin:4px 2px 0;color:#5d7180;font-size:13px}
.info-footnote a{color:#1a6b7a;font-weight:700;text-decoration:none}
@media (max-width:800px){.service-page{padding:14px}.social-grid{grid-template-columns:1fr}}
`;

export default Social;
