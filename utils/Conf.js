class Conf{
    constructor(){
        /**
         * Url racine du serveur web
         * @type {string}
         */
        this.serverRoot="";
        /**
         * Intervale entre deux synchronisations
         * @type {number}
         */
        this.synchroDelaySeconds=30;
        /**
         * Nom du répertoire de stockage des fichiers
         * Ce répertoire se trouvera dans le répertoire home de l'utilisateur Windows (C:\Users\nom-user\repertoire)
         * @type {string}
         */
        this.appDirectoryStorageName="jukeboxvr-storage"
    }
}
module.exports=Conf;