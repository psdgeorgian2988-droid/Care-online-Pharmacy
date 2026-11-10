import HomeServiceCatalog from "./HomeServiceCatalog";

/** Labs tab: laboratory partners only. Radiology opens from its own tab. */
export default function LabsHub() {
  return (
    <div className="app-home is-fill is-account labs-hub">
      <HomeServiceCatalog sectionKeys={["lab"]} />
    </div>
  );
}
