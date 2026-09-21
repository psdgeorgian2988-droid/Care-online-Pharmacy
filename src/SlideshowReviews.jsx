const SLIDESHOW_REVIEWS = [
  {
    name: "Priya Sharma",
    city: "Gurgaon",
    stars: 5,
    text: "Medicines arrived the same evening. Booking was so simple.",
  },
  {
    name: "Rajesh Kumar",
    city: "Delhi",
    stars: 5,
    text: "Nurse visit for my father was punctual and very caring.",
  },
  {
    name: "Anita Verma",
    city: "Noida",
    stars: 5,
    text: "Lab sample collected at home. Reports came next morning.",
  },
  {
    name: "Suresh Patel",
    city: "Faridabad",
    stars: 5,
    text: "Physiotherapy at home helped my mother walk confidently again.",
  },
  {
    name: "Meena Iyer",
    city: "Ghaziabad",
    stars: 5,
    text: "Caretaker support for my mother-in-law has been a blessing.",
  },
  {
    name: "Amit Joshi",
    city: "Delhi",
    stars: 5,
    text: "Ambulance reached quickly and the team stayed calm throughout.",
  },
  {
    name: "Kavita Reddy",
    city: "Gurgaon",
    stars: 5,
    text: "Ordered medicines for diabetes. Packaging and timing were perfect.",
  },
  {
    name: "Vikram Singh",
    city: "Noida",
    stars: 5,
    text: "Radiology booking was clear and the centre visit was smooth.",
  },
  {
    name: "Sunita Nair",
    city: "Delhi",
    stars: 5,
    text: "Vaccination nurse was gentle with my child. Highly recommend.",
  },
  {
    name: "Fatima Khan",
    city: "Faridabad",
    stars: 5,
    text: "Home Care team explained every step. Felt safe and supported.",
  },
];

function starsLabel(count) {
  return "★".repeat(count) + "☆".repeat(Math.max(0, 5 - count));
}

function ReviewBubble({ review }) {
  return (
    <article className="slideshow-review-bubble">
      <p className="slideshow-review-stars" aria-label={`${review.stars} out of 5 stars`}>
        {starsLabel(review.stars)}
      </p>
      <p className="slideshow-review-text">“{review.text}”</p>
      <p className="slideshow-review-name">
        {review.name}
        <span> · {review.city}</span>
      </p>
    </article>
  );
}

/** Infinite horizontal review strip for the welcome slideshow margin. */
export default function SlideshowReviews() {
  const loop = [...SLIDESHOW_REVIEWS, ...SLIDESHOW_REVIEWS];

  return (
    <div className="slideshow-reviews" aria-label="Customer ratings and reviews">
      <div className="slideshow-reviews-track">
        {loop.map((review, index) => (
          <ReviewBubble key={`${review.name}-${index}`} review={review} />
        ))}
      </div>
    </div>
  );
}
