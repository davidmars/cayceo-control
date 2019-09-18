const EventEmitter = require("event-emitter-es6");
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http , { wsEngine: 'ws' , pingInterval:100});

class Wifi extends EventEmitter{
    constructor(){
        super();
        let me = this;
        this._initSocket();
    }


    /**
     * initialise les sockets des casques
     * @private
     */
    _initSocket(){
        http.close();
        http.listen(3000, function(){
            console.log('listening on *:3000');
        });

        io.on('connection', function(socket){
            console.log("io connection from",socket.handshake.address);
            let numero=ipToNumero(socket.handshake.address);
            /**
             * Le casque concerné
             * @type {CasqueModel}
             */
            let casque = casquesManager.getByNumero(numero);
            if(!casque){
                console.warn(`impossible de trouver un casque numéro ${numero}`);
                console.warn(`Le casque n'a pas été branché en ADB ou a changé d'IP entre temps`);
                return;
            }
            casque.socketId = socket.id;
            io.to(socket.id).emit('setid', numero );

            setTimeout(function(){
                var tmp = new ServerMessage();
                tmp.id = numero;
                tmp.msg = "Connected to server !";
                io.emit( 'chat', tmp )
            }, 500);

            socket.on('chat', function(msg){ // exemple receive

                //io.emit('chat', msg); // exemple emit
                var json = JSON.parse(msg);
                console.log("msg json from ", json.id," = ",json);
                let casque = casquesManager.getByNumero(json.id);
                if(!casque){
                    console.error("imposible de trouver le casque "+json.id);
                }
                if(casque){
                    casque.socket=json;
                    casque.online=true;
                    if(json.batterylevel){
                        casque.batteryLevel=json.batterylevel;
                    }
                    if ( json.currentPlayTime > -1 ){
                        //console.log("json.currentPlayTime = " + json.currentPlayTime);
                        casque.currentPlayTime = json.currentPlayTime;
                    }
                    if ( json.totalPlaytime > 0 ){
                        //console.log("json.totalPlaytime = " + json.totalPlaytime);
                        casque.totalPlayTime = json.totalPlaytime;
                    }
                    if(json.fileList && json.fileList.length){
                        casque.socketFiles=json.fileList;
                    }
                    if ( json.msg === "Application Pause"){
                        casque.online=false;
                    }
                }



            });

            socket.on('disconnect', function(){
                console.error("socket disconect");
                let casque = casquesManager.getByNumero(numero);
                if(casque){
                    casque.online=false;
                }
            });


        });


    }

    /**
     * Lance une scéance sur le casque donné
     * @param {CasqueModel} casqueModel
     * @param {string} contenuPath Chemin vers le fichier sur le casque
     * @param minutes
     */
    startSeance(casqueModel,contenuPath,minutes){
        let obj={
            id:casqueModel.numero,
            videoPath:contenuPath,
            sessionDuration: minutes*60,
            msg : `Vazy lance le contenu! ${contenuPath} pendant ${minutes} minutes `
        };
        console.log("lance une seance sur ",casqueModel,obj);
        io.to(casqueModel.socketId).emit('chat' , obj );

        setTimeout(function(){
            let obj={
                sessionDuration: minutes*60,
                id:casqueModel.numero,
                startsession : true
            };
            io.to(casqueModel.socketId).emit('chat' , obj );
        },2000);


    }
}
module.exports = Wifi;


class ServerMessage{
    constructor(){
        this.id = 0;
        this.battery = false;
        this.changelanguage = false;
        this.language = "";
        this.startsession = false;
        this.stopsession = false;
        this.calibrate = false;
        this.opencalibration = false;
        this.videoPath = "";
        this.sessionDuration = -1;
        this.msg = "default";
    }
}