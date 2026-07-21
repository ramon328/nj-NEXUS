import { useLocation } from "wouter";

/**
 * A custom hook that provides navigation capabilities using Wouter.
 * This hook is designed to be a drop-in replacement for React Router's useNavigate.
 */
export function useNavigation() {
  const [location, navigate] = useLocation();

  /**
   * Navigate to a new location.
   * @param to The path to navigate to
   * @param options Optional configuration with a replace option
   */
  const navigateTo = (to: string, options?: { replace?: boolean }) => {
    navigate(to, options);
  };

  return navigateTo;
}

/**
 * A custom hook that provides the current location and navigation function.
 * This is a direct export of Wouter's useLocation hook.
 */
export function useCurrentLocation() {
  return useLocation();
}

/**
 * Extract route parameters from the current route.
 * A simple utility to simulate React Router's useParams functionality with Wouter.
 * @param pattern The route pattern with parameters (e.g., "/users/:id")
 */
export function useRouteParams<T extends Record<string, string>>(
  pattern: string
): T {
  const [location] = useLocation();
  const params: Record<string, string> = {};

  // Split the pattern and current location into segments
  const patternSegments = pattern.split("/").filter(Boolean);
  const pathSegments = location.split("/").filter(Boolean);

  // If the number of segments doesn't match, return empty params
  if (patternSegments.length !== pathSegments.length) {
    return {} as T;
  }

  // Extract parameters by matching segments with pattern
  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i];
    if (patternSegment.startsWith(":")) {
      const paramName = patternSegment.slice(1);
      params[paramName] = pathSegments[i];
    }
  }

  return params as T;
}
