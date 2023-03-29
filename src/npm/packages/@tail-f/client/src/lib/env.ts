import { config, document, parseDomain } from ".";

export const ERR_BUFFER_OVERFLOW = "buffer-overflow";
export const ERR_POST_FAILED = "post-failed";
export const ERR_INVALID_COMMAND = "invalid-command";
export const ERR_INTERNAL_ERROR = "internal-error";
export const ERR_ARGUMENT_ERROR = "invalid-argument";
export const ERR_RESERVED = "reserved";
export const ERR_CONFIG_LOCKED = "config-locked";

const src = (document.currentScript!["src"] ?? "").split("#");
const args = (src[1] ?? "").split(";");
export const TRACKER_NAME = args[0] || config.name;
export const SCRIPT_SRC = src[0];
export const TRACKER_DOMAIN = args[1] || parseDomain(SCRIPT_SRC)?.domain;

export const isInternalUrl = (url: string | null | undefined) =>
  parseDomain(url)?.domain.endsWith(TRACKER_DOMAIN) === true;

export const mapUrl = (...urlParts: string[]) =>
  urlParts.join("").replace(/(^(?=\?))|(^\.(?=\/))/, SCRIPT_SRC);
