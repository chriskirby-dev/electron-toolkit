class OverlayPlugin {}

export function install(window) {}

export function initialize(window) {
    const mainViewOverlay = this.createContentView("overlay", {
        isMainView: false,
        x: window.x,
        y: window.y,
        width: window.width,
        height: window.height,
        debug: true,
        webPreferences: {
            nodeIntegration: true,
            preload: path.resolve(__dirname, "..", "preload/overlay.mjs"),
        },
    });

    //window.on("", () => {});

    window.overlay = mainViewOverlay;

    mainViewOverlay.setBackgroundColor("blue");
}
