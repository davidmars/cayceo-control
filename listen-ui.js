const electron = require('electron');
const remote = electron.remote;
const app=remote.app;
const win = remote.getCurrentWindow();

/**
 * écoute des actions utilisateur
 */

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

//Met à jour les contenus web
ui.on(CMD.UPDATE_CONTENT,function(){
    window.sync.doIt();
});