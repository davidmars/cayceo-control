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
//toggle full screen
ui.on(CMD.FULLSCREEN_TOGGLE,function(){
    if(win.isFullScreen()){
        win.setFullScreen(false)
    }else{
        win.setFullScreen(true)
    }
});
//quitter le programme
ui.on(CMD.QUIT,function(){
    win.close();
});
//redemarrer le programme
ui.on(CMD.REBOOT,function(){
    setTimeout(function(){
        app.relaunch();
        app.exit(0);
    },1000*1);
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

ui.on(CMD.NEW_SEANCE,function(seance){
    console.log("installer une séance",seance);
    ui.log(["installer une séance",seance]);
    /*
    casques:[numero,numero]
    duree: "20"
    film: "contenumachine-196"
    */

    let contenu=sync.getContenuByUid(seance.film);
    for(let i=0;i<seance.casques.length;i++){
        wifi.startSeance(
            casquesManager.getByNumero(seance.casques[i]),
            contenu.localFile,
            seance.duree
        )
    }
});