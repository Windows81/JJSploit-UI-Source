const axios = require('axios');
const download = require('download');
const fs = require('fs');
const path = require('path');
const isDev = require('electron-is-dev');

const ExploitAPI = require('./JJSploitModule');
const SaveData = require('./settings');
var vars = require('./variables');
const analytics = require('./wrappers/analytics')

var firstCheck = true

async function CheckUpdates(){
    var mainWindow = vars.mainWindow

    var res = await axios.get('https://cdn.wearedevs.net/software/jjsploit/latestdata.txt')
    .then(res => {
        if(typeof res.data !== "object") throw new Error("JSON failed to parse")
        else return res.data
    })
    //Fallback to reading the Github backup if the site is down
    .catch(async e => {
        console.warn("Using fallback update checker", e)
        return await axios.get('https://raw.githubusercontent.com/WeAreDevs-Official/backups/master/latestdata.txt')
        .then(res => {
            if(typeof res.data === "object") return res.data
        })
        .catch(e => {})
    })

    if(!res) {
        //Prevents the error from being displayed several times
        if(firstCheck === true){
            mainWindow.webContents.send('message', {"showMessageBox": {
                subject: "Error", 
                text: "There was an error when checking for updates... Make sure JJSploit can connect to the internet by disabling any firewalls"
            }});
            firstCheck = false
        }

        //Retries the udpdate check
        setTimeout(CheckUpdates, 5000)

        return
    }

    vars.latestData = res
    var latestData = vars.latestData

    var serverMessage = latestData.ui.servermessage || "No announcements..."
    mainWindow.webContents.send('message', {"serverMessage": serverMessage});

    if(SaveData().ui.version < latestData.ui.version){
        // UI update is available. Force update required

        //Disable always on top so it doesnt hide the updater
        mainWindow.setAlwaysOnTop(false);
        mainWindow.webContents.send('message', {topMost: false});

        //Prevents from re-downloading the same UI update
        if(
            (SaveData().DownloadedUpdateVersion == latestData.ui.version) &&
            FileExists(process.resourcesPath + '\\jjsploit_installer.exe')
        ){
            //Already downloaded the latest UI update, re-launch it. The client might've exited the installer before it finished
            ExploitAPI.RunExe(process.resourcesPath + '\\jjsploit_installer.exe')
            mainWindow.webContents.send('message', {"showMessageBox": {
                subject: "Error", 
                text:"Update downloaded. Please look for the installation window. Otherwise re-download from wearedevs.net if theres any issue."
            }});
        }
        //Download a new copy of the latest installer
        else{
            //Clear the record just in case
            SaveData({DownloadedUpdateVersion: undefined})
            //Download latest UI
            DownloadUIInstaller()
        }
    }
    else{ 
        //No UI update available, re-download exploit-main.dll

        //Downloads the module if it is not patched and if it doesn't exist or if there is a newer version
        let moduleName = "exploit-main.dll"
        let modulePath = isDev ? path.resolve(__dirname, "../resources", moduleName) : path.resolve(process.resourcesPath, moduleName)
        if(!latestData.dll.patched && (!FileExists(modulePath) || (SaveData().downloadedModuleVersion||0) < latestData.dll.version)){
            isDev && console.log("Downloading module")
            await DownloadModule(latestData.dll.downloadurl, moduleName);

            //Record that an update was downloaded so it isnt redownloaded the next time JJSploit is opened
            SaveData({downloadedModuleVersion: latestData.dll.version})
        }

        //Downloads the beta module if it is not patched and if it doesn't exist or if there is a newer version
        let betaModuleName = "beta-exploit-main.dll"
        let betaModulePath = isDev ? path.resolve(__dirname, "../resources", betaModuleName) : path.resolve(process.resourcesPath, betaModuleName)
        if(latestData.betaDLL){
            mainWindow.webContents.send('message', {"betaModuleFound": true});

            if(!latestData.betaDLL.patched && (!FileExists(betaModulePath) || (SaveData().downloadedBetaModuleVersion||0) < latestData.betaDLL.version)){
                isDev && console.log("Downloading beta module")
                await DownloadModule(latestData.betaDLL.downloadurl, betaModuleName);

                //Record that an update was downloaded so it isnt redownloaded the next time JJSploit is opened
                SaveData({downloadedBetaModuleVersion: latestData.betaDLL.version})
            }
        }

        //If both modules are patched, state the exploit is patched
        if(latestData.dll.patched && latestData.betaDLL && latestData.betaDLL.patched){
            isDev && console.log("Notify patched")
            mainWindow.webContents.send('message', {"showMessageBox": {
                subject: "Error", 
                text:"The exploit has broke due to Roblox's weekly update. Please wait for WeAreDevs to fix JJSploit"
            }});
        }
    }
}

module.exports = CheckUpdates

//download exploit-main
async function DownloadModule(downloadURL, fileName){
    var mainWindow = vars.mainWindow

    //Deletes if it already exists
    let modulePath = isDev ? path.resolve(__dirname, "../resources", fileName) : path.resolve(process.resourcesPath, fileName)
    if(FileExists(modulePath)){
        var isDeleted = await new Promise((resolve, reject)=>{
            fs.unlink(modulePath, (err) => {
                if (err) reject(err);
                resolve(true)
            });
        })
        .catch(err => {
            //Probably failed to delete. If thats the case, then the module is likely still in use by Roblox.
            console.error("Failed to delete - ", err)
        })

        if(isDeleted !== true){
            //Don't bother downloading the latest module if the current version can't be deleted
            return
        }
    }

    await download(downloadURL)
    .on('downloadProgress', progress => {
        var percent = (progress.transferred / progress.total) * 100
        percent = Math.round(percent)
        mainWindow.webContents.send('message', {"showMessageBox": {
            subject: "Downloading Module", 
            text: `Download progress: ${percent}%`
        }});
    })
    .on('error', (error, body, response) => {
        mainWindow.webContents.send('message', {"showMessageBox": {
            subject: "Module Download Error", 
            text: `Failed to download the latest exploit module for the latest version of Roblox. Make sure any anti-virus/firewall is disabled and restart JJSploit.`
        }});
        console.error(error)
        console.error(body)
        console.error(response)

        analytics.trackEvent("Module Update", "Failed")
    })
    .then(data => {
        //Moves file to the resources folder
        fs.writeFileSync(vars.resourcesPath + '/' + fileName, data);
        //Gets rid of the download progression bar
        mainWindow.webContents.send('message', "hideMessageBox");
    });
}

//Download jjsploit ui installer
async function DownloadUIInstaller(){
    var mainWindow = vars.mainWindow

    var installerFilePath = path.join(vars.resourcesPath, "jjsploit_installer.exe")

    //Deletes if it already exists
    if(FileExists(installerFilePath)){
        fs.unlinkSync(installerFilePath);
    }

	await download(vars.latestData.ui.downloadurl)
    .on('downloadProgress', progress => {
        var percent = (progress.transferred / progress.total) * 100
        percent = Math.round(percent)
        mainWindow.webContents.send('message', {"showMessageBox": {
            subject: "Downloading JJSploit update", 
            text: `Download progress: ${percent}%. Update info: ${vars.latestData.ui.updateinfo}`
        }});
    })
    .on('error', (error, body, response) => {
        mainWindow.webContents.send('message', {"showMessageBox": {
            subject: "JJSploit Update Error", 
            text: `Failed to automatically download the JJSploit update. Make sure any anti-virus/firewall is disabled and restart JJSploit. Otherwise manually update by redownloading JJSploit from https://wearedevs.net.`
        }});
        console.error(error)
        console.error(body)
        console.error(response)

        analytics.trackEvent("UI Update", "Failed")
    })
    .then(data => {
        fs.writeFileSync(installerFilePath, data);

        analytics.trackEvent("UI Update", "Completed")
    });

    //Record that an update was downloaded so it isnt redownloaded the next time JJSploit is opened
    SaveData({DownloadedUpdateVersion: vars.latestData.ui.version})

    //I think it would be unsafe to immediate run the exe after downloading, so I added a delay
    setTimeout(function(){
        ExploitAPI.RunExe(installerFilePath)

        mainWindow.webContents.send('message', {"showMessageBox": {
            subject: "Downloaded JJSploit Update", 
            text: "Please look for the installation window. Otherwise re-download from wearedevs.net if theres any issue."
        }});
    }, 2000);
}

//Checks if a file path exists
function FileExists(path){
	if (fs.existsSync(path)) {
		return true;
	}
	return false;
}