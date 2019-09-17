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
            console.log("io connection",socket.handshake.address);
            let numero=ipToNumero(socket.handshake.address);
            //let identifier = socket.handshake.address.toString().substring(socket.handshake.address.toString().length-2 , socket.handshake.address.toString().length);
            console.log("wifi device connected " + numero);
            /**
             * Le casque concerné
             * @type {CasqueModel}
             */
            let casque = casquesManager.getByNumero(numero);
            if(!casque){
                console.warn("impossible de trouver de casque pour "+numero);
                return;
            }
            casque.sockID = socket.id;
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
                    /**
                     * ANCIENNE METHODE DE GESTION DE FICHIERS appeler en plus hors adb et si casque._files null
                     */
                    if (
                        !casque.plugged
                        && casque._files
                        && json.fileList
                        && json.fileList.length
                    ){
                        casque.casqueFiles = json.fileList;
                        for ( let i = 0 ; i<casque._files.length ;  i++)
                        {
                            casque.casqueFiles[i] =casque.casqueFiles[i].split("\\").join("/");
                            console.log( 'casque file n'+i+' = ' + casque.casqueFiles[i] );
                        }
                        //casque._syncContenus();
                        console.log("syncontenus????")

                    }else{
                        casque._files = null;
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