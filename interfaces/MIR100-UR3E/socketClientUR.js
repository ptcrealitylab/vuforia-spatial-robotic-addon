// Import events module
var events = require('events');
const net = require('net');
var ur = require('./ur.js');

/*
*  This class connects to the WebSocket
*  created by the UR in order to access
*  realtime data from the robot through port 30002
*/
class SocketInterface{

    constructor(hostIP, port){

        // Create an eventEmitter object
        this.eventEmitter = new events.EventEmitter();
        
        this._isAlive = false;      // Is socket connection successful?
        this.isRobotOK = true;      // If robot is in protective stop or emergency stop this will be false
        this._isURmoving = false;   // Is robot moving?
        this.nIntervId = 0;
        this.jointSpeed = this.oldJointAngles = [0,0,0,0,0,0];
        this.lastTime = 0;
        this.jointsPosition = [0,0,0,0,0,0];
        this.jointPositionSet = false;
        this.setInitialPos = false;
        this.isProgramRunning = false;

        console.log('UR3E: Socket trying to connect...', hostIP, port);

        this.client = new net.Socket();

        this.client.connect({
            port: port,
            host: hostIP

        }, function () {

            console.log('\x1b[95m%s\x1b[0m', 'UR3E: SOCKET CONNECTION SUCCESSFUL AT ', '\x1b[32m', hostIP, ':', port);
            this._isAlive = true;

            this.eventEmitter.emit('ok');

        }.bind(this));


        this.client.on('data', function(data) {
            var res = new ur().onData(data);
            if(res !== undefined){
                //console.log(JSON.stringify(res));

                //console.log(res);
                this.parseResponseData(res);
                
            }
        }.bind(this));

        
        this.client.on('error', function(data) {
            this._isAlive = false;
            //console.warn('\x1b[36m', "UR3E: Could not connect to UR's Server Socket. Is the robot on? ☹", '\x1b[32m');

            console.log(data);
            
            this.eventEmitter.emit('ko');
            
        }.bind(this));

        const self = this;

    }

    parseResponseData(data){
        
        //console.log(data);
        
        var isProtectiveStopped = data.robotModeData.protectiveStopped;   // UR Protective Stop
        var isEmergencyStopped = data.robotModeData.emergencyStopped;    // UR Emergency Stop

        if (isProtectiveStopped || isEmergencyStopped) {
            if (this.isRobotOK){
                this.isRobotOK = false;
                this.eventEmitter.emit('ur_error');
            }
        } else {
            if (!this.isRobotOK){
                this.isRobotOK = true;
                this.eventEmitter.emit('ur_ready');
            }
        }
        
        this.isProgramRunning = data.robotModeData.programRunning;              // This indicates if the robot arm is moving
        
        if (!this._isURmoving){
            if (this.isProgramRunning === 1){
                this._isURmoving = true;
                this.eventEmitter.emit('ur_play');    // Notify indexjs
            }
        } else {
            if (this.isProgramRunning === 0){
                this._isURmoving = false;
                this.eventEmitter.emit('ur_stop');    // Notify indexjs
            }
        }
        
        let jointData_0 = data.jointData[0];
        let jointData_1 = data.jointData[1];
        let jointData_2 = data.jointData[2];
        let jointData_3 = data.jointData[3];
        let jointData_4 = data.jointData[4];
        let jointData_5 = data.jointData[5];
        
    }

    setJointSpeed(j1, j2, j3, j4, j5, j6){
        this.jointSpeed[0] = j1;
        this.jointSpeed[1] = j2;
        this.jointSpeed[2] = j3;
        this.jointSpeed[3] = j4;
        this.jointSpeed[4] = j5;
        this.jointSpeed[5] = j6;
    }
    

    moveURto(jointPositions){

        let s = 'movej([' + jointPositions[0] + ', ' + jointPositions[1] + ', ' + jointPositions[2] + ', ' 
            + jointPositions[3] + ', ' + jointPositions[4] + ', ' + jointPositions[5] + '], a=1.0, v=1.05, t=0, r=0)\n';
        
        console.log('Send: ', s);
        this.send(s);

    }
    
    computeJointSpeed(jointAngles){

        //console.log('jointAngles in UR socket: ', jointAngles);
        
        // 0 - y [A,D]
        // 1 - z [S,W]
        // 2 - z [Q,E]
        // 3 - y [O,P]
        // 4 - z [L,K]
        // 5 - y [M,N]
        
        // These are the axis with the angles in degrees that each joint rotates around in unity
        let newJointAngles = [jointAngles[0].y, jointAngles[1].z, jointAngles[2].z, jointAngles[3].y, jointAngles[4].z, jointAngles[5].y];
        
        let ms = Date.now();
        
        for (let i = 0; i < newJointAngles.length; i++){
            
            let diff = newJointAngles[i] - this.oldJointAngles[i];
            
            if (Math.abs(diff) > 350){
            }
            
            let deltaRad = (diff) * Math.PI/180;
            this.jointSpeed[i] = (deltaRad/(ms - this.lastTime)) * 1000;  // Compute rad/s
        }

        this.logAngles(newJointAngles);
        //this.logAngles(this.jointSpeed);
        
        
        this.lastTime = Date.now();
        this.oldJointAngles = newJointAngles;   // in deg
        
        if (!this.setInitialPos){
            this.startSteering();
            this.setInitialPos = true;
        }
    }
    
    logAngles(angles){
        console.log(parseFloat(angles[0]).toFixed(2) + ' | ' +
            parseFloat(angles[1]).toFixed(2) + ' | ' +
            parseFloat(angles[2]).toFixed(2) + ' | ' +
            parseFloat(angles[3]).toFixed(2) + ' | ' +
            parseFloat(angles[4]).toFixed(2) + ' | ' +
            parseFloat(angles[5]).toFixed(2));
    }

    startSteering() {

        //console.log('oldjoints: ', this.oldJointAngles);

        // Adjust for 90 degree offset in two joints from Unity
        let jointPos = [this.oldJointAngles[0],
            this.oldJointAngles[0] - Math.PI/2,
            this.oldJointAngles[0],
            this.oldJointAngles[0] - Math.PI/2,
            this.oldJointAngles[0],
            this.oldJointAngles[0]];

        // TODO: Send robot to initial position
        this.moveURto(jointPos);

        //this.steer();

        // check if already an interval has been set up
        if (!this.nIntervId) {
            //this.nIntervId = setInterval(() => { this.steer.call(this) }, 1000);  // call each 2ms
        }
    }
    
    

    steer(){
        // move_speed=[sp[0], sp[1], sp[2], 0, 0, 0]
        // speedl(move_speed,0.5,0.1)
        // speedl([0,0,0.2,0,0,0],0.5,1)
        // By default this will drive the robot in the base frame Z direction at the desired speed for 1 second. Beware that when it times out the robot will stop with a nasty jolt, so make sure you follow it with a stopl() command for a nicer deceleration.
        //let s1 = 'speedl([' + 0 + ', ' + 0 + ', ' + (-0.01) + ', ' + 0 + ', ' + 0.1 + ', ' + 0 + '], 0.5, 1)\n';
        
        // Joint speeds in rad/s
        // base = 0.2 rad/s, shoulder = 0.3 rad/s, elbow = 0.1 rad/s, wrist1=0.05 rad/s, wrist2 and wrist 3 = 0 rad/s
        
        /*let j1 = 0.2;   // base
        let j2 = 0.3;   // shoulder
        let j3 = 0.1;   // elbow
        let j4 = 0;     // wrist1
        let j5 = 0;     // wrist2
        let j6 = 0;     // wrist3*/
        
        let a = 0.5;    // acceleration of 0.5 rad/s2 of the leading axis
        let t = 1.0;    // time of 0.5 s – time before the function returns
        
        if (!this.isProgramRunning){
            let s2 = 'speedj([' + this.jointSpeed[0] + ', ' + this.jointSpeed[1] + ', ' + this.jointSpeed[2] + ', ' + this.jointSpeed[3] + ', ' + this.jointSpeed[4] + ', ' + this.jointSpeed[5] + '], '+ a +', '+ t +')\n';
            console.log('Send: ', s2);
            this.send(s2);
        } 
    }
    
    stop(){
        let s = 'stopj(10)\n';
        console.log('Send: ', s);
        this.send(s);
    }

    send(data){
        this.client.write(data);
    }

}

exports.SocketInterface = SocketInterface;

