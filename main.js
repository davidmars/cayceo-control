
// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron');
const electron = require('electron');
const path = require('path');
const { autoUpdater } = require("electron-updater");
const {ipcMain} = require('electron');


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
const isDevelopment = process.mainModule.filename.indexOf('app.asar') === -1;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    show:false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true
    }
  });
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  });

  mainWindow.setMenuBarVisibility(false);
  if(isDevelopment){
    //déplace la fenetre sur 2 eme écran
    if(electron.screen.getAllDisplays().length>1){
      mainWindow.setPosition(electron.screen.getAllDisplays()[1].bounds.x,electron.screen.getAllDisplays()[1].bounds.y);
    }
    mainWindow.maximize();
    //mainWindow.setAlwaysOnTop(true, "main-menu");
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

let timeout=null;
function checkUpdate(delaySeconds=60){
  if(timeout){
    clearInterval(timeout);
  }
  timeout=setTimeout(function(){
    autoUpdater.checkForUpdatesAndNotify();
  },delaySeconds*1000);
}

// Fonction reçue de CMD.INSTALL_AND_REBOOT
ipcMain.on('INSTALL_AND_REBOOT', (event, arg) => {
  autoUpdater.quitAndInstall();
});
// Fonction reçue de de la sync web pour autoriser ou non l'installation de pre-releases
ipcMain.on('ALLOW_PRE_RELEASE', (event, allow) => {
  autoUpdater.allowPrerelease=allow;
});
//envoie un message à renderer
function sendStatusToWindow(text,channel="MAJ") {
  mainWindow.webContents.send(channel, text);
}

autoUpdater.on('checking-for-update', () => {
  //sendStatusToWindow('Recherche de nouvelle version');
  sendStatusToWindow('');
});
autoUpdater.on('update-available', (info) => {
  sendStatusToWindow(`Téléchargement de v.${info.version }`);
});
autoUpdater.on('update-not-available', (info) => {
  sendStatusToWindow("Le programme est à jour");
  setTimeout(function(){
    sendStatusToWindow("");
  },3*1000);
  checkUpdate();
});
autoUpdater.on('error', (err) => {
    sendStatusToWindow('Error ' + err);
    setTimeout(function(){
        sendStatusToWindow("");
    },5*1000);
  checkUpdate(120);
});
autoUpdater.on('download-progress', (progressObj) => {
  //let log_message = "Download speed: " + progressObj.bytesPerSecond;
  //log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  //log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  //sendStatusToWindow(`Mise à jour ${Math.round(Number(progressObj.percent))}%`);
  sendStatusToWindow("download-progress");
  sendStatusToWindow(`${Math.floor(Number(progressObj.percent))}%`);
});
autoUpdater.on('update-downloaded', (info) => {
  sendStatusToWindow(`Installer v.${info.version }`,"MAJ done");
});
// Quit when all windows are closed.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
});
app.on('activate', function () {
  if (mainWindow === null) createWindow()
});
app.on('ready', function(){
  createWindow();
  checkUpdate(20);
});




