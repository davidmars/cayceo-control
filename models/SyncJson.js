export default class SyncJson{
    constructor() {
        alert("la classe SyncJson n'est que pour la doc");

        this.json={
            /**
             *
             */
            "synchroId": "v014.78014d484860ee48dcabfa47d1d7754b",
            /**
             *
             */
            "refreshSeconds": 45,
            /**
             *
             */
            "ganalytics": null,

            /**
             *
             */
            "jukebox": {
                /**
                 * identifiant de la machine
                 */
                "uid": "user-23",
                /**
                 * Nom (humain de la machine)
                 */
                "name": "cayceo David Halle",
                /**
                 * La machine est elle autorisée ?
                 */
                "allowed": "1",
                /**
                 *
                 */
                "istestmachine": true,
                /**
                 * La régie doit elle afficher les catégories ?
                 */
                "usetags": true,
                /**
                 * Activer ou non ipneo remote (le qr code)
                 */
                "ipneoremote":false,
                /**
                 * Activer ou non le bouton demarrer la lecture
                 */
                "btnplayall":false,
                /**
                 * Activer ou pas le bouton selectionner tous les casques
                 */
                "btnselectall":false,
            },
            "logomachine": {
                /**
                 * Chemin serveur du logo
                 */
                "serverFile": "http://etc...",
                /**
                 * Chemin local du logo
                 */
                "localFile": "logo/etc...jpg"
            },
            "qrcode": {
                /**
                 * Chemin serveur du qrcode
                 */
                "serverFile": "http://etc...",
                /**
                 * Chemin local du qrcode
                 */
                "localFile": "doc/etc...png"
            },
            "modeemploi": {
                /**
                 * Chemin serveur du mode d'emploi
                 */
                "serverFile": "http://etc...",
                /**
                 * Chemin local du mode d'emploi
                 */
                "localFile": "doc/etc...pdf"
            },
            "casquesapk": {
                /**
                 * Chemin serveur de l'apk
                 */
                "serverFile": "http://etc...",
                /**
                 * Chemin local de l'apk
                 */
                "localFile": "logo/etc...jpg"
            },
            /**
             * Liste des contenus
             * @type {Contenu[]}
             */
            "contenus": []
        }

    }
}