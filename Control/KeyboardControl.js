
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class KeyboardControl {

    promises = {};
    webContents;

    constructor(webContents){
        this.webContents = webContents;
        this.initialize();
    }

    keyUp( keyCode, modifiers=[] ){
        return this.event( 'keyUp', keyCode, modifiers );
    }

    keyDown( key ){
        return this.event( 'keyUp', keyCode, modifiers );
    }

    keyPress( keyCode, modifiers=[], duration ){
        return this.event( 'keyDown', keyCode, modifiers ).then(() =>{
            this.event('char', keyCode, modifiers);
            return this.event( 'keyUp', keyCode, modifiers );
        });
    }

    event( type, keyCode, modifiers=[] ){

        const event = { type, keyCode, modifiers };

        return new Promise( (resolve, reject) => {
            this.promises[type] = { resolve, reject };
            ////debug('SENDING', event.type, event );
            this.view.webContents.sendInputEvent(event);
        });
    }

    hook( action, params ){
        switch( action ){
            case 'keydown':
            if(this.promises.keyDown) this.promises.keyDown.resolve();
            break;
            case 'keyup':
            if(this.promises.keyUp) this.promises.keyUp.resolve();
            break;
        }
    }

    initialize(){
        /*
        this.webContents.on("before-input-event", (event, input) => {
            console.log(input);
            if(this.promises[input.type]) this.promises[input.type].resolve();

        });*/
    }
}

export default KeyboardControl;