import {getOption, setOption, optionNames} from "./lib/option.js";

const CASCADE = 0;
const SAME_AS_PARENT = 1;
const MAXIMIZE = 2;

let extensionEnabled = true;
let lockedWindows = new Set(); // Track locked window IDs
let perWindowModeEnabled = false;

getOption(optionNames.extensionEnabled, function(enabled) {
    extensionEnabled = enabled;
    updateIcon(enabled);
});

// Load per-window mode setting on startup
getOption(optionNames.perWindowMode, function(enabled) {
    perWindowModeEnabled = enabled;
    // If per-window mode is enabled on startup, set all windows to show disabled icon
    if (perWindowModeEnabled) {
        chrome.windows.getAll({}, function(windows) {
            windows.forEach(window => {
                updateWindowIcon(window.id);
            });
        });
    }
});

// Clean up closed windows
chrome.windows.onRemoved.addListener(function(windowId) {
    lockedWindows.delete(windowId);
});

// Handle new windows being created
chrome.windows.onCreated.addListener(function(window) {
    if (perWindowModeEnabled) {
        // New windows should always start unlocked in per-window mode
        // Update all tabs in the new window to show disabled icon
        setTimeout(() => {
            updateWindowIcon(window.id);
        }, 100);
    }
});

chrome.tabs.onCreated.addListener(function(tab){
    if (tab.index == 0){
        return;
    }

    let shouldCreateNewWindow = false;
    
    if (perWindowModeEnabled) {
        // Per-window mode: only act on locked windows
        shouldCreateNewWindow = lockedWindows.has(tab.windowId);
    } else {
        // Original global mode
        shouldCreateNewWindow = extensionEnabled;
    }
    
    if (!shouldCreateNewWindow) {
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
                chrome.windows.create(createData, function(newWindow) {
                    // Update icon for new window in per-window mode
                    if (perWindowModeEnabled && newWindow) {
                        updateWindowIcon(newWindow.id);
                    }
                });
                return;
            }
            // always maximize new window
            if (newWindowsPosition == MAXIMIZE){
                createData.state = "maximized";
                chrome.windows.create(createData, function(newWindow) {
                    // Update icon for new window in per-window mode
                    if (perWindowModeEnabled && newWindow) {
                        updateWindowIcon(newWindow.id);
                    }
                });
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
                    chrome.windows.create(createData, function(newWindow) {
                        // Update icon for new window in per-window mode
                        if (perWindowModeEnabled && newWindow) {
                            updateWindowIcon(newWindow.id);
                        }
                    });
                    return;
                }
                // create a new window with position setting.
                delete createData.state;
                createData.top = curWindow.top;
                createData.left = curWindow.left;
                chrome.windows.create(createData, function(newWindow) {
                    // Update icon for new window in per-window mode
                    if (perWindowModeEnabled && newWindow) {
                        updateWindowIcon(newWindow.id);
                    }
                });
            });
        });
    });
});

chrome.action.onClicked.addListener((tab) => {
    if (perWindowModeEnabled) {
        // Toggle lock state for current window
        const windowId = tab.windowId;
        if (lockedWindows.has(windowId)) {
            lockedWindows.delete(windowId);
        } else {
            lockedWindows.add(windowId);
        }
        updateWindowIcon(windowId);
    } else {
        // Original global toggle behavior
        extensionEnabled = !extensionEnabled;
        setOption(optionNames.extensionEnabled, extensionEnabled);
        updateIcon(extensionEnabled);
    }
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

function updateWindowIcon(windowId) {
    const isLocked = lockedWindows.has(windowId);
    
    // Get all tabs in the window to update icon for all
    chrome.tabs.query({windowId: windowId}, function(tabs) {
        const iconPath = isLocked ? {
            "24": "img/icon24.png",
            "32": "img/icon32.png",
            "48": "img/icon48.png",
        } : {
            "24": "img/icon-disabled24.png",
            "32": "img/icon-disabled32.png",
            "48": "img/icon-disabled48.png",
        };
        
        tabs.forEach(tab => {
            chrome.action.setIcon({
                path: iconPath,
                tabId: tab.id
            });
        });
    });
    
    const titleKey = isLocked ? "actionTitleLocked" : "actionTitleUnlocked";
    chrome.action.setTitle({
        title: chrome.i18n.getMessage(titleKey)
    });
}

// Update icons when switching windows
chrome.windows.onFocusChanged.addListener(function(windowId) {
    if (perWindowModeEnabled && windowId !== chrome.windows.WINDOW_ID_NONE) {
        updateWindowIcon(windowId);
    }
});

// Update icon when new tabs are created
chrome.tabs.onCreated.addListener(function(tab) {
    if (perWindowModeEnabled && tab.windowId) {
        // Delay icon update to ensure tab is fully initialized
        setTimeout(() => {
            // Set icon for new tab
            const isLocked = lockedWindows.has(tab.windowId);
            const iconPath = isLocked ? {
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
                tabId: tab.id
            });
        }, 100);
    }
});

// Handle tabs being attached to windows (moved between windows)
chrome.tabs.onAttached.addListener(function(tabId, attachInfo) {
    if (perWindowModeEnabled) {
        const windowId = attachInfo.newWindowId;
        const isLocked = lockedWindows.has(windowId);
        const iconPath = isLocked ? {
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
            tabId: tabId
        });
    }
});

// Listen for option changes to update perWindowModeEnabled
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'sync') {
        if (changes[optionNames.perWindowMode]) {
            perWindowModeEnabled = changes[optionNames.perWindowMode].newValue;
            // Clear locked windows and reset icons when mode changes
            if (!perWindowModeEnabled) {
                lockedWindows.clear();
                updateIcon(extensionEnabled);
            } else {
                // When enabling per-window mode, set all windows to unlocked (disabled icon)
                chrome.windows.getAll({}, function(windows) {
                    windows.forEach(window => {
                        updateWindowIcon(window.id);
                    });
                });
            }
        }
    }
});