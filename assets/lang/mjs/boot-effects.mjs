const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;

export const BootEffects = {
    sleep(milliseconds) {
        return new Promise(resolve => {
            setTimeout(
                resolve,
                reducedMotion ? 0 : milliseconds
            );
        });
    },

    async progress(callback, duration = 1200) {
        const steps = reducedMotion ? 1 : 50;

        for (let step = 0; step <= steps; step++) {
            const percentage = Math.round(
                (step / steps) * 100
            );

            callback(percentage);

            await this.sleep(duration / steps);
        }
    },

    async typeText(element, text, speed = 20) {
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

    createLog(messages) {
        return messages.map(message => {
            const timestamp = new Date()
                .toLocaleTimeString();

            return `[${timestamp}] ${message}`;
        });
    },

    get reducedMotion() {
        return reducedMotion;
    }
};
