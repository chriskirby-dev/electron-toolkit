import FluxBrowserWindow from './FluxBrowserWindow.js';

class FluxWorker extends FluxBrowserWindow {

    toolbar = false;
    tabs = false;

    constructor( options={} ){
        options.tabs = false;
        options.toolbar = false;
        options.show = false;
        super(options);
        
    }
}