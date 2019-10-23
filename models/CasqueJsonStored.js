/**
 * Le modèle de données d'un casque tel qu'il est sauvegardé dans le json de l'application
 */
class CasqueJsonStored {
    constructor(){
        /**
         * Device id (utilisé par ADB)
         * @type {string}
         */
        this.deviceId="";
        /**
         * Adresse ip complète du casque
         * @type {string}
         */
        this.ip="";
        /**
         * Dernier apk à avoir été installé avec succès à notre connaissance
         * @type {string} url du fichier téléchargé
         */
        this.lastApk="";
    }
}
module.exports=CasqueJsonStored;