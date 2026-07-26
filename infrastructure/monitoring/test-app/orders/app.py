import logging
import os
import sys
import time
import uuid

import requests
from flask import Flask, jsonify, request
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.trace import Status, StatusCode

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from common.telemetry import setup_telemetry  # noqa: E402

SERVICE_NAME = "orders"
tracer, meter = setup_telemetry(SERVICE_NAME)
log = logging.getLogger(SERVICE_NAME)

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

INVENTORY_URL = os.environ.get("INVENTORY_URL", "http://inventory:5002")
PAYMENTS_URL = os.environ.get("PAYMENTS_URL", "http://payments:5003")

orders_created = meter.create_counter("orders.created")
orders_failed = meter.create_counter("orders.failed")
order_duration = meter.create_histogram("orders.duration", unit="ms")


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.post("/orders")
def create_order():
    payload = request.get_json(force=True)
    product_id = payload.get("product_id", "unknown")
    quantity = payload.get("quantity", 1)
    order_id = str(uuid.uuid4())[:8]
    start = time.time()

    with tracer.start_as_current_span("reserve_inventory") as span:
        span.set_attribute("product_id", product_id)
        span.set_attribute("quantity", quantity)
        inv_resp = requests.post(
            f"{INVENTORY_URL}/reserve",
            json={"product_id": product_id, "quantity": quantity},
            timeout=5,
        )
        if inv_resp.status_code != 200:
            span.set_status(Status(StatusCode.ERROR, "insufficient stock"))

    if inv_resp.status_code != 200:
        orders_failed.add(1, {"reason": "out_of_stock"})
        order_duration.record((time.time() - start) * 1000, {"result": "out_of_stock"})
        log.warning(
            "order %s failed: out of stock for product_id=%s quantity=%s",
            order_id, product_id, quantity,
        )
        return jsonify(error="out_of_stock", order_id=order_id), 409

    amount = round(quantity * 19.99, 2)
    with tracer.start_as_current_span("charge_payment") as span:
        span.set_attribute("order_id", order_id)
        span.set_attribute("amount", amount)
        pay_resp = requests.post(
            f"{PAYMENTS_URL}/charge",
            json={"order_id": order_id, "amount": amount},
            timeout=5,
        )
        if pay_resp.status_code != 200:
            span.set_status(Status(StatusCode.ERROR, "payment declined"))

    if pay_resp.status_code != 200:
        orders_failed.add(1, {"reason": "payment_declined"})
        order_duration.record((time.time() - start) * 1000, {"result": "payment_declined"})
        log.error("order %s failed: payment declined amount=%.2f", order_id, amount)
        return jsonify(error="payment_declined", order_id=order_id), 402

    orders_created.add(1, {"product_id": product_id})
    order_duration.record((time.time() - start) * 1000, {"result": "confirmed"})
    log.info("order %s created for product_id=%s quantity=%s amount=%.2f", order_id, product_id, quantity, amount)
    return jsonify(order_id=order_id, status="confirmed")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, threaded=True)
