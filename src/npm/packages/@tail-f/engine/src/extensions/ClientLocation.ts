//import { Reader, ReaderModel } from "@maxmind/geoip2-node";
import {
  ClientLocationEvent,
  isSessionStartEvent,
  TrackerEvent,
  validateEvent,
} from "@tail-f/types";
import { Reader } from "maxmind";
import type { CityResponse } from "mmdb-lib";
import { EngineHost, Tracker, TrackerExtension, ValidationError } from "..";

export class ClientLocation implements TrackerExtension {
  private _initialized = false;
  private _reader: Reader<CityResponse> | null;

  public readonly name = "ClientLocation";

  public async apply(tracker: Tracker) {
    if (!this._initialized) throw new Error("Not initialized");

    if (tracker.clientIp) {
      tracker.variables.set(
        "geoip",
        this.filterNames(this._reader?.get(tracker.clientIp))
      );
      return;
    }
  }

  async update(event: TrackerEvent<string>, tracker: Tracker) {
    if (isSessionStartEvent(event)) {
      const location = tracker.variables.get("geoip") as
        | CityResponse
        | undefined;

      if (!location) return;

      return [
        event,
        validateEvent<ClientLocationEvent>({
          type: "CLIENT_LOCATION",

          session: {
            sessionId: event.sessionId,
            deviceId: event.deviceId,
          },

          city: location.city
            ? {
                name: location.city.names.en,
                geonames: location.city.geoname_id,
                confidence: location.city.confidence,
              }
            : undefined,
          subdivisions: location.subdivisions
            ? location.subdivisions.map((sub) => ({
                name: sub.names.en,
                geonames: sub.geoname_id,
                iso: sub.iso_code,
                confidence: sub.confidence,
              }))
            : undefined,
          country: location.country
            ? {
                name: location.country.names.en,
                geonames: location.country.geoname_id,
                iso: location.country.iso_code,
              }
            : undefined,
          continent: location.continent
            ? {
                name: location.continent.names.en,
                geonames: location.continent.geoname_id,
                iso: location.continent.code,
              }
            : undefined,
          lat: location.location?.latitude,
          lng: location.location?.longitude,

          source: location,
        }),
      ];
    }
  }

  public filterNames(parent: any, language = "en") {
    if (typeof parent !== "object") return;
    for (const p in parent) {
      const value = parent[p];
      if (typeof value !== "object") continue;
      if (p === "names") {
        const primaryName = value[language];
        if (primaryName) {
          parent[p] = { [language]: value[language] };
        }
        continue;
      }
      this.filterNames(value);
    }
    return parent;
  }

  private _host: EngineHost;
  public async initialize(host: EngineHost) {
    if (this._initialized == (this._initialized = true)) {
      return;
    }
    this._host = host;

    const createReader = async (watch: boolean) => {
      const data = await host.get("geoip/GeoLite2-City.mmdb", {
        changeHandler: watch
          ? async () => await createReader(false)
          : undefined,
      });
      this._reader = data ? new Reader<CityResponse>(Buffer.from(data)) : null;
    };

    await createReader(true);
  }
}
