class SocketCasqueFile extends SocketMessage{
    constructor(){
        super();
        /**
         * Liste des fichiers actuellement sur le casque
         * @type {string[]}
         */
        this.files=[];

    }
}