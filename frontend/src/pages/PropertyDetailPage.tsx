import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Upload, Map as MapIcon, Loader2, AlertCircle } from "lucide-react";
import ZoneMap from "../components/ZoneMap";
import { api } from "../api";
import { Property, Zone, ZoneSummary, GeoJSONFeatureCollection } from "../types";

export default function PropertyDetailPage() {
  const { propertyId } = useParams();
  const id = Number(propertyId);

  const [property, setProperty] = useState<Property | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [summary, setSummary] = useState<ZoneSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [propertyData, zoneData, summaryData] = await Promise.all([
        api.getProperty(id),
        api.getZones(id),
        api.getZoneSummary(id),
      ]);
      setProperty(propertyData);
      setZones(zoneData);
      setSummary(summaryData);
    } catch (err: any) {
      setError(err?.message || "Unable to load property details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    loadData();
  }, [id]);

  async function createZone(payload: {
    name: string;
    zone_type: string;
    mower_count: number;
    status: string;
    geometry: any;
  }) {
    setActionError("");
    try {
      await api.createZone(id, payload);
      await loadData();
    } catch (err: any) {
      setActionError(err?.message || "Failed to create zone");
    }
  }

  async function updateZone(
    zoneId: number,
    payload: Partial<{
      name: string;
      zone_type: string;
      mower_count: number;
      status: string;
      geometry: any;
    }>
  ) {
    setActionError("");
    try {
      await api.updateZone(id, zoneId, payload);
      await loadData();
    } catch (err: any) {
      setActionError(err?.message || "Failed to update zone");
    }
  }

  async function deleteZone(zoneId: number) {
    setActionError("");
    try {
      await api.deleteZone(id, zoneId);
      await loadData();
    } catch (err: any) {
      setActionError(err?.message || "Failed to delete zone");
    }
  }

  async function exportGeoJSON() {
    try {
      const geojson = await api.exportZones(id);
      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${property?.name || "zones"}.geojson`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setActionError(err?.message || "Failed to export GeoJSON.");
    }
  }

  async function importGeoJSON(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setActionError("");
    try {
      const text = await file.text();
      const geojson = JSON.parse(text) as GeoJSONFeatureCollection;
      await api.importZones(id, geojson);
      await loadData();
    } catch (err: any) {
      setActionError(err?.message || "Invalid GeoJSON file.");
    }

    event.target.value = "";
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Loading property blueprint...</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl flex items-center gap-3 border border-red-100 max-w-lg">
          <AlertCircle className="h-8 w-8 shrink-0" />
          <p className="font-semibold text-lg">{error || "Property not found."}</p>
        </div>
        <Link to="/properties" className="mt-6 text-blue-600 font-medium hover:underline flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Return to Properties
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link to="/properties" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors mb-3 bg-white px-3 py-1.5 rounded-full border border-slate-200 hover:border-blue-200">
            <ArrowLeft className="h-4 w-4" /> Back to Directory
          </Link>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">{property.name}</h1>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700 border border-blue-100">
              {property.type}
            </span>
            <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
              <MapIcon className="h-4 w-4" /> {property.total_acreage} Acres Total
            </span>
          </div>
          {property.notes && (
            <p className="mt-4 text-slate-600 bg-white p-4 rounded-xl border border-slate-200 shadow-sm max-w-3xl">
              <span className="font-semibold text-slate-800 block mb-1">Notes</span>
              {property.notes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow">
            <Upload className="h-5 w-5 text-blue-500" />
            Import Zones
            <input type="file" accept=".json,.geojson" className="hidden" onChange={importGeoJSON} />
          </label>
          <button
            onClick={exportGeoJSON}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow"
          >
            <Download className="h-5 w-5 text-green-400" />
            Export Data
          </button>
        </div>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="font-medium">{actionError}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Zones</p>
          <p className="text-3xl font-extrabold text-slate-900">{summary?.total_zones ?? 0}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Mappable Acreage</p>
          <p className="text-3xl font-extrabold text-slate-900">{summary?.total_acreage?.toFixed(2) ?? "0.00"}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Assigned Mowers</p>
          <p className="text-3xl font-extrabold text-slate-900">{summary?.total_mowers_assigned ?? 0}</p>
        </div>
        <div className={`rounded-2xl shadow-sm border p-5 ${summary?.understaffed_zones ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
          <p className={`text-sm font-semibold uppercase tracking-wider mb-1 ${summary?.understaffed_zones ? "text-red-600" : "text-slate-500"}`}>
            Understaffed Zones
          </p>
          <p className={`text-3xl font-extrabold ${summary?.understaffed_zones ? "text-red-700" : "text-slate-900"}`}>
            {summary?.understaffed_zones ?? 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col h-[650px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">Zone Registry</h2>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-semibold">{zones.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {zones.length === 0 ? (
              <p className="text-slate-500">No zones mapped yet.</p>
            ) : (
              zones.map((zone) => (
                <div
                  key={zone.id}
                  className={`rounded-xl border p-4 ${zone.understaffed ? "border-red-200 bg-red-50/50" : "border-slate-200 bg-white"}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-slate-900 text-lg">{zone.name}</h3>
                    {zone.understaffed && (
                      <span className="bg-red-100 border border-red-200 text-red-700 text-xs font-bold px-2 py-0.5 rounded-md">
                        Understaffed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    {zone.zone_type} • {zone.mower_count} mower(s) • {zone.acreage.toFixed(2)} acres • {zone.status}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2">
          <ZoneMap zones={zones} onCreateZone={createZone} onUpdateZone={updateZone} onDeleteZone={deleteZone} />
        </div>
      </div>
    </div>
  );
}