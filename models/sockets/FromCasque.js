/**
 * Message envoyé d'un casque vers le meuble
 */
class FromCasque{
    constructor(){

        /**
         * Un message pour les logs mais sans logique applicative.
         * @type {string|string}
         */
        this.msg=null;
        /**
         * TODO VICTOR Le numéro de version d'APK installé
         * @type {string}
         */
        this.apkVersion="";
        /**
         * Adresse ip du casque
         * @type {number}
         */
        this.ip = 0;
        /**
         * Moment où le message a été emis YYYY-MM-DD hh:mm:ss
         * @type {string}
         */
        this.time=new Date().toLocaleString();
        /**
         * Niveu de baterie de 0 à 100, -1 indique inconnu
         * @type {int}
         */
        this.battery = -1 ;
        /**
         * Chemin du contenu en cours de lecture
         * Si null alors aucun contenu n'est chargé
         * @type {string|null}
         */
        this.contenuPath = null;

        /**
         * Nombre de secondes de lecture restantes
         * Si -1 c'est qu'on ne sais pat
         * @type {number}
         */
        this.remainingSeconds = -1;
        /**
         * Liste de contenus présents sur le casque
         * Si null veut dire qu'on n'en sait rien
         * @type {String[]|null}
         */
        this.fileList=[];
        /**
         * Un code d'erreur voir FromCasque.ERROR_etc...
         * @type {String|null}
         */
        this.error=null;
    }
}


FromCasque.ERROR_CONTENU_MISSING="ERROR_CONTENU_MISSING";


module.exports = FromCasque;