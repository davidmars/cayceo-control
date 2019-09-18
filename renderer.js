// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const FileSystemUtils = require('./utils/FileSystemUtils');

const electron = require('electron');
const remote = electron.remote;

const Conf=                 require("./utils/Conf");
const Machine =             require('./utils/Machine.js');
const Sync=                 require("./models/Sync");
const CasqueModelsManager=    require("./models/CasqueModelsManager");
const Wifi=    require("./models/Wifi");

require("./utils/ip-to-numero");
require("./EVENTS");
require("cayceo-ui/dist/cayceoUi");
//passe en mode debug direct
ui.debugMode.enable();

//conf
window.conf=new Conf();
window.conf.serverRoot="https://jukeboxvr.fr"; //
window.conf.appDirectoryStorageName="jukebox-cayceo/prod";

//machine
let machine=window.machine=new Machine();
machine.on(EVENT_READY,function(){
    //pour cayceo on modifie les identifiants
    machine.name=`cayceo ${machine.name}`;
    machine.machineId=`cayceo-${machine.machineId}`;
    ui.displaySplashScreen("Hello");
    //app versions
    //affiche la version de l'application
    ui.layout.setVersion(remote.app.getVersion());
    ui.log(`App v: ${electron.remote.app.getVersion()}`,true);
    ui.log(`Node v: ${process.versions.node}`,true);
    ui.log(`Chromium v: ${process.versions.chrome}`,true);
    ui.log(`Electron v: ${process.versions.electron}`,true);
    ui.log(`Caiceo-ui v: ${ui.version}`,true);
    ui.log(`Server: ${conf.serverRoot}`,true);
    //machine name & MAC
    ui.log("MACHINE NAME: "+machine.name,true);
    ui.log("MACHINE ID: "+machine.machineId,true);
    //Répertoire de stockage
    ui.log(`Les fichiers de l'application sont stockés dans ${machine.appStoragePath}`);

    //------------- synchro WEB------------------------
    let sync=window.sync=new Sync(window.conf.serverRoot+"/povApi/action/jukeboxSync",machine);
    let started=false;
    /**
     * Quand la synchro a fait tout ce qu'elle avait à faire...
     */
    sync.on(EVENT_READY,function(err){
        //va sur la home si on a pas démaré l'application
        if(!started){
            started=true;
            setTimeout(function(){
                ui.screens.home.show();
            },5*1000);
        }
    });
    /**
     * Quand le logo est pret à être affiché
     */
    sync.on(EVENT_WEB_SYNC_LOGO_READY,function(logoUrl){
        //Affiche le logo
        ui.layout.setLogo(logoUrl);
    });
    /**
     * Quand un contenu est pret à être affiché
     */
    sync.on(EVENT_WEB_SYNC_CONTENU_READY,function(contenu){

        //Affiche le contenu
        ui.films.addFilm(
            contenu.uid,
            contenu.name,
            contenu.localThumbNoResizeAbsolute
        ).setDetails(contenu);

        casquesManager.addContenu(contenu.localFile);

    });
    /**
     * Quand un fichier est supprimé depuis le web
     */
    sync.on(EVENT_WEB_SYNC_CONTENU_DELETED,function(contenu){
        ui.screens.films.removeFilm(contenu.uid);
        //efface les fichiers windows
        FileSystemUtils.removeDirOfFile(contenu.localFileAbsolute,function(){
            ui.log(
                [
                    "Contenu supprimé de la borne"
                    ,contenu
                ]);
        });
        casquesManager.removeContenu(contenu.localFile);
    });
    /**
     * Quand on se fait jeter par le serveur
     */
    sync.on(EVENT_SYNC_NOT_ALLOWED_ERROR,function(err){
        document.title=err;
        started=false;
        ui.log(
            [
                `Erreur de synchronisation`
                ,err
            ],true
        );
        ui.displaySplashScreen();
    });
    sync.on(EVENT_WEB_SYNC_UPDATED,function(){
        ui.log("Mise à jour réussie");
        document.title="Dernière mise à jour: "+new Date().toLocaleTimeString();
        ui.isSyncing=false;
    });
    sync.on(EVENT_UPDATING,function(){
        document.title="Mise à jour en cours...";
        ui.isSyncing=true;
    });


    sync.on(EVENT_WEB_SYNC_NEW_APK_AVAILABLE,function(apkLocalPath){
       ui.log(`Un nouvel APK vient d'être téléchargé ${apkLocalPath}`);
       alert("TODO installer le nouvel APK sur les casques");
    });
    sync.on(EVENT_OFFLINE,function(){
        ui.log("on est offline :(");
        ui.isOffline=true;
    });
    sync.on(EVENT_ONLINE,function(){
        ui.log("on est online :)");
        ui.isOffline=false;
    });
    sync.on(EVENT_SYNCING,function(){
        ui.log("synchronisation des contenus web en cours...");
        ui.isSyncing=true;
    });

    //casques----------------------
    window.casquesManager=new CasqueModelsManager(machine);
    require("./listen-casques");


});

require("./listen-ui.js");



//TODO NEW_SEANCE
ui.on(CMD.NEW_SEANCE,function(sceance){
    alert(CMD.NEW_SEANCE);
    ui.log("installer une séance",sceance);
});

window.wifi=new Wifi();

require("./listen-adb");





