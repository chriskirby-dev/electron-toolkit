import { MessageChannelMain, ipcMain } from "electron";

import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export const name = "Docked";

export const path = __filename;

export function install(window) {
    window.docked = {};

    window.getDockedPosition = function () {
        const pos = { x: 0, y: 0 };
        const { target, position } = this.docked;

        if (position.includes("top")) {
            this.docked.offset.y = 0;
        } else if (position.includes("bottom")) {
            this.docked.offset.y = target.height - this.height;
        }

        if (position.includes("left")) {
            this.docked.offset.x = -this.width;
        } else if (position.includes("right")) {
            this.docked.offset.x = target.width;
        }
    };

    window.getDockedPosition.bind(window);

    window.dockTo = function (target, position, offset = { x: 0, y: 0 }) {
        this.docked = {
            search: target,
            position: position,
            offset: offset,
            attempts: this.docked.attempts || 0,
        };

        this.docked.target = Window.search(this.docked.search)[0];

        if (this.docked.target) {
            const { x, y } = this.getDockedPosition();
        } else {
            setTimeout(() => this.dockTo(target, position, offset), 1000);
            return;
        }

        console.log("dockTo", this.docked.target);

        this.docked.target.onChange((e) => {
            console.log("onChange", e);
            if (e.isMoved) {
                this.x = e.client.x;
                this.y = e.client.y;
            }

            if (e.isResized) {
                this.width = e.client.width;
                this.height = e.client.height;
            }
            this.setAlwaysOnTop(true, "screen");
        });

        this.x = this.docked.target.client.x;
        this.y = this.docked.target.client.y;
        this.width = this.docked.target.client.width;
        this.height = this.docked.target.client.height;

        this.targetWindow = targetWindow;
        this.emit("target-docked", this.targetWindow);
    };

    window.dockTo.bind(window);
}
