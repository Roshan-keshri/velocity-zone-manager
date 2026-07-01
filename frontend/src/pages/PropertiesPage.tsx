import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Map, Trash2, LayoutDashboard, Building2, AlertCircle } from "lucide-react";
import { api } from "../api";
import { Property, PropertyType } from "../types";

const PROPERTY_TYPES: PropertyType[] = [
  "Golf Course",
  "Airport",
  "Corporate Campus",
  "Other",
];

// Debounce hook for real-time search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Search & Filters
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filterType, setFilterType] = useState<string>("");

  // Create Form
  const [showForm, setShowForm] = useState(false);
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
    } catch (err) {
      setError("Failed to load properties. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Trigger search on debounce or filter change
  useEffect(() => {
    loadProperties();
  }, [debouncedSearch, filterType]);

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
        notes: notes.trim(),
      });
      setName("");
      setType("Golf Course");
      setAcreage(0);
      setNotes("");
      setShowForm(false);
      await loadProperties();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to create property.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProperty(id: number, propName: string) {
    const ok = window.confirm(`Are you sure you want to delete ${propName}?`);
    if (!ok) return;
    try {
      await api.deleteProperty(id);
      await loadProperties();
    } catch {
      setError("Unable to delete property. It might have active zones.");
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
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
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus className="h-5 w-5" />
          {showForm ? "Cancel" : "New Property"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 text-red-800 border border-red-200 bg-red-50 rounded-xl shadow-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Create Property Form (Expandable) */}
      {showForm && (
        <form onSubmit={onCreate} className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6 lg:p-8 transition-all animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="h-6 w-6 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-800">Create New Property</h2>
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
                {PROPERTY_TYPES.map(item => <option key={item} value={item}>{item}</option>)}
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
              {saving ? "Creating..." : "Save Property"}
            </button>
          </div>
        </form>
      )}

      {/* Controls & Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search properties by name..."
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
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      {/* Properties Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl h-56 border border-slate-100 shadow-sm animate-pulse flex flex-col p-6">
              <div className="h-6 w-2/3 bg-slate-200 rounded-lg mb-4"></div>
              <div className="h-5 w-1/3 bg-slate-200 rounded-lg mb-8"></div>
              <div className="h-4 w-1/2 bg-slate-200 rounded-lg mb-3"></div>
              <div className="h-4 w-3/4 bg-slate-200 rounded-lg mt-auto"></div>
            </div>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-2xl bg-white/50 border border-slate-200 border-dashed p-16 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
            <Building2 className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">No Properties Found</h3>
          <p className="mt-2 text-slate-500 max-w-sm mx-auto">
            {search || filterType 
              ? "We couldn't find any properties matching your current filters."
              : "You haven't added any properties yet. Click 'New Property' to get started."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <div
              key={property.id}
              className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 transform origin-left scale-y-0 group-hover:scale-y-100 transition-transform duration-300"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    {property.name}
                  </h3>
                  <span className="inline-flex items-center mt-2 rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                    {property.type}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-600 mb-6 flex-1">
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

              <div className="flex gap-3 mt-auto">
                <Link
                  to={`/properties/${property.id}`}
                  className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-slate-900 py-2.5 text-white font-medium hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <Map className="h-4 w-4" />
                  Manage Zones
                </Link>
                <button
                  onClick={() => deleteProperty(property.id, property.name)}
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