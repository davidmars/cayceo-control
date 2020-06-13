sync.on(EVENT_OFFLINE,function(){
    ui.log("on est offline :(");
    ui.isOffline=true;
});
sync.on(EVENT_ONLINE,function(){
    ui.log("on est online :)");
    ui.isOffline=false;
});

//------------loading------------------
//synchro en cours (ce qui ne veut pas dire qu'elle fonctionne ou pas)
sync.on(EVENT_SYNCING,function(){
    ui.log("synchronisation des contenus web en cours...");
    ui.layout.setContenuUpdate("synchronisation en cours");
    ui.isSyncing=true;
});
//synchro n'est plus en cours (ce qui ne veut pas dire qu'elle fonctionne ou pas)
sync.on(EVENT_SYNCING_FINISHED,function(){
    ui.log("synchronisation des contenus terminée");
    ui.layout.setContenuUpdate(null);
    ui.isSyncing=false;
});

//-----------errors-----------------------

sync.on(EVENT_NETWORK_ERROR,function(err){
    ui.layout.setContenuUpdate("Erreur réseau");
});
/**
 * Quand on se fait jeter par le serveur
 */
sync.on(EVENT_SYNC_NOT_ALLOWED_ERROR,function(err){
    stats.pageView(EVENT_SYNC_NOT_ALLOWED_ERROR);
    document.title=err;
    ui.log(
        [
            `Erreur de synchronisation`
            ,err
        ],true
    );
    if(ui.currentScreen !== ui.screens.splash){
        ui.displaySplashScreen("Machine non autorisée :(");
    }

});

//------------------success-----------------------------

sync.on(EVENT_WEB_SYNC_UPDATED,function(){
    document.title="Dernière mise à jour: "+new Date().toLocaleTimeString();
    console.warn("Mise à jour réussie");
    stats.pageView(EVENT_WEB_SYNC_UPDATED);
});

sync.on(EVENT_SYNC_READY_TO_DISPLAY,function(){
    console.log(EVENT_SYNC_READY_TO_DISPLAY);
    sync.disableEnableContenus();
    ui.categoriesEnabled=sync.getJukebox().usetags;
    //si on est sur le splashscreen va sur la home

    setTimeout(function () {
        if(ui.currentScreen===ui.screens.splash){
            ui.showScreen(ui.screens.home);
        }
    },3000);

    //le machine name
    let machineName=machine.name;
    if(sync.getJukebox() && sync.getJukebox().name){
        machineName= sync.getJukebox().name;
    }
    ui.layout.setMachineName(machineName);
    window.stats.machineName=machineName;
});

//-------------------modification de paramètres de la régie-----------------

/**
 * Quand le logo est pret à être affiché
 */
sync.on(EVENT_WEB_SYNC_LOGO_READY,function(logoUrl){
    //Affiche le logo
    ui.layout.setLogo(logoUrl);
});
/**
 * Quand le qrcode est pret à être affiché
 */
sync.on(EVENT_WEB_SYNC_QRCODE_READY,function(qrUrl){
    //Affiche le logo
    ui.layout.setQrcode(qrUrl);
});
/**
 * Quand le mode d'emploi est pret à être affiché
 */
sync.on(EVENT_WEB_SYNC_MODE_EMPLOI_READY,function(){
    //Affiche le bouton mode d'emploi
    ui.activeModeEmploi();
});
sync.on(EVENT_WEB_SYNC_NEW_APK_AVAILABLE,function(apkLocalPath){
    stats.pageView(EVENT_WEB_SYNC_NEW_APK_AVAILABLE+"/"+apkLocalPath);
    ui.log(`Un nouvel APK vient d'être téléchargé ${apkLocalPath}`);
    casquesManager.installCurrentApk();
});

//-----------------actions sur les contenus------------------------------
/**
 * Quand un contenu est pret à être affiché
 */
sync.on(EVENT_WEB_SYNC_CONTENU_READY,
    /** @param {Contenu} contenu */
    function(contenu){
    //Affiche le contenu
    let f=ui.films.addFilm(
        contenu.uid,
        contenu.name,
        `${machine.appStoragePath}/${contenu.localThumbNoResize}`,
        contenu.localFile,
        contenu.duration,
        contenu.short,
        contenu.serverThumbNoResize
    );
    //fenêtre de logs du film
    f.setDetails(contenu);
    //mise à jour des categories TODO replacer par setCategories
    for(let cat of contenu.categories){
        f.addCategory(cat);
    }
});
/**
 * Quand un fichier est supprimé depuis le web
 */
sync.on(EVENT_WEB_SYNC_CONTENU_DELETED,
    /** @param {Contenu} contenu */
    function(contenu){
    ui.screens.films.removeFilm(contenu.uid);
});




