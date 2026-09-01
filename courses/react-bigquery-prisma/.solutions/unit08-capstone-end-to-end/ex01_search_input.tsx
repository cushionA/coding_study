// ex01_search_input: 制御コンポーネント + デバウンスで検索入力を作る(解答)
import { useEffect, useState, type ReactElement } from "react";

export const DEFAULT_DEBOUNCE_MS = 300;

export type SearchBoxProps = {
  onSearch: (query: string) => void;
  debounceMs?: number;
  initialQuery?: string;
};

export function SearchBox({
  onSearch,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  initialQuery = "",
}: SearchBoxProps): ReactElement {
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    const timerId = setTimeout(() => {
      onSearch(query);
    }, debounceMs);
    return () => {
      clearTimeout(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, debounceMs]);

  return (
    <input
      type="text"
      aria-label="検索"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );
}
