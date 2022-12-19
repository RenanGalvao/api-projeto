/*
* Sample File
*/

import http from 'k6/http';
import { sleep } from 'k6';

const API_URL = 'http://api.localhost';

export let options = {
    insecureSkipTLSVerify: true,
    noConnectionReuse: true,
    stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
    ],
    hosts: {
        'api.localhost': '127.0.0.1'
    }
};

export default function () {
    http.get(`${API_URL}`);
    sleep(1);
}