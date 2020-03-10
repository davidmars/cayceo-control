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

    diskSpace(deviceId,cb){
        this.shell(deviceId,"df -h "+this.devicePath("."),function(output){
            const regex = /[ ]+([0-9\.]+[A-Z]+)/gm;
            let m;
            let sizes=[];
            while ((m = regex.exec(output)) !== null) {
                // This is necessary to avoid infinite loops with zero-width matches
                if (m.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
                sizes.push(m[1])
            }
            if(sizes.length===3){
                cb({
                    "size":sizes[0],
                    "used":sizes[1],
                    "available":sizes[2],
                })
            }else{
                cb(output);
            }
        });
    }

    /**
     * Eface un fichier
     * @param deviceId
     * @param file
     * @param cb
     */
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
                    let ip=match.replace("inet ","")
                    cb(ip);
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

    run(cmd, onComplete,onProgress,onError) {
        var spawn = require('child_process').spawn;
        let exec = require('child_process').exec;
        var command = exec(cmd);
        var result = '';
        command.stdout.on('data', function(data) {
            if(onProgress){
                onProgress(data);
            }
            result += data.toString();
        });
        command.on('close', function(code) {
            return onComplete(result);
        });
    }

    pushContenu2(deviceId,filePath,onComplete,onProgress,onError){
        let me=this;
        let localFile = this.machinePath(filePath);
        let destFile = this.devicePath(filePath);
        let destFileTmp = destFile+".tmp";
        let cmd="adb -s "+deviceId+" push "+localFile+" "+destFileTmp;
        //console.log(cmd);
        this.run(cmd,
            function(){
                //renomme le fichier temporaire en nom de fichier normal
                me.shell(deviceId,`mv -f ${destFileTmp} ${destFile}`
                    ,function(){
                        onComplete();
                    }
                );
            },
            function(d){
                //console.log(d);
                let percent=0;
                let regex = /([0-9]*)%/gm;
                let arr = regex.exec(d);
                //console.log(arr);
                if(arr){
                    percent=arr[1];
                    //console.log(percent);
                }
                onProgress(Number(percent));
            },
            onError
        );
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
                        console.error("erreur transfer 1 = ",error);
                        onError();
                        reject();
                    })
                })
            })
            .catch(function(error){
                console.error("erreur transfer 2 = ",error);
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

    /**
     * Reboote le casque
     * @param deviceId
     */
    reboot(deviceId){
        this.client.reboot(deviceId);
    }
    /**
     * Eteint le casque
     * @param deviceId
     * @param cb
     */
    shutDown(deviceId,cb){
        this.shell(deviceId,"reboot -p",cb);
    }

    installAPKAndReboot(deviceId,apk,onSuccess,onError){
        let me=this;
        this.client.install(deviceId,this.machinePath(apk))
            .then(function() {
                onSuccess();
                me.reboot(deviceId)
            })
            .catch(function(err) {
                onError(err);
            })
    }
}
module.exports = ADB;