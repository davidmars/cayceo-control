class CasqueNowPlaying {
   constructor(){
       /***
        * En cours de lecture ou pas
        * @type {null}
        */
        this.isPlaying=null;
       /**
        * Contenu en cours de lecture
        * @type {string}
        */
        this.contenuPath="";
       /**
        * Temps restant pour la lecture
        * @type {null}
        */
        this.remainingSeconds=null;
   }
}
module.exports=CasqueNowPlaying;