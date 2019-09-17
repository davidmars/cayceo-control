const ADB=require("./utils/ADB");
window.adb=new ADB();

/**
 * Ecoute les évênements ADB et réagit en fonction
 */

/**
 * Quand un périphérique est connecté,
 * le rajoute à la liste des casques (si il n'y est pas déjà)
 * et dit qu'il est en charge
 */
adb.on(EVENT_ADB_ADD_DEVICE,function(deviceId){
    let casqueDevice=casquesManager.getByDeviceId(deviceId);
    if(!casqueDevice){
        adb.getIp(deviceId,function(ip){
            ip=ip.split(".");
            //transforme l'ip en numéro
            let numero=ip[ip.length-1];
            let casqueModel=casquesManager.addCasque(numero,deviceId);
            //le nouveau casque est branché par définition
            casqueModel.plugged=true;
        })
        /*
        ui.askForCasqueNumero(
            function(numero){
                let casqueDevice=casquesDevices.addCasque(numero,deviceId);
                if(casqueDevice){
                    //le nouveau casque est branché par définition
                    casquesDevices.setPlugged(deviceId,true);
                }
            }
        );
        */
    }else{
        //le casque est branché
        casqueDevice.plugged=true;
    }

});
/**
 * Quand un périphérique est déconnecté....
 */
adb.on(EVENT_ADB_REMOVE_DEVICE,function(deviceId){
    let casqueDevice=casquesManager.getByDeviceId(deviceId);
    if(casqueDevice){
        //le casque n'est plus branché
        casquesManager.setPlugged(deviceId,false);
    }
});