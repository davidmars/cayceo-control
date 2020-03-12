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
    constructor(syncUrl,machine) {
        super();

        let me = this;

        /**
         * Selon si on est online ou pas
         * @type {boolean}
         */
        this.isOnline = null;
        /**
         * Si true on peut afficher les contenus
         * @type {null|boolean}
         */
        this.allowed=null;

        /**
         * True si une mise à jour est en cours
         * @type {boolean}
         */
        this.syncing = false;

        /**
         * @private
         * @type {string} Répertoire de stockage des fichiers de l'application
         */
        this.localStoragePath = machine.appStoragePath;
        /**
         * @private
         * @type {string} Url vers le json de synchro
         */
        this.syncUrl = syncUrl;
        /**
         * @private
         * @type {Machine}
         */
        this.machine = machine;

        /**
         * @private
         * Version du contenu enregistrée en local
         * @type {string}
         */
        this.synchroId = "";

        /**
         * Les données du fichier de synchronisation
         * @type {SyncJson}
         * @private
         */
        this._data = {};

        this.syncJson = new JsonStored("sync");
        me._data = this.syncJson.getJson(me._data);
        console.log("initial data", me._data);
        me._setNewJson(me._data);
        this._testReadyToDisplay();

        //mise à jour programmée
        me._recursiveSynchro();

        //écoute les fichiers
        me._listenFiles();


        me.on(EVENT_SYNCING, function () {
            me.syncing = true;
        });
        me.on(EVENT_SYNCING_FINISHED, function () {
            me._testReadyToDisplay();
            me.syncing = false;
        });
        me.on(EVENT_ONLINE, function () {
            me.isOnline = true;
        });

        //en cas d'erreur réseau
        // dit qu'on est offline si ce n'était pas déjà le cas
        me.on(EVENT_NETWORK_ERROR, function () {
            if (me.isOnline !== false) { //si on était pas dejà offline
                me.emit(EVENT_OFFLINE);
            }
        });
        me.on(EVENT_OFFLINE, function () {
            me.isOnline = false;
        });

    }


    /**
     * écoute les evenements de fichiers
     * @private
     */
    _listenFiles(){
        let me=this;


        //Quand un fichier est signélé comme existant...
        ui.on("EVENT_FILE_EXISTS",
            /** @param {FileCell} dFile */
            function(dFile){
                switch (true) {

                    //nouveau logo
                    case dFile.isLogo():
                        me.emit(EVENT_WEB_SYNC_LOGO_READY,machine.appStoragePath+"/"+dFile.path);
                        break;

                    //mise à jour de contenu
                    case dFile.isContenu():
                    case dFile.isThumbnail():
                        if(dFile.isRegie()){
                            me.emit(EVENT_WEB_SYNC_CONTENU_READY,dFile.contenu())
                        }
                        if(dFile.isThumbnail){
                            let film=ui.films.getFilmById(dFile.contenu().uid);
                            if(film){
                                film.setImage(machine.appStoragePath+"/"+dFile.contenu().localThumbNoResize);
                            }
                        }
                        break;
                }
            }
        );
        ui.on("EVENT_FILE_DELETED",
            /** @param {FileCell} dFile */
            function(dFile){
                switch (true) {
                    case dFile.isContenu():
                        if(dFile.isRegie()) {
                            me.emit(EVENT_WEB_SYNC_CONTENU_DELETED, dFile.contenu());
                        }
                        break;
                }
            }
        );

        //fichiers nouvellement créés et téléchargés
        ui.on("EVENT_FILE_EXISTS_NEW",
            /** @param {FileCell} dFile */
            function(dFile){
                switch (true) {
                    case dFile.isApk():
                        alert("new apk");
                        me.emit(EVENT_WEB_SYNC_NEW_APK_AVAILABLE,machine.appStoragePath+"/"+dFile.path);
                        break;
                }
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
        let delay=me._getSynchroDelay();
        console.log("next sync in "+delay);
        me._intervalSynchro=setInterval(function(){
            me._recursiveSynchro();
        },delay*1000);
        //fait le truc
        this._doIt();
    }

    /**
     * Calcule le delay entre deux mises à jour
     * @returns {number} secondes (si une erreur devait arriver le temps serait 60)
     * @private
     */
    _getSynchroDelay(){
        let sec;
        if(this._data && this._data.json){
            sec=this._data.json.refreshSeconds;
        }
        sec=!sec?61:sec;
        sec=isNaN(sec)?62:sec;
        return sec;
    }


    /**
     * Lance une synchronisation web de A à Z
     * @private
     */
    _doIt(){
        if(this.syncing){
            console.log("yet syncing");
            return;
        }
        let me=this;
        me.emit(EVENT_SYNCING);
        this._dwdJson(
            function(json){
                if(!me.isOnline){
                    me.emit(EVENT_ONLINE);
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
                    me._setNewJson(json);
                    me.emit(EVENT_WEB_SYNC_UPDATED);

                }else{
                    me.allowed=false;
                    for(let err of json.errors){
                        me.emit(EVENT_SYNC_NOT_ALLOWED_ERROR,err);
                    }
                }
                me.emit(EVENT_SYNCING_FINISHED);

            },
            function(){
                console.error("synchronisation impossible");
                console.error("impossible de télécharger "+me.syncUrl);
                me.emit(EVENT_NETWORK_ERROR,"impossible de télécharger "+me.syncUrl);
                setTimeout(function(){ //laisse le temps d'afficher le bouzin
                    me.emit(EVENT_SYNCING_FINISHED);
                },3000);

            }
        )
    }

    /**
     * Renvoie le SYNC_READY_TO_DISPLAY si toutes les conditions sont requises
     */
    _testReadyToDisplay(){
        if(!this.getContenus()){
            console.warn("NOT _testReadyToDisplay getContenus()")
            return;
        }
        if(this.allowed!==true){
            console.warn("NOT _testReadyToDisplay allowed",this.allowed)
            return;
        }
        this.emit(EVENT_SYNC_READY_TO_DISPLAY);
    }
    /**
     * Télécharge le json
     * @private
     * @param successCb
     * @param errorCb
     */
    _dwdJson(successCb, errorCb){
        let me = this;
        $.ajax(this.syncUrl,{
            data:{
                machinetoken:me.machine.machineId,
                machinename:me.machine.name,
                uuid:me.machine.uuid,
                exeversion:remote.app.getVersion()
            },
            success:function(json){
                successCb(json);
            },error:function(){
                errorCb();
            }
        })
    }
    /**
     * Définit un nouveau json et donc nouvelles data et nouvelle version.
     * @private
     * @param newJson
     */
    _setNewJson(newJson){
        console.log("setNewJson");
        ui.popIns.webApiData.displayData(newJson);
        let me=this;
        if(!newJson.json){
            console.error("pas de json");
            return;
        }
        this.syncJson.saveJson(newJson);
        this.synchroId=newJson.json.synchroId;
        this._data=newJson;
        this.allowed=me.getJukebox().allowed==="1";

        //prérelease acceptées ou non ?
        if(this._data.json.jukebox.istestmachine===true){
            //console.warn("ALLOW_PRE_RELEASE");
            ipcRenderer.send('ALLOW_PRE_RELEASE',true)
        }else{
            //console.warn("DISALLOW_PRE_RELEASE");
            ipcRenderer.send('ALLOW_PRE_RELEASE',false)
        }

        //marque tous les  fichiers comme à supprimer (les rétablira ensuite)
        for(let fileRegie of ui.devicesTable.regie().filesCellsArray()){
            fileRegie.shouldExists=-1;
        }

        //référence le logo
        let logoRegie=ui.devicesTable.getDeviceFile("régie",me.getLogo().localFile);
        logoRegie.fileHead().serverPath=me.getLogo().serverFile;
        logoRegie.fileHead().isLogo=true;
        logoRegie.exists=fs.existsSync(machine.appStoragePath+"/"+me.getLogo().localFile)?1:-1;

        //référence l'apk
        let apkRegie=ui.devicesTable.getDeviceFile("régie",me.getCasqueApk().localFile);
        apkRegie.fileHead().serverPath=me.getCasqueApk().serverFile;
        apkRegie.fileHead().isApk=true;
        apkRegie.exists=fs.existsSync(machine.appStoragePath+"/"+me.getCasqueApk().localFile)?1:-1;

        //fichiers contenus...
        for(let contenu of this._data.json.contenus){
            let film=ui.films.getFilmById(contenu.uid);
            if(film){
                film.setTitle(contenu.name);
            }
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




    //-------------------task files-------------------------

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


    //-------------------utils-------------------------

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
        return this._data.json.contenus;
    }

    /**
     * Renvoie les infos sur le jukebox (la régie)
     */
    getJukebox(){
        return this._data.json.jukebox;
    }

    /**
     * Les infos sur l'apk
     */
    getCasqueApk(){
        return this._data.json.casquesapk;
    }
    getLogo(){
        return this._data.json.logomachine;
    }
    /**
     * Renvoie les données d'un contenu à partir de son uid
     * @param {string} uid
     * @param {array} contenus la liste des contenus où chercher
     * @returns {null|object}
     */
    getContenuByUid(uid,contenus=null){
        if(!contenus){
            contenus=this.getContenus();
        }
        for(let i = 0;i<contenus.length;i++){
            let c=contenus[i];
            if(c.uid===uid){
                return c;
            }
        }
        return null;
    }

}
module.exports = Sync;