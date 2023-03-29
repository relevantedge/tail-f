import type { EngineHost, Tracker, TrackerExtension } from "@tail-f/engine";
import { TrackerEvent } from "@tail-f/types";

export interface CdpSettings {
  clientKey: string;
  target: string;
  channel?: string;
  language?: string;
  currency?: string;
}

export class CdpTracker implements TrackerExtension {
  public readonly name = "sitecore-cdp";
  private readonly _settings: Required<CdpSettings>;

  constructor(settings: CdpSettings) {
    this._settings = {
      channel: "WEB",
      language: "EN",
      currency: "EUR",
      ...settings,
      target: settings.target.endsWith("/")
        ? settings.target
        : `${settings.target}/`,
    };
  }

  async post(
    events: TrackerEvent<string>[],
    tracker: Tracker,
    host: EngineHost
  ): Promise<void> {
    try {
      let browserRef = tracker.cookies.get("bx_ref")?.value;
      if (!browserRef) {
        const response = await host.request(
          `https://${this._settings.target}v1.2/browser/create.json?client_key=${this._settings.clientKey}&boxever_version=1.4.8`,
          { headers: { "x-forwarded-for": tracker.clientIp ?? "" } }
        );
        browserRef = JSON.parse(response.content?.text ?? "{}").ref;
        if (!browserRef) {
          throw new Error("No browser ref returned.");
        }
        tracker.cookies.set("bx_ref", {
          value: browserRef,
          type: "identifier",
          essential: true,
        });
      }
      for (const ev of events) {
        const url = `https://${
          this._settings.target
        }v1.2/event/create.json?client_key=${
          this._settings.clientKey
        }&boxever_version=1.4.8&message=${encodeURIComponent(
          JSON.stringify({
            browser_id: browserRef,
            channel: this._settings.channel,
            type: ev.type,
            language: this._settings.language,
            currency: this._settings.currency,
            ext: ev,
          })
        )}`;

        const eventResponse = await host.request(url, {
          headers: {
            "x-forwarded-for": tracker.clientIp ?? "",
            //...tracker.headers.toJSON(),
          },
        });
        await host.log({
          group: this.name,
          level: "info",
          source: this.name,
          data: JSON.stringify([url, browserRef, eventResponse.content]),
        });
      }
    } catch (e) {
      await host.log({
        group: this.name,
        level: "error",
        source: this.name,
        data: "" + e,
      });
    }
  }
}
