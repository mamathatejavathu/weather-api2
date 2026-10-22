const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
// Best-effort per-instance throttle. Use an edge/WAF rate limit for distributed production enforcement.
const requestLog = new Map();

function sendJson(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function allowed(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "") || "unknown";
  const now = Date.now();
  const recent = (requestLog.get(ip) || []).filter((stamp) => now - stamp < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestLog.set(ip, recent);
    return false;
  }
  recent.push(now);
  requestLog.set(ip, recent);
  if (requestLog.size > 1000) {
    for (const [key, stamps] of requestLog) {
      if (!stamps.some((stamp) => now - stamp < WINDOW_MS)) requestLog.delete(key);
    }
  }
  return true;
}

module.exports = async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: { code: "METHOD_NOT_ALLOWED", message: "Use GET for weather lookups." } });
  }
  if (!allowed(req)) {
    res.setHeader("Retry-After", "60");
    return sendJson(res, 429, { error: { code: "RATE_LIMITED", message: "Too many requests. Please wait a minute and try again." } });
  }

  const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
  if (!city) return sendJson(res, 400, { error: { code: "MISSING_CITY", message: "Please provide a city in the city query parameter." } });
  if (city.length > 100 || /[\u0000-\u001f\u007f]/.test(city)) {
    return sendJson(res, 400, { error: { code: "INVALID_CITY", message: "City must be 100 characters or fewer and contain no control characters." } });
  }

  const apiKey = process.env.WEATHERAPI_KEY;
  if (!apiKey) {
    return sendJson(res, 503, { error: { code: "CONFIGURATION_ERROR", message: "Weather service is not configured. Set WEATHERAPI_KEY in the server environment." } });
  }

  const upstreamUrl = new URL("https://api.weatherapi.com/v1/current.json");
  upstreamUrl.searchParams.set("key", apiKey);
  upstreamUrl.searchParams.set("q", city);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: controller.signal,
      cache: "no-store"
    });
    // Forward the actual upstream body (not a reconstructed object), preserving its JSON values/formatting.
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(body);
  } catch (error) {
    if (error.name === "AbortError") {
      return sendJson(res, 504, { error: { code: "UPSTREAM_TIMEOUT", message: "The weather service took too long to respond. Please retry." } });
    }
    return sendJson(res, 502, { error: { code: "UPSTREAM_UNAVAILABLE", message: "Could not reach the weather service. Please retry." } });
  } finally {
    clearTimeout(timeout);
  }
};
