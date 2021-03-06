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

        this.loopToDo();

    }


    /**
     * écoute les evenements de fichiers
     * @private
     */
    _listenFiles(){
        let me=this;


        //Quand un fichier est signalé comme existant...
        ui.on("EVENT_FILE_EXISTS",
            /** @param {FileCell} dFile */
            function(dFile){
                switch (true) {

                    //nouveau qrcode
                    case dFile.isQrcode():
                        me.emit(EVENT_WEB_SYNC_QRCODE_READY,machine.appStoragePath+"/"+dFile.path);
                        break;

                    //nouveau logo
                    case dFile.isLogo():
                        me.emit(EVENT_WEB_SYNC_LOGO_READY,machine.appStoragePath+"/"+dFile.path);
                        break;

                    //nouveau mode emploi
                    case dFile.isModeEmploi():
                        me.emit(EVENT_WEB_SYNC_MODE_EMPLOI_READY,machine.appStoragePath+"/"+dFile.path);
                        break;

                    //mise à jour de contenu
                    case dFile.isContenu():
                        if(dFile.isRegie()){
                            me.emit(EVENT_WEB_SYNC_CONTENU_READY,dFile.contenu())
                        }
                        break;

                    case dFile.isThumbnail():
                            let film=ui.films.getFilmById(dFile.contenu().uid);
                            if(film){
                                film.setImage(machine.appStoragePath+"/"+dFile.contenu().localThumbNoResize);
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
                        if(dFile.isRegie()){
                            me.emit(EVENT_WEB_SYNC_NEW_APK_AVAILABLE,machine.appStoragePath+"/"+dFile.path);
                        }
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

        //options d'ergonomie
        ui.ipneoRemoteEnabled=this._data.json.jukebox.ipneoremote;
        ui.btnSelectAllEnabled=this._data.json.jukebox.btnselectall;
        ui.btnPlayAllEnabled=this._data.json.jukebox.btnplayall;

        //marque tous les  fichiers comme à supprimer (les rétablira ensuite)
        for(let fileRegie of ui.devicesTable.regie().filesCellsArray()){
            fileRegie.shouldExists=-1;
        }

        //fichiers hors web en premier

        //adresse ip:port à copier sur les casques pour que les service se connecte correctement au socket
        let ips=this.machine.getIpAdresses();
        if(ips[0]){
            let p="doc/server-socket-address.txt";
            let fullP=this.machine.appStoragePath+"/"+p;
            FileSystemUtils.ensureDirectoryExistence(fullP);
            let contenu=ips[0]+":3000";
            fs.writeFileSync(fullP,contenu);
            let fhc=ui.devicesTable.addFile(p);
            fhc.isDoc=true;
            fhc.contenuName="Server socket address";
            ui.devicesTable.getDeviceFile("régie",p).shouldExists=1;
            for(let c of ui.devicesTable.devicesArray()){
                if(c.isCasque()){
                    ui.devicesTable.getDeviceFile(c.id,p).shouldExists=1;
                    ui.devicesTable.getDeviceFile(c.id,p).exists=-1;//forcera la réécriture du fichier
                }
            }
        }
        /**
         * Les données json d'un fichier
         */
        let fileData;
        /**
         * @type {FileHeadCell}
         */
        let fileHead;
        /**
         * @type {FileCell}
         */
        let fileRegie;

        //référence le logo
        fileData=me.getLogo();
        fileRegie=ui.devicesTable.getDeviceFile("régie",fileData.localFile);
        fileHead=fileRegie.fileHead();
        fileHead.serverPath=fileData.serverFile;
        fileHead.isLogo=true;
        fileHead.bytes=fileData.bytes;
        fileRegie.exists=fs.existsSync(machine.appStoragePath+"/"+fileData.localFile)?1:-1;

        //référence le qrcode
        fileData=me.getQrcode();
        if(fileData){
            fileRegie=ui.devicesTable.getDeviceFile("régie",fileData.localFile);
            fileHead=fileRegie.fileHead();
            fileHead.serverPath=fileData.serverFile;
            fileHead.isQrCode=true;
            fileHead.bytes=fileData.bytes;
            fileRegie.exists=fs.existsSync(machine.appStoragePath+"/"+fileData.localFile)?1:-1;
        }

        //référence le mode d'emploi
        fileData=me.getModeEmploi();
        if(fileData.localFile){
            fileRegie=ui.devicesTable.getDeviceFile("régie",fileData.localFile);
            fileHead=fileRegie.fileHead();
            fileHead.serverPath=fileData.serverFile;
            fileHead.isModeEmploi=true;
            fileHead.bytes=fileData.bytes;
            fileRegie.exists=fs.existsSync(machine.appStoragePath+"/"+fileData.localFile)?1:-1;
        }

        //référence l'apk
        fileData=me.getCasqueApk();
        fileRegie=ui.devicesTable.getDeviceFile("régie",fileData.localFile);
        fileHead=fileRegie.fileHead();
        fileHead.serverPath=fileData.serverFile;
        fileHead.isApk=true;
        fileHead.bytes=fileData.bytes;
        fileRegie.exists=fs.existsSync(machine.appStoragePath+"/"+fileData.localFile)?1:-1;

        //fichiers contenus...
        for(let contenu of this._data.json.contenus){
            let film=ui.films.getFilmById(contenu.uid);
            if(film){
                film.setTitle(contenu.name);
            }
            //thumbnail
            fileRegie=ui.devicesTable.getDeviceFile("régie",contenu.image.localFile);
            fileHead=fileRegie.fileHead();
            fileHead.serverPath=contenu.image.serverFile;
            fileHead.contenuName="thumbnail "+contenu.name;
            fileHead.isThumbnail=true;
            fileHead.contenu=contenu;
            fileHead.bytes=contenu.image.bytes;
            fileRegie.exists=fs.existsSync(machine.appStoragePath+"/"+contenu.image.localFile)?1:-1;

            //gros fichier
            fileRegie=ui.devicesTable.getDeviceFile("régie",contenu.file.localFile);
            fileHead=fileRegie.fileHead();
            fileHead.serverPath=contenu.file.serverFile;
            fileHead.contenuName=contenu.name;
            fileHead.isContenu=true;
            fileHead.contenu=contenu;
            fileRegie.shouldExists=1;
            fileHead.disabled=contenu.disabled;
            fileHead.bytes=contenu.file.bytes;
            fileRegie.exists=fs.existsSync(machine.appStoragePath+"/"+contenu.file.localFile)?1:-1;
        }

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
        existingFilesAbsolute=existingFilesAbsolute.concat(FileSystemUtils.getFilesRecursive(machine.appStoragePath+"/doc"));
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
     * Teste via adb si les contenus existent sur les casques
     */
    testFilesExistCasques(){
        if(ui.devicesTable.isDoingSomething()){
            return;
        }
        console.log("testFilesExistCasques");
        //pour chaque casque branché
        for(let casque of casquesManager.casquesListPlugged()){
            adb.listFiles(casque.deviceId,function(files){
                if(files.length){
                    //pour chaque fichier référencé...
                    //marque tous les fichiers comme innexistants pour ce casque
                    for(let path in ui.devicesTable.filesHeadCells){
                        ui.devicesTable.getDeviceFile(casque.ip,path).exists=-1;
                    }
                    //marque comme existants ceux qu'on a reçu via ADB
                    for (let existing of files){
                        ui.devicesTable.getDeviceFile(casque.ip,existing).exists=1;
                    }
                }else{
                    console.error("adb list files vide?");
                    for(let path in ui.devicesTable.filesHeadCells){
                        ui.devicesTable.getDeviceFile(casque.ip,path).exists=-1;
                    }
                }
            }
            );
        }
    }

    /**
     * Renvoie la prochaine tache à faire si il y en a une
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
                    if(fc.doing===-2 && fc.errorsTry > 0){
                        fc.errorsTry--;
                        if(fc.errorsTry<=0){
                            fc.doing=0;
                        }
                    }
                }
                for(let path in device.filesCells){
                    let fc=device.filesCells[path];
                    if(fc.toDo===-1 && fc.doing===0){
                        return fc;
                    }
                }
                for(let path in device.filesCells){
                    let fc=device.filesCells[path];
                    if(fc.toDo===1 && fc.doing===0){
                        return fc;
                    }
                }
            }
        }
        return null;

    }

    /**
     * Effectue ce qui doit être fait sur une fileCell donnée
     * @param {FileCell} fileCell
     */
    performToDo(fileCell){
        console.warn("DO",
            fileCell.casque()?"casque":"régie",
            fileCell.toDo,
            fileCell.path,
            fileCell.exists,
            fileCell.shouldExists
        );
        if(fileCell.isCasque()){
            this._performToDoCasque(fileCell);
        }else{
            this._performToDoRegie(fileCell);
        }


    }

    /**
     * Effectue ce qui doit être fait sur une fileCell donnée
     * @param {FileCell} fileCell
     */
    _performToDoCasque(fileCell){
        let me=this;
        let casque=casquesManager.getByIp(fileCell.deviceCol.casque.ip);

        switch (fileCell.toDo) {
            //effacer le fichier
            case -1:
                fileCell.doing=-1;
                let _deleteOk=function(){
                    fileCell.doing=0;
                    fileCell.exists=-1;
                    wifi.askFileList(casque);
                    me.testFilesExistCasques();
                    me.todoNext();
                };
                adb.deleteFile(
                    casque.deviceId,
                    fileCell.path,
                    _deleteOk
                );
                break;

            //copier le fichier
            case 1:
                fileCell.doing=1;

                let _copyOk=function(){
                    fileCell.doing=0;
                    fileCell.exists=1;
                    fileCell.copyPercent=100;
                    me.testFilesExistCasques();
                    wifi.askFileList(casque);
                    me.todoNext();
                };
                let _copyProgress=function(percent){
                    fileCell.copyPercent=percent;
                };
                let _copyError=function(error){
                    console.error("error adb push",error)
                    fileCell.doing=-2;
                    fileCell.errorsTry=Math.floor(10+Math.random()*10); //resetera en aléatoire pour permettre un mêlange
                    wifi.askFileList(casque);
                    me.testFilesExistCasques();
                    me.testFilesExistCasques();
                    me.todoNext();
                };
                adb.pushFile(
                    casque.deviceId,
                    fileCell.path,
                    _copyOk,
                    _copyProgress,
                    _copyError
                );
                break;
        }
    }
    /**
     * Effectue ce qui doit être fait sur une fileCell donnée
     * @param {FileCell} fileCell
     */
    _performToDoRegie(fileCell){
        let me=this;
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
                        setTimeout(function(){
                            fileCell.doing=0;
                            me.todoNext();
                        },15000)
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
                        me.testFilesExistCasques();
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
                                me.testFilesExistCasques();
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
                            setTimeout(function(){
                                fileCell.doing=0;
                                me.todoNext();
                            },15000);
                            log.setContent(["Erreur de téléchargement",headFile.serverPath,localPath,err]);
                        }
                    );
                    return;
                }

        }
    }

    loopToDo(){
        let me=this;
        if(this.loopToDo_interval){
            return;
        }
        this.loopToDo_interval=setInterval(function(){
            me.testFilesExistCasques();
            me.todoNext();
        },3*60*1000);
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

        this.testFilesExistsRegie();
        let taskToDo=sync.getNextToDo();
        if(taskToDo){
            sync.performToDo(taskToDo);
        }else{
            console.log("rien à faire")
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
        if(this._data && this._data.json){
            return this._data.json.contenus;
        }
        return [];
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
    getQrcode(){
        return this._data.json.qrcode;
    }
    getModeEmploi(){
        return this._data.json.modeemploi;
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