class SocketMessage{
    constructor(){
        /**
         * Moment où le messag a été emis
         * @type {string}
         */
        this.time=new Date().toLocaleString();
        /**
         * Un message pour les logs mais sans logique applicative.
         * @type {string|string}
         */
        this.msg=null;
    }
}