const http = require('http');
var https = require('https');
const path = require('path');
const fs = require('fs');

/**
 * Methodes utilitaires pour le système de fichier
 */
class FileSystemUtils {
    /**
     * S'assure que le répertoire d'un fichier donné existe et le crée le cas échéant
     * @param filePath
     * @return {boolean}
     */
    static ensureDirectoryExistence(filePath) {
        let dirname = path.dirname(filePath);
        if (fs.existsSync(dirname)) {
            return true;
        }
        FileSystemUtils.ensureDirectoryExistence(dirname);
        fs.mkdirSync(dirname);
    }

    /**
     * Télécharge un fichier en local
     * @param {string} url Url où télécharger le fichier
     * @param {string} dest url local où télécharger le fichier
     * @param {function} cb Une fois que c'est fini
     */
    static download(url, dest, cb) {

        var client = http;
        if (url.toString().indexOf("https") === 0){
            client = https;
        }
        let file = fs.createWriteStream(dest);
        let request = client.get(url, function(response) {
            response.pipe(file);
            file.on('finish', function() {
                file.close(cb);  // close() is async, call cb after close completes.
            });
        });
    }

    /**
     * Retourne l'url base 64 d'une image
     * @private
     * @param file
     * @return {string}
     */
    static base64_encode(file) {
        let imgPath = file;
        // read binary data
        var bitmap = fs.readFileSync(imgPath);
        // convert binary data to base64 encoded string
        let buff= Buffer.from(bitmap).toString('base64');
        return "data:image/png;base64,"+buff;
    }
}
module.exports = FileSystemUtils;