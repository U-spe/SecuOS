const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;

export const BootEffects = {
    sleep(ms) {
        return new Promise(resolve =>
            setTimeout(resolve, reducedMotion ? 0 : ms)
        );
    },

    async progress(callback, duration = 1200) {
        const steps = reducedMotion ? 1 : 50;

        for (let step = 0; step <= steps; step++) {
            const value = Math.round(
                (step / steps) * 100
            );

            callback(value);

            await this.sleep(duration / steps);
        }
    },

    async typeText(element, text, speed = 18) {
        if (!element) return;

        element.textContent = "";

        for (const character of text) {
            element.textContent += character;
            await this.sleep(speed);
        }
    },

    transition(element, className = "boot-visible") {
        if (!element) return;

        element.classList.remove(className);

        requestAnimationFrame(() => {
            element.classList.add(className);
        });
    },

    createBootLog(messages) {
        return messages.map(message => {
            const timestamp = new Date()
                .toLocaleTimeString();

            return `[$DIL0] $DIL1`;
        });
    },

    async ambientSound(enabled = false) {
        if (!enabled || reducedMotion) return;

        // Audio is intentionally opt-in.
        // No audio plays without user permission.
        return;
    },

    get reducedMotion() {
        return reducedMotion;
    }
};
