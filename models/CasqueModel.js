/**
 * C'est la représentation des données propres à un casque
 */
class CasqueModel{




    constructor(){
        let me=this;
        /**
         * L'identifiant fourni par ADB
         * @type {string}
         */
        this.deviceId="";
        /**
         * L'identifiant de type 1,2,3,4 ou 5
         * @type {string}
         */
        this.numero="";

        //-----------propriétés live déduites depuis ADB

        /**
         * Branché (en ADB) ou pas
         * @type {boolean}
         * @private
         */
        this._plugged=false;


        //---------propriétés live déduites depuis socket wifi

        /**
         * Connecté en wifi ou pas
         * @type {boolean}
         */
        this._online=false;
        /**
         * Le niveau de batterie
         * @type {number}
         */
        this._batteryLevel=0;
        /**
         * L'identifiant du contenu en cours de lecture
         * @type {null|string}
         */
        this._contenuId=null;
        /**
         * Est en cours de lecture ou non
         * @type {boolean}
         */
        this._isPlaying=false;
        /**
         * Nombre de secondes de lecture restante
         * @type {number}
         */
        this._playRemainingSeconds=0;
        /**
         * Position actuelle (en secondes) de la lecture
         * @type {number}
         * @private
         */
        this._currentPlayTime=0;
        /**
         * Nombre de secondes totale pour la lecture
         * @type {number}
         * @private
         */
        this._totalPlayTime=0;

        //petite boucle toutes les 10 secondes
        let interval=setInterval(function(){
            if(this.destroyed){
                clearInterval(interval);
                return;
            }
            if(!me._online){
                if(me.plugged){
                    //niveau de batterie depuis ADB si on peut pas faire autrement
                    adb.getBattery(me.deviceId,function(level){
                        me.batteryLevel=level;
                    })
                }else{
                    me.batteryLevel="?";
                }
            }

        },1000*10)



        /**
         * Une trace du dernier socket reçu
         * @type {{}}
         */
        this.socket={

        };
        /**
         * Si true cela veut dire qu'on est entrain de copier des fichiers sur le casque
         * @type {boolean}
         */
        this._syncing=false;
        /**
         * Dit si tous les contenus sont copiés sur le casque
         * @type {boolean}
         */
        this.contenusReady=false;
        /**
         * Listes des fichiers qui doivent ou qui sont copiés sur le casque et leur état de copie
         * @type {{}}
         */
        this.contenus={};

    }

    /**
     * A appeler quand on veut supprimer définitivement un casque
     * tue les listeners
     */
    destroy(){
        this.destroyed=true;
    }



    get plugged(){
        return this._plugged;
    }
    set plugged(bool){
        this._plugged=bool;
        casquesManager.emit(EVENT_CASQUE_CHANGED,this);
        if(bool){
            this.syncContenus();
        }
    }

    get batteryLevel(){
        return this._batteryLevel;
    }
    set batteryLevel(percent){
        this._batteryLevel=percent;
        casquesManager.emit(EVENT_CASQUE_CHANGED,this);
    }

    get online() {
        return this._online;
    }
    set online(value) {
        this._online = value;
        casquesManager.emit(EVENT_CASQUE_CHANGED,this);
    }

    get contenuId() {
        return this._contenuId;
    }
    set contenuId(value) {
        this._contenuId = value;
        casquesManager.emit(EVENT_CASQUE_CHANGED,this);
    }

    get isPlaying() {
        return this._isPlaying;
    }
    set isPlaying(value) {
        this._isPlaying = value;
        casquesManager.emit(EVENT_CASQUE_CHANGED,this);
    }

    set currentPlayTime(value) {
        this._currentPlayTime = value;
        casquesManager.emit(EVENT_CASQUE_CHANGED,this);
    }
    set totalPlayTime(value) {
        this._totalPlayTime = value;
        casquesManager.emit(EVENT_CASQUE_CHANGED,this);
    }
    get playRemainingSeconds() {
        return this._totalPlayTime - this._currentPlayTime;
    }


    addContenu(file){
        if(!this.contenus[file]){
            this.contenus[file]={
                file:file,
                status:"",
            };
            casquesManager.emit(EVENT_CASQUE_CHANGED,this);
        }
    }

    /**
     * Supprime le contenu de l'index et du device
     * @param file
     */
    removeContenu(file){
        if(this.contenus[file]){
            this.contenus[file].status="toDelete";
        }
    }
    get syncing() {
        return this._syncing;
    }

    set syncing(value) {
        this._syncing = value;
        if(value){
            this.contenusReady=false;
        }
        casquesManager.emit(EVENT_CASQUE_CHANGED,this);
    }


    /**
     * Copie les contenus vers le casque récursivement
     * Une seule copie de fichier à la fois est faite sur le casque
     */
    syncContenus(){
        let me=this;
        for(let c in me.contenus){
        if(me.contenus.hasOwnProperty(c)){
            let contenu=me.contenus[c];
            if(!me.plugged || me._syncing){
                return;
            }
            if(contenu.status!=="ok"){
                me.syncing=true;
                adb.contenuExists(me.deviceId,contenu.file,function(exist){
                    if(exist){
                        if(contenu.status==="toDelete"){
                            me.syncing=true;
                            contenu.deleting=true;
                            adb.deleteFile(me.deviceId,contenu.file,function(){
                                me.syncing=false;
                                me.syncContenus();//recursive call
                            });
                            casquesManager.emit(EVENT_CASQUE_CHANGED,me);
                        }else{
                            contenu.status="ok";
                            contenu.wasOk="ok";
                            casquesManager.emit(EVENT_CASQUE_CHANGED,me);
                            me.syncing=false;
                            me.syncContenus();//recursive call
                        }

                    }else{
                        if(contenu.status==="toDelete"){
                            contenu.deleting2=true;
                            delete me.contenus[c];
                            casquesManager.emit(EVENT_CASQUE_CHANGED,me);
                            me.syncing=false;
                            me.syncContenus();//recursive call
                        }else{
                            contenu.status="waiting...";
                            adb.pushContenu(
                                me.deviceId,
                                contenu.file,
                                function () {
                                    contenu.status="ok";
                                    casquesManager.emit(EVENT_CASQUE_CHANGED,me);
                                    me.syncing=false;
                                    me.syncContenus();//recursive call
                                },
                                function (percent) {
                                    contenu.status=`${percent}%`;
                                    casquesManager.emit(EVENT_CASQUE_CHANGED,me);
                                },function(){
                                    contenu.status=`error on copy`;
                                    casquesManager.emit(EVENT_CASQUE_CHANGED,me);
                                }
                            );
                        }

                    }
                });
            }
        }
        }
        this.contenusReady=true;
    }



}
module.exports = CasqueModel;