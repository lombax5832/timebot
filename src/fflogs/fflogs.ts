const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); //initialize dotenv

import { GraphQLClient, gql } from 'graphql-request';
import { buildSdk, getSdk } from '@rpglogs/api-sdk';

const timeline: String[] = [
    "Strength of the Ward",
    "Sanctity of the Ward",
    "Dive from Grace",
    "Wrath of the Heavens",
    "Death of the Heavens",
    "Wyrmsbreath",
    "Wroth Flames",
    "Wyrmsbreath 2",
    "Exaflare's Edge 1",
    "Akh Morn's Edge 1",
    "Gigaflare's Edge 1",
    "Exaflare's Edge 2",
    "Akh Morn's Edge 2",
    "Gigaflare's Edge 2",
    "Exaflare's Edge 3",
    "Akh Morn's Edge 3",
    "Natural Alignment 1",
    "High Concept 1",
    "Limitless Desolation",
    "Natural Alignment 2",
    "High Concept 2",
    "Program Loop",
    "Pantokrator",
    "Party Synergy",
    "Limitless Synergy",
    "P3 Transition",
    "Hello, World",
    "Oversampled Wave Cannon",
    "P4",
    "Run: \\*\\*\\*\\*mi* (Delta Version)",
    "Run: \\*\\*\\*\\*mi* (Sigma Version)",
    "Run: \\*\\*\\*\\*mi* (Omega Version)",
    "P6",
    "Cosmo Memory",
    "Cosmo Arrow 1",
    "Unlimited Wave Cannon 1",
    "Cosmo Arrow 2",
    "Unlimited Wave Cannon 2"
]

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
    return getReportCustomExpressionGql(ffGql, code, "actor.type = NPC AND MATCHED type = 'cast' AND ability.name in ('Oversampled Wave Cannon') IN (1) END OR type = 'begincast' AND source.class = 'boss' AND ability.name in ('Cosmo Arrow') OR type = 'cast' AND ability.id in (25555,25569,26381,27529,27538,27957,27956,27973,29752,28060,29453,28058,31027,31002,30962,31032,31148,31163,30189,31491,31499,31551,31544,31507,31573,31610,31624,32788,32789,31649,31660)");
}

const getReportCustomExpressionGql = async (ffGql: GraphQLClient, code: string, expression: string) => {
    const query = gql`
    {
        reportData {
            report(code: "${code}") {
                events(
                    filterExpression: "${expression}"
                    endTime: 9999999999999
                    useAbilityIDs: false
                    limit: 4000
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

const getFilterTimestamps = async (code: string, filter: string, ffGql) => {
    const data = await getReportCustomExpressionGql(ffGql, code, filter)
    return data;
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

    let timestamps: number[][] = []

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
            if (reportDict[fight.id].name == "_rsv_28060_-1_1_C0_0Action" || reportDict[fight.id].name == "Exaflare's Edge") {
                reportDict[fight.id].name = "Exaflare's Edge" + (reportDict[fight.id].duration > 900 ? ` ${Math.floor((reportDict[fight.id].duration - 900) / 80) + 1}` : "");
            }
            if (reportDict[fight.id].name == "_rsv_29453_-1_1_C0_0Action" || reportDict[fight.id].name == "Akh Morn's Edge") {
                reportDict[fight.id].name = "Akh Morn's Edge" + (reportDict[fight.id].duration > 920 ? ` ${Math.floor((reportDict[fight.id].duration - 920) / 80) + 1}` : "");
            }
            if (reportDict[fight.id].name == "_rsv_28058_-1_1_C0_0Action" || reportDict[fight.id].name == "Gigaflare's Edge") {
                reportDict[fight.id].name = "Gigaflare's Edge" + (reportDict[fight.id].duration > 946 ? ` ${Math.floor((reportDict[fight.id].duration - 946) / 80) + 1}` : "");
            }
            if (reportDict[fight.id].name == "Gorgomanteia") {
                reportDict[fight.id].name = (reportDict[fight.id].duration > 240 ? "Gorgomanteia 2" : "Gorgomanteia");
            }
            if (reportDict[fight.id].name == "High Concept") {
                reportDict[fight.id].name = (reportDict[fight.id].duration > 150 ? "High Concept 2" : "High Concept 1");
            }
            if (reportDict[fight.id].name == "Natural Alignment") {
                reportDict[fight.id].name = (reportDict[fight.id].duration > 150 ? "Natural Alignment 2" : "Natural Alignment 1");
            }
            if (reportDict[fight.id].name == "unknown_7b13") {
                reportDict[fight.id].name = "P3 Transition";
            }
            if (reportDict[fight.id].name == "unknown_7b7a") {
                reportDict[fight.id].name = "P4";
            }
            if (reportDict[fight.id].name == "Run: ****mi* (Delta Version)") {
                reportDict[fight.id].name = "Run: \\*\\*\\*\\*mi* (Delta Version)";
            }
            if (reportDict[fight.id].name == "Run: ****mi* (Sigma Version)") {
                reportDict[fight.id].name = "Run: \\*\\*\\*\\*mi* (Sigma Version)";
            }
            if (reportDict[fight.id].name == "Run: ****mi* (Omega Version)") {
                reportDict[fight.id].name = "Run: \\*\\*\\*\\*mi* (Omega Version)";
            }
            if (reportDict[fight.id].name == "Cosmo Memory") {
                reportDict[fight.id].name = "P6";
            }
            if (reportDict[fight.id].name == "Cosmo Arrow") {
                reportDict[fight.id].name = "Cosmo Arrow " + (reportDict[fight.id].duration < 920 ? '1' : '2');
            }
            if (reportDict[fight.id].name == "Unlimited Wave Cannon") {
                reportDict[fight.id].name = "Unlimited Wave Cannon " + (reportDict[fight.id].duration < 970 ? '1' : '2');
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

    data.reportData.report.fights.forEach(fight => {
        if (reportDict[fight.id]) {
            if (!timestamps[reportDict[fight.id].name]) {
                timestamps[reportDict[fight.id].name] = []
            }
            timestamps[reportDict[fight.id].name].push(fight.startTime + startTimestamp)
        }
    })

    let resultSet = [];

    Object.keys(resultDict).forEach((result) => {
        resultSet.push({ name: result, ...resultDict[result] })
    })

    resultSet.sort((a, b) => timeline.indexOf(a.name) - timeline.indexOf(b.name))

    //console.log(reportDict);
    //console.log(resultDict);
    //console.log(timestamps);
    return { resultSet, timestamps, startTimestamp };
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

export { initFFLogsGQL, getTimeSpentPerMech, getFilterTimestamps }