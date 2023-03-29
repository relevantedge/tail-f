import { isTrackerEvent, TrackerEvent } from "@tail-f/types";
import { Schema, Validator } from "jsonschema";
import { JsonString } from ".";
import { ReadOnlyRecord } from "./lib";

export function getErrorMessage(validationResult: any) {
  return !validationResult["type"] ? validationResult["error"] : null;
}

export type ValidationError = { error: string; source: any };
export const isValidationError = (item: any): item is ValidationError =>
  item && item["type"] == null && item["error"] != null;

export type ParseResult = TrackerEvent | ValidationError;

export type SchemaDefinition = { name: string; json: string | Schema };

export class EventParser {
  private readonly _types: { [key: string]: { name: string; schema: Schema } } =
    {};
  private readonly _validator: Validator = new Validator();

  public readonly events: ReadOnlyRecord<string, Schema>;

  constructor(schema: Record<string, JsonString<Schema> | Schema>) {
    const events = {};
    const registerEvent = (schema: Schema, defaultName: string) => {
      const typeProp = schema.properties?.type;
      if (!typeProp) {
        throw new Error("An event cannot be registered without a type.");
      }

      const name =
        typeProp.const ??
        typeProp["default"] ??
        schema.$id?.replace(/^.*\/([^\/]+)$/, "$1") ??
        defaultName;
      const reg = { name, schema };

      const add = (alias: string, registration: typeof reg) => {
        const current = this._types[alias];
        if (current && current !== registration) {
          throw new Error(
            `Cannot add the type '${registration.name}' with the alias '${alias}' since that is already in use by '${current.name}'.`
          );
        }
        this._types[alias] = registration;
      };

      if (typeProp.enum?.length) {
        for (const alias of typeProp.enum) {
          add(alias, reg);
        }
      } else {
        if (typeProp?.type === "string" && !typeProp.const) {
          typeProp.const = reg.name;
        }
        add(reg.name, reg);
      }

      events[reg.name] = reg.schema;

      return reg;
    };

    const rewriteRefs = (parent: any, rewrite: (current: string) => string) => {
      if (typeof parent !== "object") return;
      if (Array.isArray(parent)) {
        parent.forEach((item) => rewriteRefs(item, rewrite));
      } else {
        for (const prop in parent) {
          const value = parent[prop];
          if (prop === "$ref" && value.startsWith("#")) {
            parent[prop] = rewrite(value as string);
          } else {
            rewriteRefs(value, rewrite);
          }
        }
      }
    };

    for (const [name, source] of Object.entries(schema)) {
      const schema: Schema =
        typeof source === "string" ? JSON.parse(source) : source;

      const schemaDefs: Record<string, Schema> = {};
      const schemaEvents: Schema[] = [];
      if (schema.type) {
        if (!schema.properties?.type) {
          throw new Error("A schema with a root type must be an event.");
        }
        // We got a root type. No need to extract events from the schema definitions, they are already there.

        registerEvent(schema, name.replace(/^.*?([^\/\.]+)(?:\..*)?$/, "$1"));
        continue;
      } else if (!schema.definitions) {
        // Empty schema.
        continue;
      }

      for (const [name, def] of Object.entries(schema.definitions)) {
        const typeProp = def.properties?.type as Schema;
        if (!typeProp) {
          schemaDefs[name] = def;
          continue;
        }

        schemaEvents.push(registerEvent(def, name).schema);
      }

      for (const event of schemaEvents) {
        function patch(schema: Schema) {
          rewriteRefs(schema, (current) => {
            event.definitions ??= {};
            const name = current.replace(/^.*?([^\/]+)$/, "$1");
            if (!event.definitions[name]) {
              const def = schemaDefs[name];
              if (!def) {
                throw new Error(
                  `The reference ${name} could not be resolved. Mind that an event cannot reference other events.`
                );
              }
              event.definitions[name] = def;
              patch(def);
            }
            return current;
          });
        }
        patch(event);

        this._validator.addSchema(event);
      }
    }

    this.events = events;
  }

  public parseAndValidate(data: string | {}): ParseResult[] {
    const parsed = this.parse(data);
    return this.validate(parsed);
  }

  public parse(data: string | {}): ParseResult[] {
    let events = typeof data === "string" ? JSON.parse(data) : data;
    if (!Array.isArray(events)) {
      events = [events];
    }
    const results: ParseResult[] = [];

    for (const instance of events) {
      if (typeof instance !== "object" || Array.isArray(instance)) {
        results.push({ error: "Object expected", source: instance });
        continue;
      }

      if (!instance.type) {
        results.push({
          error: "A type property was expected.",
          source: instance,
        });
      }

      const reg = this._types[instance.type];
      if (reg) {
        instance.type = reg.name;
      }
      results.push(instance);
    }
    return results;
  }

  public validate(events: ParseResult[]): ParseResult[] {
    const validated: ParseResult[] = [];
    for (const instance of events) {
      if (isValidationError(instance)) {
        validated.push(instance);
        continue;
      }
      const reg = this._types[instance.type];
      if (!reg) {
        validated.push({
          error: `No such type: '${instance.type}'.`,
          source: instance,
        });
        continue;
      }

      if (!instance.type) {
        validated.push({
          error: "A type property was expected.",
          source: instance,
        });
        continue;
      }

      const result = this._validator.validate(instance, reg.schema, {
        nestedErrors: true,
        throwError: false,
      });
      if (!result.valid) {
        validated.push({
          error: result.errors
            .map(
              (error) =>
                `${error.path.length ? error.path.join(".") : "instance"} ${
                  error.message
                }`
            )
            .join("\n"),
          source: instance,
        });
        continue;
      }
      instance.type = reg.name;
      validated.push(instance);
    }

    return validated;
  }
}
