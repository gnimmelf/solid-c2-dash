import { Title } from "@solidjs/meta";
import MapView from "../../components/map-view";

export default function MapViewPage() {
  return (
    <main style={{ display: "flex", "min-height": 0, flex: 1 }}>
      <Title>Map View</Title>
      <MapView />
    </main>
  );
}