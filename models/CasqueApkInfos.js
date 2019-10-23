/**
 * Informations sur l'apk installé sur un casque
 */
class CasqueApkInfos {
    constructor(){

        /**
         * Version renvoyée par l'apk lui même
         * @type {null}
         */
        this.version=null;
        /**
         * Dernier apk a avoir été installé avec succès
         * Cette donnée est enregistrée d'une session sur l'autre
         * @type {string}
         */
        this.lastApk="on sait pas :(";
        /**
         * Informations à propos de l'état d'installation de l'apk
         * @type {{installing: boolean, when: string, status: string}}
         */
        this.installation={
            when:'pas depuis le dernier reboot',
            status:'',
            installing:false
        };
    }
}
module.exports=CasqueApkInfos;