import stringify from 'json-stringify-safe';

function getObjectSizeInBytes(obj) {
    // Convert object to JSON string
    const jsonString = stringify(obj);

    // Create a Blob from the JSON string and get its size
    const blob = new Blob([jsonString], { type: 'application/json' });
    return blob.size;
}

export default getObjectSizeInBytes;
