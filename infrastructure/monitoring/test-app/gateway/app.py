import logging
import os
import sys
import time

import requests
from flask import Flask, jsonify, request
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from common.telemetry import setup_telemetry  # noqa: E402

SERVICE_NAME = "gateway"
tracer, meter = setup_telemetry(SERVICE_NAME)
log = logging.getLogger(SERVICE_NAME)

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

ORDERS_URL = os.environ.get("ORDERS_URL", "http://orders:5001")

checkout_requests = meter.create_counter(
    "gateway.checkout.requests", description="Checkout requests received"
)
checkout_duration = meter.create_histogram(
    "gateway.checkout.duration", unit="ms", description="End-to-end checkout latency"
)


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.post("/checkout")
def checkout():
    payload = request.get_json(force=True)
    product_id = payload.get("product_id", "unknown")
    quantity = payload.get("quantity", 1)

    checkout_requests.add(1, {"product_id": product_id})
    log.info("checkout received product_id=%s quantity=%s", product_id, quantity)

    start = time.time()
    try:
        resp = requests.post(f"{ORDERS_URL}/orders", json=payload, timeout=5)
        result = resp.json()
        if resp.status_code >= 400:
            log.warning(
                "checkout rejected product_id=%s status=%s error=%s",
                product_id, resp.status_code, result.get("error"),
            )
        else:
            log.info("checkout succeeded order_id=%s", result.get("order_id"))
        return jsonify(result), resp.status_code
    except requests.RequestException as exc:
        log.error("checkout failed calling orders service: %s", exc)
        return jsonify(error="orders_service_unavailable"), 502
    finally:
        checkout_duration.record((time.time() - start) * 1000, {"product_id": product_id})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, threaded=True)
