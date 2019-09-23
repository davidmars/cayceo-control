import SocketMessage from "../SocketMessage";

/**
 * Envoyé au casque pour arrêter/démarer une séance
 */
class SocketControlContenu extends SocketMessage{
    constructor(){
        super();
        /**
         * Si tue demande la lecture, si false demande son arrêt
         * @type {boolean}
         */
        this.play=false;
    }
}