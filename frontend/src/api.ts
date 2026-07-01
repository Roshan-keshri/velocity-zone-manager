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

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const api = {
  // ---------------- AUTH ----------------

  async signup(email: string, password: string) {
    return client.post("/auth/signup", {
      email,
      password,
    });
  },

  async login(
    email: string,
    password: string
  ): Promise<LoginResponse> {
    const { data } = await client.post<LoginResponse>("/auth/login", {
      email,
      password,
    });

    return data;
  },

  // ---------------- PROPERTY ----------------

  async getProperties(
    search?: string,
    type?: string
  ): Promise<Property[]> {
    const { data } = await client.get<Property[]>("/properties", {
      params: {
        q: search || undefined,
        type: type || undefined,
      },
    });

    return data;
  },

  async getProperty(id: number): Promise<Property> {
    const { data } = await client.get<Property>(
      `/properties/${id}`
    );

    return data;
  },

  async createProperty(payload: {
    name: string;
    type: string;
    total_acreage: number;
    notes?: string;
  }): Promise<Property> {
    const { data } = await client.post<Property>(
      "/properties",
      payload
    );

    return data;
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
    const { data } = await client.put<Property>(
      `/properties/${id}`,
      payload
    );

    return data;
  },

  async deleteProperty(id: number) {
    await client.delete(`/properties/${id}`);
  },

  // ---------------- ZONES ----------------

  async getZones(propertyId: number): Promise<Zone[]> {
    const { data } = await client.get<Zone[]>(
      `/properties/${propertyId}/zones`
    );

    return data;
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
    const { data } = await client.post<Zone>(
      `/properties/${propertyId}/zones`,
      payload
    );

    return data;
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
    const { data } = await client.put<Zone>(
      `/properties/${propertyId}/zones/${zoneId}`,
      payload
    );

    return data;
  },

  async deleteZone(
    propertyId: number,
    zoneId: number
  ) {
    await client.delete(
      `/properties/${propertyId}/zones/${zoneId}`
    );
  },

  // ---------------- SUMMARY ----------------

  async getZoneSummary(
    propertyId: number
  ): Promise<ZoneSummary> {
    const { data } = await client.get<ZoneSummary>(
      `/properties/${propertyId}/zones/summary`
    );

    return data;
  },

  // ---------------- EXPORT ----------------

  async exportZones(
    propertyId: number
  ): Promise<GeoJSONFeatureCollection> {
    const { data } =
      await client.get<GeoJSONFeatureCollection>(
        `/properties/${propertyId}/zones/export`
      );

    return data;
  },

  // ---------------- IMPORT ----------------

  async importZones(
    propertyId: number,
    geojson: GeoJSONFeatureCollection
  ): Promise<Zone[]> {
    const { data } = await client.post<Zone[]>(
      `/properties/${propertyId}/zones/import`,
      geojson
    );

    return data;
  },
};