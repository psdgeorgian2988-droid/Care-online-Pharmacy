import { useMemo, useState } from "react";
import {
  loadReviews,
  reviewStats,
  REVIEW_SERVICES,
  serviceLabel,
} from "./reviewStore";

function starText(rating) {
  const n = Math.max(1, Math.min(5, Number(rating) || 0));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function Reviews() {
  const reviews = useMemo(() => loadReviews(), []);
  const stats = reviewStats(reviews);
  const [filter, setFilter] = useState("all");
  const visible =
    filter === "all"
      ? reviews
      : reviews.filter((row) => row.service === filter);

  return (
    <>
      <style>{styles}</style>
      <div className="service-page info-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">Patient reviews</span>
            <h1>What MediHome customers say</h1>
            <p>
              {stats.count
                ? `${stats.average} / 5 from ${stats.count} review${
                    stats.count === 1 ? "" : "s"
                  } on this device.`
                : "No reviews yet. Be the first to share feedback."}
            </p>
          </div>
        </section>

        <div className="review-toolbar">
          <div className="review-filters" role="tablist" aria-label="Filter reviews">
            <button
              type="button"
              className={filter === "all" ? "is-on" : undefined}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            {REVIEW_SERVICES.map((item) => (
              <button
                key={item.value}
                type="button"
                className={filter === item.value ? "is-on" : undefined}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <a className="review-write" href="#feedback">
            Write a review
          </a>
        </div>

        {visible.length === 0 ? (
          <p className="info-footnote">No reviews in this category yet.</p>
        ) : (
          <div className="review-list">
            {visible.map((row) => (
              <article className="review-card" key={row.id}>
                <header>
                  <div>
                    <h2>{row.name}</h2>
                    <p>
                      {serviceLabel(row.service)}
                      {row.referenceId ? ` · ${row.referenceId}` : ""}
                    </p>
                  </div>
                  <span className="review-stars" aria-label={`${row.rating} out of 5`}>
                    {starText(row.rating)}
                  </span>
                </header>
                <p>{row.comment}</p>
                <time dateTime={String(row.createdAtMs || "")}>{row.createdAt}</time>
              </article>
            ))}
          </div>
        )}
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
.review-toolbar{max-width:760px;margin:0 auto 12px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
.review-filters{display:flex;flex-wrap:wrap;gap:6px}
.review-filters button{border:1px solid #d7e2e9;background:#fff;color:#34546b;border-radius:999px;padding:6px 10px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
.review-filters button.is-on{background:#1a6b7a;border-color:#1a6b7a;color:#fff}
.review-write{display:inline-flex;align-items:center;min-height:36px;padding:0 14px;border-radius:8px;background:#1a6b7a;color:#fff;font-size:13px;font-weight:700;text-decoration:none}
.review-list{max-width:760px;margin:0 auto;display:grid;gap:10px}
.review-card{background:#fff;border:1px solid #e4ecef;border-radius:12px;padding:14px 16px}
.review-card header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px}
.review-card h2{margin:0;font-size:16px}
.review-card header p{margin:4px 0 0;color:#5d7180;font-size:12px}
.review-stars{color:#e2a30b;letter-spacing:1px;font-size:14px;white-space:nowrap}
.review-card > p{margin:0;color:#34546b;font-size:14px;line-height:1.5}
.review-card time{display:block;margin-top:8px;color:#7a8b96;font-size:12px}
.info-footnote{max-width:760px;margin:8px auto 0;color:#5d7180;font-size:13px}
@media (max-width:800px){.service-page{padding:14px}}
`;

export default Reviews;
