const EventEmitter = require("event-emitter-es6");
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http , { wsEngine: 'ws' , pingInterval:100});
const ToCasque = require('./sockets/ToCasque');

class Wifi extends EventEmitter{
    constructor(){
        super();
        let me = this;
        this.listening=false;
        this._initSocket();

    }
    /**
     * initialise les sockets des casques
     * @private
     */
    _initSocket(){
        let me =this;
        http.close();
        http.on("error",function(e){
            let ips=machine.getIpAdresses();
            console.error("socket error",e);
            ui.log(["ipV4",ips,true]);
            ui.log(["socket error",e],true);
            ui.devicesTable.regie().ip=ips;
        });
        http.on('listening', function() {
            ui.log(["listenning socket on",http.address()]);
            me.listening=true;
            me.emit(EVENT_READY);
        });
        //http.listen(3000,"192.168.0.2", function(){}); //écoute sur une seule ip
        http.listen(3000, function(){});
        io.on('connection', function(socket){
            let reg=/(.*)([0-9]{3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/gm;
            let ip=socket.handshake.address; //:::ffff:192.168.0.47
            ip=String(ip).replace(reg,"$2");
            console.log("io connection from",ip);
            /**
             * Le casque concerné
             * @type {CasqueModel}
             */
            let casque = casquesManager.getByIp(ip);
            if(!casque){
                console.warn(`impossible de trouver le casque ${ip}`);
                console.warn(`Le casque n'a pas été branché en ADB ou a changé d'IP entre temps`);
                return;
            }
            casque.socketId = socket.id;
            io.to(socket.id).emit('setip', casque.ip);

            setTimeout(function(){
                var tmp = new ServerMessage();
                tmp.ip = ip;
                tmp.msg = "Connected to server !";
                io.emit( 'chat', tmp )
            }, 500);

            socket.on('chat', function(msg){ // exemple receive

                //io.emit('chat', msg); // exemple emit
                var json = JSON.parse(msg);
                //console.log("msg json from ", json.ip," = ",json);
                let casque = casquesManager.getByIp(json.ip);
                if(!casque){
                    //dans ce cas on a casque connecté en socket mais le casque n'est pas référencé
                    console.error("impossible de trouver le casque "+json.ip);
                    //todo faire une alerte pour dire de brancher le casque numéro X ?
                }
                if(casque){
                    casque.setSocket(json);
                }
            });
            socket.on('disconnect', function(){
                console.error("socket disconect");
                let casque = casquesManager.getByIp(ip);
                if(casque){
                    casque.setOnline(false);
                }
            });
        });
    }
    /**
     * Précharge une scéance sur le casque donné
     * @param {CasqueModel} casqueModel
     * @param {string} contenuPath Chemin vers le fichier sur le casque
     * @param minutes
     */
    loadSeance(casqueModel, contenuPath, minutes){
        let obj=new ToCasque();
        obj.ip = casqueModel.ip;
        obj.contenuPath = contenuPath;
        if(!minutes || isNaN(minutes)){
            minutes=99;
        }
        obj.sessionDuration = minutes*60;
        obj.cmd = ToCasque.CMD_LOAD_SESSION;
        obj.msg = `Vazy lance le contenu stp! ${contenuPath} pendant ${minutes} minutes `;
        console.log("lance une seance sur ",casqueModel,obj);
        io.to(casqueModel.socketId).emit('chat' , obj );
    }

    /**
     * demarre la seance sur le casque
     * @param {CasqueModel} casqueModel
     */
    startSeance(casqueModel)
    {
        let obj=new ToCasque();
        obj.ip = casqueModel.ip;
        obj.cmd = ToCasque.CMD_START_SESSION;
        obj.msg = `demarre la seance sur le casque ${casqueModel.ip}`
        console.log("demarre une seance sur ",casqueModel,obj);
        io.to(casqueModel.socketId).emit('chat' , obj );
    }


    /**
     * stop la seance sur le casque
     * @param {CasqueModel} casqueModel
     */
    stopSeance(casqueModel)
    {
        let obj=new ToCasque();
        obj.ip = casqueModel.ip;
        obj.cmd = ToCasque.CMD_STOP_SESSION;
        obj.msg = `stop la seance sur le casque ${casqueModel.ip} connard`
        console.log("stop une seance sur ",casqueModel,obj);
        io.to(casqueModel.socketId).emit('chat' , obj );
    }


    /**
     * demande la mise à jour de la filelist
     * @param {CasqueModel} casqueModel
     */
    askFileList(casqueModel)
    {
        let obj=new ToCasque();
        obj.ip = casqueModel.ip;
        obj.cmd = ToCasque.CMD_CHECK_FILES;
        obj.msg = `demande la mise à jour de la filelist sur le casque ${casqueModel.ip} connard`
        //console.log("demande la mise à jour de la filelist sur ",casqueModel,obj);
        io.to(casqueModel.socketId).emit('chat' , obj );
    }

}
module.exports = Wifi;


class ServerMessage{
    constructor(){
        this.ip = 0;
        this.battery = false;
        this.language = "";
        this.videoPath = "";
        this.sessionDuration = -1;
        this.msg = "default";
    }
}