// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const FileSystemUtils = require('./utils/FileSystemUtils');

const electron = require('electron');
const remote = electron.remote;
const app=remote.app;
const win = remote.getCurrentWindow();

const Conf=                 require("./utils/Conf");
const Machine =             require('./utils/Machine.js');
const Sync=                 require("./utils/Sync");

const CasqueModelsManager=    require("./utils/casqueModelsManager");

require("./EVENTS");
require("cayceo-ui/dist/cayceoUi");

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
        ).setDetails(contenu)
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
    });
    sync.on(EVENT_UPDATING,function(){
        document.title="Mise à jour en cours...";
    });
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
        console.warn("il faut effacer le contenu sur les casques",contenu);

        //TODO effacer les fichiers sur les casques
    });

    sync.on(EVENT_WEB_SYNC_NEW_APK_AVAILABLE,function(apkLocalPath){
       ui.log(`Un nouvel APK vient d'être téléchargé ${apkLocalPath}`);
       alert("TODO installer le nouvel APK sur les casques");
    });
    sync.on(EVENT_OFFLINE,function(){
        ui.log("on est offline :(");
        //todo ui.isOffline();
    });
    sync.on(EVENT_ONLINE,function(){
        ui.log("on est online :)");
        //todo ui.isOnline();
    });
    sync.on(EVENT_SYNCING,function(){
        ui.log("synchronisation des contenus web en cours...");
        //ui.$navSync.addClass("syncing");
    });


});




//-----------commandes utilisateur simples------------------------

//ouverture de la console
ui.on(CMD.OPEN_CONSOLE,function(numero){
    //window.require('remote').getCurrentWindow().toggleDevTools();
    win.openDevTools();
});
//quitter le programme
ui.on(CMD.QUIT,function(){
    win.close();
});
//Efface tout les fichiers locaux et redémare l'application
ui.on(CMD.RESET_ALL,function(){
    FileSystemUtils.removeDir(machine.appStoragePath,function(){
        setTimeout(function(){
            app.relaunch();
            app.exit(0);
        },1000*5);
    })
});

//-----------commandes de synchro web------------------------

//Met à jour les contenus web
ui.on(CMD.UPDATE_CONTENT,function(){
    window.sync.doIt();
});


//-----------commandes sur les casques------------------------

ui.on(CMD.REMOVE_CASQUE,function(numero){
    ui.log(`Désindexation du casque ${numero}`);
    casquesManager.removeCasque(numero);
    ui.showPopin(ui.popIns.dashboard);
});

//TODO WAKE_UP_CASQUES
ui.on(CMD.WAKE_UP_CASQUES,function(){
    alert(CMD.WAKE_UP_CASQUES);
});

//TODO STOP_CASQUE
ui.on(CMD.STOP_CASQUE,function(numero){
    alert(`${CMD.STOP_CASQUE} ${numero}`);

});

//TODO NEW_SEANCE
ui.on(CMD.NEW_SEANCE,function(sceance){
    alert(CMD.NEW_SEANCE);
    ui.log("installer une séance",sceance);
});



//casques----------------------

window.casquesManager=new CasqueModelsManager(machine);


/**
 * On vient d'ajouter un nouveau casque
 */
casquesManager.on(EVENT_CASQUE_ADDED,function (casqueModel) {
        ui.casques.addCasque(casqueModel.numero);
});
/**
 * On vient de supprimer un casque
 */
casquesManager.on(EVENT_CASQUE_DELETED,function (casqueModel) {
    ui.casques.removeCasque(casqueModel.numero);
});
/**
 * Quand une propriété d'un casque change, met à jour son ui
 */
casquesManager.on(EVENT_CASQUE_CHANGED,function (casqueModel) {
    /** @var {CasqueMode} casqueModel **/
    /** @var {Casque} casqueUi **/
    let casqueUi=ui.casques.getCasqueByNumero(casqueModel.numero);
    if(!casqueUi){
        //casqueUi=ui.casques.addCasque(casqueModel.numero);
    }
    if(casqueUi){
        casqueUi.setDetails(casqueModel);
        casqueUi.setBatteryPlugged(casqueModel.plugged);
        casqueUi.setBattery(casqueModel.batteryLevel);
        casqueUi.setOnline(casqueModel.online);
        casqueUi.displayTime(casqueModel.playRemainingSeconds);
        casqueUi.setIsPlaying(casqueModel.isPlaying);
        let contenu=casqueUi.contenu;
        if(contenu){
            contenu=contenu.filmId;
        }
        if(contenu !== casqueModel.contenuId){
            casqueUi.setContenu(ui.films.getFilmById(casqueModel.contenuId));
        }
    }else{
        console.error("casque ui introuvable",casqueModel);
    }
});


require("./listen-adb");




