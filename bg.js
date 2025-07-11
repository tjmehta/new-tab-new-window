import {getOption, setOption, optionNames} from "./lib/option.js";

const CASCADE = 0;
const SAME_AS_PARENT = 1;
const MAXIMIZE = 2;

let extensionEnabled = true;

getOption(optionNames.extensionEnabled, function(enabled) {
    extensionEnabled = enabled;
    updateIcon(enabled);
});

chrome.tabs.onCreated.addListener(function(tab){
    if (tab.index == 0){
        return;
    }

    if (!extensionEnabled) {
        return;
    }

    chrome.windows.get(tab.windowId, function(curWindow){
        getOption("newWindowsPosition", function(newWindowsPosition){
            var createData = {
                tabId: tab.id,
                incognito: tab.incognito,
                state: curWindow.state
            };
            // if the default window position was used, simply create
            // a new window and done.
            if (newWindowsPosition == CASCADE){
                chrome.windows.create(createData);
                return;
            }
            // always maximize new window
            if (newWindowsPosition == MAXIMIZE){
                createData.state = "maximized";
                chrome.windows.create(createData);
                return;
            }
            // new window need to be placed to where the current window is.
            chrome.runtime.getPlatformInfo(function(platformInfo){
                // window states that cannot be
                var nonPositionalStates = {
                    minimized: true,
                    maximized: true,
                    fullscreen: true
                };
                // ignores maximized state on OS X
                if (platformInfo.os == "mac"){
                    nonPositionalStates.maximized = false;
                }
                // just create a new window and done if the current
                // window is in special state.
                if (nonPositionalStates[curWindow.state]){
                    chrome.windows.create(createData);
                    return;
                }
                // create a new window with position setting.
                delete createData.state;
                createData.top = curWindow.top;
                createData.left = curWindow.left;
                chrome.windows.create(createData);
            });
        });
    });
});

chrome.action.onClicked.addListener(() => {
    extensionEnabled = !extensionEnabled;
    setOption(optionNames.extensionEnabled, extensionEnabled);
    updateIcon(extensionEnabled);
});

function updateIcon(enabled) {
    const iconPath = enabled ? {
        "24": "img/icon24.png",
        "32": "img/icon32.png",
        "48": "img/icon48.png",
    } : {
        "24": "img/icon-disabled24.png",
        "32": "img/icon-disabled32.png",
        "48": "img/icon-disabled48.png",
    };
    chrome.action.setIcon({
        path: iconPath,
    });

    const title = chrome.i18n.getMessage(enabled ? "actionTitle" : "actionTitleDisabled");
    chrome.action.setTitle({
        title: title,
    });
}