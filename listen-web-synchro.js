
/**
 * Quand le logo est pret à être affiché
 */
sync.on(EVENT_WEB_SYNC_LOGO_READY,function(logoUrl){
    //Affiche le logo
    ui.layout.setLogo(logoUrl);
});
/**
 * Quand un contenu est pret à être affiché
 */
sync.on(EVENT_WEB_SYNC_CONTENU_READY,function(contenu){

    //Affiche le contenu
    let f=ui.films.addFilm(
        contenu.uid,
        contenu.name,
        `${machine.appStoragePath}/${contenu.localThumbNoResize}`,
        contenu.localFile,
        contenu.duration,
        contenu.short
    ).setDetails(contenu);
    for(let cat of contenu.categories){
        f.addCategory(cat);
    }

});
/**
 * Quand un fichier est supprimé depuis le web
 */
sync.on(EVENT_WEB_SYNC_CONTENU_DELETED,function(contenu){
    ui.screens.films.removeFilm(contenu.uid);
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
    ui.displaySplashScreen("Machine non autorisée :(");
});
sync.on(EVENT_WEB_SYNC_UPDATED,function(){
    console.warn("Mise à jour réussie");
    stats.pageView(EVENT_WEB_SYNC_UPDATED);
    document.title="Dernière mise à jour: "+new Date().toLocaleTimeString();
    ui.isSyncing=false;
    sync.disableEnableContenus();
    ui.categoriesEnabled=sync.data.json.jukebox.usetags;
    if(ui.currentScreen===ui.screens.splash){
        ui.showScreen(ui.screens.home);
    }
});
sync.on(EVENT_UPDATING,function(){
    document.title="Mise à jour en cours...";
    ui.isSyncing=true;
});
sync.on(EVENT_WEB_SYNC_NEW_APK_AVAILABLE,function(apkLocalPath){
    stats.pageView(EVENT_WEB_SYNC_NEW_APK_AVAILABLE+"/"+apkLocalPath);
    ui.log(`Un nouvel APK vient d'être téléchargé ${apkLocalPath}`);
    casquesManager.installCurrentApk();
});
sync.on(EVENT_OFFLINE,function(){
    ui.log("on est offline :(");
    ui.isOffline=true;
});
sync.on(EVENT_ONLINE,function(){
    ui.log("on est online :)");
    ui.isOffline=false;
});
sync.on(EVENT_SYNCING,function(){
    ui.log("synchronisation des contenus web en cours...");
    ui.isSyncing=true;
});