export default function BackToHome({ show = true } = {}) {
  if (!show) return null;

  return (
    <div className="back-to-home-bar">
      <a className="back-to-home-btn" href="#home">
        ← Back to Home
      </a>
    </div>
  );
}
