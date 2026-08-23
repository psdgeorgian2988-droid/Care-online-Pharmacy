import { pinLocationForDisplay } from "./pinLocation";

function PinGpsBlock({ record, compact = false, showPinText = true }) {
  const loc = pinLocationForDisplay(record);
  if (!loc.pin) return null;

  return (
    <div className={`pin-gps-block${compact ? " is-compact" : ""}`}>
      {showPinText ? (
        <p className="pin-gps-meta">
          <strong>PIN {loc.pin}</strong>
          {loc.locality ? ` · ${loc.locality}` : ""}
          {Number.isFinite(loc.lat) && Number.isFinite(loc.lng)
            ? ` · ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`
            : " · GPS via PIN"}
        </p>
      ) : null}
      <a
        className="pin-gps-link"
        href={loc.mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open map
      </a>
      {!compact && loc.embedUrl ? (
        <iframe
          className="pin-gps-embed"
          title={`Map for PIN ${loc.pin}`}
          src={loc.embedUrl}
          loading="lazy"
        />
      ) : null}
    </div>
  );
}

export default PinGpsBlock;
