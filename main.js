
// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron');
const electron = require('electron');
const path = require('path')
const { autoUpdater } = require("electron-updater");



// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
const isDevelopment = process.mainModule.filename.indexOf('app.asar') === -1;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 630,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true
    }
  });
  mainWindow.setMenuBarVisibility(false);
  if(isDevelopment){
    //déplace la fenetre sur 2 eme écran
    if(electron.screen.getAllDisplays().length>1){
      mainWindow.setPosition(electron.screen.getAllDisplays()[1].bounds.x,0);
    }
    mainWindow.setAlwaysOnTop(true, "main-menu");
    mainWindow.webContents.openDevTools();
  }else{
    mainWindow.setFullScreen(true);
  }


  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })


}
const {ipcMain} = require('electron');
// Fonction reçue de CMD.INSTALL_AND_REBOOT
ipcMain.on('INSTALL_AND_REBOOT', (event, arg) => {
  autoUpdater.quitAndInstall();
});
//envoie un message à renderer
function sendStatusToWindow(text,channel="MAJ") {
  mainWindow.webContents.send(channel, text);
}

autoUpdater.on('checking-for-update', () => {
  sendStatusToWindow('Mise à jour ???');
});
autoUpdater.on('update-available', (info) => {
  sendStatusToWindow('Va télécharger une mise à jour');
  //bloque les mises à jour
  updateFound=true;
  //les débloquera dans 10 minutes
  updateTimeoutUnblock=setTimeout(function(){
    updateFound=false;
  },updateIntervalInstallingMinutes*60*1000)
});
autoUpdater.on('update-not-available', (info) => {
  sendStatusToWindow('');
});
autoUpdater.on('error', (err) => {
  sendStatusToWindow('Error ' + err);
});
autoUpdater.on('download-progress', (progressObj) => {
  //let log_message = "Download speed: " + progressObj.bytesPerSecond;
  //log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  //log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  sendStatusToWindow(`Mise à jour ${Math.round(progressObj.percent)}%`);
});
autoUpdater.on('update-downloaded', (info) => {
  sendStatusToWindow('Installer la mise à jour',"MAJ done");
  updateLoop(true)
});

//temps entre deux test de nouvelle version
let updateIntervalMinutes=1;
//temps donné pour une installation
let updateIntervalInstallingMinutes=30;
let updateTimeout=null;
let updateTimeoutUnblock=null;
let updateFound=false;
let updateLoop=function(stop=false){
  if(updateTimeout) {
    clearTimeout(updateTimeout);
  }
  if(stop){
    if(updateTimeoutUnblock) {
      clearTimeout(updateTimeoutUnblock);
    }
    return;
  }
  if(!updateFound){
    sendStatusToWindow('Mise à jour ?');
    autoUpdater.checkForUpdatesAndNotify();
  }else{
    sendStatusToWindow('Va télécharger une mise à jour...');
  }
  updateTimeout=setTimeout(function(){
    updateLoop();
  },updateIntervalMinutes*60*1000);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function(){
  createWindow();
  setInterval(function(){
    updateLoop();
  },5*1000);

});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.




