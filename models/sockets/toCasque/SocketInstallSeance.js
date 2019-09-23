import SocketMessage from "../SocketMessage";

/**
 * Envoyé au casque pour installer une séance
 */
class SocketInstallSeance extends SocketMessage{
    constructor(){
        super();
        /**
         * url relative du contenu (bundle) sur le casque
         * @type {string}
         */
        this.contenu="";
        /**
         * Durée en secondes de la séance
         * @type {number}
         */
        this.dureeSecondes=0;

    }
}