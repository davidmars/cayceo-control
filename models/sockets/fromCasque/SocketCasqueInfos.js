class SocketCasqueInfos extends SocketMessage{
    constructor(){
        super();
        /**
         * Url du contenu en cours de lecture, null si il n'y en a pas
         * @type {null|string}
         */
        this.contenu=null;
        /**
         * Duréée total en secondes du contenu à lire
         * @type {number}
         */
        this.totalPlayTime=0;
        /**
         * position en secondes du contenu lu
         * @type {number}
         */
        this.currentPlayTime=0;
        /**
         * Est en cours de lecture ou non
         * @type {null|boolean}
         */
        this.isPlaying=null;
        /**
         * Pourcentage de batterie
         * @type {null|number}
         */
        this.batteryLevel=null;
    }
}