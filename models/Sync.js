const FileSystemUtils=require("../utils/FileSystemUtils");
const fs = require("fs");
const electron = require('electron');
const EventEmitter = require("event-emitter-es6");
const JsonStored = require("../utils/JsonStored");
const { ipcRenderer } = require('electron');
const remote = electron.remote;
const slash = require('slash');

/**
 * Objet qui synchronise l'application avec le serveur web
 */
class Sync extends EventEmitter{
    /**
     *
     * @param {string} syncUrl Url vers le json de synchro
     * @param {Machine} machine La machine dont on déduira pas mal de trucs
     */
    constructor(syncUrl,machine){
        super();

        let me=this;

        /**
         * Selon si on est online ou pas
         * @type {boolean}
         */
        this.isOnline=null;

        /**
         * True si une mise à jour est en cours
         * @type {boolean}
         */
        this.syncing=false;
        /**
         * Quand true c'est qu'on peut commencer à faire qque chose
         * @type {boolean}
         */
        this.ready=false;

        /**
         * @private
         * @type {string} Répertoire de stockage des fichiers de l'application
         */
        this.localStoragePath=machine.appStoragePath;
        /**
         * @private
         * @type {string} Url vers le json de synchro
         */
        this.syncUrl=syncUrl;
        /**
         * @private
         * @type {Machine}
         */
        this.machine=machine;

        /**
         * @private
         * Version du contenu enregistrée en local
         * @type {string}
         */
        this.synchroId="";
        /**
         * @private
         * Les données du fichier de synchronisation
         * @type {SyncJson}
         */
        this.data={};

        /**
         * Liste des fichiers (bundles) tels qu'ils devraient être référencés sur les casques
         * @type {string[]}
         */
        this.files=[];

        this.syncJson=new JsonStored("sync");
        me.data=this.syncJson.getJson(me.data);
        console.log("initial data",me.data);
        me.setNewJson(me.data);
        //mise à jour programmée
        me._recursiveSynchro();

        //en cas d'erreur réseau
        // dit qu'on est offline
        // dit qu'on ne synchronise pas pour relancer une sync un peu plus tard
        me.on(EVENT_NETWORK_ERROR,function(){
            if(me.isOnline!==false){
                me.isOnline=false;
                me.emit(EVENT_OFFLINE);
            }
            me.syncing=false;
            me.ready=true;
            me.emit(EVENT_SYNC_READY_TO_DISPLAY);
            me.emit(EVENT_READY);
        });

        //Quand un fichier existe pour sur
        ui.on("EVENT_FILE_EXISTS",
            /** @param {FileCell} deviceFile */
            function(deviceFile){
                switch (true) {
                    case deviceFile.fileHead().isLogo:
                        me.emit(EVENT_WEB_SYNC_LOGO_READY,machine.appStoragePath+"/"+deviceFile.path);
                        break;
                    case deviceFile.fileHead().isContenu:
                    case deviceFile.fileHead().isThumbnail:
                        if(deviceFile.deviceCol.isRegie()){
                            me.emit(EVENT_WEB_SYNC_CONTENU_READY,deviceFile.fileHead().contenu)
                        }
                }
            }
        );
        ui.on("EVENT_FILE_DELETED",
            /** @param {FileCell} deviceFile */
            function(deviceFile){
                switch (true) {
                    case deviceFile.fileHead().isContenu:
                        if(deviceFile.deviceCol.isRegie()) {
                            me.emit(EVENT_WEB_SYNC_CONTENU_DELETED, deviceFile.fileHead().contenu);
                        }
                        break;
                }
            }
        );

        ui.on("EVENT_FILE_EXISTS_NEW",
            /** @param {FileCell} deviceFile */
            function(deviceFile){
                console.warn("Fichier créé",deviceFile);
                switch (true) {
                    case deviceFile.fileHead().isApk:
                        alert("new apk");
                        me.emit(EVENT_WEB_SYNC_NEW_APK_AVAILABLE,machine.appStoragePath+"/"+deviceFile.path);
                        break;
                }
                console.log("EVENT fichier existe",deviceFile.path)
            }
        );

    }

    /**
     * Met à jour les contenus en boucle à intervale régulier
     * @private
     */
    _recursiveSynchro(){
        let me=this;
        if(me._intervalSynchro){
            clearInterval(me._intervalSynchro);
        }
        let delay=me._synchroDelay();
        console.log("next sync in "+delay);
        me._intervalSynchro=setInterval(function(){
            me._recursiveSynchro();
        },delay*1000);
        //fait le truc
        this.doIt();
    }

    /**
     * Calcule le delay entre deux mises à jour
     * @returns {number} secondes (si une erreur devait arriver le temps serait 60)
     * @private
     */
    _synchroDelay(){
        let sec;
        if(this.data && this.data.json){
            sec=this.data.json.refreshSeconds;
        }
        sec=!sec?61:sec;
        sec=isNaN(sec)?62:sec;
        return sec;
    }
    /**
     * Affiche ou masque les contenus dans l'ui
     */
    disableEnableContenus(){
        //masque / affiche les contenus disabled
        for(let contenu of this.getContenus()){
            let film=ui.films.getFilmById(contenu.uid);
            if(film){
                film.disabled=contenu.disabled;
            }
        }
    }

    /**
     * La liste des contenus actuelle
     * @returns {Contenu[]}
     */
    getContenus(){
        return this.data.json.contenus;
    }

    /**
     * Lance une synchronisation web de A à Z
     */
    doIt(){

        if(this.syncing){
            console.log("yet syncing");
            return;
        }
        let me=this;
        me.syncing=true;
        me.emit(EVENT_SYNCING);
        this.dwdJson(
            function(json){
                if(!me.isOnline){
                    me.emit(EVENT_ONLINE);
                    me.isOnline=true;
                }
                if(json.success){
                    //console.log("json",json);
                    ui.popIns.webApiData.displayData(json);
                    if(json.json.jukebox.pin){
                        ui.pinCode=json.json.jukebox.pin;
                    }
                    if(json.json.synchroId !== me.synchroId){
                        ui.log("Mise à jour du contenu nécessaire");
                    }else{
                        ui.log("Votre contenu est à jour");
                    }
                    me.setNewJson(json);
                    me.ready=true;
                    me.syncing=false;
                    me.emit(EVENT_WEB_SYNC_UPDATED);
                    me.emit(EVENT_SYNC_READY_TO_DISPLAY);
                    me.emit(EVENT_READY);
                }else{
                    for(let err of json.errors){
                        me.syncing=false;
                        me.emit(EVENT_SYNC_NOT_ALLOWED_ERROR,err);
                    }
                }

            },
            function(){
                console.error("synchronisation impossible");
                console.error("impossible de télécharger "+me.syncUrl);
                me.emit(EVENT_NETWORK_ERROR,"impossible de télécharger "+me.syncUrl);
            }
        )
    }

    /**
     * Définit un nouveau json et donc nouvelles data et nouvelle version.
     * @private
     * @param newJson
     */
    setNewJson(newJson){
        console.log("setNewJson");
        ui.log({"Nouvelle version des contenus à synchroniser":this.data});
        ui.popIns.webApiData.displayData(newJson);
        let me=this;
        /**
         *
         * @type {SyncJson}
         */
        let oldJson=this.data;
        if(!newJson.json){
            console.error("pas de json");
            return;
        }
        this.syncJson.saveJson(newJson);
        this.synchroId=newJson.json.synchroId;
        this.data=newJson;

        //prérelease acceptées ou non ?
        if(this.data.json.jukebox.istestmachine===true){
            //console.warn("ALLOW_PRE_RELEASE");
            ipcRenderer.send('ALLOW_PRE_RELEASE',true)
        }else{
            //console.warn("DISALLOW_PRE_RELEASE");
            ipcRenderer.send('ALLOW_PRE_RELEASE',false)
        }

        //marque tous les  fichiers comme à supprimer (les rétablira ensuite)
        for(let fileRegie of ui.devicesTable.devicesById["régie"].filesCellsArray()){
            fileRegie.shouldExists=-1;
        }

        //référence le logo
        let logoRegie=ui.devicesTable.getDeviceFile("régie",me.data.json.logomachine.localFile);
        logoRegie.fileHead().serverPath=me.data.json.logomachine.serverFile;
        logoRegie.fileHead().isLogo=true;
        logoRegie.exists=fs.existsSync(machine.appStoragePath+"/"+me.data.json.logomachine.localFile)?1:-1;

        //référence l'apk
        let apkRegie=ui.devicesTable.getDeviceFile("régie",me.data.json.casquesapk.localFile);
        apkRegie.fileHead().serverPath=me.data.json.casquesapk.serverFile;
        apkRegie.fileHead().isApk=true;
        apkRegie.exists=fs.existsSync(machine.appStoragePath+"/"+me.data.json.casquesapk.localFile)?1:-1;

        //fichiers contenus...
        for(let contenu of this.data.json.contenus){
            //gros fichier
            let contenuFile=ui.devicesTable.getDeviceFile("régie",contenu.localFile);
            contenuFile.fileHead().serverPath=contenu.serverFile;
            contenuFile.fileHead().contenuName=contenu.name;
            contenuFile.fileHead().isContenu=true;
            contenuFile.fileHead().contenu=contenu;
            contenuFile.shouldExists=1;
            contenuFile.fileHead().disabled=contenu.disabled;
            contenuFile.exists=fs.existsSync(machine.appStoragePath+"/"+contenu.localFile)?1:-1;
            //thumbnail
            let thumbnail=ui.devicesTable.getDeviceFile("régie",contenu.localThumbNoResize);
            thumbnail.fileHead().serverPath=contenu.serverThumbNoResize;
            thumbnail.fileHead().isThumbnail=true;
            thumbnail.fileHead().contenu=contenu;
            thumbnail.fileHead().contenuName="thumbnail "+contenu.name;
            thumbnail.exists=fs.existsSync(machine.appStoragePath+"/"+contenu.localThumbNoResize)?1:-1;
        }

        //--------------gros fichiers-----------------------

        //essaye de faire les taches
        setTimeout(function(){
            me.todoNext();
        },1000);
    }


    /**
     * Renvoie les données d'un contenu à partir de son uid
     * @param {string} uid
     * @param {array} contenus la liste des contenus où chercher
     * @returns {null|object}
     */
    getContenuByUid(uid,contenus=null){
        if(!contenus){
            contenus=this.data.json.contenus;
        }
        for(let i = 0;i<contenus.length;i++){
            let c=contenus[i];
            if(c.uid===uid){
                return c;
            }
        }
        return null;
    }

    /**
     * Télécharge le json
     * @private
     * @param successCb
     * @param errorCb
     */
    dwdJson(successCb,errorCb){
        let me = this;
        $.ajax(this.syncUrl,{
            data:{
                machinetoken:me.machine.machineId,
                machinename:me.machine.name,
                uuid:me.machine.uuid,
                exeversion:remote.app.getVersion()
            },
            success:function(data){
                //console.log(data);
                successCb(data);
            },error:function(){
                errorCb();
            }
        })
    }

    /**
     * Liste tous les fichiers physiques de la régie dans "contenus" et les marque comme existants
     * Marque tous les autres fichiers référencés comme innexistants
     */
    testFilesExistsRegie(){
        if(ui.devicesTable.isDoingSomething()){
            return;
        }
        let existingFilesAbsolute=FileSystemUtils.getFilesRecursive(machine.appStoragePath+"/contenus");
        existingFilesAbsolute=existingFilesAbsolute.concat(FileSystemUtils.getFilesRecursive(machine.appStoragePath+"/logo"));
        existingFilesAbsolute=existingFilesAbsolute.concat(FileSystemUtils.getFilesRecursive(machine.appStoragePath+"/apk"));
        existingFilesAbsolute=existingFilesAbsolute.concat(FileSystemUtils.getFilesRecursive(machine.appStoragePath+"/img"));
        let existingFiles=[];
        for(let f in existingFilesAbsolute){
            let p=existingFilesAbsolute[f].replace(slash(machine.appStoragePath)+"/",'');
            existingFiles.push(p);
        }
        //marque les fichiers qui existent
        for(let path in existingFiles){
            ui.devicesTable.getDeviceFile("régie",existingFiles[path]).exists=1;
        }
        //marque les fichiers qui n'existent pas
        for(let path in ui.devicesTable.filesHeadCells){
            if(existingFiles.indexOf(path)===-1){
                let dv=ui.devicesTable.getDeviceFile("régie",path,true);
                if(dv){
                    dv.exists=-1;
                }
            }
        }
    }

    /**
     * Teste via adb si les contenus existent sur le casque
     */
    testFilesExistCasques(){
        if(ui.devicesTable.isDoingSomething()){
            return;
        }
        console.log("testFilesExistCasques");
        for(let path in ui.devicesTable.filesHeadCells){
            for(let casque of casquesManager.casquesList()){
                if(casque.plugged){
                    //console.log("testFilesExistCasques",casque.deviceId,path);
                    adb.contenuExists(casque.deviceId,path,function(exists){
                        if(exists){
                            ui.devicesTable.getDeviceFile(casque.ip,path).exists=1;
                        }else{
                            let df=ui.devicesTable.getDeviceFile(casque.ip,path,true)
                            if(df){
                                df.exists=-1;
                            }
                        }
                    });
                    //teste l'espace disque
                    adb.diskSpace(casque.deviceId,function(output){
                        casque.diskUsage=output;
                    });
                }
            }
        }
    }

    /**
     *
     * @returns {null|FileCell}
     */
    getNextToDo(){
        //si une opération est en cours (copie ou effaçage) on renvoie rien
        for(let device of ui.devicesTable.devicesArray()){
            if(device.isDoingSomething()){
               return null;
            }
        }
        for(let device of ui.devicesTable.devicesArray()){
            if(device.isUsable()){ //est branché
                for(let path in device.filesCells){
                    let fc=device.filesCells[path];
                    if(fc.toDo===-1){
                        return fc;
                    }
                }
                for(let path in device.filesCells){
                    let fc=device.filesCells[path];
                    if(fc.toDo===1){
                        return fc;
                    }
                }
            }
        }
        return null;

    }



    /**
     *
     * @param {FileCell} fileCell
     */
    performToDo(fileCell){
        let me=this;
        console.warn("DO",
            fileCell.casque()?"casque":"régie",
            fileCell.toDo,
            fileCell.path,
            fileCell.exists,
            fileCell.shouldExists
        );

        if(fileCell.deviceCol.casque){
            let casque=casquesManager.getByIp(fileCell.deviceCol.casque.ip);
            switch (fileCell.toDo) {
                case -1:
                    fileCell.doing=-1;
                    adb.deleteFile(casque.deviceId,fileCell.path,function(){
                        fileCell.doing=0;
                        fileCell.exists=-1;
                        wifi.askFileList(casque);
                        me.todoNext();
                    });
                    break;

                case 1:
                    fileCell.doing=1;
                    adb.pushContenu2(
                        casque.deviceId,
                        fileCell.path,
                        function () {
                            fileCell.doing=0;
                            fileCell.exists=1;
                            fileCell.copyPercent=100;
                            wifi.askFileList(casque);
                            me.todoNext();
                        },
                        function (percent) {
                            fileCell.copyPercent=percent;
                        }, function (error) {
                            console.error("error adb push2",error)
                            fileCell.doing=-2;
                            wifi.askFileList(casque);
                        }
                    );
                    break;
            }
        }else{
            //régie
            let headFile=fileCell.fileHead();
            let localPath=me.localStoragePath+"/"+fileCell.path;
            switch (fileCell.toDo) {
                case -1:
                    FileSystemUtils.removeFile(localPath,
                        function(){
                            fileCell.doing=0;
                            fileCell.exists=-1;
                            ui.log(["Contenu supprimé de la régie",fileCell.path]);
                            me.todoNext();
                        },
                        function(){
                            fileCell.doing=-2;
                        }
                    );
                    break;

                case 1:
                    //dwd le gros fichier
                    if(!headFile){
                        console.error("headFile introuvable",fileCell.path)
                    }else{
                        if(!headFile.serverPath){
                            console.error("headFile serverPath introuvable",fileCell.path,headFile)
                        }
                    }
                    FileSystemUtils.ensureDirectoryExistence(localPath);
                    if(fs.existsSync(localPath)){
                        console.log("!!!!!")
                        //ok le fichier existait déjà
                        fileCell.doing=0;
                        fileCell.exists=1;
                        setTimeout(function(){
                            ui.layout.setContenuUpdate(null);
                            me.todoNext();
                        },1000);
                        return;
                    }else{
                        let log=ui.log(`Téléchargement de ${headFile.serverPath} `,true);
                        fileCell.doing=1;
                        FileSystemUtils.download(
                            headFile.serverPath
                            ,localPath
                            ,function(file){
                                ui.layout.setContenuUpdate(`${headFile.contenuName} terminé`);
                                fileCell.exists=1;
                                fileCell.doing=0;
                                setTimeout(function(){
                                    ui.layout.setContenuUpdate(null);
                                    me.todoNext();
                                },1000);
                                log.setContent(`Téléchargement vers ${file} terminé :)`);
                            }
                            ,function(percent,bytes,total){
                                fileCell.copyPercent=percent;
                                log.setContent(["Téléchargement",headFile.serverPath,percent+"%",FileSystemUtils.humanFileSize(bytes)+" / "+FileSystemUtils.humanFileSize(total)]);
                            }
                            ,function (err) {
                                me.emit(EVENT_NETWORK_ERROR);
                                fileCell.doing=-2;
                                ui.layout.setContenuUpdate(`${headFile.contenuName} error`);
                                setTimeout(function(){
                                    ui.layout.setContenuUpdate(null);
                                },1000);
                                log.setContent(["Erreur de téléchargement",headFile.serverPath,localPath,err]);
                            }
                        );
                        return;
                    }

            }
        }


    }

    loopToDo(){
        let me=this;
        if(this.loopToDo_interval){
            return;
        }
        this.loopToDo_interval=setInterval(function(){
            me.todoNext();
        },60*1000);
    }

    /**
     * si possible lance la prochaine tache à faire
     */
    todoNext(){
        console.warn("todoNext");
        if(ui.devicesTable.isDoingSomething()){
            console.log("occupé")
            return;
        }
        this.testFilesExistCasques();
        this.testFilesExistsRegie();
        let taskToDo=sync.getNextToDo();
        if(taskToDo){
            sync.performToDo(taskToDo);
        }else{
            //console.log("rien à faire")
        }
    }


}
module.exports = Sync;