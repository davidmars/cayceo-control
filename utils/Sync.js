const FileSystemUtils=require("./FileSystemUtils");
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
            me.applyLocalPaths();
            me.synchroId = me.data.json.synchroId;
            ui.log("la version du contenu est " + this.synchroId);
            ui.popIns.webApiData.displayData(json);
        } else {
            ui.log("sync.json va être téléchargé pour la première fois...");
            ui.popIns.webApiData.displayData("pas encore téléchargé...");
        }
        me.doIt();
        setInterval(function(){
            me.doIt();
        },1000*window.conf.synchroDelaySeconds)
    }

    /**
     * Applique les chemins locaux absoluts aux urls
     * @private
     */
    applyLocalPaths(){
        let me=this;
        //logo
        me.data.json.logomachine.localPathAboslute=this.localStoragePath+"/"+ me.data.json.logomachine.localFile;
        //apk
        if(me.data.json.casquesapk && me.data.json.casquesapk.localFile) {
            let apk = me.data.json.casquesapk;
            apk.localPathAboslute = this.localStoragePath + "/" + apk.localFile;
        }
        //contenus
        for(let i=0;i<this.getContenus().length;i++){
            let c=this.getContenus()[i];
            c.localFileAbsolute=this.localStoragePath+"/"+c.localFile;
            c.localThumbAbsolute=this.localStoragePath+"/"+c.localThumb;
            c.localThumbNoResizeAbsolute=this.localStoragePath+"/"+c.localThumbNoResize;
        }
    }

    /**
     * La liste des contenus actuelle
     * @returns {object[]}
     */
    getContenus(){
        return this.data.json.contenus;
    }

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
                    console.log("json",json);
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
                        me.emit(EVENT_ERROR,err);
                    }
                }

            },
            function(){
                console.error("synchronisation impossible");
                console.error("impossible de télécharger "+me.syncUrl);
                me.emit(EVENT_NETWORK_ERROR,"impossible de télécharger "+me.syncUrl);
                if(me.isOnline!==false){
                    me.isOnline=false;
                    me.emit(EVENT_OFFLINE);
                }
                me.syncing=false;
                me.emit(EVENT_READY);

            }
        )
    }

    /**
     *
     * Définit un nouveau json et donc noucelles data et nouvelle version.
     * @private
     * @param json
     */
    setNewJson(json){
        let oldJson=this.data;
        fs.writeFileSync(this.jsonPath,JSON.stringify(json),{ encoding : 'utf8'});
        this.synchroId=json.json.synchroId;
        this.data=json;
        this.applyLocalPaths();
        console.log("nouvelle version",this.synchroId);
        console.log("nouveau json",this.data);
        ui.popIns.webApiData.displayData(json);



        //compare les anciennes et nouvelles données pour voir ce qui a été supprimé
        if(oldJson.json.contenus){
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
                    this.emit(window.EVENT_CONTENU_DELETED,contenu);
                }
            }
            //recherche les contenus ajoutés
            for(i=0;i<newUids.length;i++){
                if($.inArray(newUids[i],oldUids) === -1){
                    let contenu=this.getContenuByUid(newUids[i],json.json.contenus);
                    console.warn("contenu ajouté",contenu);
                    this.emit(window.EVENT_CONTENU_ADDED,contenu);
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
            //apk.localPathAboslute=this.localStoragePath+"/"+ apk.localFile;
            let distApk=apk.serverFile;
            FileSystemUtils.ensureDirectoryExistence(apk.localPathAboslute);
            if(!fs.existsSync(apk.localPathAboslute)){
                this.emit(EVENT_DOWNLOADING,"apk " + distApk);
                FileSystemUtils.download(distApk,apk.localPathAboslute,function(){
                    me.emit(EVENT_NEW_APK_AVAILABLE,apk.localPathAboslute);
                    me.dwdNext();
                });
                return;
            }
        }

        //dwd logo
        //me.data.json.logomachine.localPathAboslute=this.localStoragePath+"/"+ me.data.json.logomachine.localFile;
        let dist=me.data.json.logomachine.serverFile;
        FileSystemUtils.ensureDirectoryExistence(me.data.json.logomachine.localPathAboslute);
        if(!fs.existsSync(me.data.json.logomachine.localPathAboslute)){
            this.emit(EVENT_DOWNLOADING,"logo " + dist);
            FileSystemUtils.download(dist,me.data.json.logomachine.localPathAboslute,function(){
                me.dwdNext();
            });
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
                this.emit(EVENT_DOWNLOADING,"thumb " + contenu.serverThumb);
                FileSystemUtils.download(contenu.serverThumb,contenu.localThumbAbsolute,function(){
                    me.dwdNext();
                });
                return;
            }
            //dwd thumb no resize
            //contenu.localThumbNoResizeAbsolute=this.localStoragePath+"/"+contenu.localThumbNoResize;
            FileSystemUtils.ensureDirectoryExistence(contenu.localThumbNoResizeAbsolute);
            if(!fs.existsSync(contenu.localThumbNoResizeAbsolute)){
                this.emit(EVENT_DOWNLOADING,"thumb no resize " + contenu.serverThumbNoResize);
                FileSystemUtils.download(contenu.serverThumbNoResize,contenu.localThumbNoResizeAbsolute,function(){
                    me.dwdNext();
                });
                return;
            }

            //dwd le gros fichier
            //contenu.localFileAbsolute=this.localStoragePath+"/"+contenu.localFile;
            FileSystemUtils.ensureDirectoryExistence(contenu.localFileAbsolute);
            if(!fs.existsSync(contenu.localFileAbsolute)){
                this.emit(EVENT_DOWNLOADING,"file " + contenu.serverFile);
                FileSystemUtils.download(contenu.serverFile,contenu.localFileAbsolute,function(){
                    me.dwdNext();
                });
                return;
            }
        }
        me.emit(EVENT_UPDATED);
        me.emit(EVENT_READY);
        me.syncing=false;

    }

}
module.exports = Sync;