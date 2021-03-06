const electron = require('electron');
const remote = electron.remote;
const app=remote.app;
const win = remote.getCurrentWindow();
const { ipcRenderer } = require('electron');

/**
 * écoute des actions utilisateur
 */

//ouverture de la console
ui.on(CMD.OPEN_CONSOLE,function(){
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
    stats.pageView(CMD.QUIT);
    adb.killServer(function(){
        win.close();
    })

});
//quitter le programme
ui.on(CMD.SHUT_DOWN_ALL,function(){
    stats.pageView(CMD.SHUT_DOWN_ALL);
    casquesManager.shutDownAll();
    setTimeout(function(){
        adb.killServer(function(){
            machine.shutDown()
        })
    },1000);
});
//redemarrer le programme
ui.on(CMD.REBOOT,function(){
    stats.pageView(CMD.REBOOT);
    setTimeout(function(){
        adb.killServer(function(){
            app.relaunch();
            app.exit(0);
        });
    },1000*1);
});
ui.on(CMD.INSTALL_AND_REBOOT,function(){
    stats.pageView(CMD.INSTALL_AND_REBOOT);
    adb.killServer(function(){
        setTimeout(function(){
            ipcRenderer.send('INSTALL_AND_REBOOT', {});
        },1000*1);
    });

});

//Efface tout les fichiers locaux et redémare l'application
ui.on(CMD.RESET_ALL,function(){
    stats.pageView(CMD.RESET_ALL);
    FileSystemUtils.removeDir(machine.appStoragePath,function(){
        adb.killServer(function(){
            setTimeout(function(){
                app.relaunch();
                app.exit(0);
            },1000*5);
        });
    })
});

//Met à jour les contenus web
ui.on(CMD.UPDATE_CONTENT,function(){
    window.sync.doIt();
});
//ouvre la doc pdf
ui.on(CMD.OPEN_DOC,function(){
    ipcRenderer.send('OPEN_DOC', machine.appStoragePath+"/"+sync.getModeEmploi().localFile);
});

ui.on(CMD.NEW_SEANCE,function(seance){

    console.log("installer une séance",seance);
    ui.log(["installer une séance",seance]);
    /*
    casques:[ip,ip]
    duree: "20"
    film: "contenumachine-196"
    */

    let contenu=sync.getContenuByUid(seance.film);
    let timeOut = null;
    let casquesOk=[];
    let casquesNOK=[];
    let testsCount=25;
    for(let i=0;i<seance.casques.length;i++){
        let casq=casquesManager.getByIp(seance.casques[i]);
        wifi.loadSeance(
            casq,
            contenu.localFile,
            seance.duree
        );
        stats.pageView(`${CMD.NEW_SEANCE}/${contenu.name}/c-${casq.ip}`);
    }

    /**
     * Renverra true si les contenus sont tous prêts sur les casques ou si le nombre d'essais est dépassé
     * @returns {boolean}
     */
    let isOk=function(){
        casquesOk=[];
        casquesNOK=[];
        for(let i=0;i<seance.casques.length;i++){
            let casque = casquesManager.getByIp(seance.casques[i]);
            //console.log("comparaison contenu : ",casque,casque.socket,casque.socket.contenuPath ,contenu.localFile )
            if( casque.socket.contenuPath === contenu.localFile ){
                casquesOk.push(seance.casques[i]);
            }else{
                casquesNOK.push(seance.casques[i]);
            }
        }
        //console.log("test installation ",casquesOk , casquesNOK);
        testsCount--;
        return testsCount <=0 || casquesNOK.length === 0;
    };

    /**
     * Teste en boucle toutes les secondes si les contenus sont prêts
     */
    let testRecursive = function()
    {
        if( timeOut){clearTimeout(timeOut);}
        timeOut = setTimeout(function (){
            if(!isOk()){
                testRecursive();
            }else{
                ui.seanceReady(casquesOk,casquesNOK)
            }
        },1000)
    };
    testRecursive();


});