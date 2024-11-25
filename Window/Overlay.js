import FluxBrowserWindow from "../Base/FluxBrowserWindow.js";
import { Window } from "../vendor/windows-koffi";
class Overlay extends FluxBrowserWindow {
    constructor(target, options) {
        options.alwaysOnTop = true;
        (options.transparent = true), (options.frame = false);
        if (!options.webPreferences) options.webPreferences = {};
        options.webPreferences.preload = "../Renderer/preload.js";
        super(options);
        this._target = target;
    }

    initialize() {
        const { config, options, _target } = this;

        if (_target) {
            this.target = Window.from(_target);
            this.target.onChange((e) => {
                if (e.isMoved) {
                    this.x = win.client.x;
                    this.y = win.client.y;
                }

                if (e.isResized) {
                    this.width = win.rect.width;
                    this.height = win.rect.height;
                }
                this.setAlwaysOnTop(true, "screen");
            });
        }
    }
}
