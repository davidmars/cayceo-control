const EventEmitter = require("event-emitter-es6");
const adb = require('adbkit');
const FileSystemUtils = require('../utils/FileSystemUtils');

class ADB extends EventEmitter{
    constructor(){
        super();
        let me=this;
        this.client = adb.createClient()
        this.client.trackDevices()
            .then(function(tracker) {
                tracker.on('add', function(device) {
                    console.log('ADB Device %s was plugged in', device.id,device);
                    setTimeout(function(){
                        me.emit(EVENT_ADB_ADD_DEVICE,device.id);
                    },1000*5);

                });
                tracker.on('remove', function(device) {
                    console.log('ADB Device %s was unplugged', device.id,device)
                    me.emit(EVENT_ADB_REMOVE_DEVICE,device.id);
                });
                tracker.on('end', function() {
                    console.log('ADB Tracking stopped')
                });
            })
            .catch(function(err) {
                console.error('ADB Something went wrong:', err.stack)
            })
    }

    /**
     * Retourne le chemin d'un contenu sur le casque
     * @param {string} path Le chemin en relatif
     * @returns {string}
     */
    devicePath(path){
        return '/sdcard/Download/'+path;
    }
    /**
     * Retourne le chemin d'un contenu sur le PC
     * @param {string} path Le chemin en relatif
     * @returns {string}
     */
    machinePath(path){
        return window.machine.appStoragePath+"/"+path;
    }

    /**
     * Execuste une commande shell adb et renvoie l'output
     * @param deviceId
     * @param cmd
     * @param cb
     */
    shell(deviceId,cmd,cb){
        if(!cb){
            cb=function(o){
                console.log(cmd,o);
            }
        }
        this.client.shell(deviceId,cmd)
            .then(adb.util.readAll)
            .then(function(output) {
                output=output.toString().trim();

                cb(output);
            });
    }

    deleteFile(deviceId,file,cb){
        this.shell(deviceId,"rm "+this.devicePath(file),cb);
    }
    /**
     * Renvoie l'adresse IP en callback
     * @param deviceId
     * @param cb
     */
    getIp(deviceId,cb){
        this.shell(deviceId,"ip addr show wlan0",function(o){
            let regex = /inet ([0-9.]*)/m;
            let m;
            if ((m = regex.exec(o)) !== null) {
                m.forEach((match, groupIndex) => {
                    cb(match);
                    return;
                });
            }
        })
    }

    /**
     * Renvoie le pourcentage de chargement en callback
     * @param deviceId
     * @param cb
     */
    getBattery(deviceId,cb){
        this.shell(deviceId,"dumpsys battery",function(out){
            let regex = /level: ([0-9]*)/m;
            let m;
            if ((m = regex.exec(out)) !== null) {
                m.forEach((match, groupIndex) => {
                    cb(match);
                    return;
                });
            }
        });
    }



    /**
     * Renvoie true si le fichier existe sur le casque
     * @param deviceId
     * @param filePath
     * @param {function} cb argument true ou false selon si le fichier existe ou non
     */
    contenuExists(deviceId,filePath,cb){
        let file=this.devicePath(filePath);
        this.shell(deviceId,`ls ${file}`,function(output){
            if(output===file){
                cb(true)
            }else{
                cb(false);
            }
        });
    }

    /**
     * Ajoute une contenu sur le device spécifié
     * @param {string} deviceId
     * @param {string} filePath Le chemin relatif vers le fichier à copier
     * @param {function} onComplete
     * @param {function} onProgress percent,bytes,totalBytes
     * @param {function} onError
     */
    pushContenu(deviceId,filePath,onComplete,onProgress,onError){
        let me=this;
        let localFile = this.machinePath(filePath);
        let destFile = this.devicePath(filePath);
        let destFileTmp = destFile+".tmp";
        let fileSize=FileSystemUtils.fileSize(localFile);

        this.client.push(deviceId, localFile,destFileTmp)
            .then(function (transfer) {
                return new Promise(function (resolve, reject) {
                    transfer.on('progress', function (stats) {
                        let percentage = ( stats.bytesTransferred/fileSize)*99;
                        onProgress(percentage,stats.bytesTransferred,fileSize);
                    });
                    transfer.on('end', function () {
                        //renomme le fichier temporaire en nom de fichier normal
                        me.shell(deviceId,`mv -f ${destFileTmp} ${destFile}`
                            ,function(){
                                onComplete();
                                resolve();
                            }
                            );
                    });
                    transfer.on('error', function(){
                        onError();
                        reject();
                    })
                })
            })
            .catch(function(error){
                console.error("erreur transfer = ",error);
                onError();
            });
    }

    /**
     * Sort le device de veille
     * @param deviceId
     */
    wakeUp(deviceId){
        this.shell(
            deviceId
            ,"input keyevent KEYCODE_WAKEUP"
            ,function(o){}
            )
    }
}
module.exports = ADB;