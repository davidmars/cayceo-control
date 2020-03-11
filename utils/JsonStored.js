const { JSONStorage } = require('node-localstorage');

/**
 * Représente un fichier json enregistré sur le PC
 */
class JsonStored {
    constructor(jsonPath){
        this.jsonPath=jsonPath+".json";
    }

    /**
     * Enregistre des valeurs dans le json
     * @param {*} data Les valeurs à enregistrer
     */
    saveJson(data){
        JsonStored.storages.setItem(this.jsonPath,data);
    }

    /**
     * Renvoie les valeurs du json et au besoin enregistre une valeur par défaut
     * @param {*} toSaveIfNull Les valeurs à enregistrer si le json n'existe pas
     * @returns {*}
     */
    getJson(toSaveIfNull=null){
        let d=JsonStored.storages.getItem(this.jsonPath);
        if(!d && toSaveIfNull){
            this.saveJson(toSaveIfNull);
            return this.getJson();
        }else{
            return d;
        }

    }

    /**
     * Doit être appelé une fois pour déterminer le répertoire de stockage des fichier
     * @param storagePath
     */
    static init(storagePath){
        JsonStored.storages=new JSONStorage(storagePath);
    }
}


module.exports=JsonStored;