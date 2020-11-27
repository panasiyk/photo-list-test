import axios from 'axios';

export default class Helper {
    static intRandom (minimum = 5, maximum = 10) {
        return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
    }

    static async get (url) {
        const apiUrl = (params) => `http://jsonplaceholder.typicode.com/${params}`;
        try {
            return (await axios.get(apiUrl(url))).data;
        } catch ({
            status, message, code, ...other
        }) {
            throw Error(message);
        }
    }

    static localStorage () {
        return {
            set: (key, data) => window.localStorage.setItem(key, JSON.stringify(data)),
            get: (key) => JSON.parse(window.localStorage.getItem(key)),
        };
    }
}

Array.prototype.sortByAlphabetAndCategory = function sortByAlphabetAndCategory (name) {
    return this.sort((first, second) => {
        if (first.type === 'CATEGORY' || second.type === 'CATEGORY') return 0;
        if (first[name] < second[name]) return -1;
        if (first[name] > second[name]) return 1;

        return 0;
    });
};
