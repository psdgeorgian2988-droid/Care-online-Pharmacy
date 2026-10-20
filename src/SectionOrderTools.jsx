import HeaderCart from "./HeaderCart.jsx";
import HomeCurrentStatus from "./HomeCurrentStatus.jsx";
import HomePrescriptionUpload from "./HomePrescriptionUpload";

export const SECTION_ORDER_KINDS = {
  medicine: ["medicine", "cart"],
  lab: ["lab"],
  radiology: ["radiology"],
  homecare: ["homecare"],
  vaccination: ["vaccination", "homecare"],
  doctor: ["doctor"],
  psychologist: ["psychologist"],
  stepdown: ["stepdown"],
  ambulance: ["ambulance"],
};

export const SECTION_UPLOAD_RX = new Set(["medicine", "lab", "radiology", "stepdown"]);

export default function SectionOrderTools({
  kinds,
  showUpload = false,
  showCart = false,
  className = "",
} = {}) {
  if (!showUpload && !showCart) {
    return <HomeCurrentStatus kinds={kinds} />;
  }

  return (
    <div
      className={`home-rx-cart-row section-order-tools${className ? ` ${className}` : ""}`}
    >
      <HomeCurrentStatus kinds={kinds} bare />
      {showUpload ? <HomePrescriptionUpload /> : null}
      {showCart ? <HeaderCart className="home-rx-cart" /> : null}
    </div>
  );
}
