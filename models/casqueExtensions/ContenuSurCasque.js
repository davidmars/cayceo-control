/**
 * Représente un contenu qui est ou devrait être sur un casque
 */
class ContenuSurCasque{
    constructor(file){
        this.file=file;
        this.status="";
        this.isOnCasque=null;
        this.fileExistsby={
            "adb":null,
            "socket":null
        }
    }
}

module.exports = ContenuSurCasque;