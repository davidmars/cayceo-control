const os = require('os');
const fs = require('fs');
const FileSystemUtils = require('./FileSystemUtils');
const EventEmitter = require("event-emitter-es6");
const uuid = require('uuid/v4');
const JsonStored=require("./JsonStored");
const checkDiskSpace = require('check-disk-space');
const DiskSpace =             require('./DiskSpace.js');

/**
 * Permet d'obtenir l'adresse MAC et le nom de l'ordi
 */
class Machine extends EventEmitter{
    constructor(){
        super();
        let me=this;

        /**
         * Le nom de l'ordi
         * @type {string}
         */
        this.name=os.hostname();

        /**
         * L'identifiant unique du processeur
         * @type {string}
         */
        this.machineId="";
        let exec = require('child_process').exec;
        exec("wmic CPU get ProcessorId",function(error, stdout, stderr){
            let regex = /[\n]([A-Z0-9]*)/m;
            let m;
            if ((m = regex.exec(stdout)) !== null) {
                me.machineId=m[1];
            }
            me.emit(EVENT_READY);
        });
        /**
         * Chemin vers le dossier racine pour le stockage
         * @type {string}
         */
        this.appStoragePath=os.homedir()+"/"+window.conf.appDirectoryStorageName;
        if (!fs.existsSync(me.appStoragePath)) {
            FileSystemUtils.ensureDirectoryExistence(me.appStoragePath+"/test.txt");
        }

        JsonStored.init(this.appStoragePath);
        let uuidStorage=new JsonStored("uuid");
        /**
         * identifiant unique au format uuid (utilisé pour les stats)
         * @type {string}
         */
        this.uuid=uuidStorage.getJson(uuid()); //cae6430f-c656-462f-aa31-40b71c528484
    }

    /**
     * Eteint la machine
     */
    shutDown(){
        let exec = require('child_process').exec;
        exec("shutdown /s /t 0");
    }

    /**
     * Renvoie les ips de la machine
     * @returns {string[]}
     */
    getIpAdresses(){
        let interfaces = os.networkInterfaces();
        let addresses = [];
        for (let k in interfaces) {
            for (let k2 in interfaces[k]) {
                let address = interfaces[k][k2];
                if (address.family === 'IPv4' && !address.internal) {
                    addresses.push(address.address);
                }
            }
        }
        return addresses;
    }
    getDiskSpace(cb){
        // On Windows
        checkDiskSpace(this.appStoragePath).then((diskSpace) => {
            console.log("diskSpace",diskSpace);
            let ds=new DiskSpace();
            ds.availableBytes=diskSpace.free;
            ds.sizeBytes=diskSpace.size;
            ds.usedBytes=diskSpace.size-diskSpace.free;
            cb(ds);
        })
    }
}
module.exports = Machine;