import json
import platform
import sys
import time
from datetime import datetime, timezone

def run_diagnostics():
    started = time.time()
    results = []

    def check(name, passed, detail, critical=False):
        results.append({
            "name": name,
            "passed": bool(passed),
            "detail": str(detail),
            "critical": bool(critical)
        })

    check(
        "Python runtime",
        sys.version_info >= (3, 10),
        platform.python_version()
    )

    try:
        from js import window, navigator, document

        check(
            "Browser connection",
            window is not None,
            "Browser bridge available",
            True
        )

        check(
            "Document access",
            document is not None,
            "DOM connection available",
            True
        )

        width = int(window.innerWidth)
        height = int(window.innerHeight)

        check(
            "Display",
            width > 0 and height > 0,
            f"{width} x {height}"
        )

        check(
            "Internet connection",
            bool(navigator.onLine),
            "Online" if navigator.onLine else "Offline"
        )

        check(
            "Secure browser context",
            bool(window.isSecureContext),
            "HTTPS or localhost" if window.isSecureContext
            else "Not a secure context"
        )

        check(
            "Reduced motion",
            True,
            str(window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches)
        )

        desktop = document.querySelector("#desktop")

        check(
            "Desktop environment",
            desktop is not None,
            "Desktop element found" if desktop is not None
            else "Missing #desktop element",
            True
        )

        storage_available = False

        try:
            key = "__secuos_diagnostic_test__"
            window.localStorage.setItem(key, "test")
            window.localStorage.removeItem(key)
            storage_available = True
        except Exception:
            storage_available = False

        check(
            "Local storage",
            storage_available,
            "Profile storage available" if storage_available
            else "Browser storage unavailable",
            True
        )

    except Exception as error:
        check(
            "Browser integration",
            False,
            str(error),
            True
        )

    elapsed = round((time.time() - started) * 1000, 2)

    return {
        "system": "SecuOS",
        "component": "Python Diagnostics",
        "python_version": platform.python_version(),
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
        "duration_ms": elapsed,
        "results": results
    }


report = run_diagnostics()

json.dumps(report)
