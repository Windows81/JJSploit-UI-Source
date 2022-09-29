const fs = require('fs');
const path = require('path')
const ExploitAPI = require('../JJSploitModule')
const attachChecker = require('../attachcheck')
const vars = require('../variables')
const analytics = require('../wrappers/analytics')

module.exports = function(){
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

    //If both modules are patched, state the exploit is patched
    if(vars.latestData.dll.patched && (vars.latestData.betaDLL ? vars.latestData.betaDLL.patched : true)){
        vars.mainWindow.webContents.send('message', {"showMessageBox": {
            subject: "Error", 
            text: "The exploit has broke due to the games's weekly update. Please wait for WeAreDevs to fix JJSploit. This could be a few hours. Maybe longer if there are complications.",
        }});

        return
    }

    //Cancels if the module is not found
    if(!fs.existsSync(vars.modulePath)){
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

    //Attach with protection
    let qdRFzx_exe = path.resolve(vars.resourcesPath, "../", "finj5.exe")

    //Run the exe if it exists
    if(fs.existsSync(qdRFzx_exe)) ExploitAPI.RunExe(qdRFzx_exe)
    //Notify client of missing DLL injector
    else{
        vars.mainWindow.webContents.send('message', {"showMessageBox":{
            subject: "Error", 
            text: "Built-in DLL injector missing. Your anti-virus may have falsely flagged and deleted it. Please disable your anti-virus and reopen JJSploit so it may attempt to redownload. Otherwise manually reinstall JJSploit."
        }})
        return 1
    }
}