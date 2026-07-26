import logging
import os
import random
import sys
import time

from flask import Flask, jsonify, request
from opentelemetry.instrumentation.flask import FlaskInstrumentor

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from common.telemetry import setup_telemetry  # noqa: E402

SERVICE_NAME = "payments"
tracer, meter = setup_telemetry(SERVICE_NAME)
log = logging.getLogger(SERVICE_NAME)

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)

charge_duration = meter.create_histogram("payments.charge.duration", unit="ms")
charge_total = meter.create_counter("payments.charge.total")

DECLINE_RATE = float(os.environ.get("PAYMENTS_DECLINE_RATE", "0.08"))


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.post("/charge")
def charge():
    payload = request.get_json(force=True)
    order_id = payload.get("order_id", "unknown")
    amount = payload.get("amount", 0)

    start = time.time()
    time.sleep(random.uniform(0.05, 0.3))  # simulate a payment processor round-trip

    if random.random() < DECLINE_RATE:
        charge_total.add(1, {"result": "declined"})
        charge_duration.record((time.time() - start) * 1000, {"result": "declined"})
        log.error("payment declined order_id=%s amount=%.2f", order_id, amount)
        return jsonify(error="declined"), 402

    charge_total.add(1, {"result": "approved"})
    charge_duration.record((time.time() - start) * 1000, {"result": "approved"})
    log.info("payment approved order_id=%s amount=%.2f", order_id, amount)
    return jsonify(status="approved", order_id=order_id)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003, threaded=True)
