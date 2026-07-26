// src/telemetry.ts
// Wires up OTLP metrics and logs (no traces) shipped to the shared
// infrastructure/monitoring stack's Alloy collector. Must be imported
// first, before express/http, so the auto-instrumentations can patch
// those modules before they're used.
import { diag, DiagConsoleLogger, DiagLogLevel, metrics } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { LoggerProvider, BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";

const SERVICE_NAME = "peninei-backend";

const endpoint = (
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://alloy:4318"
).replace(/\/$/, "");

function parseHeaders(raw: string | undefined): Record<string, string> {
    const headers: Record<string, string> = {};
    (raw || "").split(",").forEach((pair) => {
        if (!pair.trim()) return;
        const [key, ...rest] = pair.split("=");
        headers[key.trim()] = rest.join("=").trim();
    });
    return headers;
}

const headers = parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);

if (process.env.BACKEND_OTEL_DEBUG === "true") {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
}

const resource = resourceFromAttributes({
    "service.name": SERVICE_NAME,
    "service.namespace": "peninei",
    "deployment.environment": process.env.DEPLOYMENT_ENV || "production",
});

// Metrics
const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
        url: `${endpoint}/v1/metrics`,
        headers,
    }),
    exportIntervalMillis: 5000,
});
const meterProvider = new MeterProvider({ resource, readers: [metricReader] });
metrics.setGlobalMeterProvider(meterProvider);

// Logs - Winston log records are forwarded here in addition to the
// existing console/file transports (see logger.js), via instrumentation-winston.
const loggerProvider = new LoggerProvider({
    resource,
    processors: [
        new BatchLogRecordProcessor({
            exporter: new OTLPLogExporter({
                url: `${endpoint}/v1/logs`,
                headers,
            }),
        }),
    ],
});
logs.setGlobalLoggerProvider(loggerProvider);

registerInstrumentations({
    instrumentations: [
        new HttpInstrumentation(),
        new ExpressInstrumentation(),
        new WinstonInstrumentation(),
    ],
});

export const meter = metrics.getMeter(SERVICE_NAME);

// HTTP request metrics (drive req/s and latency dashboards in Grafana)
export const httpRequestsTotal = meter.createCounter("http_requests_total", {
    description: "Total HTTP requests handled",
});
export const httpRequestDuration = meter.createHistogram(
    "http_request_duration_ms",
    { description: "HTTP request duration", unit: "ms" }
);

// Halacha sync endpoint
export const syncRequestsTotal = meter.createCounter("sync_requests_total", {
    description: "Total /halachot/sync requests",
});
export const syncDuration = meter.createHistogram("sync_duration_ms", {
    description: "Duration of /halachot/sync requests",
    unit: "ms",
});

// Scraper job
export const halachasScrapedTotal = meter.createCounter(
    "halachas_scraped_total",
    { description: "Total halachot saved by the scraper" }
);
export const scrapeDuration = meter.createHistogram(
    "halacha_scrape_duration_ms",
    { description: "Duration of a per-date scrape", unit: "ms" }
);

// AI parsing job
export const halachasAiParsedTotal = meter.createCounter(
    "halachas_ai_parsed_total",
    { description: "Total halachot processed by the AI parser" }
);
