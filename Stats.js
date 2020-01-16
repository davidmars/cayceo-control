const ua = require('universal-analytics');
//https://kilianvalkhof.com/2018/apps/using-google-analytics-to-gather-usage-statistics-in-electron/

/**
 * Permet de fair des stats google analytics
 */
class Stats {
    constructor(googleAnalyticsId="UA-126805732-2"){
        console.log("machine.uuid",machine.uuid);
        this.usr=ua(googleAnalyticsId, machine.uuid);
    }

    pageView(page){
        console.log("pageView",page);
        this.usr.pageview(
            `${machine.name}/${page}`,
            machine.name,
            page
        ).send()
    }
    event(){
        this.usr.event(

        ).send();
    }

}
module.exports=Stats;