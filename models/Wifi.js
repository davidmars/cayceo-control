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
            io.to(socket.id).emit('setip', casque.ip);


            setTimeout(function(){
                var tmp = new ServerMessage();
                tmp.id = numero;
                tmp.msg = "Connected to server !";
                io.emit( 'chat', tmp )
            }, 500);

            socket.on('chat', function(msg){ // exemple receive

                //io.emit('chat', msg); // exemple emit
                var json = JSON.parse(msg);
                console.log("msg json from ", json.ip," = ",json);
                let casque = casquesManager.getByIp(json.ip);
                if(!casque){
                    //dans ce cas on a casque connecté en socket mais le casque n'est pas référencé
                    console.error("imposible de trouver le casque "+json.ip);
                    //todo faire une alerte pour dire de brancher le casque numéro X ?
                }
                if(casque){
                    casque.socket=json;
                    casque.online=true;
                    casque.isPlaying = json.IsPlaying;
                    if(json.batterylevel){
                        casque.batteryLevel=json.batterylevel;
                    }
                    /*
                    if ( json.currentPlayTime > -1 ){
                        //console.log("json.currentPlayTime = " + json.currentPlayTime);
                        casque.currentPlayTime = json.currentPlayTime;
                    }
                    if ( json.totalPlaytime > 0 ){
                        //console.log("json.totalPlaytime = " + json.totalPlaytime);
                        casque.totalPlayTime = json.totalPlaytime;
                    }*/
                    if(json.fileList && json.fileList.length){
                        casque.socketFiles=json.fileList;
                        //todo victor.. la liste des fichiers on fait comment pour l'avoir?
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
            contenuPath:contenuPath,
            sessionDuration: minutes*60,
            //TODO change that for tocasque.CMD_LOAD_SESSION!
            cmd : "CMD_LOAD_SESSION",
            msg : `Vazy lance le contenu stp! ${contenuPath} pendant ${minutes} minutes `
        };
        console.log("lance une seance sur ",casqueModel,obj);
        io.to(casqueModel.socketId).emit('chat' , obj );

        //todo victor... pouquoi faut-il faire 2 appels?
        //todo victor... la sessionsduration semble pas marcher, j'ai toujours la même durée

        setTimeout(function(){
            let obj={
                //TODO sessionDuration: minutes*60,
                sessionDuration: -1,
                id:casqueModel.numero,
                startsession : true
            };
            io.to(casqueModel.socketId).emit('chat' , obj );
        },2000);

        //todo victor une fois que la séance est lancée je n'ai aucun fedback...
        //todo victor feedback contenu en cours de lecture (ou rien si il n'y a rien qui se lit)
        //todo victor feedback isPlaying qui soit pas tout le temps sur true
        //



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