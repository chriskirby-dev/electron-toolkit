import MouseControl from './MouseControl.js';
import KeyboardControl from './KeyboardControl.js';
import EventEmitter from 'events';
import { MessageChannelMain } from 'electron';
import fs from 'fs';
import path from 'path';

class AutomateControl extends EventEmitter {

    

    webContents;

    constructor( webContents ){
        super();
        this.webContents = webContents;
        this.initialize();
    }

    parseMouseEvent( data ){
        return {
            x: data.x,
            y: data.y,
        }
    }

    parseKeyboardEvent(data){
        return {
            key: data.key,
        }
    }

    eventHook(event, data){
        if(['mousemove', 'mousedown', 'mouseup'].includes(event)){
            this.mouse.hook( event, this.parseMouseEvent(data) );
        }else if(['keydown', 'keyup'].includes(event)){
            this.keyboard.hook( event, this.parseKeyboardEvent(data) );
        }
    }

    initialize(){
        const { webContents } = this;
        this.mouse = new MouseControl( this.webContents );
        this.keyboard = new KeyboardControl( this.webContents );

        this.webContents.on('input-event', () => {

        });

        this.webContents.on('before-input-event', () => {

        });
        
    }

}

export default AutomateControl;