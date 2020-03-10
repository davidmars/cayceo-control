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
        /**
         * Affiche l'espace libre
         * @type {string}
         */
        this.diskUsage="";

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
                //adb.getBattery(me.deviceId,function(level){
                    //me.setBatteryLevel(level);
                //});
            }else{
                me.setBatteryLevel("?");
            }
        }
        //teste si l'apk est à jour
        me.testAPK();

        //teste si les contenus sont à jour
        //me.checkContenusExists();

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
            casquesManager.emit(EVENT_CASQUE_PLUGGED,this);
            //this.checkContenusExists();
            this.testAPK();
        }else{
            casquesManager.emit(EVENT_CASQUE_UNPLUGGED,this);
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
        for(let f of json.fileList){
            let df=ui.devicesTable.getDeviceFile(this.ip,f);
            if(!this.socketFiles && df.exists !== -1){
                //si c'est la première fois qu'on recoit la liste de fichier on estime que le fichier existe bien
                df.exists=1;
            }
        }
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
     * Supprime le contenu de l'index
     * La suppression du fichier reelle se fera plus tard
     * @param file
     */
    removeContenu(file){


    }

    refreshDisplay(){
        //console.warn("casque refresh display")
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
            casqueUi.setApkIsOk(me.isApkOk());
            //lecture de contenu
            if(me.nowPlaying.contenuPath){
                if(!ui.films.getFilmByFilePath(me.nowPlaying.contenuPath)){
                    console.warn("contenu en cours de lecture qui n'est plus dans l'app");
                    wifi.stopSeance(this);
                }else{
                    casqueUi.setContenuPath(me.nowPlaying.contenuPath);
                }
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
        stats.pageView(`${CMD.CASQUE_INSTALL_APK}/START/${apk}/c-${me.ip}`);
        adb.installAPKAndReboot(
            me.deviceId,
            apk,
            function(){
                //enregistre la derniere version de l'APK pour le prochain boot de l'app
                stats.pageView(`${CMD.CASQUE_INSTALL_APK}/SUCCESS/${apk}/c-${me.ip}`);
                me.apkInfos.lastApk=sync.data.json.casquesapk.serverFile;
                casquesManager._saveJson();
                me.apkInfos.installation.when=new Date().toLocaleString();
                me.apkInfos.installation.status="good !";
                me.apkInfos.installation.installing=false;
                me.refreshDisplay();

            },
            function(err){
                stats.pageView(`${CMD.CASQUE_INSTALL_APK}/ERROR/${apk}/c-${me.ip}`);
                me.apkInfos.installation.when=new Date().toLocaleString();
                me.apkInfos.installation.status=err;
                me.apkInfos.installation.installing=false;
                me.refreshDisplay();
            }
        );
    }

}




module.exports = CasqueModel;