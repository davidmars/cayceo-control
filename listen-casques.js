/**
 * On vient d'ajouter un nouveau casque
 */
casquesManager.on(EVENT_CASQUE_ADDED,function (casqueModel) {
    ui.casques.addCasque(casqueModel.numero);
    for(let i=0;i<sync.getContenus().length;i++){
        let c=sync.getContenus()[i];
        casqueModel.addContenu(c.localFile);
    }
    casqueModel.syncContenus();
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
    /** @property {CasqueModel} casqueModel **/
    /** @property {Casque} casqueUi **/
    let casqueUi=ui.casques.getCasqueByNumero(casqueModel.numero);
    if(!casqueUi){
        console.error("casque ui introuvable",casqueModel);
    }else{
        casqueUi.setDetails(casqueModel);
        casqueUi.setBatteryPlugged(casqueModel.plugged);
        casqueUi.setBattery(casqueModel.batteryLevel);
        casqueUi.setOnline(casqueModel.online);
        casqueUi.displayTime(casqueModel.playRemainingSeconds);
        casqueUi.setIsPlaying(casqueModel.isPlaying);
        casqueUi.setContenusReady(casqueModel.contenusReady);
        let contenu=casqueUi.contenu;
        if(contenu){
            contenu=contenu.filmId;
        }
        if(contenu !== casqueModel.contenuId){
            casqueUi.setContenu(ui.films.getFilmById(casqueModel.contenuId));
        }
    }
});


//-----------commandes de l'utilisateur sur les casques------------------------

ui.on(CMD.WAKE_UP_CASQUES,function(){
    casquesManager.wakeUp();
});

//sur un seul casque...

ui.on(CMD.CASQUE_REMOVE,function(numero){
    ui.log(`Désindexation du casque ${numero}`);
    casquesManager.removeCasque(numero);
    ui.showPopin(ui.popIns.dashboard);
});
ui.on(CMD.CASQUE_REBOOT,function(numero){
    let c= casquesManager.getByNumero(numero);
    if(!c.plugged){
        alert(`Il faut que le casque ${numero} soit branché`);
        return
    }
    adb.reboot(c.deviceId);
});
ui.on(CMD.CASQUE_INSTALL_APK,function(numero){
    let c= casquesManager.getByNumero(numero);
    if(!c.plugged){
        alert(`Il faut que le casque ${numero} soit branché`);
        return
    }
    let apk=sync.data.json.casquesapk.localFile;
    c.apkInstallation=`installation de ${apk}`;
    adb.installAPKAndReboot(
        c.deviceId,
        apk,
        function(){
            c.apkInstallation=`${apk} install success! @ ${new Date().toLocaleString()}`;
        },
        function(err){
            c.apkInstallation=[apk,err];
        }
    );
});
//TODO CASQUE_STOP
ui.on(CMD.CASQUE_STOP,function(numero){
    let c= casquesManager.getByNumero(numero);
    alert(`todo ${CMD.CASQUE_STOP} ${numero}`);
});

//TODO CASQUE_PLAY
ui.on(CMD.CASQUE_PLAY,function(numero){
    let c= casquesManager.getByNumero(numero);
    alert(`todo ${CMD.CASQUE_PLAY} ${numero}`);
});



//TODO CASQUE_DELETE_ALL_FILES
ui.on(CMD.CASQUE_DELETE_ALL_FILES,function(numero){
    let c= casquesManager.getByNumero(numero);
    if(!c.plugged){
        alert(`Il faut que le casque ${numero} soit branché`);
        return
    }
    alert(`todo ${CMD.CASQUE_DELETE_ALL_FILES} ${numero}`);
});
