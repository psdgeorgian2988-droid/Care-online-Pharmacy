import HomeServiceCatalog from "./HomeServiceCatalog";

/** Bottom-nav Labs: Lab Tests + Radiology card grids (same look as home). */
export default function LabsHub() {
  return (
    <div className="app-home is-fill is-account labs-hub">
      <HomeServiceCatalog sectionKeys={["lab", "radiology"]} />
    </div>
  );
}
