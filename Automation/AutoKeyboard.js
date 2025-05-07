function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
  

class AutoKeyboard {

    view;
    promises = {};

    constructor(browserView){
        this.view = browserView;

        this.view.webContents.on("before-input-event", (event, input) => {
            console.log(input);
            if(this.promises[input.type]) this.promises[input.type].resolve();

        });
        
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

    type( value, speed=100 ){
        const self = this;
        const chars = value.split('');
        //debug(chars);
        return new Promise((resolve, reject) => {
            function typeNextChar(){
                if(chars.length == 0) return resolve(true)
                const char = chars.shift();
                const modifiers = [];
                if(/[A-Z]/.test(char)) modifiers.push('shift');
                console.log('Typing', char);
                self.keyPress(char, modifiers).then(() => delay(speed)).then(typeNextChar);
            }

            typeNextChar();

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

    callback( action, params ){
        switch( action ){
            case 'keydown':
            if(this.promises.keyDown) this.promises.keyDown.resolve();
            break;
            case 'keyup':
            if(this.promises.keyUp) this.promises.keyUp.resolve();
            break;
        }
    }
}

export default AutoKeyboard;