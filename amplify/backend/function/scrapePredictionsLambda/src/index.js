"use strict";
const AWS = require("aws-sdk");
const cheerio = require("cheerio");
const axios = require("axios");
const uuidv1 = require("uuid/v1");

AWS.config.update({ region: "eu-west-2" });

exports.handler = async function (event, context) {
    async function getSoccerVistaHtml(url) {
        let response = await axios(url);
        return response;
    }

    const html = await getSoccerVistaHtml("http://www.soccervista.com/bet.php/?sh=2");

    getBets(html.data);

};

function getBets(data) {
    const $ = cheerio.load(data);
    const today = new Date();
    const d = $('#date a[href*="sh=2"]').text() + ' ' + today.getFullYear()
    let eventDate = today.setDate(today.getDate() + 2);
    eventDate = new Date(d)

    $("td.home").each(function () {

        var data = $(this);
        var prediction = getPrediction(data);
        var bet = {
            TableName: "soccerVistaPredictionsDev",
            Item: {
                id: uuidv1(),
                home: getHomeTeam(data),
                away: getAwayTeam(data),
                prediction: prediction,
                confidence: getConfidence(data),
                country: getCountry(data) ? getCountry(data) : "no-data",
                league: getLeague(data) ? getLeague(data) : "no-data",
                predictionType: getPredictionType(data)
                    ? getPredictionType(data)
                    : "no-data",
                eventDate: getDate(eventDate, data),
                form: getForm(data, prediction),
                inBasket: false
            }
        };
        if (!(bet.prediction === "No Prediction")) {
            saveBet(bet);
        }
    });
}

function saveBet(bet) {
    const documentClient = new AWS.DynamoDB.DocumentClient({
        region: "eu-west-2"
    });
    documentClient.put(bet, (err, data) => {
        if (err) {
            console.log(err);
        }
    });
}

function getForm(data, prediction) {
    var d = {};
    if (prediction == "1") {
        d = data.prev();
    } else if (prediction == "2") {
        d = data
            .next()
            .next()
            .next();
    } else {
        return 0;
    }
    var elements = d.children();
    var form =
        elements.filter(".won,.won2").length * 20 +
        elements.filter(".draw,.draw2").length * 10;
    return form;
}

function getDate(date, data) {
    var d = data
        .prev()
        .prev()
        .text()
        .split(":");
    date.setHours(d[0], d[1]);
    return date;
}

function getHomeTeam(data) {
    return data.text();
}

function getAwayTeam(data) {
    return data
        .next()
        .next()
        .text();
}

function getPrediction(data) {
    var predictionText = data
        .next()
        .next()
        .next()
        .next()
        .text();
    if (typeof predictionText === "string") {
        if (predictionText.includes(getHomeTeam(data))) {
            return "1";
        } else if (predictionText.includes(getAwayTeam(data))) {
            return "2";
        } else {
            return "No Prediction";
        }
    }
}

function getConfidence(data) {
    var predictionText = data
        .next()
        .next()
        .next()
        .next()
        .text()
        .slice(0, 2);
    var val = parseInt(predictionText);
    if (val) {
        return val;
    }
    return -1;
}

function getCountry(data) {
    return data
        .parent()
        .prev(".headupe")
        .children()
        .next()
        .next()
        .prev()
        .text();
}

function getLeague(data) {
    return data
        .parent()
        .prev(".headupe")
        .children()
        .next()
        .next()
        .text();
}

function getPredictionType(data) {
    var val = data
        .parent()
        .parents("table.main")
        .prev();
    if (val.is("h2")) {
        return val.text();
    } else {
        return val.prev().text();
    }
}
