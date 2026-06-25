"""
Structured logging configuration for the Debate Arena application.

Provides a factory function for creating module-scoped loggers with
consistent formatting. Log level is driven by the ENVIRONMENT setting.
"""

import logging
import sys

from app.config import settings


_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
_DATE_FORMAT = "%Y-%m-%dT%H:%M:%S%z"

_configured = False


def _configure_root_logger() -> None:
    """One-time configuration of the root logger and stream handler."""
    global _configured
    if _configured:
        return

    level = logging.DEBUG if not settings.is_production else logging.INFO

    formatter = logging.Formatter(fmt=_LOG_FORMAT, datefmt=_DATE_FORMAT)

    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger("debate_arena")
    root.setLevel(level)
    root.addHandler(handler)
    root.propagate = False

    _configured = True


def get_logger(name: str) -> logging.Logger:
    """
    Return a child logger under the 'debate_arena' namespace.

    Args:
        name: Logical name for the logger, typically __name__ of the caller.

    Returns:
        A configured logging.Logger instance.
    """
    _configure_root_logger()
    return logging.getLogger(f"debate_arena.{name}")
