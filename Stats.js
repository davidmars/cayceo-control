const ua = require('universal-analytics');
//https://kilianvalkhof.com/2018/apps/using-google-analytics-to-gather-usage-statistics-in-electron/

/**
 * Permet de fair des stats google analytics
 */
class Stats {
    /**
     * Objet qui permet de faire des hists statistiques
     * @param  {string} googleAnalyticsId identifiant google analytics UA-etc
     * @param {string} machineName Nom de la machine
     */
    constructor(googleAnalyticsId="UA-126805732-2",machineName=""){
        this.machineName = machineName ? machineName : machine.name;
        console.log("machine.uuid",machine.uuid);
        this.usr=ua(googleAnalyticsId, machine.uuid);
    }

    pageView(page){
        let url= `${this.machineName}/${page}`;
        console.log("pageView",url);
        this.usr.pageview(
           url,
            this.machineName,
            page
        ).send()
    }
    event(){
        this.usr.event(

        ).send();
    }

}
module.exports=Stats;