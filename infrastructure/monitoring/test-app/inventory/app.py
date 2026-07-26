import logging
import os
import random
import sys
import time

from flask import Flask, jsonify, request
from opentelemetry.instrumentation.flask import FlaskInstrumentor

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from common.telemetry import setup_telemetry  # noqa: E402

SERVICE_NAME = "inventory"
tracer, meter = setup_telemetry(SERVICE_NAME)
log = logging.getLogger(SERVICE_NAME)

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)

# "gizmo" is deliberately low-stock and "unobtainium" doesn't exist, so both
# reliably produce out-of-stock errors for testing.
STOCK = {"widget": 200, "gadget": 60, "gizmo": 6, "doohickey": 100}

reserve_duration = meter.create_histogram("inventory.reserve.duration", unit="ms")
stock_level = meter.create_up_down_counter("inventory.stock_level")


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.post("/reserve")
def reserve():
    payload = request.get_json(force=True)
    product_id = payload.get("product_id", "unknown")
    quantity = payload.get("quantity", 1)

    start = time.time()
    time.sleep(random.uniform(0.01, 0.08))  # simulate a DB round-trip

    available = STOCK.get(product_id, 0)
    if available < quantity:
        reserve_duration.record((time.time() - start) * 1000, {"result": "rejected"})
        log.warning(
            "reservation rejected product_id=%s requested=%s available=%s",
            product_id, quantity, available,
        )
        return jsonify(error="insufficient_stock", available=available), 409

    STOCK[product_id] -= quantity
    stock_level.add(-quantity, {"product_id": product_id})
    reserve_duration.record((time.time() - start) * 1000, {"result": "reserved"})
    log.info("reserved product_id=%s quantity=%s remaining=%s", product_id, quantity, STOCK[product_id])
    return jsonify(status="reserved", remaining=STOCK[product_id])


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, threaded=True)
