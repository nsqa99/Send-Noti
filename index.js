const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const {ping, listenAllEvents, initWeb3} = require('./web3');
const {handleError, handleEvent, handleClose} = require('./util')


const admin = require("firebase-admin");
const serviceAccount = require("./key/my-icetea-firebase-adminsdk-cyitm-6a7523f508.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://my-icetea.firebaseio.com"
});

const port = process.env.PORT || 3000;


app.use(bodyParser.json());

const notification_options = {
    priority: "high",
    timeToLive: 60 * 60 * 24
};

const message = {
    data: {
        type: "hello",
        infoMessenger: "test",
    },
    notification: {
        title: "hello",
        body: "test",
    }
};

app.post('/firebase/noti', (req, res) => {

    
    const  registrationToken = req.body.registrationToken
    const options =  notification_options;
    
    admin.messaging().sendToDevice(registrationToken, message, options)
      .then( response => {
        console.log(response);
        res.status(200).send("Succesfully sent!");
       
      })
      .catch( error => {
          console.log(error);
      });
});

app.get('/', () => console.log("welcome"));

const start = () => {
    initWeb3(handleError, handleClose)
    listenAllEvents(handleEvent, handleError)
  
    setInterval(() => {
      ping().catch(handleError)
    }, +process.env.PING_INTERNAL || 45000)
  
  }
  
start()

app.listen(port, () => console.log('Server is listening...'));

