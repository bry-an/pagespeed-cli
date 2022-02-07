#!/usr/bin/env node
import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fetch from 'node-fetch';
import 'dotenv/config';
import path from 'path';
import ora from 'ora';

const spinner = ora({
	discardStdin: false,
	text: 'Getting analytics, please wait',
    color: 'green',
});

import {
    averageOfProp,
    averageOfPropPercent,
    cond,
    defaultToDash,
    ensureArray,
    highestOfProp,
    isntNilOrEmpty,
    props,
    safeMultiplyBy100
} from './src/util.js';
import { DEFAULT_OPTIONS, EMPTY_DATASET } from './src/constants.js';
import { checkFile, readFileAsJson, writeFileAsJson } from './src/fsUtil.js';
import { createNewDataset } from './src/pagespeedUtil.js';

const log = console.log;
const logError = (...msgs) => log(chalk.red(...msgs));
const logSuccess = (...msgs) => log(chalk.yellow(...msgs));
const logBold = (...msgs) => log(chalk.blue.bold(...msgs));

const argv = yargs(hideBin(process.argv)).argv;

const filePath = path.join(process.cwd(), 'src', 'history', '_data.json');

const logHistoryError = (e) => {
        logError('There was an ERROR parsing or writing history')
        logError('This session was likely unsaved')
        logError('And history may be corrupt.')
        logError('You may want to run this session again');
        logError('Or rerun with "--reset-history" to start with a fresh history');
        logError(e.message);
}

const initFs = async () => {
    // if no history file yet, create one
    if (!await checkFile(filePath)) {
        try {
            await createNewDataset(filePath);
            return EMPTY_DATASET;
        } catch (e) {
            logHistoryError(e);
            return {};
        }
    } else {
        // get and return history
        try {
            const json = await readFileAsJson(filePath);
            return json;
        } catch (e) {
            logHistoryError(e);
            return {};
        }
    }
};

const updateHistory = (oldHistory, results) => {
    const newEntry = oldHistory;
    results.forEach(({ timestamp, data }) => {
        const entry = {
            site: data.id,
            strategy: 'MOBILE',
            timestamp,
            data: { ...data },
        };

        // site already has an entry
        if (Object.hasOwnProperty.call(newEntry, data.id)) {
            if (!Array.isArray(newEntry[data.id].records)) {
                newEntry[data.id].records = [entry];
                logError('History may be corrupted.')
            }
            newEntry[data.id].records.push(entry);
            return;
        }

        // new entry
        newEntry[data.id] = { records: [entry] }
    })
    return newEntry;
}

const createHistoryEntry = (history, currentAnalyticsResult) => {
    const newHistory = updateHistory(history, currentAnalyticsResult);

    try {
       return writeFileAsJson(filePath, newHistory);
    } catch (e) {
        logHistoryError(e);
    }
}

const parseAnalyticsResponse = (response) => {
    const { lighthouseResult = {}, id, analysisUTCTimestamp: timestamp } = response;
    const { audits = {} } =  lighthouseResult;
    const {
        'speed-index': speedIndex,
        'total-blocking-time': totalBlockingTime,
        'largest-contentful-paint': largestContentfulPaint,
        'first-contentful-paint': firstContentfulPaint,
        'main-thread-tasks': mainThreadTasks,
        'cumulative-layout-shift': cumulativeLayoutShift,
        'interactive': timeToInteractive,
    } = audits;


    const { displayValue: tbtDisplayValue, score: tbtScore } = totalBlockingTime || {};
    const { score: speedIndexScore } = speedIndex || {};
    const { score: lcpScore, displayValue: lcpDisplayValue } = largestContentfulPaint || {};
    const { score: fcpScore, displayValue: fcpDisplayValue } = firstContentfulPaint || {};
    const { score: ttiScore, displayValue: ttiDisplayValue } = timeToInteractive || {};
    const { score: clsScore, displayValue: clsDisplayValue } = cumulativeLayoutShift || {};

    return {
        timestamp,
        data: {
            id,
            tbtDisplayValue,
            tbtScore,
            speedIndexScore,
            lcpScore,
            fcpScore,
            ttiScore,
            clsScore,
            lcpDisplayValue,
            fcpDisplayValue,
            ttiDisplayValue,
            clsDisplayValue,
        },
    }
}

const getAnalytics = async (urls, options = {}) => {
    const apiKey = process.env.API_KEY || options.apiKey;
    const strategy = options.strategy || 'MOBILE';

    spinner.start();
    const promises = urls.map(async (url) => {
        try {
            const res = await fetch(
                `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&key=${apiKey}&strategy=${strategy}`
            );
            return await res.json();
        } catch (e) {
            logError('There was an ERROR getting performance data for', url)
            logError(e.message)
            return {};
        }
    })

    let analytics = await Promise.all(promises); 
    spinner.stop();
    analytics = analytics.map(parseAnalyticsResponse);
    return analytics;
}

const displayMetricData = (data) => {
const {
        tbtDisplayValue,
        tbtScore,
        speedIndexScore,
        lcpScore,
        fcpScore,
        ttiScore,
        clsScore,
        lcpDisplayValue,
        fcpDisplayValue,
        ttiDisplayValue,
        clsDisplayValue,
    } = data;

    const displayValue = (val) => chalk.bold.yellow(val);
    const displayScore = (score) => Math.round(safeMultiplyBy100(score));

    const displayData = [
        { metric: 'Speed Index', value: displayScore(speedIndexScore) },
        { metric: 'Total Blocking Time', value: defaultToDash(tbtDisplayValue) },
        { metric: 'Total Blocking Time Score', value: displayScore(tbtScore) },
        { metric: 'First Contentful Paint', value: defaultToDash(fcpDisplayValue) },
        { metric: 'First Contentful Paint Score', value: displayScore(tbtScore) },
        { metric: 'Time to Interactive', value: defaultToDash(ttiDisplayValue) },
        { metric: 'Time to Interactive Score', value: displayScore(ttiScore) },
        { metric: 'Cumulative Layout Shift', value: defaultToDash(clsDisplayValue) },
        { metric: 'Cumulative Layout Shift Score', value: displayScore(clsScore) },
    ];

    console.table(displayData, Object.keys(displayData[0]));
}

const displayAnalytics = (analytics, options = {}) => {
    analytics.forEach(({ data = {}, timestamp } ) => {
        console.log();
        if (isntNilOrEmpty(data)) {
            logSuccess('Mobile performance data for', data.id)
            if (options.showHistory) {
                logSuccess('Recorded at', new Date(timestamp).toLocaleString())
            }
            displayMetricData(data)
        }
    })
    if (options.showHistory) {
        logSuccess(`Average Speed Index score from all entries (count = ${analytics.length}) is: `)
        logBold(averageOfProp('speedIndexScore', analytics.map(({ data }) => ({ ...data, speedIndexScore: safeMultiplyBy100(data.speedIndexScore) }))))
    }
}

const showHistory = (urls, history, options) => {
    urls.forEach((url) => {
        if (Object.hasOwnProperty.call(history, url)) {
            const { records } = history[url];
            if (!options.compare) {
                displayAnalytics(records, { showHistory: true });
            }
        }
    });
    if (options.compare)   {
        let recordsToCompare = props(urls, history).map((item) => item ? item.records.map(({ data }) => ({ ...data })) : []);
        const averages = recordsToCompare.map((groupedRecords) => groupedRecords.length ? ({ site: groupedRecords[0]?.id, average: averageOfPropPercent('speedIndexScore', groupedRecords) }) : {})
        const { site: higherSite, average: higherAverage } = highestOfProp('average', averages);

        logSuccess('Comparision Results:')
        console.log('------------------')
        logBold(higherSite)
        logSuccess('was fastest')
        console.log();
        logSuccess('I compared the average speed indicies of each site:')
        console.log();
        averages.forEach((averageEntry) => {
            console.log('----------')
            logSuccess('Site')
            logBold(averageEntry.site)
            logSuccess('Average')
            logBold(averageEntry.average)
            console.log();
        })
    }
}

// currently unused
const displayTasksList = (mainTasksList) => {
    const tasksList = mainThreadTasks.details.items.map((x) => JSON.parse(JSON.stringify(x))) 
    const sortedTasksList = tasksList.sort((a, b) => b.duration - a.duration)
    console.table(sortedTasksList, ['startTime', 'duration'])
}


const parseAndExecute = (args, history) => {
    // create show-history command
    let options = DEFAULT_OPTIONS;
    const argVector = args['_'];
    const { url } = args;
    // might be one or many, either way put in arr
    const urls = ensureArray(url);

    switch (true) {
        case args.mtt:
            options.displayMainThreadTasks = true;
        case args.desktop:
            options.strategy = 'DESKTOP';
        case args.compare:
            options.compare = true;
        case args.key:
            options.apiKey = args.key;
        default:
            options = DEFAULT_OPTIONS;
    }

    if (argVector.includes('show-history')) {
        showHistory(urls, history, options);
    } else if (argVector.includes('get-analytics')) {
        return getAnalytics(urls, options).then((analytics) => {
            if (options.compare) {
                const allAnalytics = analytics.map(({ data }) => ({ ...data }));
                const betterSpeedScore = highestOfProp('speedIndexScore', allAnalytics);
                logSuccess('Comparision Results:')
                console.log('------------------')
                logBold(betterSpeedScore.id)
                logSuccess('Was fastest at')
                logSuccess(safeMultiplyBy100(betterSpeedScore.speedIndexScore))
                console.log('-----------')
                logSuccess('All Analytics');
                allAnalytics.forEach((analytic) => {
                    logSuccess('Site')
                    logSuccess(analytic.id)
                    logSuccess(safeMultiplyBy100(analytic.speedIndexScore))
                    console.log()
                })
            } else {
                displayAnalytics(analytics, options);
            }
            createHistoryEntry(history, analytics);
        })
    } else {
        logError('Unknown command!')
    }
}

const main = async () => {
    // make sure history file exists
    // get any existing history
    const history = await initFs();
    parseAndExecute(argv, history);
}

main();
