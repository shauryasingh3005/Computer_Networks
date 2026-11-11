import { ipv4ToNumber } from "./engine";

export interface StaticRoute {
  destination: string;
  prefixLength: number;
  nextHop: string;
  interfaceName: string;
  metric: number;
}

export function longestPrefixMatch(routes: StaticRoute[], destinationAddress: string): StaticRoute | undefined {
  const destination = ipv4ToNumber(destinationAddress);
  if (destination === undefined) return undefined;
  return routes
    .filter((route) => {
      const network = ipv4ToNumber(route.destination);
      return network !== undefined && Number.isInteger(route.prefixLength) && route.prefixLength >= 0 && route.prefixLength <= 32
        && (destination & (route.prefixLength === 0 ? 0 : (0xffffffff << (32 - route.prefixLength)) >>> 0))
          === (network & (route.prefixLength === 0 ? 0 : (0xffffffff << (32 - route.prefixLength)) >>> 0));
    })
    .sort((first, second) => second.prefixLength - first.prefixLength || first.metric - second.metric)[0];
}