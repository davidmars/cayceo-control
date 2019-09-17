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
         * Branché ou pas
         * @type {boolean}
         * @private
         */
        this._plugged=false;


        //---------propriétés live déduites depuis socket wifi

        /**
         * Connecté en wifi ou pas
         * @type {boolean}
         */
        this.online=false;
        /**
         * Le niveau de batterie
         * @type {number}
         */
        this._batteryLevel=0;
        /**
         * L'identifiant du contenu en cours de lecture
         * @type {null|string}
         */
        this.contenuId=null;
        /**
         * Est en cours de lecture ou non
         * @type {boolean}
         */
        this.isPlaying=false;
        /**
         * Nombre de secondes de lecture restante
         * @type {number}
         */
        this.playRemainingSeconds=0;

        let interval=setInterval(function(){
            if(this.destroyed){
                clearInterval(interval);
                return;
            }
            if(me.plugged){
                adb.getBattery(me.deviceId,function(level){
                    me.batteryLevel=level;
                })
            }else{
                me.batteryLevel="?";
            }
        },1000*10)

    }


    set plugged(bool){
        this._plugged=bool;
        casquesManager.emit(EVENT_CASQUE_CHANGED,this);
    }
    get plugged(){
        return this._plugged;
    }
    set batteryLevel(percent){
        this._batteryLevel=percent;
        casquesManager.emit(EVENT_CASQUE_CHANGED,this);
    }
    get batteryLevel(){
        return this._batteryLevel;
    }

}
module.exports = CasqueModel;