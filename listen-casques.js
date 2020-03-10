/**
 * On vient d'ajouter un nouveau casque
 */
casquesManager.on(EVENT_CASQUE_ADDED,
    /** @param {CasqueModel} casque */
    function (casque) {
    if(typeof stats !== "undefined"){
        stats.pageView(`${EVENT_CASQUE_ADDED}/c-${casque.ip}`);
    }
    ui.casques.addCasque(casque.ip);
});
/**
 * On vient de supprimer un casque
 */
casquesManager.on(EVENT_CASQUE_DELETED,
    /** @param {CasqueModel} casque */
    function (casque) {
    stats.pageView(`${EVENT_CASQUE_DELETED}/c-${casque.ip}`);
    ui.casques.removeCasque(casque.ip);
});
/**
 * On vient de brancher un casque
 */
casquesManager.on(EVENT_CASQUE_PLUGGED,
    /** @param {CasqueModel} casque */
    function(casque){
        sync.testFilesExistCasques();
    }
);
/**
 * On vient de débrancher un casque
 */
casquesManager.on(EVENT_CASQUE_UNPLUGGED,
    /** @param {CasqueModel} casque */
    function(casque){
    ui.devicesTable.devicesById[casque.ip].resetDoings();
});



//-----------commandes de l'utilisateur sur les casques------------------------

ui.on(CMD.WAKE_UP_CASQUES,function(){
    casquesManager.wakeUp();
});

//sur un seul casque...
ui.on(CMD.CASQUE_WAKE_UP,function(ip){
    let c=casquesManager.getByIp(ip);
    if(ip){
        c.wakeUp();
    }
});

ui.on(CMD.CASQUE_REMOVE,function(ip){
    ui.log(`Désindexation du casque ${ip}`);
    casquesManager.removeCasque(ip);
    ui.showPopin(ui.popIns.dashboard);
});
ui.on(CMD.CASQUE_REBOOT,function(ip){
    let c= casquesManager.getByIp(ip);
    if(!c.plugged){
        alert(`Il faut que le casque ${ip} soit branché pour le redémarrer`);
        return
    }
    adb.reboot(c.deviceId);
});
ui.on(CMD.CASQUE_INSTALL_APK,function(ip){
    let c= casquesManager.getByIp(ip);

    if(!c.plugged){
        alert(`Il faut que le casque ${ip} soit branché`);
        return
    }
    c.installCurrentApk();

});

ui.on(CMD.CASQUE_STOP,function(ip){
    let c= casquesManager.getByIp(ip);
    wifi.stopSeance(c);
});

ui.on(CMD.CASQUE_PLAY,function(ip){
    let c= casquesManager.getByIp(ip);
    wifi.startSeance(c);
});

//TODO CASQUE_DELETE_ALL_FILES
ui.on(CMD.CASQUE_DELETE_ALL_FILES,function(ip){
    let c= casquesManager.getByIp(ip);
    if(!c.plugged){
        alert(`Il faut que le casque ${ip} soit branché`);
        return
    }
    alert(`todo ${CMD.CASQUE_DELETE_ALL_FILES} ${ip}`);
});
