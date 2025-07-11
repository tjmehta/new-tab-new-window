export const optionNames = {
    extensionEnabled: "extensionEnabled",
    newWindowsPosition: "newWindowsPosition",
};

export function getOption(name, callback){
    var defaults = {
        [optionNames.extensionEnabled]: true,
        [optionNames.newWindowsPosition]: 0,
    };
    var query = {};
    query[name] = defaults[name];
    chrome.storage.sync.get(query, function(options){
        callback(options[name]);
    });
};

export function setOption(name, value, callback){
    value = {
        [optionNames.extensionEnabled]: Boolean,
        [optionNames.newWindowsPosition]: Number,
    }[name](value);
    var data = {};
    data[name] = value;
    chrome.storage.sync.set(data, callback);
};
