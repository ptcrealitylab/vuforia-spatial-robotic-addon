/*
*  Custom Math operations
*/
class customMaths {

    constructor() {

    }

    radians_to_degrees(radians = 0)
    {
        var pi = Math.PI;
        return radians * (180/pi);
    }

    degrees_to_radians(degrees = 0)
    {
        var pi = Math.PI;
        return degrees * (pi/180);
    }

    distance( a, b )
    {

        //console.log('a: ', a);
        //console.log('b: ', b);

        var dx = a[0] - b[0];
        var dy = a[1] - b[1];

        var distance = Math.sqrt( dx * dx + dy * dy );

        return distance;
    }

    signed_angle(vector1, vector2){

        let angle = Math.atan2(vector2[1], vector2[0]) - Math.atan2(vector1[1], vector1[0]);

        if (angle > Math.PI)        { angle -= 2 * Math.PI; }
        else if (angle <= -Math.PI) { angle += 2 * Math.PI; }

        return angle;

    }

    /**
     * Tells you how much the frame was rotated by twisting the x-axis
     * @param m
     * @return {number}
     */
    getRotationAboutAxisX(m) {
        var q = this.getQuaternionFromMatrix(m);
        var angles = this.quaternionToEulerAngles(q);
        return angles.theta;
    }

    /**
     * Tells you how much the frame was rotated by twisting the y-axis
     * @param m
     * @return {number}
     */
    getRotationAboutAxisY(m) {
        var q = this.getQuaternionFromMatrix(m);
        var angles = this.quaternionToEulerAngles(q);
        return angles.psi;
    }

    /**
     * Tells you how much the frame was rotated by twisting the z-axis
     * @param m
     * @return {number}
     */
    getRotationAboutAxisZ(m) {
        var q = this.getQuaternionFromMatrix(m);
        var angles = this.quaternionToEulerAngles(q);
        return angles.phi;
    }
    
    getDirectionFromMatrix(v, m){
        var q = this.getQuaternionFromMatrix(m);

        // Quaternion * Vector
        const ix =  q.w * v.x + q.y * v.z - q.z * v.y;
        const iy =  q.w * v.y + q.z * v.x - q.x * v.z;
        const iz =  q.w * v.z + q.x * v.y - q.y * v.x;
        const iw = -q.x * v.x - q.y * v.y - q.z * v.z;
        // Final Quaternion * Vector = Result
        let result = {x:0, y:0, z:0};
        result.x = ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y;
        result.y = iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z;
        result.z = iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x;

        let length = Math.sqrt((result.x * result.x) + (result.y * result.y) + (result.z * result.z));
        result.x = result.x/length;
        result.y = result.y/length;
        result.z = result.z/length;

        return result;
    }

    /**
     * Extracts three axes of rotation from a quaternion in the form of Euler angles.
     * https://en.wikipedia.org/wiki/Euler_angles
     * @param {{x: number, y: number, z: number, w: number}}
     */
    quaternionToEulerAngles(q) {
        var phi = Math.atan2(q.z * q.w + q.x * q.y, 0.5 - (q.y * q.y + q.z * q.z));
        var theta = Math.asin(-2 * (q.y * q.w - q.x * q.z));
        var psi = Math.atan2(q.y * q.z + q.x * q.w, 0.5 - (q.z * q.z + q.w * q.w));
        return {
            phi: phi,
            theta: theta,
            psi: psi
        }
    }

    /**
     * Extracts rotation information from a 4x4 transformation matrix
     * @param {Array.<number>} m - a 4x4 transformation matrix
     * @author https://answers.unity.com/questions/11363/converting-matrix4x4-to-quaternion-vector3.html
     */
    getQuaternionFromMatrix(m) {

        // create identity Quaternion structure as a placeholder
        // this is the Quaternion that happens when m is the identity matrix
        var q = { x: 0, y: 0, z: 0, w: 1 };

        if (m.length === 0) { return q; }

        q.w = Math.sqrt( Math.max( 0, 1 + m[0] + m[5] + m[10] ) ) / 2;
        q.x = Math.sqrt( Math.max( 0, 1 + m[0] - m[5] - m[10] ) ) / 2;
        q.y = Math.sqrt( Math.max( 0, 1 - m[0] + m[5] - m[10] ) ) / 2;
        q.z = Math.sqrt( Math.max( 0, 1 - m[0] - m[5] + m[10] ) ) / 2;
        q.x *= Math.sign( q.x * ( m[6] - m[9] ) );
        q.y *= Math.sign( q.y * ( m[8] - m[2] ) );
        q.z *= Math.sign( q.z * ( m[1] - m[4] ) );

        return q;
    }

}

exports.CustomMaths = customMaths;


