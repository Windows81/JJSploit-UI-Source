const fs = require('fs');
const ExploitAPI = require('../JJSploitModule');
const attachChecker = require('../attachcheck')
const vars = require('../variables');
const analytics = require('../wrappers/analytics')

module.exports = function(moduleFileName){
    //ExploitAPI.LaunchExploit(); //Not doing this because its extremely limited
    let modulePath = vars.resourcesPath + '\\' + moduleFileName

    //Cancels injection if module is already injected
    if(attachChecker.attached === true){
        //DLL is already noted as injected

        vars.mainWindow.webContents.send('message', {"showMessageBox":{
            subject: "Error", 
            text: "DLL already injected. You may use the exploit"
        }});

        analytics.trackEvent("Injector", "Re-inject attempted")

        return
    }

    //Cancels if the module is not found
    if(!FileExists(modulePath)){
        //exploit-main.dll not found

        vars.mainWindow.webContents.send('message', {"showMessageBox":{
            subject: "Error", 
            text: "Could not find DLL! Please reopen JJSploit and wait a few seconds for it to automatically download. Disable your anti-virus if its deleting the dll"
        }});
        
        if(!vars.latestData){ //Would only be "" if update check failed
            vars.mainWindow.webContents.send('message', {"showMessageBox":{
                subject: "Error", 
                text: "The dll is missing, but JJSploit failed to look for the latest version. Make sure nothing is blocking JJSploit's internet connection"
            }});
        }

        analytics.trackEvent("Injector", "Failed attempt with missing module")

        return
    }

    if(!vars.latestData){ 
        // Update check failed, so inject any already downloaded dll
        // Would only be "" if update check failed
        vars.mainWindow.webContents.send('message', {"showMessageBox": {
            subject: "Error", 
            text: "Warning: Could not check for a dll update, so we're injecting the latest version installed. Using an old version may be broken..."
        }});
    }

    var pid = ExploitAPI.GetProcessIDByName("RobloxPlayerBeta.exe")
    if(!pid){
        vars.mainWindow.webContents.send('message', {"showMessageBox":{
            subject: "Error", 
            text: "JJSploit did not find Roblox. Make sure a game is opened! A game must have been launched from the Roblox website. The Windows Store version is not supported."
        }});

        analytics.trackEvent("Injector", "Failed to find Roblox")

        return
    }

    var injectResult = ExploitAPI.InjectDLL(modulePath, pid);
    if(injectResult != true){
        vars.mainWindow.webContents.send('message', {"showMessageBox":{
            subject: "Error", 
            text: "Injection failed for an unknown reason."
        }});

        analytics.trackEvent("Injector", "Failed injection")

        return
    } 
}

//Checks if a file path exists
function FileExists(path){
	if (fs.existsSync(path)) {
		return true;
	}
	return false;
}