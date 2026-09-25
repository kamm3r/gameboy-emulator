import { useEffect, useState } from "react";

// Boolean setting persisted in localStorage. Starts from the default and
// reads storage after mount so server and client render the same markup.
export function useSetting(key: string, default_value: boolean) {
  const [value, set_value] = useState(default_value);

  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored !== null) set_value(stored === "true");
  }, [key]);

  function update(next: boolean): void {
    window.localStorage.setItem(key, String(next));
    set_value(next);
  }

  return [value, update] as const;
}
