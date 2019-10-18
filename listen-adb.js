const ADB=require("./models/ADB");
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
        adb.getIp(deviceId,function(ipString){
            let ip=ipString.split(".");
            //transforme l'ip en numéro
            let numero=ip[ip.length-1];
            let casqueModel=casquesManager.addCasque(numero,ipString,deviceId);
            //le nouveau casque est branché par définition
            casqueModel.setPlugged(true);
        })
    }else{
        //le casque est branché dans tous les cas
        casqueDevice.setPlugged(true);
    }
});
/**
 * Quand un périphérique est déconnecté....
 */
adb.on(EVENT_ADB_REMOVE_DEVICE,function(deviceId){
    let casqueDevice=casquesManager.getByDeviceId(deviceId);
    if(casqueDevice){
        //le casque n'est plus branché
        casqueDevice.setPlugged(false);
    }
});