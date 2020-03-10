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
    }


}
module.exports=CasqueContenusSynchro;