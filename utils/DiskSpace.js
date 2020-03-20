class DiskSpace {




    get available() {
        return this._available;
    }

    set available(value) {
        this.availableBytes=this.bytesFileSize(value);
        this._available = value;
    }

    get size() {
        return this._size;
    }

    set size(value) {
        this.sizeBytes=this.bytesFileSize(value);
        this._size = value;
    }

    get used() {
        return this._used;
    }

    set used(value) {
        this.usedBytes=this.bytesFileSize(value);
        this._used = value;
    }

    get availableBytes() {
        return this._availableBytes;
    }

    set availableBytes(value) {
        this._available=this.humanFileSize(value);
        this._availableBytes = value;
    }

    get sizeBytes() {
        return this._sizeBytes;
    }

    set sizeBytes(value) {
        this._size=this.humanFileSize(value);
        this._sizeBytes = value;
    }

    get usedBytes() {
        return this._usedBytes;
    }

    set usedBytes(value) {
        this._used=this.humanFileSize(value);
        this._usedBytes = value;
    }
    constructor() {
        /**
         * Espace disque disponible format humain
         * @type {string}
         */
        this._available="";
        /**
         * Espace disque total format humain
         * @type {string}
         */
        this._size="";
        /**
         * Espace disque utilisé format humain
         * @type {string}
         */
        this._used="";
        /**
         * Espace disque disponible format numérique
         * @type {Number|null}
         */
        this._availableBytes=null;
        /**
         * Espace disque total format numérique
         * @type {Number|null}
         */
        this._sizeBytes=null;
        /**
         * Espace disque utilisé format numérique
         * @type {Number|null}
         */
        this._usedBytes=null;



    }
    humanFileSize(bytes, si){
        let thresh = si ? 1000 : 1024;
        if(Math.abs(bytes) < thresh) {
            return bytes + 'B';
        }
        let units = si
            ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
            : ['K','M','G','T','P','E','Z','Y'];
        let u = -1;
        do {
            bytes /= thresh;
            ++u;
        } while(Math.abs(bytes) >= thresh && u < units.length - 1);
        return bytes.toFixed(1)+''+units[u];
    }
    bytesFileSize(string){
        let regex = /([0-9]+)\.([0-9]+)([A-za-z])/;
        let r=regex.exec(string);
        if(r){
            let base=Number(r[1]+"."+r[2]);
            switch (r[3]) {
                case "G":
                    return Math.round(base*1024*1024*1024);
                case "M":
                    return Math.round(base*1024*1024);
                case "K":
                    return Math.round(base*1024);
                case "B":
                    return Math.round(base);
                default:
                    return 0;
            }
        }
    }
}
module.exports = DiskSpace;