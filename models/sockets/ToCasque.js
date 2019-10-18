/**
 * Message envoyé du meuble vers un casque
 */
class ToCasque{
    constructor(){
        /**
         * Un message pour les logs mais sans logique applicative.
         * @type {string|string}
         */
        this.msg=null;
        /**
         * Adresse ip du casque
         * @type {string}
         */
        this.ip = 0;
        /**
         * Moment où le message a été emis YYYY-MM-DD hh:mm:ss
         * @type {string}
         */
        this.time=new Date().toLocaleString();
        /**
         * Une des commandes ToCasque.CMD_etc...
         * @type {null|string}
         */
        this.cmd = null;
        /**
         * En cas de cmd CMD_LOAD_SESSION dé&finit le chemin du contenu à charger
         * @type {string}
         */
        this.startSessionContenuPath = "";

    }
}
/**
 * Demande de lister les fichiers (pour de vrai)
 * @type {string}
 */
ToCasque.CMD_CHECK_FILES="CMD_CHECK_FILES";
/**
 * Demande de charger un contenu
 * @type {string}
 */
ToCasque.CMD_LOAD_SESSION="CMD_LOAD_SESSION";
/**
 * Force le démarage de la session
 * @type {string}
 */
ToCasque.CMD_START_SESSION="CMD_START_SESSION";
/**
 * Décharge une session
 * @type {string}
 */
ToCasque.CMD_STOP_SESSION="CMD_STOP_SESSION";

module.exports = ToCasque;