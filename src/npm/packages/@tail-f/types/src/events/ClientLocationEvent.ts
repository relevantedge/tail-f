import { TrackerEvent } from "..";

export interface GeoEntity {
  name: string;
  geonames?: number;
  iso?: string;
  confidence?: number;
}

export interface ClientLocationEvent extends TrackerEvent<"CLIENT_LOCATION"> {
  city?: GeoEntity;
  subdivisions?: GeoEntity[];
  country?: GeoEntity;
  continent?: GeoEntity;
  lat?: number;
  lng?: number;

  source?: Record<string, any>;
}

export const isClientLocationEvent = (
  ev: TrackerEvent
): ev is ClientLocationEvent => ev.type === "CLIENT_LOCATION";
