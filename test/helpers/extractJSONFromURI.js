function extractJSONFromURI(uri) {
    const encodedJSON = uri.substr('data:application/json;base64,'.length)
    const decodedJSON = Buffer.from(encodedJSON, 'base64').toString('utf8')
    return JSON.parse(decodedJSON)
}

module.exports = {
    extractJSONFromURI,
};