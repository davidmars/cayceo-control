const EventEmitter = require("event-emitter-es6");
const { exec } = require("child_process");
const app = require('electron').remote.app;
const path = require('path');

class ADB extends EventEmitter{
    constructor(){
        super();

        this.processQueue=[];
        /**
         * Définit ce qui doit être loggé ou non
         */
        this.defaultLogsFor={
            devices:            false,

            diskSpace:          false,
            getIp:              false,
            getBattery:         true,

            pushFile:           false,
            renameFile:         true,
            fileExists:         true,
            listFiles:          true,

            installAPKAndReboot:true,
            reboot:             true,
            shutDown:           true,
            wakeUp:             true,
            killServer:         true,


        };

        let me=this;

        let exe="platform-tools_r28.0.0-windows/platform-tools/adb.exe";
        let exePath=path.join(app.getAppPath(),exe).replace('\\resources\\app.asar', '');
        console.log("exePath",exePath);
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
        this.devicesIdsStatus={}

        //test en boucle si un casque est connecté ou non
        setInterval(function(){
           me._testDevices();
        },5000);
        me._testDevices();

    }

    /**
     * Tue le serveur ADB
     * @param cb
     */
    killServer(cb){
        this.run(
            "kill-server",
            cb,
            null,
            null,
            this.defaultLogsFor.killServer,
            true
        );
    }
    /**
     * Execute une commande adb sur un device donné
     * @param {String} deviceId L'identifiant ADB du device
     * @param cmd
     * @param onCompleteCb
     * @param onProgressCb
     * @param onErrorCb
     * @param {boolean} logs Affiche les logs par defaut ou non
     * @param {boolean} parallel si true le process peut se lancer même si un autre est en cours
     */
    runDevice(deviceId,cmd, onCompleteCb,onProgressCb,onErrorCb,logs,parallel=false){
        cmd="-s "+deviceId+" "+cmd;
        this.run(cmd, onCompleteCb,onProgressCb,onErrorCb,logs,parallel);
    }

    /**
     * Execute une commande adb
     * @param cmd
     * @param onCompleteCb
     * @param onProgressCb
     * @param onErrorCb
     * @param {boolean} logs
     * @param {boolean} parallel si true le process peut se lancer même si un autre est en cours
     */
    run(cmd, onCompleteCb,onProgressCb,onErrorCb,logs=true,parallel=false) {
        let me=this;
        if(!parallel){
            if(me.processQueue.length> 2 ){
                console.log("ADB run bloqué "+me.processQueue.length+" / "+me.processQueue[0]);

                //si une command eidentique n'est pas dans la file d'attente
                if(me.processQueue.indexOf(cmd)===-1){
                    me.processQueue.push(cmd);
                }
                setTimeout(function(){
                    //me.processQueue.shift()
                    me.run(cmd, onCompleteCb,onProgressCb,onErrorCb,logs,parallel);
                },500);

                return;
            }
        }

        let c_cmd="%c adb "+cmd+" ";

        if(logs){
            console.log(
                this.exe+" "+c_cmd+"%c start ("+me.processQueue.length+")",
                "color: #eee;background-color:#333;",
                "color: #99F;background-color:#333;"
            );
        }
        let logOnProgress,logOnComplete,logOnError;

        if(logs){
            logOnProgress=function(r){
                console.log(
                    c_cmd+"%c onProgress ",
                    "color: #eee;background-color:#333;",
                    "color: #99F;background-color:#333;"
                );
                console.log(r);
            };
            logOnComplete=function(code,buffer){
                console.log(
                    c_cmd+"%c onComplete ",
                    "color: #eee;background-color:#333;",
                    "color: #3F3;background-color:#333;"
                );
                console.log("code",code);
                console.log("buffer",buffer);
            };
            logOnError=function(r){
                console.error(
                    c_cmd+"%c onError ",
                    "color: #eee;background-color:#333;",
                    "color: #f00;background-color:#333;"
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
        let onComplete=function(code,buffer){
            logOnComplete(code,buffer);
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

        let command = exec(this.exe+" "+cmd,{shell: true,maxBuffer:1024*1024*32});
        if(!parallel){
            me.busy=true;
        }
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

            if(!parallel){
                me.busy=false;
                me.processQueue.shift();
            }
            if(code){
                onError("close (code " +code+") "+ bufferError);
            }else{
                onComplete(code,buffer);
            }
        });

    }

    /**
     * envoie les events EVENT_ADB_ADD_DEVICE et EVENT_ADB_REMOVE_DEVICE
     * fait la comparaison entre ce qu'on avait déjà et ce qui a changé
     * @private
     */
    _testDevices(){
        let me=this;
        let manageDeviceIds=function(connectedIds){
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
        };
        this.devices(manageDeviceIds);
    }

    /**
     * Liste les devices et renvoie leurs ids en cb
     * @param cb
     * @private
     */
    devices(cb){
        let me=this;
        this.run("devices",function(str){
            let connectedIds=[];
            me.devicesIdsStatus={};
            let regex = /^([A-Z0-9]+)\s+([A-Za-z ]+)$/gm;
            let arr;
            while ((arr = regex.exec(str)) !== null) {
                if(String(arr[2])==="device"){
                    connectedIds.push(arr[1]);
                }
                me.devicesIdsStatus[arr[1]] = arr[2];
            }
            me.emit(EVENT_ADB_DEVICES,str);
            cb(connectedIds);
        },
            null,
            null,
            this.defaultLogsFor.devices,
            true
        )
    }


    /**
     * Renvoie l'espace total, l'espace utilisé et l'espace libre
     * @param {String} deviceId L'identifiant ADB du device
     * @param cb
     */
    diskSpace(deviceId,cb){
        if(cb){
            cb("calculating...");
        }
        let cmd="shell df -h "+this.devicePath(".");
        let _done=function(output){
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
        };
        this.runDevice(
            deviceId,
            cmd,
            _done,
            null,
            null,
            this.defaultLogsFor.diskSpace
        );
    }

    /**
     * Efface un fichier (si il existe)
     * @param {String} deviceId L'identifiant ADB du device
     * @param {String} file Chemin du fichier
     * @param cb
     */
    deleteFile(deviceId,file,cb){
        let me=this;
        let path=this.devicePath(file);
        this.fileExists(deviceId,file,function(exists){
            if(exists){
                console.error("EXISTE DEJA "+file)
                me.runDevice(deviceId,"shell rm "+path,cb);
            }else{
                console.error("EXISTAIT PAS "+file)
                cb();
            }
        })

    }
    /**
     * Renvoie l'adresse IP en callback
     * @param {String} deviceId L'identifiant ADB du device
     * @param cb
     */
    getIp(deviceId,cb){
        this.runDevice(deviceId,"shell ip addr show wlan0",function(buffer){
            let regex = /inet\s+([0-9.]*)/gm;
            let arr;
            while ((arr = regex.exec(buffer)) !== null) {
                cb(arr[1]);
                return;
            }
            cb(null);

        },null,null,this.defaultLogsFor.getIp,true)
    }

    /**
     * Renvoie le pourcentage de chargement en callback
     * @param {String} deviceId L'identifiant ADB du device
     * @param cb
     */
    getBattery(deviceId,cb){
        let onComplete=function(out){
            let regex = /level: ([0-9]*)/m;
            let m;
            if ((m = regex.exec(out)) !== null) {
                m.forEach((match, groupIndex) => {
                    cb(match);
                    return;
                });
            }
        };
        this.runDevice(deviceId,"shell dumpsys battery",
            onComplete,
            null,
            null,
            this.defaultLogsFor.getBattery,
            false
        );
    }



    /**
     * Renvoie true si le fichier existe sur le casque
     * @param {String} deviceId L'identifiant ADB du device
     * @param filePath
     * @param {function} cb argument true ou false selon si le fichier existe ou non
     */
    fileExists(deviceId, filePath, cb){
        let file=this.devicePath(filePath);
        let onComplete=function(output){
            if(output.toString().toLowerCase().indexOf('no such file')===-1){
                cb(true);
            }else{
                cb(false);
            }
        };
        let onError=function(){
            cb(false)
        };
        this.runDevice(deviceId,`shell ls ${file}`,
            onComplete,
            null,
            onError,
            this.defaultLogsFor.fileExists
        );
    }

    /**
     * Liste les fichiers dans download et le renvoie en callback
     * @param {String} deviceId L'identifiant ADB du device
     * @param cb
     */
    listFiles(deviceId,cb){
        let cmd="shell find /sdcard/Download -type f";
        let _done=function(str){
            let files=[];
            let regex = /sdcard\/Download\/(.*)/gm;
            let arr;
            while ((arr = regex.exec(str)) !== null) {
                files.push(arr[1]);
            }
            //console.log("files",files);
            if(cb){
                cb(files);
            }
        };
        this.runDevice(deviceId,cmd,
            _done,
            null,
            null,
            this.defaultLogsFor.listFiles,
            false
        );
    }

    /**
     * Rennome un fichier
     * @param {String} deviceId L'identifiant ADB du device
     * @param oldName
     * @param newName
     * @param onComplete
     * @param onProgress
     * @param onError
     */
    renameFile(deviceId,oldName,newName,onComplete, onProgress, onError){
        let me=this;
        me.runDevice(deviceId,`shell mv -f ${oldName} ${newName}`
            ,onComplete,onProgress,onError,me.defaultLogsFor.renameFile,false
        );
    }

    /**
     * Copie un fichier de la régie vers un casque
     * @param {String} deviceId L'identifiant ADB du device
     * @param filePath
     * @param onComplete
     * @param onProgress
     * @param onError
     */
    pushFile(deviceId, filePath, onComplete, onProgress, onError){
        let me=this;
        let localFile = this.machinePath(filePath);
        let destFile = this.devicePath(filePath);
        let destFileTmp = destFile+".tmp";
        let cmd="push "+localFile+" "+destFileTmp;

        let _onProgress=function(d){
            let percent=0;
            let regex = /([0-9]*)%/gm;
            let arr = regex.exec(d);
            //console.log(d);
            //console.log(arr);
            if(arr){
                percent=arr[1];
                //console.log(percent);
            }
            onProgress(Number(percent));
        };
        let _onComplete=function(){
            //renomme le fichier temporaire en nom de fichier normal
            me.renameFile(deviceId,destFileTmp,destFile,onComplete,null,onError);
        };
        this.runDevice(deviceId,cmd,
            _onComplete,
            _onProgress,
            onError,
            me.defaultLogsFor.pushFile,
            false
        );
    }





    /**
     * Sort le device de veille
     * @param {String} deviceId L'identifiant ADB du device
     */
    wakeUp(deviceId){
        this.runDevice(
            deviceId
            ,"shell input keyevent KEYCODE_WAKEUP"
            ,null,
            null,
            null,
            this.defaultLogsFor.wakeUp,
            true
            )
    }

    /**
     * Reboote le casque
     * @param {String} deviceId L'identifiant ADB du device
     */
    reboot(deviceId){
       this.runDevice(deviceId,"reboot",
           null,
           null,
           null,
           this.defaultLogsFor.reboot,
           true
       );
    }
    /**
     * Eteint le casque
     * @param {String} deviceId L'identifiant ADB du device
     * @param cb
     */
    shutDown(deviceId,cb){
        this.runDevice(deviceId,"shell reboot -p",
            cb,null,
            null,
            this.defaultLogsFor.shutDown,
            true
        );
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
        me.runDevice(
            deviceId,cmd,
            success,
            null,
            onError,
            this.defaultLogsFor.installAPKAndReboot,
            true
        );
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




}
module.exports = ADB;