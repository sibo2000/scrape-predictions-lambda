'use strict'
const AWS = require('aws-sdk');

AWS.config.update({ region: 'eu-west-2'})

exports.handler = function (event, context) { //eslint-disable-line

  const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'eu-west-2'})

  const params = {
    TableName: 'soccerVistaPredictionsDev',
    Item: {
      id: '12345',
      hometeam:'West Ham'
    }
  }

  documentClient.put(params, (err, data) =>{
    if(err) {
      console.log(err)
    }
  })
};
