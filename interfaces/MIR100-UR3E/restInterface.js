const fetch = require('node-fetch');

class restInterface {
    
    constructor(){
        
    }

    getData(url = '') {

        // Default options are marked with *

        return fetch(url, {
            method: "GET", // *GET, POST, PUT, DELETE, etc.
            mode: "cors", // no-cors, cors, *same-origin
            cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            credentials: "same-origin", // include, *same-origin, omit
            headers: {
                "Content-Type": "application/json"
            },
            redirect: "follow", // manual, *follow, error
            referrer: "no-referrer", // no-referrer, *client
        }).then(response => response.json(), response => {  // parses JSON response into native Javascript objects
            //console.log("ERROR: ", response);
            console.log('\x1b[36m%s\x1b[0m', "\nMIR: Couldn't GET data from REST API. Are you sure MIR robot is ON? ☹ ");
        });

    }

    postData(url = '', data = {}) {

        // Default options are marked with *
        return fetch(url, {
            method: "POST", // *GET, POST, PUT, DELETE, etc.
            mode: "cors", // no-cors, cors, *same-origin
            cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            credentials: "same-origin", // include, *same-origin, omit
            headers: {
                "Content-Type": "application/json"
            },
            redirect: "follow", // manual, *follow, error
            referrer: "no-referrer", // no-referrer, *client
            body: JSON.stringify(data), // body data type must match "Content-Type" header
        })
            .then(response => response.text())      // convert to plain text
    }
}

exports.RestInterface = restInterface;
