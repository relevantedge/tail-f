import { ConsentEvent, validateEvent } from "@tail-f/types";
import { useRef, useState } from "react";

export const useConsent = (): [boolean | null, (consent: boolean) => void] => {
  const gen = useRef(0);
  const [hasConsent, setConsent] = useState<boolean | null>(null);

  ++gen.current;
  const currentGen = gen.current;
  tail.push({
    get: {
      consent: (value) => {
        if (currentGen === gen.current) {
          if (value !== hasConsent) {
            setConsent(value === undefined ? null : value);
          }
          return true; // Keep polling until next render (currentGen < gen.current).
        }
      },
    },
  });

  return [
    hasConsent,
    (consent: boolean) => {
      tail.push(
        validateEvent<ConsentEvent>({
          type: "CONSENT",
          nonEssentialTracking: consent,
        })
      );
    },
  ];
};
