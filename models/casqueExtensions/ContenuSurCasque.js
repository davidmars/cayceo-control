/**
 * Représente un contenu qui est ou devrait être sur un casque
 */
class ContenuSurCasque{
    constructor(file){
        this.file=file;
        this.status="";
        this.isOnCasque=null;
    }
}

module.exports = ContenuSurCasque;