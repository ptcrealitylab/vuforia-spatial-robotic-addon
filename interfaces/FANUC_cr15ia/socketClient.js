// Import events module
var events = require('events');
const net = require('net');

/*
*  This class connects to the WebSocket
*  created by the FANUC in order to access
*  realtime data from the robot through port 30002
*/
class SocketInterface{

    constructor(hostIP, port){

        // Create an eventEmitter object
        this.eventEmitter = new events.EventEmitter();
        
        this._isAlive = false;      // Is socket connection successful?
        this.isRobotOK = true;      // If robot is in protective stop or emergency stop this will be false
        
        console.log('FANUC: Socket trying to connect...');

        this.client = new net.Socket();

        this.client.connect({
            port: port,
            host: hostIP

        }, function (data) {

            console.log('\x1b[95m%s\x1b[0m', 'FANUC: SOCKET CONNECTION SUCCESSFUL AT ', '\x1b[32m', hostIP, ':', port, data);
            this._isAlive = true;

            //let s = '+552.00:-400.00:+100.00';
            //console.log('Sending s: ', s);
            //this.client.write(s);

            console.log('Sending');
            //this.client.write('+350.00:+000.00:+230.00');

        }.bind(this));
        
        this.client.on('data', function(data) {

            console.log('FANUC: ------------ Received: ', String(data));

            this.processFANUCPacket(String(data));

        }.bind(this));
        
        this.client.on('error', function(data) {
            this._isAlive = false;
            console.log('\x1b[36m', "FANUC: Could not connect to FANUC's Server Socket. Is the robot on? ☹ ");
        }.bind(this));

        this.send = this.send.bind(this);
        
        const self = this;

    }

    processFANUCPacket(data){

        // If FANUC finished moving
        //console.log('received: ', data);
        
        if (data === 'stop'){
            this._isFANUCmoving = false;
            this.eventEmitter.emit('fanuc_stop');    // Notify indexjs
        } else if (data === 'play') {
            this._isFANUCmoving = true;
            this.eventEmitter.emit('fanuc_play');    // Notify indexjs
        }

    }

    moveFANUCto(x, y, z, rx, ry, rz){

        let x_round = Math.abs(x).toFixed(2);
        let y_round = Math.abs(y).toFixed(2);
        let z_round = Math.abs(z).toFixed(2);
        
        let xString = x_round.toString();
        let yString = y_round.toString();
        let zString = z_round.toString();
        
        if (x >= -9 && x < 0) xString = '-00' + xString;
        if (y >= -9 && y < 0) yString = '-00' + yString;
        if (z >= -9 && z < 0) zString = '-00' + zString;

        if (x >= 0 && x <= 9) xString = '+00' + xString;
        if (y >= 0 && y <= 9) yString = '+00' + yString;
        if (z >= 0 && z <= 9) zString = '+00' + zString;

        if (x < 100 && x > 9) xString = '+0' + xString;
        if (y < 100 && y > 9) yString = '+0' + yString;
        if (z < 100 && z > 9) zString = '+0' + zString;

        if (x > -100 && x < -9) xString = '-0' + xString;
        if (y > -100 && y < -9) yString = '-0' + yString;
        if (z > -100 && z < -9) zString = '-0' + zString;
        
        if (x >= 100) xString = '+' + xString;
        if (y >= 100) yString = '+' + yString;
        if (z >= 100) zString = '+' + zString;

        if (x <= -100) xString = '-' + xString;
        if (y <= -100) yString = '-' + yString;
        if (z <= -100) zString = '-' + zString;
            
        let s = xString + ':' + yString + ':' + zString;
        
        this.send(s);

    }

    send(data){

        console.log('FANUC: Send data to robot: ', data);
        
        this.client.write(data);
        //this.client.write('+500.00:+000.00:+200.00');
    }

}

exports.SocketInterface = SocketInterface;

