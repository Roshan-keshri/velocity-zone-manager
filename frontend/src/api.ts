import axios from "axios";
import type {
  LoginResponse,
  Property,
  Zone,
  ZoneSummary,
  GeoJSONFeatureCollection,
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const client = axios.create({
  baseURL: API_BASE_URL,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const extractApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const msg =
      (error.response?.data as any)?.error ||
      (error.response?.data as any)?.message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return "Something went wrong.";
};

export const api = {
  // ---------------- AUTH ----------------
  async signup(email: string, password: string) {
    try {
      return await client.post("/auth/signup", { email, password });
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  },

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const { data } = await client.post<LoginResponse>("/auth/login", {
        email,
        password,
      });
      return data;
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  },

  // ---------------- PROPERTY ----------------
  async getProperties(search?: string, type?: string): Promise<Property[]> {
    try {
      const { data } = await client.get<Property[]>("/properties", {
        params: { q: search || undefined, type: type || undefined },
      });
      return data;
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  },

  async getProperty(id: number): Promise<Property> {
    try {
      const { data } = await client.get<Property>(`/properties/${id}`);
      return data;
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  },

  async createProperty(payload: {
    name: string;
    type: string;
    total_acreage: number;
    notes?: string;
  }): Promise<Property> {
    try {
      const { data } = await client.post<Property>("/properties", payload);
      return data;
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  },

  async updateProperty(
    id: number,
    payload: Partial<{
      name: string;
      type: string;
      total_acreage: number;
      notes: string;
    }>
  ): Promise<Property> {
    try {
      const { data } = await client.put<Property>(`/properties/${id}`, payload);
      return data;
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  },

  async deleteProperty(id: number) {
    try {
      await client.delete(`/properties/${id}`);
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  },

  // ---------------- ZONES ----------------
  async getZones(propertyId: number): Promise<Zone[]> {
    try {
      const { data } = await client.get<Zone[]>(`/properties/${propertyId}/zones`);
      return data;
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  },

  async createZone(
    propertyId: number,
    payload: {
      name: string;
      zone_type: string;
      mower_count: number;
      status: string;
      geometry: any;
    }
  ): Promise<Zone> {
    try {
      const { data } = await client.post<Zone>(
        `/properties/${propertyId}/zones`,
        payload
      );
      return data;
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  },

  async updateZone(
    propertyId: number,
    zoneId: number,
    payload: Partial<{
      name: string;
      zone_type: string;
      mower_count: number;
      status: string;
      geometry: any;
    }>
  ): Promise<Zone> {
    try {
      const { data } = await client.put<Zone>(
        `/properties/${propertyId}/zones/${zoneId}`,
        payload
      );
      return data;
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  },

  async deleteZone(propertyId: number, zoneId: number) {
    try {
      await client.delete(`/properties/${propertyId}/zones/${zoneId}`);
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  },

  // ---------------- SUMMARY ----------------
  async getZoneSummary(propertyId: number): Promise<ZoneSummary> {
    try {
      const { data } = await client.get<ZoneSummary>(
        `/properties/${propertyId}/zones/summary`
      );
      return data;
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  },

  // ---------------- EXPORT ----------------
  async exportZones(propertyId: number): Promise<GeoJSONFeatureCollection> {
    try {
      const { data } = await client.get<GeoJSONFeatureCollection>(
        `/properties/${propertyId}/zones/export`
      );
      return data;
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  },

  // ---------------- IMPORT ----------------
  async importZones(
    propertyId: number,
    geojson: GeoJSONFeatureCollection
  ): Promise<Zone[]> {
    try {
      const { data } = await client.post<Zone[]>(
        `/properties/${propertyId}/zones/import`,
        geojson
      );
      return data;
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  },
};