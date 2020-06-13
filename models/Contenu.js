export default class Contenu{
    constructor() {
        alert("la classe contenu n'est que pour la doc");
        /**
         *
         * @type {string}
         */
        this.uid="contenumachine-etc";
        /**
         *
         * @type {boolean}
         */
        this.disabled=false;
        /**
         * Nom du contenu
         * @type {string}
         */
        this.name="";
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
        this.serverThumbNoResize="";
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

        /**
         * Texte court de description du contenu
         * @type {string}
         */
        this.short="";
        /**
         *
         * @type {string} durée en secondes du contenu
         */
        this.duration="";




    }
}