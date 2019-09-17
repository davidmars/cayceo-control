const EventEmitter = require("event-emitter-es6");
const CasqueModel = require("./CasqueModel");
const fs = require("fs");

class CasqueModelsManager extends EventEmitter{
    constructor(machine){
        super();
        let me=this;
        /**
         * La liste des casques qui vient d'un json local
         * @type {CasqueModel[]}
         */
        this._casques=[];
        /**
         * @private
         * Chemin vers le fichier en local où on enregistrera les ralations entre numéros et deviceId
         * @type {string}
         */
        this.jsonPath=machine.appStoragePath+"/casques.json";
        //teste si le json existe
        if (fs.existsSync(this.jsonPath)) {
            let json = fs.readFileSync(me.jsonPath);
            json = JSON.parse(json);
            me._casques = json;
        } else {
            this._saveJson();
        }
        for(let i=0; i<this._casques.length; i++){
            let num=this._casques[i].numero;
            let id=this._casques[i].deviceId;
            this._casques[i]=new CasqueModel();
            this._casques[i].numero=num;
            this._casques[i].deviceId=id;
            this.emit(EVENT_CASQUE_ADDED,this._casques[i]);
        }

    }

    /**
     * Enregistre les associations deviceId / numero pour une future utilisation
     * @private
     */
    _saveJson(){
        let json=[];
        for(let i=0; i<this._casques.length; i++){
            json.push(
                {
                    "deviceId":this._casques[i].deviceId,
                    "numero":this._casques[i].numero
                }
            )
        }
        fs.writeFileSync(this.jsonPath,JSON.stringify(json,null,2),{ encoding : 'utf8'});
    }

    /**
     * Retourne un CasqueModel par son deviceId
     * @param {string} deviceId
     * @returns {CasqueModel|null}
     */
    getByDeviceId(deviceId){
        for(let i=0; i<this._casques.length; i++){
            let c=this._casques[i];
            if(c.deviceId===deviceId){
                return c;
            }
        }
        return null;
    }

    /**
     * Retourne un CasqueModel par son numero
     * @param {string} numero
     * @returns {CasqueModel|null}
     */
    getByNumero(numero){
        for(let i=0; i<this._casques.length; i++){
            let c=this._casques[i];
            if(c.numero===numero){
                return c;
            }
        }
        return null;
    }

    /**
     * Ajoute un casque à la liste des casques enregistrés
     * @param {string} numero
     * @param {string} deviceId
     * @returns {CasqueModel}
     */
    addCasque(numero,deviceId){
        let existing=this.getByDeviceId(deviceId);
        if(existing){
            console.warn(`Le casque deviceId ${deviceId} existait déjà`);
            return existing;
        }
        existing=this.getByNumero(numero);
        if(existing){
            console.warn(`Le casque numero ${numero} existait déjà`);
            return existing;
        }
        let c=new CasqueModel();
        c.numero=numero;
        c.deviceId=deviceId;
        this._casques.push(c);
        this._saveJson();
        this.emit(EVENT_CASQUE_ADDED,c);
        return c;
    }
    /**
     * Supprime un casque de la liste des casques enregistrés
     * @param {string} numero
     * @returns {CasqueModel} Le casque qui vient d'être supprimé
     */
    removeCasque(numero){
        let existing=this.getByNumero(numero);
        if(!existing){
            console.warn(`Le casque numero ${numero} n'existe pas`);
            return null;
        }
        for(let i=0; i<this._casques.length; i++){
            let c=this._casques[i];
            if(c.numero===numero){
                c.destroyed=true;
                this._casques.splice(i, 1);
                this.emit(EVENT_CASQUE_DELETED,c);
                this._saveJson();
                return c;
            }
        }

    }

    /**
     * Définit si un casque est branché ou non
     * @param {string} deviceId
     * @param plugged
     */
    setPlugged(deviceId,plugged=true){
        let c=this.getByDeviceId(deviceId);
        if(c){
            c.plugged=plugged;
            this.emit(EVENT_CASQUE_CHANGED,c);
        }
    }
    /**
     * Définit si un casque est connecté en wifi ou non
     * @param  {string} numero numero du casque
     * @param online
     */
    setOnline(numero,online=true){
        let c=this.getByNumero(numero);
        if(c){
            c.online=online;
            this.emit(EVENT_CASQUE_CHANGED,c);
        }
    }
}
module.exports = CasqueModelsManager;