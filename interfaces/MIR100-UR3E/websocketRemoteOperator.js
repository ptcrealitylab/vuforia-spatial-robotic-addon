// Import events module
const WebSocket = require('ws');
const events = require('events');

/*
*  This class connects to the WebSocket
*  created by the UR in order to access
*  realtime data from the robot through port 30002
*/
class WebsocketRemoteOperator{

    constructor(){

        // Create an eventEmitter object
        this.eventEmitter = new events.EventEmitter();

        let url = 'ws://localhost:31337';
        
        console.log('Connecting to Remote Operator on: ', url);
        
        this.ws = new WebSocket(url);

        this.ws.on('open', function open(event) {
            console.log('Remote Operator websocket connected successfully');
        });

        this.ws.on('message', function incoming(msg) {

            let message = JSON.parse(msg);

            let j1 = message.robotData['Base_rotation'];
            let j2 = message.robotData['Shoulder_rotation'];
            let j3 = message.robotData['Elbow_rotation'];
            let j4 = message.robotData['Wrist1_rotation'];
            let j5 = message.robotData['Wrist2_rotation'];
            let j6 = message.robotData['Wrist3_rotation'];

            //console.log('Rotations: ', j1, j2, j3, j4, j5, j6);
            
            this.jointRotations = [j1, j2, j3, j4, j5, j6];

            this.eventEmitter.emit('newJointData');    // Notify indexjs

        }.bind(this));
    }

    get currentJointAngles(){
        return this.jointRotations;
    }
    
}

exports.WebsocketRemoteOperator = WebsocketRemoteOperator;

