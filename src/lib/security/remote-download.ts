import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class UnsafeRemoteUrlError extends Error {
  constructor(message = "URL sumber tidak diizinkan.") {
    super(message);
    this.name = "UnsafeRemoteUrlError";
  }
}

type ResolveHost = (hostname: string) => Promise<readonly string[]>;

const defaultResolveHost: ResolveHost = async (hostname) => {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
};

function isBlockedIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }
  const [a, b, c] = parts as [number, number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isBlockedIp(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  const version = isIP(normalized);
  if (version === 4) return isBlockedIpv4(normalized);
  if (version !== 6) return true;

  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    if (isIP(mapped) === 4) return isBlockedIpv4(mapped);
    return true;
  }

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized === "0:0:0:0:0:0:0:0" ||
    normalized === "0:0:0:0:0:0:0:1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  );
}

export async function assertSafeRemoteHttpUrl(
  rawUrl: string,
  resolveHost: ResolveHost = defaultResolveHost,
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeRemoteUrlError("URL sumber tidak valid.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new UnsafeRemoteUrlError("URL sumber harus menggunakan HTTP atau HTTPS.");
  }
  if (url.username || url.password) {
    throw new UnsafeRemoteUrlError("URL dengan kredensial tidak diizinkan.");
  }
  if (
    (url.protocol === "http:" && url.port && url.port !== "80") ||
    (url.protocol === "https:" && url.port && url.port !== "443")
  ) {
    throw new UnsafeRemoteUrlError("Port URL sumber tidak diizinkan.");
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new UnsafeRemoteUrlError();
  }

  let addresses: readonly string[];
  try {
    addresses = await resolveHost(hostname);
  } catch {
    throw new UnsafeRemoteUrlError("Host URL sumber tidak dapat diverifikasi.");
  }
  if (addresses.length === 0 || addresses.some(isBlockedIp)) {
    throw new UnsafeRemoteUrlError();
  }
  return url;
}

export async function downloadRemoteImage(
  rawUrl: string,
  options: {
    maxBytes: number;
    timeoutMs?: number;
    maxRedirects?: number;
    fetchImpl?: typeof fetch;
    resolveHost?: ResolveHost;
  },
): Promise<Uint8Array> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRedirects = options.maxRedirects ?? 3;
  let url = await assertSafeRemoteHttpUrl(rawUrl, options.resolveHost);

  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const response = await fetchImpl(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
      headers: { Accept: "image/*" },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === maxRedirects) {
        throw new UnsafeRemoteUrlError("Redirect URL sumber tidak valid.");
      }
      url = await assertSafeRemoteHttpUrl(new URL(location, url).toString(), options.resolveHost);
      continue;
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();
    if (!contentType?.startsWith("image/")) {
      throw new UnsafeRemoteUrlError("URL sumber tidak mengembalikan berkas gambar.");
    }
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > options.maxBytes) {
      throw new UnsafeRemoteUrlError("Ukuran berkas melebihi batas.");
    }
    if (!response.body) throw new Error("Response body kosong");

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > options.maxBytes) {
        await reader.cancel();
        throw new UnsafeRemoteUrlError("Ukuran berkas melebihi batas.");
      }
      chunks.push(value);
    }

    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  }

  throw new UnsafeRemoteUrlError("Terlalu banyak redirect.");
}
