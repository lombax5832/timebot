const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); //initialize dotenv

import { GraphQLClient, gql } from 'graphql-request';
import { buildSdk, getSdk } from '@rpglogs/api-sdk';

async function getAccessToken() {
    console.log(process.env.RPGLOGS_API_CLIENT_ID + ':' + process.env.RPGLOGS_API_CLIENT_SECRET)
    const authHeader = 'Basic ' +
        btoa(
            process.env.RPGLOGS_API_CLIENT_ID + ':' +
            process.env.RPGLOGS_API_CLIENT_SECRET
        );
    const response = await fetch(
        'https://www.fflogs.com' +
        '/oauth/token',
        {
            method: 'POST',
            headers: {
                Authorization: authHeader,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });
    const json = await response.json();
    if (response.status === 200) {
        return json.access_token;
    } else {
        throw new Error(
            'Response was not OK: ' +
            JSON.stringify(json ?? {})
        );
    }
}

const initFFLogs = async () => {
    const accessToken: string = await getAccessToken();
    const sdk: ReturnType<typeof getSdk> = buildSdk(accessToken, 'ff');
    return sdk;
}

const initFFLogsGQL = async () => {
    const accessToken: string = await getAccessToken();
    const endpoint = 'https://www.fflogs.com/api/v2/client';
    const graphQLClient = new GraphQLClient(endpoint, {
        headers: {
            Authorization: 'Bearer ' + accessToken
        }
    })
    return graphQLClient;
}

const getReportGql = async (ffGql: GraphQLClient, code: string) => {
    const query = gql`
    {
        reportData {
            report(code: "${code}") {
                events(
                    filterExpression: "actor.type = NPC AND type = 'cast' AND (ability.id in (25555,25569,26381,27529,27538,27957,27973,29752,28060,29453,28058))"
                    endTime: 9999999999999
                    useAbilityIDs: false
                ){
                    data
                }
                fights{
                    id
                    startTime
                    endTime
                }
                startTime
            }
        }
    }
  `

    const data = await ffGql.request(query)
    //console.log(JSON.stringify(data, undefined, 2))
    return data;
}

const getReport = async (sdk: ReturnType<typeof getSdk>, code: number) => {
    try {
        const response = await sdk.getCharacter({ characterId: code, includeGameData: false, includeGuilds: false, includeServer: false })
        if (!response?.characterData?.character?.id) {
            console.log('Report not found.');
            return;
        }
        console.log(response.characterData.character);
    } catch (error) {
        console.log('An error occurred.', error.response)
    }
}

const getTimeSpentPerMech = async (code: string, ffGql) => {
    const data = await getReportGql(ffGql, code)

    if (!data?.reportData?.report?.events?.data) {
        console.log("error has occured")
        return {};
    }

    const startTimestamp = data.reportData.report.startTime;
    let reportDict = {};
    // let nameDict = {};
    let totalTime = 0;
    /*
        data.reportData.report.fights.forEach(fight => {
            data.reportData.report.events.data.filter(event => event.fight == fight.id).forEach()
        });
    */

    data.reportData.report.events.data.forEach(event => {
        reportDict[event.fight] = { name: event.ability.name };
    });
    data.reportData.report.fights.forEach(fight => {
        if (reportDict[fight.id]) {
            totalTime += (fight.endTime - fight.startTime) / 1000;
            reportDict[fight.id].duration = (fight.endTime - fight.startTime) / 1000;

            if (reportDict[fight.id].name == "Great Wyrmsbreath") {
                reportDict[fight.id].name = "Wyrmsbreath" + (reportDict[fight.id].duration > 800 ? " 2" : "");
            }
            if (reportDict[fight.id].name == "_rsv_28060_-1_1_C0_0Action") {
                reportDict[fight.id].name = "Exaflare's Edge" + (reportDict[fight.id].duration > 910 ? ` ${Math.floor((reportDict[fight.id].duration-910)/80)+1}`: "");
            }
            if (reportDict[fight.id].name == "_rsv_29453_-1_1_C0_0Action") {
                reportDict[fight.id].name = "Akh Morn's Edge" + (reportDict[fight.id].duration > 930 ? ` ${Math.floor((reportDict[fight.id].duration-930)/80)+1}`: "");
            }
            if (reportDict[fight.id].name == "_rsv_28058_-1_1_C0_0Action") {
                reportDict[fight.id].name = "Gigaflare's Edge" + (reportDict[fight.id].duration > 956 ? ` ${Math.floor((reportDict[fight.id].duration-956)/80)+1}`: "");
            }
        }
    });

    let resultDict = {};

    Object.keys(reportDict).forEach((fightId) => {
        resultDict[reportDict[fightId].name] = {
            duration: resultDict[reportDict[fightId].name] ? resultDict[reportDict[fightId].name].duration + reportDict[fightId].duration : reportDict[fightId].duration,
            wipes: resultDict[reportDict[fightId].name] ? resultDict[reportDict[fightId].name].wipes + 1 : 1
        };
    })

    Object.keys(reportDict).forEach((fightId) => {
        resultDict[reportDict[fightId].name].percentage = resultDict[reportDict[fightId].name].duration * 100 / totalTime;
    })

    console.log(reportDict);
    console.log(resultDict);
    return { resultDict, startTimestamp };
}
/*
initFFLogsGQL().then(async (ffGql) => {
    //const data = await getReportGql(ffGql, "DB9RFnC4ybd2Yprv")
    getTimeSpentPerMech("jRbCBKhZ2tW16aV7", ffGql)
})
/*
initFFLogs().then((ffSdk) => {
    getReport(ffSdk, 8436496);
});*/

export { initFFLogsGQL, getTimeSpentPerMech }