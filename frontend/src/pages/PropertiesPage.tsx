import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Plus,
  Map,
  Trash2,
  LayoutDashboard,
  Building2,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { api } from "../api";
import { Property, PropertyType } from "../types";

const PROPERTY_TYPES: PropertyType[] = [
  "Golf Course",
  "Airport",
  "Corporate Campus",
  "Other",
];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Search/filter
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filterType, setFilterType] = useState<string>("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<PropertyType>("Golf Course");
  const [acreage, setAcreage] = useState<number>(0);
  const [notes, setNotes] = useState("");

  async function loadProperties() {
    try {
      setLoading(true);
      const data = await api.getProperties(debouncedSearch.trim(), filterType || undefined);
      setProperties(data);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Failed to load properties. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProperties();
  }, [debouncedSearch, filterType]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setType("Golf Course");
    setAcreage(0);
    setNotes("");
  }

  function startCreate() {
    resetForm();
    setShowForm(true);
    setError("");
  }

  function startEdit(property: Property) {
    setEditingId(property.id);
    setName(property.name);
    setType(property.type);
    setAcreage(property.total_acreage);
    setNotes(property.notes || "");
    setShowForm(true);
    setError("");
  }

  function cancelForm() {
    resetForm();
    setShowForm(false);
    setError("");
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Property name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await api.createProperty({
        name: name.trim(),
        type,
        total_acreage: acreage,
        notes: notes.trim() || undefined,
      });
      resetForm();
      setShowForm(false);
      await loadProperties();
    } catch (err: any) {
      setError(err?.message || "Unable to create property.");
    } finally {
      setSaving(false);
    }
  }

  async function onUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (!name.trim()) {
      setError("Property name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await api.updateProperty(editingId, {
        name: name.trim(),
        type,
        total_acreage: acreage,
        notes: notes.trim(),
      });
      resetForm();
      setShowForm(false);
      await loadProperties();
    } catch (err: any) {
      setError(err?.message || "Unable to update property.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(propertyId: number, propertyName: string) {
    const ok = window.confirm(`Are you sure you want to delete "${propertyName}"?`);
    if (!ok) return;

    try {
      await api.deleteProperty(propertyId);
      await loadProperties();
    } catch (err: any) {
      setError(err?.message || "Unable to delete property.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <LayoutDashboard className="h-9 w-9 text-blue-600" />
            Velocity Zone Manager
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Manage commercial mowing properties and their operational zones.
          </p>
        </div>

        {!showForm ? (
          <button
            onClick={startCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Plus className="h-5 w-5" />
            New Property
          </button>
        ) : (
          <button
            onClick={cancelForm}
            className="flex items-center gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 text-red-800 border border-red-200 bg-red-50 rounded-xl shadow-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={editingId ? onUpdate : onCreate}
          className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6 lg:p-8"
        >
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="h-6 w-6 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-800">
              {editingId ? "Edit Property" : "Create New Property"}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Property Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Oak Creek Golf Club"
                className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Property Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PropertyType)}
                className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none"
              >
                {PROPERTY_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Total Acreage</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={acreage}
                onChange={(e) => setAcreage(Number(e.target.value))}
                className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Notes (Optional)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key details..."
                className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              disabled={saving}
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving
                ? editingId
                  ? "Updating..."
                  : "Creating..."
                : editingId
                ? "Update Property"
                : "Save Property"}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search properties by name or type..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="md:w-64 py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
        >
          <option value="">All Types</option>
          {PROPERTY_TYPES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-600">Loading properties...</p>
      ) : properties.length === 0 ? (
        <div className="rounded-2xl bg-white/50 border border-slate-200 border-dashed p-16 text-center shadow-sm">
          <h3 className="text-xl font-bold text-slate-800">No Properties Found</h3>
          <p className="mt-2 text-slate-500 max-w-sm mx-auto">
            {search || filterType
              ? "No properties match your current filters."
              : "You haven't added any properties yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <div
              key={property.id}
              className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col"
            >
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                {property.name}
              </h3>

              <span className="inline-flex items-center mt-2 rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 text-xs font-semibold tracking-wide uppercase w-fit">
                {property.type}
              </span>

              <div className="space-y-3 text-sm text-slate-600 mb-6 mt-4 flex-1">
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg">
                  <span className="font-medium flex items-center gap-2">
                    <Map className="h-4 w-4 text-slate-400" />
                    Total Acreage
                  </span>
                  <span className="font-bold text-slate-900">{property.total_acreage} ac</span>
                </div>

                {property.notes && (
                  <div className="p-2.5">
                    <p className="text-slate-500 font-medium mb-1">Notes</p>
                    <p className="text-slate-700 line-clamp-2">{property.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-auto">
                <Link
                  to={`/properties/${property.id}`}
                  className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-slate-900 py-2.5 text-white font-medium hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <Map className="h-4 w-4" />
                  Manage Zones
                </Link>

                <button
                  onClick={() => startEdit(property)}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all"
                  title="Edit Property"
                >
                  <Pencil className="h-5 w-5" />
                </button>

                <button
                  onClick={() => onDelete(property.id, property.name)}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all"
                  title="Delete Property"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}