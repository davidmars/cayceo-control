/**
 * informe juckeboxVr de l'état des la machine et des casques
 */

class DevicesWebService {
    constructor(syncUrl,machine) {
        this.interval=5;

        let me = this;
        /**
         * @private
         * @type {string} Url vers le json de synchro
         */
        this.syncUrl = syncUrl;
        /**
         * @private
         * @type {Machine}
         */
        this.machine = machine;
        setInterval(function(){
            me._sendInfo();
        },me.interval*1000);
    }
    _sendInfo(){

        let devices=[];

        for(let casque of casquesManager.casquesList()){
            let c={};
            c.id=ipToNumero(casque.ip);
            c.isPlugged=casque.plugged;
            c.batteryLevel=Number(casque.batteryLevel);
            c.ip=casque.ip;
            c.apk=casque.apkInfos.lastApk;

            c.state="offline";
            if(casque.online) {
                let casqueUi=ui.casques.getCasqueByIp(casque.ip);

                if(casqueUi){
                    if(casqueUi.isSelectable()){
                        c.state = "ready";
                    }
                    if(casqueUi.contenu){
                        c.session={};
                        c.session.playTime=Number(casque.nowPlaying.remainingSeconds)*-1;
                        let contenu=ui.films.getFilmByFilePath(casque.nowPlaying.contenuPath);
                        if(contenu){
                            c.session.pictureUrl=contenu.imgHttp;
                            c.session.name=contenu.title;
                        }
                        if(casque.nowPlaying.isPlaying){
                            c.state="in_progress";
                        }else{
                            c.state="paused";
                        }
                    }
                }
            }

            devices.push(c);
        }
        $.ajax(this.syncUrl,{
            data:{
                uid:sync.getJukebox().uid,
                devices:devices
            },
            success:function(json){
                console.log("DevicesWebService",json)
            },error:function(err){
                console.error("DevicesWebService",err)
            }
        })
    }
}

module.exports = DevicesWebService;