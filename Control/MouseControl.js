import Easing from "./Easing.mjs";

class MouseControl {
    promises = {};

    x = 0;
    y = 0;
    target = { x: 0, y: 0 };
    speed = { max: 200, current: 0 };

    constructor(webContents) {
        this.webContents = webContents;
    }

    move(x, y) {
        x += this.x;
        y += this.y;
        this.target = { x: Math.round(x), y: Math.round(y) };
        return this.send("mouseMove", options);
    }

    moveTo(x, y, options) {
        x = Math.round(x);
        y = Math.round(y);
        this.target = { x, y };
        return this.send("mouseMove", options);
    }

    moveSmooth(x, y) {
        const self = this;

        let promise;
        x = Math.round(x);
        y = Math.round(y);
        console.log("Smooth Move From", this.x, this.y, "To", x, y);

        //Mouse Position Already there nothing to do.
        if (this.x == x && this.y == y) return Promise.resolve();

        const start = { x: this.x, y: this.y };
        const distX = x - this.x;
        const distY = y - this.y;
        //Get total distance to target
        const distance = Math.sqrt(distX * distX + distY * distY);
        //Given Max Speed get duration
        const duration = (distance / this.speed.max) * 1000;
        let timeStart = Date.now();
        let time = 0;

        return new Promise((resolve, reject) => {
            const tick = () => {
                console.log("tick", self.x, self.y);
                time = Date.now() - timeStart;
                //Cap percentage at 1
                const percentage = Math.min(time / duration, 1);
                const targetX = start.x + Easing.easeInOut(time, duration) * distX;
                const targetY = start.y + Easing.easeInOut(time, duration) * distY;
                //Send MoveTo event and wait for completion
                self.moveTo(targetX, targetY).then(() => {
                    if (percentage >= 1) return resolve();
                    tick();
                });
            };

            tick();
        });
    }

    down(options = {}) {
        return this.send("mouseDown", options);
    }

    up(options = {}) {
        return this.send("mouseUp", options);
    }

    click(options) {
        return new Promise((resolve, reject) => {
            return this.down(options).then(() => {
                setTimeout(() => {
                    return this.up(options).then(() => {
                        return resolve();
                    });
                }, 200);
            });
        });
    }

    wheel() {
        var evt = {
            type: "mouseWheel",
            x: 1,
            y: 1,
            deltaX: 100,
            deltaY: 100,
            wheelTicksX: 10,
            wheelTicksY: 10,
            canScroll: true,
        };
        this.win.webContents.sendInputEvent(evt);
    }

    send(type, options = {}) {
        //type: mouseDown, mouseUp, mouseEnter, mouseLeave, contextMenu, mouseWheel or mouseMove.
        //bugtton: The button pressed, can be left, middle, right.
        const event = {
            type: type,
            ...this.target,
        };

        if (event.type == "mouseWheel") {
        } else if (["mouseDown", "mouseUp", "mouseEnter", "mouseLeave"].includes(event.type)) {
            const eventType = event.type.replace("mouse", "").toLowerCase();
            event.button = options.button || "left";
            event.clickCount = options.clickCount || 1;
            //debug(event);
            return new Promise((resolve, reject) => {
                this.promises[eventType] = { resolve, reject };
                this.webContents.sendInputEvent(event);
            });
        } else if (event.type === "mouseMove") {
            return new Promise((resolve, reject) => {
                if (event.x === this.x && event.y === this.y) {
                    return resolve();
                }
                this.promises.move = { resolve, reject };
                this.webContents.sendInputEvent(event);
            });
        }
    }

    hook(action, params) {
        // //debug('MOUSE CALLBACK', action, params, this.target );
        if (params.x) this.x = params.x;
        if (params.y) this.y = params.y;

        switch (action) {
            case "mousemove":
                if (this.promises.move && params.x === this.target.x && params.y === this.target.y) {
                    // //debug('Resolve Move Callback');
                    const resolve = this.promises.move.resolve;
                    delete this.promises.move;
                    resolve();
                }
                break;
            case "mousedown":
                if (this.promises.down) {
                    this.promises.down.resolve();
                    delete this.promises.down;
                }
                break;
            case "mouseup":
                if (this.promises.up) {
                    this.promises.up.resolve();
                    delete this.promises.up;
                }
                break;
            case "mouseenter":
                if (this.promises.enter) {
                    this.promises.enter.resolve();
                    delete this.promises.enter;
                }
                break;
            case "mouseleave":
                if (this.promises.leave) {
                    this.promises.leave.resolve();
                    delete this.promises.leave;
                }
                break;
            case "mousewheel":
                if (this.promises.wheel) {
                    this.promises.wheel.resolve();
                    delete this.promises.wheel;
                }
                break;
        }
    }
}

export default MouseControl;
