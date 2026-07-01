import { useEffect, useMemo, useRef, useState } from "react";
import "ol/ol.css";
import Map from "ol/Map.js";
import View from "ol/View.js";
import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector.js";
import VectorSource from "ol/source/Vector.js";
import OSM from "ol/source/OSM.js";
import Draw from "ol/interaction/Draw.js";
import Modify from "ol/interaction/Modify.js";
import Select from "ol/interaction/Select.js";
import GeoJSON from "ol/format/GeoJSON.js";
import { Fill, Stroke, Style, Text } from "ol/style.js";
import { fromLonLat } from "ol/proj.js";
import { click } from "ol/events/condition.js";
import Polygon from "ol/geom/Polygon.js";
import { Zone, ZoneStatus, ZoneType } from "../types";

type ZoneMapProps = {
  zones: Zone[];
  onCreateZone: (payload: {
    name: string;
    geometry: GeoJSON.Polygon;
    zone_type: ZoneType;
    mower_count: number;
    status: ZoneStatus;
  }) => Promise<void>;
  onUpdateZone: (
    zoneId: number,
    payload: Partial<{
      name: string;
      geometry: GeoJSON.Polygon;
      zone_type: ZoneType;
      mower_count: number;
      status: ZoneStatus;
    }>
  ) => Promise<void>;
  onDeleteZone: (zoneId: number) => Promise<void>;
};

const geojsonFormat = new GeoJSON();

const zoneTypeColor: Record<ZoneType, string> = {
  Fairway: "#22c55e",
  Rough: "#eab308",
  Perimeter: "#3b82f6",
  Exclusion: "#ef4444",
};

export default function ZoneMap({
  zones,
  onCreateZone,
  onUpdateZone,
  onDeleteZone,
}: ZoneMapProps) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource>(new VectorSource());
  const drawRef = useRef<Draw | null>(null);

  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [mowerCount, setMowerCount] = useState(1);
  const [zoneType, setZoneType] = useState<ZoneType>("Fairway");
  const [status, setStatus] = useState<ZoneStatus>("Active");
  const [isDrawing, setIsDrawing] = useState(false);

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === selectedZoneId) || null,
    [zones, selectedZoneId]
  );

  const zoneStyle = (feature: any) => {
    const typeValue = (feature.get("zone_type") || "Fairway") as ZoneType;
    const isUnderstaffed = Boolean(feature.get("understaffed"));
    const color = zoneTypeColor[typeValue] || zoneTypeColor.Fairway;
    const name = String(feature.get("name") || "Zone");
    const label = isUnderstaffed ? `⚠ ${name}` : name;

    return new Style({
      stroke: new Stroke({
        color: isUnderstaffed ? "#dc2626" : color,
        width: isUnderstaffed ? 3 : 2,
      }),
      fill: new Fill({
        color: isUnderstaffed ? "rgba(220,38,38,0.28)" : `${color}33`,
      }),
      text: new Text({
        text: label,
        fill: new Fill({ color: "#0f172a" }),
        stroke: new Stroke({ color: "#ffffff", width: 3 }),
      }),
    });
  };

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;

    const baseLayer = new TileLayer({ source: new OSM() });
    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
      style: zoneStyle,
    });

    const map = new Map({
      target: mapEl.current,
      layers: [baseLayer, vectorLayer],
      view: new View({
        // Default India center if no zones
        center: fromLonLat([78.9629, 20.5937]),
        zoom: 5,
      }),
    });

    const modify = new Modify({ source: vectorSourceRef.current });
    map.addInteraction(modify);

    modify.on("modifyend", async (event) => {
      const feature = event.features.item(0);
      const zoneId = Number(feature.get("zoneId"));
      const geometry = feature.getGeometry() as Polygon;

      // write geometry in EPSG:4326 for backend
      const geo = geojsonFormat.writeGeometryObject(geometry, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }) as GeoJSON.Polygon;

      await onUpdateZone(zoneId, { geometry: geo });
    });

    const select = new Select({ condition: click });
    map.addInteraction(select);

    select.on("select", (event) => {
      const feature = event.selected[0];
      if (!feature) {
        setSelectedZoneId(null);
        return;
      }
      const zoneId = Number(feature.get("zoneId"));
      setSelectedZoneId(zoneId);
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, [onUpdateZone]);

  useEffect(() => {
    const source = vectorSourceRef.current;
    source.clear();

    zones.forEach((zone) => {
      const feature = geojsonFormat.readFeature(
        {
          type: "Feature",
          geometry: zone.geometry,
          properties: {
            zoneId: zone.id,
            name: zone.name,
            zone_type: zone.zone_type,
            understaffed: zone.understaffed,
          },
        },
        {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        }
      );
      source.addFeature(feature);
    });

    // Required: zoom to extent on load when zones exist, else India default
    const map = mapRef.current;
    if (!map) return;

    if (zones.length > 0 && source.getFeatures().length > 0) {
      const extent = source.getExtent();
      map.getView().fit(extent, {
        padding: [40, 40, 40, 40],
        maxZoom: 17,
        duration: 300,
      });
    } else {
      map.getView().setCenter(fromLonLat([78.9629, 20.5937]));
      map.getView().setZoom(5);
    }
  }, [zones]);

  useEffect(() => {
    if (!selectedZone) return;
    setZoneName(selectedZone.name);
    setMowerCount(selectedZone.mower_count);
    setZoneType(selectedZone.zone_type);
    setStatus(selectedZone.status);
  }, [selectedZone]);

  const startDraw = () => {
    if (!mapRef.current || drawRef.current) return;

    const draw = new Draw({
      source: vectorSourceRef.current,
      type: "Polygon",
    });
    drawRef.current = draw;
    mapRef.current.addInteraction(draw);
    setIsDrawing(true);

    draw.on("drawend", async (event) => {
      const geometry = event.feature.getGeometry() as Polygon;
      mapRef.current?.removeInteraction(draw);
      drawRef.current = null;
      setIsDrawing(false);

      const nameInput = window.prompt("Zone name?", `Zone ${zones.length + 1}`) || "";
      const mowerInput = window.prompt("Mower count?", "1") || "1";
      const typeInput = (window.prompt(
        "Zone Type: Fairway | Rough | Perimeter | Exclusion",
        "Fairway"
      ) || "Fairway") as ZoneType;
      const statusInput = (window.prompt("Status: Active | Inactive", "Active") || "Active") as ZoneStatus;

      const geo = geojsonFormat.writeGeometryObject(geometry, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }) as GeoJSON.Polygon;

      const validType: ZoneType = ["Fairway", "Rough", "Perimeter", "Exclusion"].includes(typeInput)
        ? typeInput
        : "Fairway";
      const validStatus: ZoneStatus = statusInput === "Inactive" ? "Inactive" : "Active";
      const mowers = Number(mowerInput);

      await onCreateZone({
        name: nameInput.trim() || `Zone ${zones.length + 1}`,
        zone_type: validType,
        mower_count: Number.isFinite(mowers) ? mowers : 1, // backend enforces >=1 with exact message
        status: validStatus,
        geometry: geo,
      });
    });
  };

  const cancelDraw = () => {
    if (!mapRef.current || !drawRef.current) return;
    mapRef.current.removeInteraction(drawRef.current);
    drawRef.current = null;
    setIsDrawing(false);
  };

  const saveSelectedZone = async () => {
    if (!selectedZone) return;
    await onUpdateZone(selectedZone.id, {
      name: zoneName.trim() || selectedZone.name,
      mower_count: mowerCount,
      zone_type: zoneType,
      status,
    });
  };

  const deleteSelectedZone = async () => {
    if (!selectedZone) return;
    const ok = window.confirm(`Delete zone "${selectedZone.name}"?`);
    if (!ok) return;
    await onDeleteZone(selectedZone.id);
    setSelectedZoneId(null);
  };

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="rounded-xl bg-white p-3 shadow-sm">
        <div className="mb-3 flex gap-2">
          {!isDrawing ? (
            <button onClick={startDraw} className="rounded bg-slate-800 px-3 py-2 text-sm text-white">
              Draw Zone
            </button>
          ) : (
            <button onClick={cancelDraw} className="rounded border border-slate-300 px-3 py-2 text-sm">
              Cancel Draw
            </button>
          )}
        </div>
        <div ref={mapEl} className="h-[520px] w-full rounded border border-slate-200" />
      </div>

      <aside className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Zone Editor</h3>
        {!selectedZone ? (
          <p className="mt-2 text-sm text-slate-600">Select a zone on map to edit.</p>
        ) : (
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Mower Count</label>
              <input
                type="number"
                min={1}
                value={mowerCount}
                onChange={(e) => setMowerCount(Number(e.target.value))}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Zone Type</label>
              <select
                value={zoneType}
                onChange={(e) => setZoneType(e.target.value as ZoneType)}
                className="w-full rounded border border-slate-300 px-3 py-2"
              >
                <option value="Fairway">Fairway</option>
                <option value="Rough">Rough</option>
                <option value="Perimeter">Perimeter</option>
                <option value="Exclusion">Exclusion</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ZoneStatus)}
                className="w-full rounded border border-slate-300 px-3 py-2"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={saveSelectedZone} className="rounded bg-slate-800 px-3 py-2 text-sm text-white">
                Save
              </button>
              <button
                onClick={deleteSelectedZone}
                className="rounded border border-red-300 px-3 py-2 text-sm text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}