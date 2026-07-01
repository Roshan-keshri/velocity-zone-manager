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
import { Feature } from "ol";
import Polygon from "ol/geom/Polygon.js";
import { Zone } from "../types";

type ZoneMapProps = {
  zones: Zone[];
  onCreateZone: (payload: {
    name: string;
    geometry: any;
    zone_type: string;
    mower_count: number;
    status: string;
  }) => Promise<void>;
  onUpdateZone: (
    zoneId: number,
    payload: Partial<{
      name: string;
      geometry: any;
      zone_type: string;
      mower_count: number;
      status: string;
    }>
  ) => Promise<void>;
  onDeleteZone: (zoneId: number) => Promise<void>;
};

const zoneTypeColor: Record<string, string> = {
  Fairway: "#22c55e",
  Rough: "#eab308",
  Perimeter: "#3b82f6",
  Exclusion: "#ef4444"
};

export default function ZoneMap({ zones, onCreateZone, onUpdateZone, onDeleteZone }: ZoneMapProps) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource>(new VectorSource());
  const drawRef = useRef<Draw | null>(null);
  const modifyRef = useRef<Modify | null>(null);
  const selectRef = useRef<Select | null>(null);

  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [mowerCount, setMowerCount] = useState(1);
  const [zoneType, setZoneType] = useState<string>("Fairway");
  const [status, setStatus] = useState<string>("Active");
  const [isDrawing, setIsDrawing] = useState(false);

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === selectedZoneId) || null,
    [zones, selectedZoneId]
  );

  const zoneStyle = (feature: any) => {
    const typeValue = String(feature.get("zone_type") || "Fairway");
    const color = zoneTypeColor[typeValue] || zoneTypeColor.Fairway;
    const name = String(feature.get("name") || "Zone");

    return new Style({
      stroke: new Stroke({ color, width: 2 }),
      fill: new Fill({ color: `${color}33` }),
      text: new Text({
        text: name,
        fill: new Fill({ color: "#0f172a" }),
        stroke: new Stroke({ color: "#ffffff", width: 3 })
      })
    });
  };

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;

    const baseLayer = new TileLayer({ source: new OSM() });
    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
      style: zoneStyle
    });

    const map = new Map({
      target: mapEl.current,
      layers: [baseLayer, vectorLayer],
      view: new View({
        center: fromLonLat([77.5946, 12.9716]),
        zoom: 11
      })
    });

    const modify = new Modify({ source: vectorSourceRef.current });
    map.addInteraction(modify);
    modifyRef.current = modify;

    modify.on("modifyend", async (event) => {
      const feature = event.features.item(0);
      const zoneId = Number(feature.get("zoneId"));
      const geometry = feature.getGeometry() as Polygon;
      const coords = geometry.getCoordinates();
      await onUpdateZone(zoneId, {
        geometry: { type: "Polygon", coordinates: coords as number[][][] }
      });
    });

    const select = new Select({ condition: click });
    map.addInteraction(select);
    selectRef.current = select;

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
      const feature = new GeoJSON().readFeature({
        type: "Feature",
        geometry: zone.geometry,
        properties: {
          zoneId: zone.id,
          name: zone.name,
          zone_type: zone.zone_type
        }
      });
      feature.set("zoneId", zone.id);
      feature.set("name", zone.name);
      feature.set("zone_type", zone.zone_type);
      source.addFeature(feature);
    });
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
      type: "Polygon"
    });
    drawRef.current = draw;
    mapRef.current.addInteraction(draw);
    setIsDrawing(true);

    draw.on("drawend", async (event) => {
      const geometry = event.feature.getGeometry() as Polygon;
      const coords = geometry.getCoordinates();
      mapRef.current?.removeInteraction(draw);
      drawRef.current = null;
      setIsDrawing(false);

      const name = window.prompt("Zone name?")?.trim() || `Zone ${zones.length + 1}`;
      const mowers = Number(window.prompt("Mower count?", "1") || "1");
      const typeStr = (window.prompt("Zone Type: Fairway | Rough | Perimeter | Exclusion", "Fairway") || "Fairway");

      await onCreateZone({
        name,
        zone_type: ["Fairway", "Rough", "Perimeter", "Exclusion"].includes(typeStr) ? typeStr : "Fairway",
        mower_count: Number.isFinite(mowers) && mowers > 0 ? mowers : 1,
        status: "Active",
        geometry: { type: "Polygon", coordinates: coords as number[][][] }
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
      status
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
                onChange={(e) => setZoneType(e.target.value)}
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
                onChange={(e) => setStatus(e.target.value)}
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