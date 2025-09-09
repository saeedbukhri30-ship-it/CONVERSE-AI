// @ts-nocheck

// IMPORTANT: Replace with your actual Google Cloud Project credentials.
// It is strongly recommended to use environment variables for this.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_API_KEY = process.env.API_KEY!;

// The scope for Google Drive API.
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient;
let gapiInited = false;
let gisInited = false;

/**
 * Callback after the GAPI client library has loaded.
 */
async function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

/**
 * Callback after the GIS client library has loaded.
 */
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
}

/**
 * Initializes the GAPI client with the API key and discovery document.
 */
async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: GOOGLE_API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    });
    gapiInited = true;
}

// Load GAPI and GIS scripts
const gapiScript = document.createElement('script');
gapiScript.src = 'https://apis.google.com/js/api.js';
gapiScript.async = true;
gapiScript.defer = true;
gapiScript.onload = gapiLoaded;
document.body.appendChild(gapiScript);

// The gis script is already loaded from index.html, we just need to initialize
if (window.google && window.google.accounts) {
    gisLoaded();
}


/**
 * Initializes the Google Client and checks the initial sign-in state.
 * @param {function(boolean): void} updateSigninStatus - Callback to update the sign-in status in the UI.
 */
export function initGoogleClient(updateSigninStatus) {
    // A simple polling mechanism to wait for both libraries to be initialized
    const checkInit = setInterval(() => {
        if (gapiInited && gisInited) {
            clearInterval(checkInit);
            // Initial check of the user's sign-in status
            const token = gapi.client.getToken();
            updateSigninStatus(!!token);
        }
    }, 100);
}


/**
 *  Sign in the user with Google.
 */
export function signInToGoogle() {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error("Google Token Client not initialized."));
            return;
        }

        tokenClient.callback = (resp) => {
            if (resp.error !== undefined) {
                reject(resp);
            }
            resolve(resp);
        };
        
        // Conditionally request consent if scopes not granted
        if (gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    });
}

/**
 *  Sign out the user from Google.
 */
export function signOutFromGoogle() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken('');
        });
    }
}


/**
 * Uploads a file to Google Drive.
 * @param {string} fileName The name of the file.
 * @param {string} content The content of the file.
 */
export async function uploadToDrive(fileName: string, content: string) {
    if (!gapi.client.getToken()) {
        throw new Error("User not signed in.");
    }

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const metadata = {
        'name': fileName,
        'mimeType': 'application/json'
    };

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        content +
        close_delim;

    const request = gapi.client.request({
        'path': '/upload/drive/v3/files',
        'method': 'POST',
        'params': { 'uploadType': 'multipart' },
        'headers': {
            'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody
    });
    
    return new Promise((resolve, reject) => {
        request.execute(function (file, rawResponse) {
            if (rawResponse && JSON.parse(rawResponse).gapiRequest.data.error) {
                reject(JSON.parse(rawResponse).gapiRequest.data.error);
            } else {
                resolve(file);
            }
        });
    });
}

/**
 * Creates a Google Doc with the given content.
 * @param {string} fileName The name of the file.
 * @param {string} htmlContent The HTML content of the file.
 * @returns {Promise<string>} A promise that resolves with the webViewLink of the created document.
 */
export async function createDocInDrive(fileName: string, htmlContent: string): Promise<string> {
    if (!gapi.client.getToken()) {
        throw new Error("User not signed in.");
    }

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const metadata = {
        'name': fileName,
        'mimeType': 'application/vnd.google-apps.document'
    };

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
        htmlContent +
        close_delim;

    const request = gapi.client.request({
        'path': '/upload/drive/v3/files',
        'method': 'POST',
        'params': { 'uploadType': 'multipart' },
        'headers': {
            'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody
    });
    
    return new Promise((resolve, reject) => {
        request.execute(function (file, rawResponse) {
            if (rawResponse && JSON.parse(rawResponse).gapiRequest.data.error) {
                reject(JSON.parse(rawResponse).gapiRequest.data.error);
            } else if (file && file.webViewLink) {
                resolve(file.webViewLink);
            } else {
                reject(new Error("Failed to create document or get link."));
            }
        });
    });
}