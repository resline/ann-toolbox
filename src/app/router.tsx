import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { HOME_ROUTE, routeByPath, type RouteDef } from './routes';

/**
 * Router na History API — pięć płaskich tras, zero parametrów, zero zagnieżdżeń.
 *
 * Nie sięgamy po react-router, bo dla tego kształtu tras nic by nie wniósł.
 * Kształt API jest jednak celowo taki sam (useRoute / navigate / Link), więc
 * gdyby doszły trasy z parametrami, podmiana będzie mechaniczna.
 *
 * Bez routera przycisk Wstecz na Androidzie zamykał całą aplikację.
 */

interface RouterContextValue {
  route: RouteDef;
  navigate: (path: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

const currentPath = () =>
  typeof window === 'undefined' ? HOME_ROUTE.path : window.location.pathname;

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onPopState = () => setPath(currentPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    if (to === window.location.pathname) return;
    if (options?.replace) window.history.replaceState({}, '', to);
    else window.history.pushState({}, '', to);
    setPath(to);
  }, []);

  const value = useMemo<RouterContextValue>(
    () => ({ route: routeByPath(path), navigate }),
    [path, navigate]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter musi być użyty wewnątrz <RouterProvider>');
  return ctx;
}

export const useRoute = (): RouteDef => useRouter().route;

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  replace?: boolean;
}

export const Link: React.FC<LinkProps> = ({ to, replace, onClick, children, ...rest }) => {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      onClick={(event) => {
        onClick?.(event);
        // pozwól przeglądarce obsłużyć otwarcie w nowej karcie
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        navigate(to, { replace });
      }}
      {...rest}
    >
      {children}
    </a>
  );
};
