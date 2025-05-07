import EventEmitter from 'events';
import AutoMouse from './AutoMouse.js';
import AutoKeyboard from './AutoKeyboard.js';
import CDP from 'chrome-remote-interface';
import Dom from '../Dev/Dom/Dom.js';

class BrowserControl extends EventEmitter {

    constructor( browserView ){
        super();
        this.view = browserView;
        this.mouse = new AutoMouse(browserView);
        this.keyboard = new AutoKeyboard(browserView);
        this.dom = new Dom(browserView);

        this.dom.on('ready', () => { this.emit('ready'); } );
       // this.debugger = new Debugger(this.view);
    }

    inject( script ){
        this.view.webContents.executeJavaScript(`
            ${script}
        `);
    }

    injectPromise( script ){
        return this.view.webContents.executeJavaScript(`
            (function promise(){
                return new Promise(function(resolve, reject){
                    ${script}
                });
            })()
        `);
    }

    

    navigate(url){
        return this.dom.navigate(url);
    }

    async input( target, value ){
        //debug('CONTROL:INPUT', target, value );
        const formElement = await this.dom.querySelector( target.selector, null, true );
        //debug('formElement',formElement);
        const startValue = formElement.value;

        return this.mouse.moveSmooth( formElement.rect.left + 20, formElement.rect.top + (formElement.rect.height/2) ).then(() => {
            
            return this.mouse.click().then(() => {
            
                return this.keyboard.type( value ).then(async () => {
                    //Verify
                    const finalValue = await formElement.value;
                    if(finalValue == startValue+value) return true;
                    return false;
                });

            });
        });
    }

    mouseTo( x, y ){
        return this.mouse.moveSmooth( x, y ).then(() => {
            if(this.mouse.x == x && this.mouse.y == y) return true;
            return false;
        });
    }

    clickElement( target ){

    }
    
    clickPoint( x, y ){

    }

}


export default BrowserControl;