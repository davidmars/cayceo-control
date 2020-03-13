const EventEmitter = require("event-emitter-es6");
const { exec } = require("child_process");
const app = require('electron').remote.app;
const path = require('path');
var basepath = app.getAppPath();

class ADB extends EventEmitter{
    constructor(){
        super();


        this.defaultLogsFor={
            pushFile:false,
            fileExists:false,
            diskSpace:false,
        };

        let me=this;

        let exe="platform-tools_r28.0.0-windows/platform-tools/adb.exe";
        let exePath=path.join(app.getAppPath(),exe).replace('\\resources\\app.asar', '');
        console.error("exePath",exePath);
        /**
         * Chemin vers le programme adb
         * @type {string}
         */
        this.exe=exePath;
        console.log("ADB",this.exe);
        this.run("version");

        /**
         * Liste des ids actuellement connectés
         * @type {String[]}
         */
        this.deviceIds=[];

        //test en boucle si un casque est connecté ou non
        setInterval(function(){
           me._testDevices();
        },5000);
        me._testDevices();

    }

    _testDevices(){
        let me=this;
        this._devices(
            function(connectedIds){
                for(let connected of connectedIds){
                    //console.log("connected "+connected)
                    if(me.deviceIds.indexOf(connected) === -1){
                        console.log("vient d'être branché :"+connected)
                        me.emit(EVENT_ADB_ADD_DEVICE,connected);
                    }
                }
                for(let old of me.deviceIds){
                    if(connectedIds.indexOf(old) === -1){
                        console.log("vient d'être DEbranché :"+old)
                        me.emit(EVENT_ADB_REMOVE_DEVICE,old);
                    }
                }
                me.deviceIds=connectedIds;
            }
        )
    }

    /**
     * Liste les devices et renvoie leurs ids en cb
     * @param cb
     * @private
     */
    _devices(cb){
        this.run("devices",function(str){
            let devicesIds=[];
            let regex = /^([a-zA-Z0-9]+)\s+device/gm;
            let arr;
            while ((arr = regex.exec(str)) !== null) {
                devicesIds.push(arr[1]);
            }
            cb(devicesIds);
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

    diskSpace(deviceId,cb){
        if(cb){
            cb("calculating...");
        }
        this.runDevice(deviceId,"shell df -h "+this.devicePath("."),function(output){
            let regex = /[ ]+([0-9\.]+[A-Z]+)/gm;
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
                if(cb){
                    cb({
                        "size":sizes[0],
                        "used":sizes[1],
                        "available":sizes[2],
                    })
                }

            }else{
                if(cb){
                    cb(output);
                }

            }
        },null,null,this.defaultLogsFor.diskSpace);
    }

    /**
     * Eface un fichier
     * @param deviceId
     * @param file
     * @param cb
     */
    deleteFile(deviceId,file,cb){
        this.runDevice(deviceId,"shell rm "+this.devicePath(file),cb);
    }
    /**
     * Renvoie l'adresse IP en callback
     * @param deviceId
     * @param cb
     */
    getIp(deviceId,cb){
        this.runDevice(deviceId,"shell ip addr show wlan0",function(buffer){
            let regex = /inet\s+([0-9.]*)/gm;
            console.error(buffer)
            //console.error(regex.test(buffer))
            let arr;
            while ((arr = regex.exec(buffer)) !== null) {
                cb(arr[1]);
            }
        })
    }

    /**
     * Renvoie le pourcentage de chargement en callback
     * @param deviceId
     * @param cb
     */
    getBattery(deviceId,cb){
        this.runDevice(deviceId,"shell dumpsys battery",function(out){
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
    fileExists(deviceId, filePath, cb){
        let file=this.devicePath(filePath);
        this.runDevice(deviceId,`shell ls ${file}`,
            function(output){cb(true)},
            null,
            function(){cb(false)},
            false);
    }

    /**
     * Execute une commande adb sur un device donné
     * @param deviceId
     * @param cmd
     * @param onCompleteCb
     * @param onProgressCb
     * @param onErrorCb
     * @param {boolean} logs Affiche les logs par defaut ou non
     */
    runDevice(deviceId,cmd, onCompleteCb,onProgressCb,onErrorCb,logs){
        cmd="-s "+deviceId+" "+cmd;
        this.run(cmd, onCompleteCb,onProgressCb,onErrorCb,logs);
    }

    /**
     * Execute une commande adb
     * @param cmd
     * @param onCompleteCb
     * @param onProgressCb
     * @param onErrorCb
     * @param {boolean} logs
     */
    run(cmd, onCompleteCb,onProgressCb,onErrorCb,logs=true) {
        let c_cmd="%c adb "+cmd+" ";
        let debug=true;

        if(logs){
            console.log(
                this.exe+" "+c_cmd+"%c start ",
                "color: #eee;background-color:#333;",
                "color: #33F;"
            );
        }
        let logOnProgress,logOnComplete,logOnError;

        if(logs){
            logOnProgress=function(r){
                console.log(
                    c_cmd+"%c onProgress ",
                    "color: #eee;background-color:#333;",
                    "color: #33F;"
                );
                console.log(r);
            };
            logOnComplete=function(code,buffer){
                console.log(
                    c_cmd+"%c onComplete ",
                    "color: #eee;background-color:#333;",
                    "color: #3F3;"
                );
                console.log("code",code);
                console.log("buffer",buffer);
            };
            logOnError=function(r){
                console.error(
                    c_cmd+"%c onError ",
                    "color: #eee;background-color:#333;",
                    "color: #f00;"
                );
                console.error("logOnError",r);
            };
        }else{
            logOnProgress=logOnComplete=logOnError=function(){};
        }




        let onProgress=function(r){
            logOnProgress(r);
            if(onProgressCb){
                onProgressCb(r);
            }
        };
        let onComplete=function(buffer){
            logOnComplete(buffer);
            if(onCompleteCb){
                onCompleteCb(buffer);
            }
        };
        let onError=function(r){
            logOnError(r);
            if(onErrorCb){
                onErrorCb(r);
            }
        };

        let command = exec(this.exe+" "+cmd,{shell: true});
        let buffer = '';
        let bufferError = '';
        command.stderr.on('data',function(data){
            bufferError+=data.toString();
        });
        command.stdout.on('data', function(data) {
            if(onProgress){
                onProgress(data);
            }
            buffer += data.toString();
        });
        command.on('close', function(code) {
            if(code){
                onError("close (code " +code+") "+ bufferError);
            }else{
                onComplete(buffer);
            }
        });

    }

    pushFile(deviceId, filePath, onComplete, onProgress, onError){
        let me=this;
        let localFile = this.machinePath(filePath);
        let destFile = this.devicePath(filePath);
        let destFileTmp = destFile+".tmp";
        let cmd="push "+localFile+" "+destFileTmp;
        //console.log(cmd);
        this.runDevice(deviceId,cmd,
            function(){
                //renomme le fichier temporaire en nom de fichier normal
                me.runDevice(deviceId,`shell mv -f ${destFileTmp} ${destFile}`
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
            onError,
            me.defaultLogsFor.pushFile
        );
    }





    /**
     * Sort le device de veille
     * @param deviceId
     */
    wakeUp(deviceId){
        this.runDevice(
            deviceId
            ,"shell input keyevent KEYCODE_WAKEUP"
            ,function(o){}
            )
    }

    /**
     * Reboote le casque
     * @param deviceId
     */
    reboot(deviceId){
       this.runDevice(deviceId,"reboot");
    }
    /**
     * Eteint le casque
     * @param deviceId
     * @param cb
     */
    shutDown(deviceId,cb){
        this.runDevice(deviceId,"shell reboot -p",cb);
    }

    /**
     * Installe un APK sur le périphérique et le redémarre
     * @param deviceId
     * @param apk
     * @param onSuccess
     * @param onError
     */
    installAPKAndReboot(deviceId,apk,onSuccess,onError){
        let me=this;
        let cmd="install -r "+this.machinePath(apk);
        let success=function(){
            onSuccess();
            me.reboot(deviceId)
        };
        me.runDevice(deviceId,cmd,success,null,onError);
    }
}
module.exports = ADB;