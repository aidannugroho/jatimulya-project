const TOKEN_CACHE_KEY = "ga4:oauth-token";
const API_ROOT = "https://analyticsdata.googleapis.com/v1beta";

function base64Url(input) {
  let bytes;
  if (typeof input === "string") bytes = new TextEncoder().encode(input);
  else if (input instanceof Uint8Array) bytes = input;
  else if (input instanceof ArrayBuffer) bytes = new Uint8Array(input);
  else bytes = new TextEncoder().encode(JSON.stringify(input));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem) {
  const body = String(pem)
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function serviceAccount(env) {
  const raw = env.GA4_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("GA4_SERVICE_ACCOUNT_JSON belum dikonfigurasi");
  }
  const sa = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!sa.client_email || !sa.private_key) {
    throw new Error("Service account GA4 tidak lengkap");
  }
  return sa;
}

async function getAccessToken(env) {
  const cached = await env.JR_ADMIN_KV.get(TOKEN_CACHE_KEY);
  if (cached) return cached;

  const sa = serviceAccount(env);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Gagal membuat token GA4");
  }
  await env.JR_ADMIN_KV.put(TOKEN_CACHE_KEY, data.access_token, {
    expirationTtl: Math.max(60, Number(data.expires_in || 3600) - 120),
  });
  return data.access_token;
}

async function ga4Fetch(env, path, body) {
  const token = await getAccessToken(env);
  // Data API memakai ID numerik (564000201), bukan hash URL Admin (a416061740p564000201).
  const propertyId = env.GA4_PROPERTY_ID || "564000201";
  const res = await fetch(`${API_ROOT}/properties/${propertyId}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error?.message || JSON.stringify(data).slice(0, 400);
    throw new Error(message);
  }
  return data;
}

function dateRange(startDate, endDate) {
  return {
    startDate: startDate || "30daysAgo",
    endDate: endDate || "today",
  };
}

export function buildDimensionFilter(filters = []) {
  const matchTypes = {
    EQUAL: "EXACT",
    NOT_EQUAL: "EXACT",
    CONTAINS: "CONTAINS",
    BEGINS_WITH: "BEGINS_WITH",
    ENDS_WITH: "ENDS_WITH",
    REGEXP: "FULL_REGEXP",
    PARTIAL_REGEXP: "PARTIAL_REGEXP",
  };
  const list = filters
    .filter((f) => f && f.dimensionName && f.value !== undefined && f.value !== "")
    .map((f) => {
      const op = f.operator || "EQUAL";
      const value = String(f.value);
      const filter = {
        fieldName: f.dimensionName,
        stringFilter: { matchType: matchTypes[op] || "EXACT", value, caseSensitive: false },
      };
      return op === "NOT_EQUAL" ? { notExpression: { filter } } : { filter };
    });
  if (!list.length) return undefined;
  if (list.length === 1) return list[0];
  return { andGroup: { expressions: list } };
}

export function buildMetricFilter(filters = []) {
  const ops = {
    EQUAL: "EQUAL",
    GREATER_THAN: "GREATER_THAN",
    LESS_THAN: "LESS_THAN",
  };
  const list = filters
    .filter((f) => f && f.metricName && f.value !== undefined && f.value !== "")
    .map((f) => ({
      filter: {
        fieldName: f.metricName,
        numberFilter: { operation: ops[f.operator] || "GREATER_THAN", value: Number(f.value) },
      },
    }));
  if (!list.length) return undefined;
  if (list.length === 1) return list[0];
  return { andGroup: { expressions: list } };
}

export async function runReport(env, options = {}) {
  const {
    startDate,
    endDate,
    dimensions = ["pagePath"],
    metrics = ["totalUsers", "sessions", "screenPageViews", "engagedSessions", "keyEvents"],
    dimensionFilters = [],
    metricFilters = [],
    orderBys = [],
    limit = 50,
    offset = 0,
    keepEmptyRows = false,
    compare = false,
  } = options;

  const body = {
    dateRanges: compare
      ? [dateRange(startDate, endDate), { startDate: "60daysAgo", endDate: "30daysAgo" }]
      : [dateRange(startDate, endDate)],
    dimensions: dimensions.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    limit: String(limit),
    offset: String(offset),
    keepEmptyRows,
    returnPropertyQuota: true,
  };
  const dimensionFilter = buildDimensionFilter(dimensionFilters);
  if (dimensionFilter) body.dimensionFilter = dimensionFilter;
  const metricFilter = buildMetricFilter(metricFilters);
  if (metricFilter) body.metricFilter = metricFilter;
  if (orderBys.length) body.orderBys = orderBys;

  try {
    return await ga4Fetch(env, ":runReport", body);
  } catch (error) {
    if (metrics.includes("keyEvents") && /keyEvents|unknown metric|not valid/i.test(error.message)) {
      body.metrics = metrics.map((name) => ({ name: name === "keyEvents" ? "conversions" : name }));
      return await ga4Fetch(env, ":runReport", body);
    }
    throw error;
  }
}

export async function runRealtimeReport(env, options = {}) {
  const body = {
    dimensions: (options.dimensions || ["pagePath"]).map((name) => ({ name })),
    metrics: (options.metrics || ["activeUsers", "screenPageViews"]).map((name) => ({ name })),
    limit: String(options.limit || 25),
  };
  const filter = buildDimensionFilter(options.dimensionFilters || []);
  if (filter) body.dimensionFilter = filter;
  return ga4Fetch(env, ":runRealtimeReport", body);
}

export async function getMetadata(env) {
  return ga4Fetch(env, "/metadata");
}

export function flattenReport(report) {
  const dimensionNames = (report.dimensionHeaders || []).map((h) => h.name);
  const metricNames = (report.metricHeaders || []).map((h) => h.name);
  return (report.rows || []).map((row) => {
    const item = {};
    dimensionNames.forEach((name, i) => {
      item[name] = row.dimensionValues?.[i]?.value ?? "";
    });
    metricNames.forEach((name, i) => {
      item[name] = Number(row.metricValues?.[i]?.value || 0);
    });
    return item;
  });
}

export function deriveRows(rows, mode = "unique") {
  return rows.map((row) => {
    const users = Number(row.totalUsers || row.activeUsers || 0);
    const sessions = Number(row.sessions || 0);
    const events = Number(row.screenPageViews || 0);
    const engaged = Number(row.engagedSessions || 0);
    const keyEvents = Number(row.keyEvents ?? row.conversions ?? 0);
    const jrValue = mode === "events" ? events || keyEvents || sessions : users || sessions;
    return {
      ...row,
      jr_engagement_rate: sessions ? engaged / sessions : 0,
      jr_key_event_rate: users ? keyEvents / users : 0,
      jr_value: jrValue,
      jr_mode: mode,
    };
  });
}
