import fs from "node:fs";
import path from "path";
import * as url from "url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const DEFAULT_PRELOAD = path.resolve(__dirname, "../Renderer/preload.mjs");
const DEFAULT_HOMEPAGE = path.resolve(__dirname, "../views/default.html");

const electronBrowserWindowOptions = [
    "width",
    "height",
    "x",
    "y",
    "useContentSize",
    "center",
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight",
    "resizable",
    "movable",
    "minimizable",
    "maximizable",
    "closable",
    "focusable",
    "alwaysOnTop",
    "fullscreen",
    "fullscreenable",
    "simpleFullscreen",
    "skipTaskbar",
    "kiosk",
    "title",
    "icon",
    "frame",
    "parent",
    "modal",
    "acceptFirstMouse",
    "disableAutoHideCursor",
    "autoHideMenuBar",
    "enableLargerThanScreen",
    "backgroundColor",
    "hasShadow",
    "opacity",
    "transparent",
    "type",
    "titleBarStyle",
    "trafficLightPosition",
    "fullscreenWindowTitle",
    "thickFrame",
    "vibrancy",
    "zoomToPageWidth",
    "tabbingIdentifier",
    "webPreferences",
    "show",
    "paintWhenInitiallyHidden",
    "safeStorageKey",
    "visualEffectState",
];

const electronWebPreferencesOptions = [
    "devTools",
    "nodeIntegration",
    "nodeIntegrationInWorker",
    "nodeIntegrationInSubFrames",
    "preload",
    "sandbox",
    "contextIsolation",
    "enableRemoteModule",
    "affinity",
    "webSecurity",
    "allowRunningInsecureContent",
    "images",
    "java",
    "textAreasAreResizable",
    "webgl",
    "webviewTag",
    "spellcheck",
    "enableWebSQL",
    "v8CacheOptions",
    "enablePreferredSizeMode",
    "disableHtmlFullscreenWindowResize",
    "backgroundThrottling",
    "offscreen",
    "transparentBackground",
    "disableDialogs",
    "navigateOnDragDrop",
    "autoplayPolicy",
    "safeDialogs",
    "safeDialogsMessage",
    "disableBlinkFeatures",
    "enableBlinkFeatures",
    "defaultFontFamily",
    "defaultFontSize",
    "defaultMonospaceFontSize",
    "minimumFontSize",
    "defaultEncoding",
    "offscreen",
    "partition",
    "zoomFactor",
    "javascript",
    "webaudio",
    "webauthn",
    "webgl2",
    "plugins",
    "siteInstance",
    "disableSiteInstanceRemoval",
    "additionalArguments",
    "extraHeaders",
];

const DEFAULT_OPTIONS = {
    title: "Vision View",
    show: true,
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        preload: DEFAULT_PRELOAD,
    },
};

function buildPreload(contents) {
    const urlPattern = /^(https?:\/\/|\/\/|\/|\.\.?\/|[a-zA-Z]:\\|file:\/\/)/;

    return contents
        .map((source) => {
            if (urlPattern.test(source)) {
                try {
                    return fs.readFileSync(source, "utf8");
                } catch (e) {
                    console.error(e);
                    return "";
                }
            } else {
                return source;
            }
        })
        .join("\n");
}

function mergeOptions(keys, options, defaults) {
    return keys.reduce((acc, key) => {
        if (key === "preload") {
            const ploads = Array.isArray(options[key]) ? options[key] : [options[key] || ""];
            if (!ploads.includes(DEFAULT_PRELOAD)) {
                ploads.push(DEFAULT_PRELOAD);
            }
            console.log(ploads);
            options[key] = ploads;
            console.log(buildPreload(ploads));
            acc[key] = `data:text/javascript;base64,${Buffer.from(buildPreload(ploads)).toString("base64")}`;
            return acc;
        }
        if (key === "webPreferences") {
            acc[key] = mergeOptions(electronWebPreferencesOptions, options[key], defaults[key]);
            return acc;
        }
        if (options[key] !== undefined) {
            acc[key] = options[key];
        } else if (defaults[key] !== undefined) {
            acc[key] = defaults[key];
        }
        return acc;
    }, {});
}

export function extractOptions(options) {
    return mergeOptions(electronBrowserWindowOptions, options, DEFAULT_OPTIONS);
}

export default electronBrowserWindowOptions;
