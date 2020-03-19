const EventEmitter = require("event-emitter-es6");
const CasqueModel = require("./CasqueModel");
const CasqueJsonStored = require("./casqueExtensions/CasqueJsonStored");
const JsonStored = require("../utils/JsonStored");

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
         * Le json local des casques
         * @type {JsonStored}
         */
        this.jsonStored=new JsonStored("casques");
        /**
         *
         * @type {CasqueJsonStored[]}
         */
        let casquesFromJson=this.jsonStored.getJson(this._getCasquesJson());
        for(let i=0; i<casquesFromJson.length; i++){
            this._casques[i]=new CasqueModel();
            this._casques[i].deviceId=casquesFromJson[i].deviceId;
            this._casques[i].ip=casquesFromJson[i].ip;
            if(casquesFromJson[i].lastApk){
                this._casques[i].apkInfos.lastApk=casquesFromJson[i].lastApk;
            }
            this.emit(EVENT_CASQUE_ADDED,this._casques[i]);
        }

    }

    /**
     *
     * @returns {CasqueModel[]}
     */
    casquesList(){
        return this._casques;
    }
    /**
     * Renvoie uniquement les casque branchés
     * @returns {CasqueModel[]}
     */
    casquesListPlugged(){
        let r=[];
        for (let c of this.casquesList()){
            if(c.plugged){
                r.push(c);
            }
        }
        return r;
    }

    /**
     * Renvoie un json avec les infos des casques qui vont bien
     * @returns {CasqueJsonStored[]}
     * @private
     */
    _getCasquesJson(){
        let casquesJson=[];
        for(let i=0; i<this._casques.length; i++){
            let casqueData=new CasqueJsonStored();
            casqueData.deviceId=this._casques[i].deviceId;
            casqueData.ip=this._casques[i].ip;
            casqueData.lastApk=this._casques[i].apkInfos.lastApk;
            casquesJson.push(casqueData);
        }
        return casquesJson;
    }
    /**
     * Enregistre les associations deviceId / ip pour une future utilisation
     * @private
     */
    _saveJson(){
        this.jsonStored.saveJson(this._getCasquesJson());
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
     * Retourne un CasqueModel par son Ip
     * @param {string} ipAdress
     * @returns {CasqueModel|null}
     */
    getByIp(ipAdress){
        for(let i=0; i<this._casques.length; i++){
            let c=this._casques[i];
            if(c.ip==ipAdress){
                return c;
            }
        }
        return null;
    }

    /**
     * Ajoute un casque à la liste des casques enregistrés
     * @param {string} ip
     * @param {string} deviceId
     * @returns {CasqueModel}
     */
    addCasque(ip,deviceId){
        let existing=this.getByDeviceId(deviceId);
        if(existing){
            console.warn(`Le casque deviceId ${deviceId} existait déjà`);
            return existing;
        }
        existing=this.getByIp(ip);
        if(existing){
            console.warn(`Le casque ${ip} existait déjà`);
            return existing;
        }
        let c=new CasqueModel();
        c.ip=ip;
        c.deviceId=deviceId;
        this._casques.push(c);
        this._saveJson();
        this.emit(EVENT_CASQUE_ADDED,c);
        return c;
    }
    /**
     * Supprime un casque de la liste des casques enregistrés
     * @param {string} ip
     */
    removeCasque(ip){
        let existing=this.getByIp(ip);
        if(!existing){
            console.warn(`Le casque ${ip} n'existe pas`);
            return null;
        }
        for(let i=0; i<this._casques.length; i++){
            let c=this._casques[i];
            if(c.ip===ip){
                c.destroy();//Le casque cleanera ses listeners
                this._casques.splice(i, 1);//efface le casque de la liste
                this.emit(EVENT_CASQUE_DELETED,c);//dira à l'ui nottament de virer ce casque
                this._saveJson();//enregistre la config sans ce casque
                c=null;
            }
        }

    }

    /**
     * Installe l'apk sur tous les casques
     */
    installCurrentApk(){
        for(let i=0; i<this._casques.length; i++){
            let c=this._casques[i];
            c.installCurrentApk();
        }
    }

    /**
     * Sort de la mise en veille les casque branchés en ADB
     */
    wakeUp(){
        let me=this;
        for(let i=0; i<me._casques.length; i++){
            let c=me._casques[i];
            c.wakeUp();
        }
    }

    /**
     * Eteint tous les casque branchés en ADB
     */
    shutDownAll() {
        let me=this;
        for(let i=0; i<me._casques.length; i++){
            let c=me._casques[i];
            if(c.plugged){
                adb.shutDown(c.deviceId);
            }

        }
    }






}
module.exports = CasqueModelsManager;