import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

// ============================================================
// Generic async data hook
// ============================================================

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): UseAsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fn()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Unknown error");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, ...deps]);

  return { data, loading, error, refresh };
}

// ============================================================
// Socket.IO hook for real-time updates
// ============================================================

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[socket] Connected");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const onSessionChange = useCallback(
    (callback: (event: { type: string; projectHash: string; sessionId?: string }) => void) => {
      const socket = socketRef.current;
      if (!socket) return () => {};

      socket.on("session-change", callback);
      return () => {
        socket.off("session-change", callback);
      };
    },
    [],
  );

  return { onSessionChange };
}

// ============================================================
// Dark mode hook
// ============================================================

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);

  return { dark, toggle };
}
