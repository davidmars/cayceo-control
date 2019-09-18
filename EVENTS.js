/**
 * Quand un element est pret
 * @type {string}
 */
window.EVENT_READY="EVENT_READY";

/**
 * Qunad une erreur de réseau survient
 * @type {string}
 */
window.EVENT_NETWORK_ERROR="EVENT_NETWORK_ERROR";

/**
 * Quand une synchronisation WEB est en cours
 * @type {string}
 */
window.EVENT_SYNCING="EVENT_SYNCING";

/**
 * Quand une mise à jour est en cours
 * @type {string}
 */
window.EVENT_UPDATING="EVENT_UPDATING";

/**
 * Quand on détecte qu'on est offline
 * @type {string}
 */
window.EVENT_ONLINE="EVENT_ONLINE";
/**
 * Quand on détecte qu'on est online
 * @type {string}
 */
window.EVENT_OFFLINE="EVENT_OFFLINE";
/**
 * Quand une erreur se produit car l'api web nous refuse l'accès
 * @type {string}
 */
window.EVENT_SYNC_NOT_ALLOWED_ERROR="EVENT_SYNC_NOT_ALLOWED_ERROR";
/**
 * Quand le logo est prêt, l'argument est l'url locale du logo
 * @type {string}
 */
window.EVENT_WEB_SYNC_LOGO_READY="EVENT_WEB_SYNC_LOGO_READY";
/**
 * Quand le un contenu est prêt, l'argument est le json du contenu
 * @type {string}
 */
window.EVENT_WEB_SYNC_CONTENU_READY="EVENT_WEB_SYNC_CONTENU_READY";
/**
 * Signale un contenu qui a été suprimé
 * @type {string}
 */
window.EVENT_WEB_SYNC_CONTENU_DELETED="EVENT_WEB_SYNC_CONTENU_DELETED";
/**
 * Un nouvel APK vient d'être téléchargé, le paramètre est le chamin vers le fichier
 * @type {string}
 */
window.EVENT_WEB_SYNC_NEW_APK_AVAILABLE="EVENT_WEB_SYNC_NEW_APK_AVAILABLE";
/**
 * Quand une synchronisation est terminée
 * @type {string}
 */
window.EVENT_WEB_SYNC_UPDATED="EVENT_WEB_SYNC_UPDATED";

/**
 * Quand un périphérique se connecte en ADB, le paramètre est le deviceId
 * @type {string}
 */
window.EVENT_ADB_ADD_DEVICE="EVENT_ADB_ADD_DEVICE";
/**
 * Quand un périphérique se déconnecte en ADB, le paramètre est le deviceId
 * @type {string}
 */
window.EVENT_ADB_REMOVE_DEVICE="EVENT_ADB_REMOVE_DEVICE";

/**
 * Quand un casque vient d'être ajouté à la liste, le paramètre est le CasqueModel
 * @type {string}
 */
window.EVENT_CASQUE_ADDED="EVENT_CASQUE_ADDED";
/**
 * Quand un casque vient d'être supprimé de la liste, le paramètre est le CasqueModel
 * @type {string}
 */
window.EVENT_CASQUE_DELETED="EVENT_CASQUE_DELETED";

