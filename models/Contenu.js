export default class Contenu{
    constructor() {
        alert("la classe contenu n'est que pour la doc")
        /**
         *
         * @type {boolean}
         */
        this.disabled=false;
        /**
         *
         * @type {boolean}
         */
        this.ready=false;
        /**
         *
         * @type {string}
         */
        this.localFile="";
        /**
         *
         * @type {string}
         */
        this.localFileAbsolute="";
        /**
         *
         * @type {boolean}
         */
        this.localFileAbsolute_downloaded=false;

        /**
         * @deprecated
         * @type {string}
         */
        this.localThumb="";
        /**
         * @deprecated
         * @type {string}
         */
        this.localThumbAbsolute="";
        /**
         * @deprecated
         * @type {boolean}
         */
        this.localThumbAbsolute_downloaded=false;

        /**
         *
         * @type {string}
         */
        this.localThumbNoResize="";
        /**
         *
         * @type {string}
         */
        this.localThumbNoResizeAbsolute="";
        /**
         *
         * @type {boolean}
         */
        this.localThumbNoResizeAbsolute_downloaded=false;




    }
}