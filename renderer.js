// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const FileSystemUtils = require('./utils/FileSystemUtils');

const electron = require('electron');
const remote = electron.remote;
const isDevelopment = process.mainModule.filename.indexOf('app.asar') === -1;

const Conf=                 require("./utils/Conf");
const Machine =             require('./utils/Machine.js');
const Sync=                 require("./models/Sync");
const CasqueModelsManager=    require("./models/CasqueModelsManager");
const Wifi=    require("./models/Wifi");
const Stats=    require("./Stats");






require("./EVENTS");
require("cayceo-ui/dist/cayceoUi");

ui.debugMode.disable();
if(isDevelopment){
    ui.debugMode.enable();
}
ui.pinCode="1707";

//conf
window.conf=new Conf();
window.conf.serverRoot="https://jukeboxvr.fr"; //
window.conf.appDirectoryStorageName="cayceo-control/prod";

// Listen for messages
const {ipcRenderer} = require('electron');
ipcRenderer.on('MAJ', function(event, text) {
    if(text){
        ui.log(`${text}`,true);
    }
    ui.layout.setVersionUpdateMessage(text);
});
ipcRenderer.on('MAJ done', function(event, text) {
    ui.log(`${text}`,true);
    ui.layout.setVersionUpdateMessage(text,true);
});

//machine
window.machine=new Machine();
machine.on(EVENT_READY,function(){

    //pour cayceo on modifie les identifiants
    machine.name=`cayceo ${machine.name}`;
    machine.machineId=`cayceo-${machine.machineId}`;

    //préinitialise les stats (les modifiera ensuite quand on aura le nom de la machine depuis la syncro)
    window.stats=new Stats(
        "UA-126805732-2",
        machine.name
    );

    ui.displaySplashScreen("Hello");
    //app versions
    //affiche la version de l'application
    ui.layout.setVersion(remote.app.getVersion());
    ui.log(`App v: ${electron.remote.app.getVersion()}`,true);
    ui.log(`Node v: ${process.versions.node}`,true);
    ui.log(`Chromium v: ${process.versions.chrome}`,true);
    ui.log(`Electron v: ${process.versions.electron}`,true);
    ui.log(`Cayceo-ui v: ${ui.version}`,true);
    ui.log(`Server: ${conf.serverRoot}`,true);
    //machine name & MAC
    ui.log("MACHINE NAME: "+machine.name,true);
    ui.log("MACHINE ID: "+machine.machineId,true);
    //Répertoire de stockage
    ui.log(`Les fichiers de l'application sont stockés dans ${machine.appStoragePath}`);

    //Traite les actions demandées par l'utilisateur
    require("./listen-ui.js");

    //synchro web
    window.sync=new Sync(
        window.conf.serverRoot+"/povApi/action/jukeboxSync",
        machine
    );
    require("./listen-web-synchro");

    //casques
    window.casquesManager=new CasqueModelsManager(machine);
    require("./listen-casques");
    window.wifi=new Wifi();
    //affiche l'ip de la régie dans la devicesTable en boucle
    let displayIp=function(){ui.devicesTable.regie().ip=machine.getIpAdresses();};
    setInterval(displayIp,60*1000);
    displayIp();

    //traite les actions induites par ADB
    require("./listen-adb");

    /*
    let started=false;
    let startOrNot=function(){
        console.log("start or not ?")
        //va sur la home si on a pas démaré l'application
        if(!sync.ready){
            console.log("start or not ?","not sync not ready")
            ui.log("Waiting for data sync",true);
            return;
        }
        if(!wifi.listening ){
            console.log("start or not ?","not wifi not listening")
            let ips=machine.getIpAdresses();
            ui.devicesTable.regie().ip=ips;
            ui.log(["ipV4",ips],true);
            ui.log("Waiting for socket...",true);
            return;
        }

        if(!started){
            let machineName=machine.name;
            if(sync.getJukebox() && sync.getJukebox().name){
                machineName= sync.getJukebox().name;
            }
            window.stats.machineName=machineName;
            stats.pageView("BOOT");
            started=true;
            setTimeout(function(){
                ui.screens.home.show();
            },5*1000);
            console.log("start or not ?","YES !")

            sync.loopToDo();

        }else{
            console.log("start or not ?","YET STARTED !")
        }
    };
    //Quand la synchro a fait tout ce qu'elle avait à faire...
    sync.on(EVENT_SYNC_READY_TO_DISPLAY,function(){
        if(sync.getJukebox()){
            this.ui.categoriesEnabled=sync.getJukebox().usetags; //active ou pas les catégories
            if(sync.getJukebox().name){
                this.ui.layout.setMachineName(sync.getJukebox().name);
            }
        }
        startOrNot();
    });
    //Quand le socket est prêt
    wifi.on(EVENT_READY,function(){
        startOrNot();
    });
    */

});
