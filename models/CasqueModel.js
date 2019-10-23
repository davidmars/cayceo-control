const ContenuSurCasque=require("./casqueExtensions/ContenuSurCasque.js");
const CasqueApkInfos=require("./casqueExtensions/CasqueApkInfos.js");
const CasqueNowPlaying=require("./casqueExtensions/CasqueNowPlaying.js");
const CasqueContenusSynchro=require("./casqueExtensions/CasqueContenusSynchro.js");
/**
 * C'est la représentation des données propres à un casque
 */
class CasqueModel{

    constructor(){
        let me=this;
        /**
         * L'identifiant fourni par ADB
         * @type {string}
         */
        this.deviceId="";
        /**
         * Adresse ip du casque
         * @type {string}
         */
        this.ip="";
        /**
         * Branché (en ADB) ou pas
         * @private
         * @type {boolean}
         */
        this._plugged=false;

        //---------propriétés live déduites depuis socket wifi
        /**
         * Connecté en wifi ou pas
         * @private
         * @type {boolean}
         */
        this._online=false;
        /**
         * Informations à propos de la lecture en cours de contenu
         * @type {CasqueNowPlaying}
         */
        this.nowPlaying=new CasqueNowPlaying();
        /**
         * Quelque informations sur les éventuelles installations de l'APK
         * @type {CasqueApkInfos}
         */
        this.apkInfos=new CasqueApkInfos();

        //-----------propriétés live déduites depuis ADB


        /**
         * Le niveau de batterie
         * @private
         * @type {number}
         */
        this._batteryLevel=0;

        //petite boucle toutes les 10 secondes
        me._interval=setInterval(function(){
            me.loop();
        },1000*10);

        //------------contenus-------------------------
        /**
         * Informe sur l'état général de copie des contenus
         * @type {CasqueContenusSynchro}
         */
        this.contenusSynchro=new CasqueContenusSynchro(this);

        /**
         * Listes des fichiers qui doivent ou qui sont copiés sur le casque et leur état de copie
         * @type {ContenuSurCasque[]}
         */
        this.contenus=[];

        //------------socket-------------------------
        /**
         * La liste des fichiers renvoyée par socket
         * @type {null|string[]}
         */
        this.socketFiles=null;
        /**
         * L'identifiant de socket
         * @type {null}
         */
        this.socketId=null;
        /**
         * Une trace du dernier socket reçu
         * @type {FromCasque}
         */
        this.socket={
            msg:"Aucun socket reçu pour le moment"
        };


    }

    /**
     * Un boucle lancée toutes les 10 secondes qui va...
     * Tester la batterie via ADB si jamais on est offline
     * Vérifier que les contenus du casque sont à jour
     * Effacer les fichiers inutiles sur le casque (si toutes les conditions sont rencontrées pour faire cette opération)
     */
    loop(){
        let me=this;
        //autodestruction
        if(me.destroyed){
            clearInterval(me._interval);
            return;
        }

        //test de batterie
        if(!me._online){
            if(me.plugged){
                //niveau de batterie depuis ADB si on peut pas faire autrement
                adb.getBattery(me.deviceId,function(level){
                    me.setBatteryLevel(level);
                });
            }else{
                me.setBatteryLevel("?");
            }
        }
        //teste si l'apk est à jour
        me.testAPK();

        //teste si les contenus sont à jour
        me.checkContenusExists();

        //teste si on a des fichiers à effacer sur le casque
        if(!me.contenusSynchro.busy //si on est pas entrain de copier des bidules
            && me.contenusSynchro.ready //si on est certain que tout va bien
            && me.online //doit etre online pour s'assurer que la listes des fichiers va bien
            && me.plugged //doit etre branché pour adb
            && me.socketFiles //doit avoir des fichiers
            && sync.files.length>0 //être certain que la synchro web contient bien des machins
        ){
            for(let f of me.socketFiles){
                if(sync.files.indexOf(f)===-1){
                    console.warn("il faut effacer "+f,sync.files);
                    adb.deleteFile(me.deviceId,f,function(){
                        wifi.askFileList(me);
                    });
                    break; //on efface pas plus d'un fichier à la fois
                }else{
                    //console.log("il ne faut pas effacer "+f);
                }
            }

        }

    }

    /**
     * Retourne true si l'apk est à jour
     * @returns {string|*|boolean}
     */
    isApkOk(){
        return this.apkInfos.lastApk===sync.data.json.casquesapk.serverFile;
    }

    /**
     * A appeler quand on veut supprimer définitivement un casque
     * tue les listeners
     */
    destroy(){
        this.destroyed=true;
    }


    /**
     * Définit si le casque est branché ou non
     * @param bool
     */
    setPlugged(bool){
        this._plugged=bool;
        if(bool){
            this.checkContenusExists();
            this.syncContenus();
            this.testAPK();
        }else{
            this.contenusSynchro.busy=false
        }
        this.refreshDisplay();
    }
    get plugged(){return this._plugged;}

    /**
     * Définit le niveau de batterie
     * @param percent
     */
    setBatteryLevel(percent){
        this._batteryLevel=percent;
        this.refreshDisplay();
    }
    get batteryLevel(){return this._batteryLevel;}

    /**
     * Définit si le casque est online ou pas
     * @param value
     */
    setOnline(value) {
        this._online = value;
        this.refreshDisplay();
    }
    get online() {return this._online;}







    /**
     * Retourne l'entrée d'un contenu par son fichier
     * @param {string} file
     * @returns {ContenuSurCasque}
     * @private
     */
    _getContenuEntryByFile(file){
        for(let i=0;i<this.contenus.length;i++){
            let c=this.contenus[i];
            if(c.file===file){
                return c;
            }
        }
        return null;
    }
    /**
     * Indexe un contenu qui est, devrait ou sera sur le casque
     * @param file
     */
    indexNewContenu(file){
        if(!this._getContenuEntryByFile(file)){
            let c=new ContenuSurCasque(file);
            this.contenus.push(c);
            this.checkContenusExists();
            this.contenusSynchro.updateContenusReady();
            if(!this.contenusSynchro.ready){
                this.syncContenus();
            }
        }
    }

    /**
     *
     * @param {FromCasque} json
     */
    setSocket(json){
        this.socket=json;
        //on ne passe pas par les setters ici afin de ne faire qu'un seul refresh deisplay
        this._online=true;
        if(json.batterylevel !== -1){
            this._batteryLevel=json.batterylevel;
        }
        //apk
        this.apkInfos.version=json.apkVersion;
        //fichiers
        this.socketFiles=json.fileList;
        //infos sur la lecture en cours
        this.nowPlaying.isPlaying = json.isPlaying === 1;
        this.nowPlaying.contenuPath = json.contenuPath;
        this.nowPlaying.remainingSeconds = json.remainingSeconds;

        if ( json.msg === "Application Pause"){
            this._online=false;
        }
        this.refreshDisplay();
    }

    /**
     * Supprime le contenu de l'index et du device
     * @param file
     */
    removeContenu(file){
        let c=this._getContenuEntryByFile(file);
        if(c){
            c.shouldBeDeleted=true;
            c.status="to delete";
        }
        this.checkContenusExists();
        this.refreshDisplay();
        this.contenusSynchro.updateContenusReady();
        this.syncContenus();
    }

    /**
     * Vérifie via socket puis adb si les contenus sont sur le casque
     */
    checkContenusExists(){
        let me=this;
        for(let i=0;i<me.contenus.length;i++) {
            let cont = me.contenus[i];
            if(me.socketFiles!==null){
                if(me.socketFiles.indexOf(cont.file)>-1){
                    cont.fileExistsby.socket=cont.isOnCasque=true;
                    if(cont.shouldBeDeleted){
                        cont.status="to delete";
                        me.syncContenus();
                    }else{
                        cont.status="ok";
                    }
                }else{
                    cont.fileExistsby.socket=false
                }
            }
            if(cont.status===""){
                if(me.plugged){
                    cont.fileExistsby.adb="testing";
                    adb.contenuExists(me.deviceId,cont.file,function(exist){
                        if(exist){
                            cont.fileExistsby.adb=cont.isOnCasque=true;
                            if(cont.shouldBeDeleted){
                                cont.status="to delete";
                                me.syncContenus();
                            }else{
                                cont.status="ok";
                            }
                        }else{
                            cont.fileExistsby.adb=cont.isOnCasque=false;
                            if(!cont.shouldBeDeleted){
                                cont.status="to copy";
                                me.syncContenus();
                            }
                        }
                        me.contenusSynchro.updateContenusReady();
                    });
                }
            }

        }
        me.contenusSynchro.updateContenusReady();
    }




    /**
     * Copie/supprime les contenus vers le casque récursivement
     * Une seule copie de fichier à la fois est faite sur le casque
     */
    syncContenus(){
        console.log("syncContenus...")
        let me=this;

        for(let i =0;i<me.contenus.length;i++){
            let contenu=me.contenus[i];
            //si la synchro est pas possible (ou bien déjà en cours) on se barre
            if(!me.contenusSynchro.isPossible()){
                console.log("syncContenus...impossible")
                return;
            }
            console.log("syncContenus...go!")
            if(contenu.status!=="ok"){
                switch (contenu.isOnCasque) {
                    case true: //le contenu est sur le casque
                        if(contenu.shouldBeDeleted){ //et il faut le virer
                            if(contenu.status!==    "delete in progress..."){
                                contenu.status=     "delete in progress...";
                                me.contenusSynchro.busy=true;
                                adb.deleteFile(me.deviceId,contenu.file,function(){
                                    contenu.status="ok";
                                    contenu.isOnCasque=false;
                                    me.contenusSynchro.busy=false;
                                    me.syncContenus();//recursive call
                                });
                                me.refreshDisplay();
                            }
                        }else{ //tout va bien
                            contenu.status="ok";
                            me.refreshDisplay();
                        }
                        break;
                    case false: //il est pas sur le casque

                        if(contenu.shouldBeDeleted){ //tout va bien
                            contenu.status="ok";
                            me.refreshDisplay();
                        }else{ //il faut le copier
                            if(contenu.status!==    "copy in progress...") {
                                contenu.status =    "copy in progress...";
                                me.contenusSynchro.busy = true;
                                adb.pushContenu(
                                    me.deviceId,
                                    contenu.file,
                                    function () {
                                        contenu.status = "ok";
                                        me.refreshDisplay();
                                        me.contenusSynchro.busy = false;
                                        me.syncContenus();//recursive call
                                    },
                                    function (percent) {
                                        contenu.status = `${percent}%`;
                                        me.contenusSynchro.percent=percent;
                                        me.refreshDisplay();
                                    }, function () {
                                        contenu.status = `error on copy`;
                                        me.contenusSynchro.busy = false;
                                        me.refreshDisplay();
                                    }
                                );
                            }
                        }
                    break;
                }
            }
        }
        this.contenusSynchro.updateContenusReady();
        console.log("syncContenus...finished!")
    }


    refreshDisplay(){
        let me=this;
        /** @property {Casque} casqueUi **/
        let casqueUi=ui.casques.getCasqueByIp(me.ip);
        if(!casqueUi){
            console.error(`casque ui introuvable ${me.ip}`,me);
        }else{
            casqueUi.setDetails(me);
            casqueUi.setBatteryPlugged(me.plugged);
            casqueUi.setBattery(me.batteryLevel);
            casqueUi.setOnline(me.online);
            casqueUi.setContenusReady(me.contenusSynchro.ready);
            if(!me.contenusSynchro.ready){
                casqueUi.setCopyProgress(me.contenusSynchro.percent);
            }
            casqueUi.setApkIsOk(me.isApkOk());

            //lecture de contenu
            if(me.nowPlaying.contenuPath){
                casqueUi.setContenuPath(me.nowPlaying.contenuPath);
            }else{
                casqueUi.setContenu(null);
            }
            casqueUi.displayTime(me.nowPlaying.remainingSeconds);
            casqueUi.setIsPlaying(me.nowPlaying.isPlaying);

        }
    }

    /**
     * Tente de reveiller un casque (si il est branché en adb)
     */
    wakeUp(){
        if(this.plugged){
            window.adb.wakeUp(this.deviceId);
        }
    }

    /**
     * Teste si l'apk est à jour
     * Si ce n'est pas le cas, tente de l'installer
     */
    testAPK(){
        let me=this;
        if(!this.isApkOk()){
            if(!this.apkInfos.installation.installing && this.plugged){
                me.installCurrentApk();
            }
        }
    }
    /**
     * Installe la dernière version de l'apk sur ce casque
     */
    installCurrentApk(){
        let me =this;
        let apk=sync.data.json.casquesapk.localFile;
        me.apkInfos.installation.when=new Date().toLocaleString();
        me.apkInfos.installation.status=`installation de ${apk}`;
        if(!this.plugged){
            me.apkInfos.installation.status=[
                `oups ${apk}`,
                "n'a pas pu été installé car le casque était débranché"
            ];
            me.refreshDisplay();
            return;
        }
        me.apkInfos.installation.installing=true;
        adb.installAPKAndReboot(
            me.deviceId,
            apk,
            function(){
                //enregistre la derniere version de l'APK pour le prochain book de l'app
                me.apkInfos.lastApk=sync.data.json.casquesapk.serverFile;
                casquesManager._saveJson();
                me.apkInfos.installation.when=new Date().toLocaleString();
                me.apkInfos.installation.status="good !";
                me.apkInfos.installation.installing=false;
                me.refreshDisplay();

            },
            function(err){
                me.apkInfos.installation.when=new Date().toLocaleString();
                me.apkInfos.installation.status=err;
                me.apkInfos.installation.installing=false;
                me.refreshDisplay();
            }
        );
    }

}




module.exports = CasqueModel;