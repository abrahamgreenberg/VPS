import logging
import os
import random
import time

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [load-generator] %(message)s")
log = logging.getLogger("load-generator")

GATEWAY_URL = os.environ.get("GATEWAY_URL", "http://gateway:5000")

# "unobtainium" always fails inventory, "gizmo" has low stock and fails once
# it runs out - both keep a steady trickle of errors flowing through the pipeline.
PRODUCTS = ["widget", "gadget", "gizmo", "doohickey", "unobtainium"]

if __name__ == "__main__":
    while True:
        product = random.choice(PRODUCTS)
        quantity = random.randint(1, 4)
        try:
            resp = requests.post(
                f"{GATEWAY_URL}/checkout",
                json={"product_id": product, "quantity": quantity},
                timeout=10,
            )
            log.info("checkout product=%s qty=%s -> %s %s", product, quantity, resp.status_code, resp.text[:200])
        except requests.RequestException as exc:
            log.error("checkout request failed: %s", exc)
        time.sleep(random.uniform(0.5, 2.5))
