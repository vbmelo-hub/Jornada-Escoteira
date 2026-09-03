(() => {
    "use strict";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function initNavigation() {
        const toggle = document.querySelector(".nav-toggle");
        const nav = document.querySelector(".site-nav");
        const closeButton = document.querySelector(".drawer-close");
        const backdrop = document.querySelector("[data-nav-backdrop]");
        if (!toggle || !nav) return;

        const setOpen = (open) => {
            const isMobile = window.innerWidth <= 900;
            const shouldOpen = isMobile && open;
            document.body.classList.toggle("is-nav-open", shouldOpen);
            toggle.setAttribute("aria-expanded", String(shouldOpen));
            toggle.setAttribute("aria-label", shouldOpen ? "Fechar menu" : "Abrir menu");
            backdrop?.setAttribute("aria-hidden", String(!shouldOpen));
            nav.inert = isMobile && !shouldOpen;
            if (isMobile) nav.setAttribute("aria-hidden", String(!shouldOpen));
            else nav.removeAttribute("aria-hidden");
            if (shouldOpen) {
                const active = nav.querySelector('[aria-current="page"]') || nav.querySelector("a");
                window.setTimeout(() => active?.focus({ preventScroll: true }), reduceMotion ? 0 : 180);
            }
        };

        toggle.addEventListener("click", () => setOpen(!document.body.classList.contains("is-nav-open")));
        closeButton?.addEventListener("click", () => { setOpen(false); toggle.focus(); });
        backdrop?.addEventListener("click", () => setOpen(false));
        nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setOpen(false)));
        document.addEventListener("keydown", (event) => {
            if (!document.body.classList.contains("is-nav-open")) return;
            if (event.key === "Escape") {
                setOpen(false);
                toggle.focus();
                return;
            }
            if (event.key === "Tab") {
                const focusables = [...nav.querySelectorAll('a[href], button:not([disabled])')].filter(el => !el.hidden);
                if (!focusables.length) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        });
        window.addEventListener("resize", () => setOpen(false), { passive: true });
        setOpen(false);
    }

    function initTimeline() {
        const items = [...document.querySelectorAll("[data-timeline-item]")];
        if (!items.length) return;
        if (reduceMotion || !("IntersectionObserver" in window)) {
            items.forEach(item => item.classList.add("is-visible"));
            return;
        }
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    obs.unobserve(entry.target);
                }
            });
        }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
        items.forEach(item => observer.observe(item));
    }

    function initBackToTop() {
        const button = document.getElementById("voltarTopo");
        if (!button) return;
        let ticking = false;
        const update = () => {
            button.classList.toggle("is-visible", window.scrollY > 420);
            ticking = false;
        };
        window.addEventListener("scroll", () => {
            if (!ticking) {
                window.requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
        button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));
        update();
    }

    function initGallery() {
        const items = [...document.querySelectorAll("[data-gallery-item]")];
        const lightbox = document.querySelector("[data-lightbox]");
        const image = lightbox?.querySelector("[data-lightbox-image]");
        const caption = lightbox?.querySelector("[data-lightbox-caption]");
        const close = lightbox?.querySelector(".lightbox-close");
        const prev = lightbox?.querySelector(".lightbox-prev");
        const next = lightbox?.querySelector(".lightbox-next");
        if (!items.length || !lightbox || !image) return;

        let index = 0;
        let lastFocus = null;
        let touchStartX = null;

        const render = () => {
            const item = items[index];
            const thumb = item.querySelector("img");
            image.src = item.dataset.full;
            image.alt = thumb?.alt || "Registro ampliado da trajetória escoteira";
            if (caption) caption.textContent = `Foto ${index + 1} de ${items.length}`;
        };
        const open = (newIndex, trigger) => {
            index = newIndex;
            lastFocus = trigger;
            render();
            lightbox.hidden = false;
            document.body.classList.add("is-lightbox-open");
            close?.focus({ preventScroll: true });
        };
        const closeBox = () => {
            lightbox.hidden = true;
            document.body.classList.remove("is-lightbox-open");
            image.src = "";
            lastFocus?.focus({ preventScroll: true });
        };
        const move = delta => { index = (index + delta + items.length) % items.length; render(); };

        items.forEach((item, i) => item.addEventListener("click", () => open(i, item)));
        close?.addEventListener("click", closeBox);
        prev?.addEventListener("click", () => move(-1));
        next?.addEventListener("click", () => move(1));
        lightbox.addEventListener("click", event => { if (event.target === lightbox) closeBox(); });
        document.addEventListener("keydown", event => {
            if (lightbox.hidden) return;
            if (event.key === "Escape") { closeBox(); return; }
            if (event.key === "ArrowLeft") { move(-1); return; }
            if (event.key === "ArrowRight") { move(1); return; }
            if (event.key === "Tab") {
                const focusables = [...lightbox.querySelectorAll('button:not([disabled])')];
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        });
        lightbox.addEventListener("touchstart", e => { touchStartX = e.changedTouches[0]?.clientX ?? null; }, { passive: true });
        lightbox.addEventListener("touchend", e => {
            if (touchStartX === null) return;
            const delta = (e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
            if (Math.abs(delta) > 55) move(delta > 0 ? -1 : 1);
            touchStartX = null;
        }, { passive: true });
    }

    function initContactForm() {
        const form = document.querySelector("[data-contact-form]");
        if (!form) return;
        const button = form.querySelector('button[type="submit"]');
        const label = form.querySelector("[data-submit-label]");
        const status = form.querySelector("[data-form-status]");
        const defaultLabel = label?.textContent.trim() || "Enviar mensagem";

        form.addEventListener("submit", async event => {
            event.preventDefault();
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            status?.classList.remove("is-success", "is-error");
            if (status) status.textContent = "";
            if (button) button.disabled = true;
            if (label) label.textContent = "Enviando...";
            form.setAttribute("aria-busy", "true");
            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    body: new FormData(form),
                    headers: { Accept: "application/json" }
                });
                if (!response.ok) throw new Error(`Formspree respondeu com status ${response.status}`);
                form.reset();
                if (status) {
                    status.textContent = "Mensagem enviada com sucesso!";
                    status.classList.add("is-success");
                }
            } catch (error) {
                console.error("Falha ao enviar o formulário:", error);
                if (status) {
                    status.textContent = "Não foi possível enviar a mensagem. Tente novamente.";
                    status.classList.add("is-error");
                }
            } finally {
                form.removeAttribute("aria-busy");
                if (button) button.disabled = false;
                if (label) label.textContent = defaultLabel;
            }
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        initNavigation();
        initTimeline();
        initBackToTop();
        initGallery();
        initContactForm();
    });
})();
