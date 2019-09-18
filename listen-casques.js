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