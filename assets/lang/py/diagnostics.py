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

    # Python runtime
    check(
        "Python runtime",
        sys.version_info >= (3, 10),
        platform.python_version()
    )

    # Browser environment
    try:
        from js import window, navigator, document

        check(
            "Browser environment",
            True,
            navigator.userAgent
        )

        check(
            "Document access",
            document is not None,
            "DOM connection available",
            True
        )

        check(
            "Display dimensions",
            window.innerWidth > 0 and window.innerHeight > 0,
            f"{window.innerWidth}x{window.innerHeight}"
        )

        check(
            "Online connection",
            bool(navigator.onLine),
            "Online" if navigator.onLine else "Offline"
        )

        check(
            "Reduced motion preference",
            True,
            str(window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches)
        )

        check(
            "Secure context",
            bool(window.isSecureContext),
            "Secure context" if window.isSecureContext
            else "Not a secure context"
        )

    except Exception as error:
        check(
            "Browser bridge",
            False,
            str(error),
            True
        )

    elapsed = round((time.time() - started) * 1000, 2)

    return {
        "system": "SecuOS",
        "component": "Python Diagnostics",
        "runtime": platform.python_version(),
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
        "duration_ms": elapsed,
        "results": results
    }


report = run_diagnostics()

json.dumps(report)
