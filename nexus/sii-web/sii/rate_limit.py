"""Control de ritmo para imitar a un humano y evitar bloqueos."""
from __future__ import annotations

import logging
import random
import time

log = logging.getLogger("sii.rate_limit")


class Throttle:
    """Inserta pausas aleatorias entre peticiones."""

    def __init__(self, delay_min: float, delay_max: float):
        self.delay_min = max(0.0, delay_min)
        self.delay_max = max(self.delay_min, delay_max)
        self._last: float | None = None

    def wait(self) -> None:
        pause = random.uniform(self.delay_min, self.delay_max)
        if self._last is not None:
            elapsed = time.monotonic() - self._last
            remaining = pause - elapsed
            if remaining > 0:
                log.debug("Pausa anti-bloqueo: %.1fs", remaining)
                time.sleep(remaining)
        else:
            time.sleep(pause)
        self._last = time.monotonic()
