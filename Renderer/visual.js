class FluxVisual {
    /**
     * Highlights the element with the given selector
     *
     * @param {String} selector - the selector for the element
     */
    static highlight(selector) {
        const target = typeof selector == "string" ? document.querySelector(selector) : selector;
        const rect = target.getBoundingClientRect();

        const current = document.querySelector(".flux-highlight");
        if (current) {
            current.remove();
        }

        const highlight = document.createElement("div");
        highlight.className = "flux-highlight";
        highlight.style.position = "fixed";
        highlight.style.left = rect.left + "px";
        highlight.style.top = rect.top + "px";
        highlight.style.width = "1px";
        highlight.style.height = "1px";

        const highlightLeft = document.createElement("div");
        const highlightRight = document.createElement("div");
        const highlightTop = document.createElement("div");
        const highlightBottom = document.createElement("div");

        highlightLeft.style.position = "absolute";
        highlightRight.style.position = "absolute";
        highlightTop.style.position = "absolute";
        highlightBottom.style.position = "absolute";

        highlightLeft.style.backgroundColor = "#ab0900";
        highlightRight.style.backgroundColor = "#ab0900";
        highlightTop.style.backgroundColor = "#ab0900";
        highlightBottom.style.backgroundColor = "#ab0900";

        highlightLeft.style.top = 0;
        highlightLeft.style.left = 0;
        highlightLeft.style.width = "2px";
        highlightLeft.style.height = rect.height + "px";
        highlightLeft.style.zIndex = "9999";

        highlightRight.style.top = 0;
        highlightRight.style.left = rect.width + "px";
        highlightRight.style.width = "2px";
        highlightRight.style.height = rect.height + "px";
        highlightRight.style.zIndex = "9999";

        highlightTop.style.top = 0;
        highlightTop.style.left = 0;
        highlightTop.style.width = rect.width + "px";
        highlightTop.style.height = "2px";
        highlightTop.style.zIndex = "9999";

        highlightBottom.style.top = rect.height + "px";
        highlightBottom.style.left = 0;
        highlightBottom.style.width = rect.width + "px";
        highlightBottom.style.height = "2px";
        highlightBottom.style.zIndex = "9999";

        highlight.appendChild(highlightLeft);
        highlight.appendChild(highlightRight);
        highlight.appendChild(highlightTop);
        highlight.appendChild(highlightBottom);

        document.body.appendChild(highlight);
    }
}
