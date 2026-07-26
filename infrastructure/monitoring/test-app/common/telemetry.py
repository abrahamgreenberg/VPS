import logging
import os

from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

try:
    from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
except ImportError:  # newer package layouts dropped the leading underscore
    from opentelemetry.exporter.otlp.proto.http.log_exporter import OTLPLogExporter


def _parse_headers(raw: str) -> dict:
    headers = {}
    for pair in raw.split(","):
        if not pair.strip():
            continue
        key, _, value = pair.partition("=")
        headers[key.strip()] = value.strip()
    return headers


def setup_telemetry(service_name: str):
    """Wires up OTLP traces, metrics and logs for one service, plus stdout logging."""
    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://alloy:4318").rstrip("/")
    headers = _parse_headers(os.environ.get("OTEL_EXPORTER_OTLP_HEADERS", ""))

    resource = Resource.create(
        {
            "service.name": service_name,
            "service.namespace": "shop-demo",
            "deployment.environment": os.environ.get("DEPLOYMENT_ENV", "demo"),
        }
    )

    logging.basicConfig(
        level=logging.INFO,
        format=f"%(asctime)s %(levelname)s [{service_name}] %(message)s",
    )

    # Traces
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=f"{endpoint}/v1/traces", headers=headers))
    )
    trace.set_tracer_provider(tracer_provider)

    # Metrics
    reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint=f"{endpoint}/v1/metrics", headers=headers),
        export_interval_millis=5000,
    )
    metrics.set_meter_provider(MeterProvider(resource=resource, metric_readers=[reader]))

    # Logs - forwarded to Loki (via Alloy) in addition to the stdout handler above
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(OTLPLogExporter(endpoint=f"{endpoint}/v1/logs", headers=headers))
    )
    otlp_handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
    logging.getLogger().addHandler(otlp_handler)

    # Injects trace_id/span_id into stdlib log records so they show up in the
    # console handler too, and so Loki logs can be correlated to Tempo traces.
    LoggingInstrumentor().instrument(set_logging_format=True)

    return trace.get_tracer(service_name), metrics.get_meter(service_name)
