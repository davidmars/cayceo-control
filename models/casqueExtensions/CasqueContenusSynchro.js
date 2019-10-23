/**
 * Informe sur l'état général de copie des contenus sur UN casque
 */
class CasqueContenusSynchro {
    /**
     *
     * @param {CasqueModel} casque
     */
    constructor(casque){
        /**
         *
         * @returns {CasqueModel}
         */
        this.casque=function(){
            return casque;
        };
        /**
         * true si les contenus sont prêts
         */
        this.ready=null;
        /**
         * true si la synchro de fichiers est en cours
         */
        this.busy=null;
        /**
         * Pourcentage d'installation total
         */
        this.percent=0;
    }

    /**
     * En fonction des contenus, dit si l'état général est "ready" ou non
     */
    updateContenusReady(){
        let casque=this.casque();
        for(let i =0;i<casque.contenus.length;i++) {
            let cont = casque.contenus[i];
            if(cont.status!=="ok" && cont.isOnCasque !== true){
                this.ready=false;
                return;
            }
        }
        this.percent=0;
        this.ready=true;
    }
    /**
     * Teste s'il est possible de synchroniser un fichier sur le casque
     * @returns {boolean}
     */
    isPossible(){
        return (
            this.casque().contenusSynchro.busy!==true
            && this.casque().plugged
        )
    }

}
module.exports=CasqueContenusSynchro;