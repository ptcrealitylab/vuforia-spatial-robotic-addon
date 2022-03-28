/**
 * @desc this class parses a json config file with the configuration paramaters for the interface
 * @author Anna Fusté
 */
export class Config {

    load(fileName) {
        // your fetch stuff
        return fetch(fileName)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Error " + response.status);
                }
                return response.json();
            })
            .then(json => {
                this.config = json;
            })
            .catch(function () {
                this.dataError = true;
            })
    }

    hasLoaded() {
        return !!this.config;
    }
}