import time
import random
import logging
import uuid

from opentelemetry.sdk.resources import Resource
# from opentelemetry.sdk.trace import TracerProvider
# from opentelemetry.sdk.trace.export import BatchSpanProcessor
# from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# from opentelemetry.sdk.metrics import MeterProvider
# from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
# from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader

from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor


OTEL_ENDPOINT = "http://localhost:4318"

# --------------------------
# OpenTelemetry setup
# --------------------------

resource = Resource.create({
    "service.name": "python-test-service",
    "service.instance.id": str(uuid.uuid4())
})

# # ---- Traces ----
# trace_provider = TracerProvider(resource=resource)
# trace.set_tracer_provider(trace_provider)
# trace_provider.add_span_processor(
#     BatchSpanProcessor(
#         OTLPSpanExporter(endpoint=f"{OTEL_ENDPOINT}/v1/traces")
#     )
# )
# tracer = trace.get_tracer(__name__)

# # ---- Metrics ----
# metric_exporter = OTLPMetricExporter(endpoint=f"{OTEL_ENDPOINT}/v1/metrics")
# reader = PeriodicExportingMetricReader(metric_exporter, export_interval_millis=2000)
# metrics_provider = MeterProvider(resource=resource, metric_readers=[reader])
# metrics.set_meter_provider(metrics_provider)
# meter = metrics.get_meter(__name__)

# request_counter = meter.create_counter("http_requests_total")
# error_counter = meter.create_counter("http_errors_total")
# latency_histogram = meter.create_histogram("http_request_latency_ms")

# ---- Logs ----
log_exporter = OTLPLogExporter(endpoint=f"{OTEL_ENDPOINT}/v1/logs")
log_provider = LoggerProvider(resource=resource)
log_provider.add_log_record_processor(
    BatchLogRecordProcessor(log_exporter)
)
handler = LoggingHandler(level=logging.DEBUG, logger_provider=log_provider)

logger = logging.getLogger("app-logger")
logger.setLevel(logging.DEBUG)
logger.addHandler(handler)


# --------------------------
# Realistic log messages
# --------------------------

INFO_MESSAGES = [
    "User logged in successfully",
    "Background sync completed",
    "Cache warmed successfully",
    "Email sent to user",
    "Scheduled job executed",
]

DEBUG_MESSAGES = [
    "Database query executed",
    "Retrying connection to upstream service",
    "Loading user session from cache",
    "Preparing response object",
    "Validation passed",
]

WARNING_MESSAGES = [
    "Slow response detected",
    "Cache miss for key",
    "Retry threshold increasing",
    "High memory usage detected",
]

ERROR_MESSAGES = [
    "Failed to load user profile",
    "Database connection timeout",
    "Unable to fetch external API resource",
    "Cache deserialization error",
]

CRITICAL_MESSAGES = [
    "CRITICAL: System overload detected",
    "CRITICAL: Unrecoverable failure in worker pool",
    "CRITICAL: Data corruption suspected",
]


def random_log_message():
    level = random.choices(
        ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        weights=[0.25, 0.35, 0.20, 0.15, 0.05]
    )[0]

    user_id = random.randint(1, 500)
    request_id = str(uuid.uuid4())

    message_map = {
        "DEBUG": DEBUG_MESSAGES,
        "INFO": INFO_MESSAGES,
        "WARNING": WARNING_MESSAGES,
        "ERROR": ERROR_MESSAGES,
        "CRITICAL": CRITICAL_MESSAGES,
    }

    message = random.choice(message_map[level])

    extra = {
        "user_id": user_id,
        "request_id": request_id,
        "path": random.choice(["/login", "/checkout", "/profile", "/search"]),
        "method": random.choice(["GET", "POST", "PUT"]),
    }

    return level, f"{message}", extra


# --------------------------
# Realistic trace simulation
# --------------------------

# def simulate_trace():
#     with tracer.start_as_current_span("http_request") as span:
#         span.set_attribute("http.method", "GET")
#         span.set_attribute("user.id", random.randint(1, 500))

#         # DB span
#         with tracer.start_as_current_span("db_query"):
#             time.sleep(random.uniform(0.01, 0.05))

#         # Cache span
#         with tracer.start_as_current_span("cache_lookup"):
#             if random.random() < 0.2:
#                 time.sleep(0.02)  # slow
#             else:
#                 time.sleep(0.005)

#         # Simulate processing
#         time.sleep(random.uniform(0.01, 0.03))


# --------------------------
# Main loop
# --------------------------

print("Sending realistic logs, traces & metrics to OpenTelemetry Collector...")

while True:
    # Generate and send log
    level, msg, extra = random_log_message()
    logger.log(getattr(logging, level), msg, extra=extra)

    # Simulate a trace
    # simulate_trace()

    # Metrics
    # latency = random.uniform(30, 200)
    # latency_histogram.record(latency)

    # request_counter.add(1)

    # if level in ["ERROR", "CRITICAL"]:
    #     error_counter.add(1)

    time.sleep(0.7)