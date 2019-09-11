// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const electron = require('electron');
const remote = electron.remote;
const app=remote.app;
const win = remote.getCurrentWindow();
const rimraf = require('rimraf');

require("./EVENTS");
require("cayceo-ui/dist/cayceoUi");




//conf
const Conf=require("./utils/Conf");
window.conf=new Conf();
window.conf.serverRoot="https://jukeboxvr.fr"; //
window.conf.appDirectoryStorageName="jukebox-cayceo/prod";


//machine
const Machine = require('./utils/Machine.js');
let machine=window.machine=new Machine();

machine.on(EVENT_READY,function(){



    //pour cayceo on modifie les identifiants
    machine.name=`cayceo ${machine.name}`;
    machine.machineId=`cayceo-${machine.machineId}`;

    ui.displaySplashScreen("Bonjour...");

    //app infos
    ui.log(`App v: ${electron.remote.app.getVersion()}`);
    ui.log(`Node v: ${process.versions.node}`);
    ui.log(`Chromium v: ${process.versions.chrome}`);
    ui.log(`Electron v: ${process.versions.electron}`);
    ui.log(`Caiceo-ui v: ${ui.version}`);
    ui.log(`Server: ${conf.serverRoot}`);

    //------------ Machine name & MAC-----------------

    ui.log("MACHINE NAME: "+machine.name);
    ui.log("MACHINE ID: "+machine.machineId);

    //------------ Répertoire de stockage-----------------

    ui.log(`Les fichiers de l'application sont stockés dans ${machine.appStoragePath}`);

    //------------- synchro WEB------------------------

    var Sync=require("./utils/Sync");
    let sync=window.sync=new Sync(window.conf.serverRoot+"/povApi/action/jukeboxSync",machine);


    let started=false;

    sync.on(EVENT_READY,function(err){
        for(let i=0;i<sync.getContenus().length;i++){
            let contenu=sync.getContenus()[i];
            ui.screens.films.addFilm(
                contenu.uid,
                contenu.name,
                contenu.localThumbNoResizeAbsolute
            );
        }
        //Affiche le logo
        if(sync.data.json.logomachine.localFile){
            ui.layout.setLogo(machine.appStoragePath+"/"+ sync.data.json.logomachine.localFile);
        }

        //va sur la home si on a pas démaré l'application
        if(!started){
            started=true;
            setTimeout(function(){
                ui.showScreen("home");
            },5*1000);
        }
    });
    sync.on(EVENT_ERROR,function(err){
        document.title=err;
        ui.log(`erreur de synchronisation ${err}`);
        ui.displaySplashScreen(err);
    });
    sync.on(EVENT_UPDATED,function(){
        ui.log("Mise à jour réussie");
        document.title="Dernière mise à jour: "+new Date().toLocaleTimeString();
    });
    sync.on(EVENT_UPDATING,function(){
        document.title="Mise à jour en cours...";
    });
    sync.on(EVENT_CONTENU_DELETED,function(contenu){
        ui.screens.films.removeFilm(contenu.uid);
        console.warn("il faut effacer le contenu ",contenu);
        //TODO effacer les fichiers windows
        //TODO effacer les fichiers sur les casques
    });
    sync.on(EVENT_DOWNLOADING,function(message){
        document.title="Téléchargement en cours...";
        ui.log("downloading...");
        ui.log(message);
    });

    sync.on(EVENT_NEW_APK_AVAILABLE,function(apkLocalPath){
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

ui.on("READY",function(){

    //affiche la version de l'application
    ui.layout.setVersion(remote.app.getVersion());

    //-----------configure les commandes utilisateur------------------
    
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
        rimraf(machine.appStoragePath,function(){
            app.relaunch();
            app.exit(0);
        });
    });
    //Met à jour les contenus web
    ui.on(CMD.UPDATE_CONTENT,function(){
        window.sync.doIt();
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
    });



    //--------TODO----------fake casques-----------------

    ui.casques.addCasque(1);
    ui.casques.addCasque(2);
    ui.casques.addCasque(3);
    ui.casques.addCasque(4);
    ui.casques.addCasque(5);


    /*
    //TODO WAKE_UP_CASQUES
    ui.on(CMD.WAKE_UP_CASQUES,function(){
        alert(CMD.WAKE_UP_CASQUES);
    });

    //TODO WAKE_UP_CASQUES
    ui.on(CMD.WAKE_UP_CASQUES,function(){
        alert(CMD.WAKE_UP_CASQUES);
    });
    
    //TODO WAKE_UP_CASQUES
    ui.on(CMD.WAKE_UP_CASQUES,function(){
        alert(CMD.WAKE_UP_CASQUES);
    });

    //TODO WAKE_UP_CASQUES
    ui.on(CMD.WAKE_UP_CASQUES,function(){
        alert(CMD.WAKE_UP_CASQUES);
    });
    
    //TODO WAKE_UP_CASQUES
    ui.on(CMD.WAKE_UP_CASQUES,function(){
        alert(CMD.WAKE_UP_CASQUES);
    });

    //TODO WAKE_UP_CASQUES
    ui.on(CMD.WAKE_UP_CASQUES,function(){
        alert(CMD.WAKE_UP_CASQUES);
    });
    
    //TODO WAKE_UP_CASQUES
    ui.on(CMD.WAKE_UP_CASQUES,function(){
        alert(CMD.WAKE_UP_CASQUES);
    });

    //TODO WAKE_UP_CASQUES
    ui.on(CMD.WAKE_UP_CASQUES,function(){
        alert(CMD.WAKE_UP_CASQUES);
    });
    
    //TODO WAKE_UP_CASQUES
    ui.on(CMD.WAKE_UP_CASQUES,function(){
        alert(CMD.WAKE_UP_CASQUES);
    });

    //TODO WAKE_UP_CASQUES
    ui.on(CMD.WAKE_UP_CASQUES,function(){
        alert(CMD.WAKE_UP_CASQUES);
    });
    
    //TODO WAKE_UP_CASQUES
    ui.on(CMD.WAKE_UP_CASQUES,function(){
        alert(CMD.WAKE_UP_CASQUES);
    });
     */



});

