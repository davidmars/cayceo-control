// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const electron = require('electron');
const remote = electron.remote;
const win = remote.getCurrentWindow();

require("cayceo-ui/dist/cayceoUi");

window.EVENT_READY="EVENT_READY";


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

    var appStorage=machine.appStoragePath;
    ui.log(`Les fichiers de l'application sont stockés dans ${appStorage}`);


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

    //TODO UPDATE_CONTENT
    ui.on(CMD.UPDATE_CONTENT,function(){
        alert(CMD.UPDATE_CONTENT);
    });

    //TODO RESET_ALL
    ui.on(CMD.RESET_ALL,function(){
        alert(CMD.RESET_ALL);
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

