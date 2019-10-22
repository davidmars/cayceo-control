const FileSystemUtils=require("../utils/FileSystemUtils");
const fs = require("fs");
const EventEmitter = require("event-emitter-es6");


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
         * @type {{}}
         */
        this.data={};

        /**
         * Liste des fichiers (bundles) tels qu'ils devraient être référencés sur les casques
         * @type {string[]}
         */
        this.files=[];

        /**
         * @private
         * Chemin vers le fichier en local
         * @type {string}
         */
        this.jsonPath=machine.appStoragePath+"/sync.json";

        //teste si le json existe
        if (fs.existsSync(this.jsonPath)) {
            let json = fs.readFileSync(me.jsonPath);
            json = JSON.parse(json);
            me.data = json;
            me._applyLocalAndCheckReady();
            me.synchroId = me.data.json.synchroId;
            ui.log("la version du contenu est " + this.synchroId);
        } else {
            ui.log("sync.json va être téléchargé pour la première fois...");
            ui.popIns.webApiData.displayData("pas encore téléchargé...");
        }
        me.doIt();
        //mise à jour programmée
        setInterval(function(){
            me.doIt();
        },1000*window.conf.synchroDelaySeconds);

        //en cas d'erreur réseau
        // dit qu'on est offline
        // dit qu'on ne synchronise pas pour relancer une sync un peu plus tard
        me.on(EVENT_NETWORK_ERROR,function(){
            if(me.isOnline!==false){
                me.isOnline=false;
                me.emit(EVENT_OFFLINE);
            }
            me.syncing=false;
            me.emit(EVENT_READY);
        })
    }

    /**
     * Applique les chemins locaux absoluts aux urls
     * Applique les variables
     * @private
     */
    _applyLocalAndCheckReady(){
        let me=this;

        //logo
        let logo=me.data.json.logomachine;
        logo.localPathAboslute=this.localStoragePath+"/"+ logo.localFile;
        let logoWasReady=logo.localPathAboslute_downloaded;
        logo.localPathAboslute_downloaded = fs.existsSync(logo.localPathAboslute);
        if(!logoWasReady && logo.localPathAboslute_downloaded){
            me.emit(EVENT_WEB_SYNC_LOGO_READY,logo.localPathAboslute);
        }

        //apk
        if(me.data.json.casquesapk && me.data.json.casquesapk.localFile) {
            let apk = me.data.json.casquesapk;
            apk.localPathAboslute = this.localStoragePath + "/" + apk.localFile;
            apk.localPathAboslute_downloaded = fs.existsSync(apk.localPathAboslute);
        }
        //contenus
        me.files=[];
        for(let i=0;i<this.getContenus().length;i++){
            let c=this.getContenus()[i];
            me.files.push(c.localFile);
            c.localFileAbsolute=this.localStoragePath+"/"+c.localFile;
            c.localFileAbsolute_downloaded=fs.existsSync(c.localFileAbsolute);
            c.localThumbAbsolute=this.localStoragePath+"/"+c.localThumb;
            c.localThumbAbsolute_downloaded=fs.existsSync(c.localThumbAbsolute);
            c.localThumbNoResizeAbsolute=this.localStoragePath+"/"+c.localThumbNoResize;
            c.localThumbNoResizeAbsolute_downloaded=fs.existsSync(c.localThumbNoResizeAbsolute);
            let contenuWasReady=c.ready;
            c.ready=c.localFileAbsolute_downloaded && c.localThumbAbsolute_downloaded && c.localThumbNoResizeAbsolute_downloaded;
            if(!contenuWasReady && c.ready){
                me.emit(EVENT_WEB_SYNC_CONTENU_READY,c);
            }
        }
    }

    /**
     * La liste des contenus actuelle
     * @returns {object[]}
     */
    getContenus(){
        return this.data.json.contenus;
    }

    /**
     * Lance une synchronisation web de A à Z
     */
    doIt(){
        if(this.syncing){
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
                        me.setNewJson(json);
                        ui.log("Mise à jour du contenu nécessaire");
                    }else{
                        ui.log("Votre contenu est à jour");
                    }
                    me.dwdNext();
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
     * @param json
     */
    setNewJson(json){
        let oldJson=this.data;
        fs.writeFileSync(this.jsonPath,JSON.stringify(json,null,2),{ encoding : 'utf8'});
        this.synchroId=json.json.synchroId;
        this.data=json;
        this._applyLocalAndCheckReady();
        ui.log({"Nouvelle version des contenus à synchroniser":this.data});
        ui.popIns.webApiData.displayData(json);

        //compare les anciennes et nouvelles données pour voir ce qui a été supprimé
        if(oldJson && oldJson.json && oldJson.json.contenus){
            let newUids=[];
            let oldUids=[];
            let i;
            for(i = 0;i<oldJson.json.contenus.length;i++){
                oldUids.push(oldJson.json.contenus[i].uid);
            }
            for(i = 0;i<json.json.contenus.length;i++){
                newUids.push(json.json.contenus[i].uid);
            }
            //recherche les contenus supprimés
            for(i=0;i<oldUids.length;i++){
                if($.inArray(oldUids[i],newUids) === -1){
                    let contenu=this.getContenuByUid(oldUids[i],oldJson.json.contenus);
                    console.warn("contenu supprimé",contenu);
                    this.emit(window.EVENT_WEB_SYNC_CONTENU_DELETED,contenu);
                }
            }


        }

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
     * Télécharge récusivement les éléments à télécharger
     * @private
     */
    dwdNext(){
        this.emit(EVENT_UPDATING);
        let me=this;

        //dwd apk
        if(me.data.json.casquesapk && me.data.json.casquesapk.localFile){
            let apk=me.data.json.casquesapk;
            let distApk=apk.serverFile;
            FileSystemUtils.ensureDirectoryExistence(apk.localPathAboslute);
            if(!fs.existsSync(apk.localPathAboslute)){
                let log=ui.log(`Téléchargement APK ${distApk} `);
                FileSystemUtils.download(
                    distApk
                    ,apk.localPathAboslute
                    ,function(file){
                        me.emit(EVENT_WEB_SYNC_NEW_APK_AVAILABLE,apk.localPathAboslute);
                        log.setContent(`Téléchargement vers ${file} terminé :)`);
                        me.dwdNext();
                    }
                    ,function(percent,bytes,total){
                        log.setContent(`downloading new APK ${percent}%`)
                    }
                    ,function (err) {
                        log.setContent(["error while downloading new APK",err])
                    }
                );
                return;
            }
        }

        //dwd logo
        let dist=me.data.json.logomachine.serverFile;
        FileSystemUtils.ensureDirectoryExistence(me.data.json.logomachine.localPathAboslute);
        if(!fs.existsSync(me.data.json.logomachine.localPathAboslute)){
            let log=ui.log(`Téléchargement de ${dist} `,true);
            FileSystemUtils.download(
                dist
                ,me.data.json.logomachine.localPathAboslute
                ,function(file){
                    me._applyLocalAndCheckReady();
                    log.setContent(`Téléchargement vers ${file} terminé :)`)
                    me.dwdNext();
                }
                ,function(percent,bytes,total){
                    log.setContent(`Téléchargement de ${dist}  ${percent}%`)
                }
                ,function (err) {
                    log.setContent([
                        "Erreur de téléchargement"
                        ,dist
                        ,me.data.json.logomachine.localPathAboslute
                        ,err
                    ])
                }
            );
            return;
        }


        //chaque contenu
        /** @property {ContenuModel} contenu */
        for(let contenu of me.data.json.contenus){

            //à chaque fois qu'un fichier doit être téléchargé rapelle la fonction en récusrsif.

            //dwd thumb
            //contenu.localThumbAbsolute=this.localStoragePath+"/"+contenu.localThumb;
            FileSystemUtils.ensureDirectoryExistence(contenu.localThumbAbsolute);
            if(!fs.existsSync(contenu.localThumbAbsolute)){
                let log=ui.log(`Téléchargement de ${contenu.serverThumb} `,true);
                FileSystemUtils.download(
                    contenu.serverThumb
                    ,contenu.localThumbAbsolute
                    ,function(file){
                        log.setContent(`Téléchargement vers ${file} terminé :)`)
                        me.dwdNext();
                    }
                    ,function(percent,bytes,total){
                        log.setContent(`Téléchargement de ${contenu.serverThumb}  ${percent}%`)
                    }
                    ,function (err) {
                        log.setContent([
                            "Erreur de téléchargement"
                            ,contenu.serverThumb
                            ,contenu.localThumbAbsolute
                            ,err
                        ])
                    }
                );
                return;
            }
            //dwd thumb no resize
            //contenu.localThumbNoResizeAbsolute=this.localStoragePath+"/"+contenu.localThumbNoResize;
            FileSystemUtils.ensureDirectoryExistence(contenu.localThumbNoResizeAbsolute);
            if(!fs.existsSync(contenu.localThumbNoResizeAbsolute)){
                let log=ui.log(`Téléchargement de ${contenu.serverThumbNoResize} `,true);
                FileSystemUtils.download(
                    contenu.serverThumbNoResize
                    ,contenu.localThumbNoResizeAbsolute
                    ,function(file){
                        log.setContent(`Téléchargement vers ${file} terminé :)`)
                        me.dwdNext();
                    }
                    ,function(percent,bytes,total){
                        log.setContent(`Téléchargement de ${contenu.serverThumbNoResize}  ${percent}%`)
                    }
                    ,function (err) {
                        log.setContent([
                            "Erreur de téléchargement"
                            ,contenu.serverThumbNoResize
                            ,contenu.localThumbNoResizeAbsolute
                            ,err
                        ])
                    }
                );
                return;
            }

            //dwd le gros fichier
            //contenu.localFileAbsolute=this.localStoragePath+"/"+contenu.localFile;
            FileSystemUtils.ensureDirectoryExistence(contenu.localFileAbsolute);
            if(!fs.existsSync(contenu.localFileAbsolute)){
                let log=ui.log(`Téléchargement de ${contenu.serverFile} `,true);
                FileSystemUtils.download(
                    contenu.serverFile
                    ,contenu.localFileAbsolute
                    ,function(file){
                        log.setContent(`Téléchargement vers ${file} terminé :)`)
                        me.dwdNext();
                        me._applyLocalAndCheckReady();
                    }
                    ,function(percent,bytes,total){
                        log.setContent([
                            "Téléchargement"
                            ,contenu.serverFile
                            ,percent+"%"
                            ,FileSystemUtils.humanFileSize(bytes)+" / "+FileSystemUtils.humanFileSize(total)
                        ]);
                    }
                    ,function (err) {
                        me.emit(EVENT_NETWORK_ERROR);
                        log.setContent([
                            "Erreur de téléchargement"
                            ,contenu.serverFile
                            ,contenu.localFileAbsolute
                            ,err
                        ])
                    }
                );
                return;
            }
        }
        me.emit(EVENT_WEB_SYNC_UPDATED);
        me.emit(EVENT_READY);
        me.syncing=false;

    }

}
module.exports = Sync;