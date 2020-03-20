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
    let displayIp=function(){
        ui.devicesTable.regie().ip=machine.getIpAdresses();
    };
    let displayDiskSpace=function(){
        machine.getDiskSpace(
            function(data){
                ui.devicesTable.regie().diskSpace=data
            }
        );
    };
    setInterval(
        function(){
            displayIp();
            displayDiskSpace();
        },
        60*1000);
    displayIp();
    displayDiskSpace();

    //traite les actions induites par ADB
    require("./listen-adb");


});
