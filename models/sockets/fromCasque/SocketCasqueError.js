/**
 * Quand le casque est face à une erreur...
 */
class SocketCasqueError extends SocketMessage{
    constructor(){
        super();
        /**
         * Code erreur
         * @type {null|string}
         */
        this.errorCode=null;

    }
}

SocketCasqueError.ERROR_CONTENU_INTROUVABLE="ERROR_CONTENU_INTROUVABLE";