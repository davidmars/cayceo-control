const EventEmitter = require("event-emitter-es6");
const adb = require('adbkit');

class ADB extends EventEmitter{
    constructor(){
        super();
        let me=this;
        this.client = adb.createClient()
        this.client.trackDevices()
            .then(function(tracker) {
                tracker.on('add', function(device) {
                    console.log('ADB Device %s was plugged in', device.id,device);
                    setTimeout(function(){
                        me.emit(EVENT_ADB_ADD_DEVICE,device.id);
                    },1000*5);

                });
                tracker.on('remove', function(device) {
                    console.log('ADB Device %s was unplugged', device.id,device)
                    me.emit(EVENT_ADB_REMOVE_DEVICE,device.id);
                });
                tracker.on('end', function() {
                    console.log('ADB Tracking stopped')
                });
            })
            .catch(function(err) {
                console.error('ADB Something went wrong:', err.stack)
            })
    }

    /**
     * Renvoie l'adresse IP en callback
     * @param deviceId
     * @param cb
     */
    getIp(deviceId,cb){
        this.client.shell(deviceId, 'ip addr show wlan0')
            .then(adb.util.readAll)
            .then(function(output) {
                output=output.toString().trim();
                let regex = /inet ([0-9.]*)/m;
                let m;
                if ((m = regex.exec(output)) !== null) {
                    m.forEach((match, groupIndex) => {
                        cb(match);
                        return;
                    });
                }
            })
    }

    /**
     * Renvoie le pourcentage de chargement en callback
     * @param deviceId
     * @param cb
     */
    getBattery(deviceId,cb){
        this.client.shell(deviceId, 'dumpsys battery')
            .then(adb.util.readAll)
            .then(function(output) {
                output=output.toString().trim();
                let regex = /level: ([0-9]*)/m;
                let m;
                if ((m = regex.exec(output)) !== null) {
                    m.forEach((match, groupIndex) => {
                        cb(match);
                        return;
                    });
                }

            })
    }
}
module.exports = ADB;