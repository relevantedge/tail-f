import { array, equals, map, parseParameterValue, tryUse, use } from ".";
import { forAncestorsOrSelf } from "./dom";
import type { Parameters } from "@tail-f/types";

export const parseElementData = (el: EventTarget | null, maxDistance = 10) =>
  use(
    {} as { data?: Parameters; tags?: string[] },
    new Set<string>(),
    (data, tags) => (
      forAncestorsOrSelf(
        el,
        (el) =>
          map(el.getAttributeNames(), (attributeName) =>
            attributeName.replace(
              /^(?:data|tail)(\-tags)?(?:\-(.*))?/,
              (_, hasTags, name) => (
                tryUse(el.getAttribute(attributeName), (value) =>
                  hasTags
                    ? ((name = name?.replace(/\-+/g, ":")),
                      name && equals(value, "0", "false")
                        ? false
                        : name && equals(value, "1", "true", "")
                        ? tags.add(name)
                        : value.replace(
                            /* Tags are separated by commas, leading and trailing whitespace is removed.
                              `\` is escaped as `\\`, and `,` is escaped as `\,`
                              Otherwise backslash has no effect so 'a\bc' is 'a\bc'
                            
                              Example:
                                this,will, b,\e   ,parsed as ,,\\,,\\\\,foo,     ,bar\,
                                ["this", "will", "b", "\\e", "parsed as", ",", "\\", "foo", "bar,"]
                            */
                            /((?:[^,\s\\]|\\\\|\\,?)(?:[^,\\]|\\\\|\\,?)*?)(?:\s*(,|$))/g,
                            (_, tag: string) =>
                              tag &&
                              (tags.add(
                                (name ? name + ":" : "") +
                                  tag.replace(/\\([\\,])/g, "$1")
                              ) as any)
                          ))
                    : ((data.data ??= {})[name] ??= parseParameterValue(value))
                ),
                ""
              )
            )
          ),
        maxDistance
      ),
      (tags.size && (data.tags = array(tags)), data)
    )
  );
