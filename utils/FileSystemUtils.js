const http = require('http');
var https = require('https');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
var glob = require("glob");

/**
 * Methodes utilitaires pour le système de fichier
 */
class FileSystemUtils {
    /**
     * Revoie la liste récursive des fichiers dans le répertoire donné
     * @param dir
     * @returns {*}
     */
    static getFilesRecursive(dir){
        return glob.sync(dir+"/**/*",{"nodir":true});
    }

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
     * @param {string} sourceUrl Url où télécharger le fichier
     * @param {string} dest url local où télécharger le fichier
     * @param {function} cbSuccess Une fois que c'est fini renvoie l'url du fichier local
     * @param {function} cbProgress renvoie pourcentage, bytes, bytes total
     * @param {function} cbError renvoie l'erreur
     */
    static download(sourceUrl, dest, cbSuccess=function(){},cbProgress=function(){},cbError=function(){}) {
        stats.pageView("DWD_FILE/START/"+dest);
        let http = require('http');
        let https = require('https');
        let timeout = 10000;
        let destTmp=dest+".tmp.dwd";
        let file = fs.createWriteStream(destTmp);
        let timeout_wrapper = function( req ) {
            return function() {
                //console.log('abort');
                error=true;
                req.abort();
                cbError("File transfer timeout!");
            };
        };
        let client=http;
        if (sourceUrl.toString().indexOf("https") === 0){
            client = https;
        }
        let error=false;
        var request = client.get(sourceUrl).on('response', function(res) {
            let len = parseInt(res.headers['content-length'], 10);
            let downloaded = 0;

            res.on('data', function(chunk) {
                file.write(chunk);
                downloaded += chunk.length;
                let percent=(100.0 * downloaded / len).toFixed(2);
                cbProgress(percent,downloaded,len);
                // reset timeout
                clearTimeout( timeoutId );
                timeoutId = setTimeout( fn, timeout );
            }).on('end', function () {
                stats.pageView("DWD_FILE/SUCCESS/"+dest);
                // clear timeout
                clearTimeout( timeoutId );
                file.end();
                if(!error){
                    fs.renameSync(destTmp,dest);
                    cbSuccess(dest);
                }
            }).on('error', function (err) {
                stats.pageView("DWD_FILE/ERROR/"+dest);
                // clear timeout
                error=true;
                clearTimeout( timeoutId );
                cbError(err.message);
            });
        });

        // generate timeout handler
        var fn = timeout_wrapper( request );
        // set initial timeout
        var timeoutId = setTimeout( fn, timeout );
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

    /**
     * Retourn le boids en byte du ficher
     * @param file
     * @returns {number}
     */
    static fileSize(file){
        return fs.statSync(file).size;
    }

    /**
     * Convertit des bytes en un truc lisible par les humains
     * @param bytes
     * @param si
     * @returns {string}
     */
    static humanFileSize(bytes, si=true) {
        var thresh = si ? 1000 : 1024;
        if(Math.abs(bytes) < thresh) {
            return bytes + ' B';
        }
        var units = si
            ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
            : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
        var u = -1;
        do {
            bytes /= thresh;
            ++u;
        } while(Math.abs(bytes) >= thresh && u < units.length - 1);
        return bytes.toFixed(1)+' '+units[u];
    }

    /**
     * Efface un répertoire et son contenu
     * @param dir
     * @param {function} cb
     */
    static removeDir(dir,cb){
        if(!cb){
            cb=function(){
                console.log(dir+" effacé!")
            }
        }
        rimraf(dir,function(){
            cb()
        });
    }

    /**
     * Efface le répertoire parent du fichier donné
     * @param file
     * @param {function} cb
     */
    static removeDirOfFile(file,cb){
        if(fs.existsSync(file)){
            let p=path.dirname(file);
            if(p){
                console.log("efface le contenu de "+p)
                FileSystemUtils.removeDir(p,cb)
            }
        }
    }

    /**
     * Efface un fichier
     * @param {string} file
     * @param {function} cbSuccess
     * @param {function} cbError Renvoie l'erreur en argument
     */
    static removeFile(file,cbSuccess,cbError){
        if(!cbSuccess){
            cbSuccess=function(){
                console.log(file+" effacé!")
            }
        }
        if(!cbError){
            cbError=function(err){
                console.error(err);
            }
        }
        if(fs.existsSync(file)){
            fs.unlink(file, function (err) {
                if (err){
                    cbError(err);
                }else{
                    cbSuccess();
                }
            });
        }else{
            let err="le fichier n'existe pas";
            cbError(err);
        }
    }
}
module.exports = FileSystemUtils;