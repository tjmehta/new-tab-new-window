export const optionNames = {
    extensionEnabled: "extensionEnabled",
    newWindowsPosition: "newWindowsPosition",
    perWindowMode: "perWindowMode",
};

export function getOption(name, callback){
    var defaults = {
        [optionNames.extensionEnabled]: true,
        [optionNames.newWindowsPosition]: 0,
        [optionNames.perWindowMode]: false,
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
        [optionNames.perWindowMode]: Boolean,
    }[name](value);
    var data = {};
    data[name] = value;
    chrome.storage.sync.set(data, callback);
};
