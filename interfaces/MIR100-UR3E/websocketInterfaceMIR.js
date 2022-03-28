const WebSocket = require('ws');
const events = require('events');

/*
*  This class connects to the WebSocket
*  created by the MIR in order to access
*  realtime data from the robot.
*/
class WebSocketInterface {

    constructor(hostIP, port){

        // Create an eventEmitter object
        this.eventEmitter = new events.EventEmitter();

        const ws_host = "ws://" + hostIP;
        //const ws_host = "ws://mir.com";
        //const ws_port = port;
        const ws_port = port;
        this._currentRobotAngle = {x:1, y:1, z:1, w:1};
        this._currentRobotPosition = {x:1, y:1};

        console.log('MIR: WebSocket trying to connect...', ws_host, ws_port);
        this.ws = new WebSocket(ws_host + ':' + ws_port);

        this.ws.on('open', function open(event) {
            
            console.log('\x1b[95m', 'MIR: WEBSOCKET CONNECTION SUCCESSFUL AT ', '\x1b[32m', ws_host, ':', ws_port);
            
            // Subscribe to robot pose
            const s = '{"op":"subscribe","topic":"/robot_pose"}';
            
            this.ws.send(s);

            this.eventEmitter.emit('ok');    // Notify indexjs

        }.bind(this));

        // Parse robot pose
        this.ws.on('message', function incoming(data) {

            //console.log(data);

            const parsedData = JSON.parse(data);

            this._currentRobotAngle = {x:parseFloat(parsedData['msg']['orientation']['x']),
                                        y:parseFloat(parsedData['msg']['orientation']['y']), 
                                        z:parseFloat(parsedData['msg']['orientation']['z']), 
                                        w:parseFloat(parsedData['msg']['orientation']['w'])};
            
            this._currentRobotPosition = {x:parseFloat(parsedData['msg']['position']['x']),
                                        y:parseFloat(parsedData['msg']['position']['y'])};
        }.bind(this));

        this.ws.on('error', function error(data) {
            console.warn('\x1b[36m', "MIR: Could not connect to MIR's WebSocket', 'Is the robot on? ☹ ", '\x1b[32m');
            this.eventEmitter.emit('ko');    // Notify indexjs
        }.bind(this));



        this.ws2 = new WebSocket(ws_host + ':' + ws_port);
        
    }

    get currentRobotAngle(){
        return this._currentRobotAngle;
    }
    set currentRobotAngle(currentAngle){
        this._currentRobotAngle = currentAngle;
    }

    get currentRobotPosition(){
        return this._currentRobotPosition;

    }
    set currentRobotPosition(currentPos){
        this._currentRobotPosition = currentPos;
    }

    currentYaw(){

        let yaw = 2 * Math.asin(this._currentRobotAngle.z);

        if ((this._currentRobotAngle.w * this._currentRobotAngle.z) < 0.0){
            yaw = -Math.abs(yaw);
        }

        return yaw * (180 / Math.PI);
    }

    move(linear, angular){
        let s = '{"op":"publish","topic":"/cmd_vel","msg":{"linear":{"x":' + linear.x + ',"y":' + linear.y + ',"z":' + linear.z + '},"angular":{"x":' + angular.x + ',"y":' + angular.y + ',"z":' + angular.z + '}}}';
        console.log(s);
        this.ws.send(s);
    }
}

exports.WebSocketInterface = WebSocketInterface;

