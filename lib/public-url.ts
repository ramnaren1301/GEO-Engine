export function assertPublicPageUrl(input: string) {
  const url = new URL(input.trim());
  if (!/^https?:$/.test(url.protocol)) throw new Error("Enter a public page URL beginning with http:// or https://.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Enter a public page URL.");
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) throw new Error("Private network URLs cannot be scanned.");
  if (host === "::1" || (host.includes(":") && (/^(fc|fd)/.test(host) || host.startsWith("fe80:")))) throw new Error("Private network URLs cannot be scanned.");
  url.hash = "";
  return url;
}
