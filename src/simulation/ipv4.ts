export function ipv4ToNumber(address: string): number | undefined {
  const octets = address.split(".");
  if (octets.length !== 4) return undefined;
  let value = 0;
  for (const octet of octets) {
    if (!/^\d{1,3}$/.test(octet)) return undefined;
    const parsed = Number(octet);
    if (parsed > 255) return undefined;
    value = value * 256 + parsed;
  }
  return value;
}
