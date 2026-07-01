export interface LoginResponse {
  access_token: string;
}

export type PropertyType =
  | "Golf Course"
  | "Airport"
  | "Corporate Campus"
  | "Other";

export type ZoneType =
  | "Fairway"
  | "Rough"
  | "Perimeter"
  | "Exclusion";

export type ZoneStatus = "Active" | "Inactive";

export interface Property {
  id: number;
  name: string;
  type: PropertyType;
  total_acreage: number;
  notes: string | null;
}

export interface Zone {
  id: number;
  property_id: number;
  name: string;
  zone_type: ZoneType;
  mower_count: number;
  status: ZoneStatus;
  geometry: GeoJSON.Polygon;
  acreage: number;
  understaffed: boolean;
}

export interface ZoneSummary {
  total_zones: number;
  total_acreage: number;
  total_mowers_assigned: number;
  understaffed_zones: number;
}

export interface ZoneGeoJSONProperties {
  id?: number;
  name?: string;
  zone_type?: ZoneType;
  mower_count?: number;
  status?: ZoneStatus;
  acreage?: number;
  understaffed?: boolean;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSON.Feature<GeoJSON.Polygon, ZoneGeoJSONProperties>[];
}