const vars = require('./variables')
const SaveData = require('./settings')
const ExploitAPI = require('./JJSploitModule')

var firstChecker = true

module.exports = {
    attached: false,
    StartChecking: function(){
        //Ensures that this function only initiates the checker once
        if(firstChecker){
            this.CheckAttached()
            setInterval(this.CheckAttached, 2000)
            firstChecker=false
        }
    },
    CheckAttached: function(){
        //Grabs the latest mainWindow every time this func is called
        var mainWindow = vars.mainWindow

        if(ExploitAPI.NamedPipeExist("\\\\.\\pipe\\WeAreDevsPublicAPI_CMD", "--ping")){
            //Ping sent, so the exploit is injected!
            if(module.exports.attached === false){
                //The DLL mustve been injected just now
                //Move client on to the key or exploit

                var saveData = SaveData()

                /* Key system - Removed since I rely on wearedevs.net. Keeping as comment incase I want it back in the future
                //Skip to exploit interface if key already completed in the past 7 days
                var lastKeyCompletion = new Date(saveData.lastKeyCompletion)
                var expireDate = lastKeyCompletion.setDate(lastKeyCompletion.getDate()+7);
                if(new Date() < expireDate){
                    //No need to send keyaccess page again since its been completed in the past 7 days
                    mainWindow.webContents.send('message', {changePage: "General"});
                } 
                else {
                    //Key access expired/never was completed, so reset and request new key access completion
                    SaveData({lastKeyCompletion: undefined})
                    mainWindow.webContents.send('message', {changePage:"KeyAccess"});
                }*/

                mainWindow.webContents.send('message', {changePage: "General"});

                //Notes that JJSploit sees that the dll is injected
                module.exports.attached=true
            }
        }
        else{
            //JJSploit couldn't see that JJSploit is injected
            if(module.exports.attached === true){
                //Roblox mustve exited just now
                module.exports.attached = false
                mainWindow.webContents.send('message', {changePage: "Attach"});
            }
        }
    }
}