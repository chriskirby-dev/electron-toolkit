class FulxControl {
    constructor(window) {
        this.window = window;
    }

    load(url) {
        return this.window.loadUrl(url);
    }

    forward() {
        if (this.window.webContents.canGoForward()) {
            this.window.webContents.goForward();
        }
    }

    back() {
        if (this.window.webContents.canGoBack()) {
            this.window.webContents.goBack();
        }
    }

    reload(ignoreCache) {
        this.window.webContents[ignoreCache ? "reloadIgnoringCache" : "reload"]();
    }

    stop() {
        this.window.webContents.stop();
    }
}
