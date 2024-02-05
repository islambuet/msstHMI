const { app, BrowserWindow, Menu,ipcMain } = require('electron')
const ejse = require('ejs-electron');
const electronStore = require('electron-store');
const store=new electronStore();
const shutdown = require('electron-shutdown-command');
const net = require('net');
const log4js = require("log4js");
const logger = log4js.getLogger();
let d = new Date();
let loggerConfig={
    "appenders": {
        "everything": {
            "type": "file",
            //"filename":"logs/"+("0" +  d.getFullYear()+ "_" + ("0"+(d.getMonth()+1)).slice(-2) + "_" +("0" + d.getDate()).slice(-2)+"_" + ("0" + d.getHours()).slice(-2) + "_" + ("0" + d.getMinutes()).slice(-2)+ "_" + ("0" + d.getSeconds()).slice(-2))+'/logger.log',
            "filename":'logs/logger.log',
            "maxLogSize":"10M",
            "layout":{
                "type": "pattern",
                "pattern": "[%d] [%5.5p] %m"
            }
        }
    },
    "categories": {
        "default": { "appenders": [ "everything"], "level": "ALL" }
    }
}
log4js.configure(loggerConfig);
logger.info("HMI Started.");
let project_prefix='msst_';
function getHMISettings(){
    return {
        'java_server_ip_address' : store.get(project_prefix+'java_server_ip_address', ''),
        'java_server_port' : store.get(project_prefix+'java_server_port', ''),
        'cm_ip_address' :  store.get(project_prefix+'cm_ip_address', ''),
        'alarm_show_details' : store.get(project_prefix+'alarm_show_details', '0'),
        'motor_speed_unit' : store.get(project_prefix+'motor_speed_unit', 'm_s'),
        'general_layout_no' : store.get(project_prefix+'general_layout_no', '1'),
        'general_show_production' : store.get(project_prefix+'general_show_production', '1'),
        'statistics_show_pie' : store.get(project_prefix+'statistics_show_pie', '1')
    };
}
let unRegisteredUser={'id':0,'name':'Amazon Operator','role':0};
let generalPage={'file':'general','title':'General View','name':'general','members':'general general_conveyors'}
let settingsPage={'file':'settings','title':'Settings','name':'settings','members':''}
let basic_info={
    "connected":false,
    "currentUser":unRegisteredUser,
    'currentMenu':generalPage,
    'selectedMachineId':0,
    'pageParams':{},
    'systemConstants':{},
    'hmiSettings':getHMISettings()
}

let mainWindow;
function getMenu(){
    let menuItems=[];
    menuItems[0]={
        label: 'Help',
        submenu: [
            {
                label: 'Settings',
                click() {
                    changeMenu({'currentMenu':settingsPage})
                }
            },
            {
                label: 'Reload',
                click() {
                    mainWindow.webContents.reload();
                }
            }
        ]
    }
    if(basic_info['currentUser']['role']>0){
        menuItems[0]['submenu'][2]={
            label: 'Logout',
            click() {
                logoutUser();
            }
        }
    }
    if((!app.isPackaged) || (basic_info['currentUser']['role']==1))
    {
        menuItems[1]={
            label: 'Dev Tools',
            click() {
                mainWindow.webContents.openDevTools();
            }
        }
    }
    if((basic_info['currentUser']['role']>0)&&(basic_info['currentUser']['role']<4)){
        menuItems[2]={
            label: 'Shutdown',
            click() {
                shutdown.shutdown();
            }
        }
    }
    return menuItems;
}
let menu = Menu.buildFromTemplate(getMenu())
Menu.setApplicationMenu(menu)

const createWindow = () => {
    //creating new window
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        resizable: !app.isPackaged,
        minimizable:!app.isPackaged,
        movable:!app.isPackaged,
        closable:!app.isPackaged,
        x:app.isPackaged?0:1921,
        y:0,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            devTools: true,
        }
    });
    ejse.data('system_general_layout_no',basic_info['hmiSettings']['general_layout_no'])
    ejse.data('system_current_page_file',basic_info['currentMenu']['file'])
    mainWindow.loadFile('index.ejs').then(function (){ connectWithServer()});
};
function changeMenu(params){
    console.log(params)
    for(let key in params){
        basic_info[key]=params[key];
    }
    ejse.data('system_current_page_file',basic_info['currentMenu']['file'])
    mainWindow.loadFile('index.ejs').then(function (){});
}
function logoutUser() {
    mainWindow.closable=false;
    //TODO start
    // let params={
    //     'machine_id':basic_info['selectedMachineId'],
    //     'message_id':120,
    //     'mode':0
    // };
    // sendRequestToServer({"request" :'forward_ape_message','params':params,"requestData":[]});
    //TODO end
    basic_info['currentUser']=unRegisteredUser;
    menu = Menu.buildFromTemplate(getMenu());
    Menu.setApplicationMenu(menu);
    changeMenu({'currentMenu':settingsPage})
}
ipcMain.on("sendRequestToIpcMain", function(e, responseName,params={}) {
    if(responseName=='basic_info'){
        mainWindow.webContents.send(responseName,basic_info);
    }
    else if(responseName=='changeMenu'){
        changeMenu(params)
    }
    else if(responseName=='logout'){
        logoutUser();
    }
    else if(responseName=='terminal_command'){
        let command=params['command'];
        switch (command){
            case '#cg%':
                app.emit('window-all-closed');
                break;
            case '#sd%':
                shutdown.shutdown();
                break;
            default:
                console.log(command)
                logger.error("Invalid terminal command: "+command)
        }
    }
    else if(responseName=='saveSettings'){
        for(let key in params){
            store.set(project_prefix+key, params[key]);
        }
        if(params['general_layout_no']!=undefined){
            ejse.data('system_general_layout_no',params['general_layout_no'])
        }
        basic_info['hmiSettings']=getHMISettings();
    }

})
let clientSocket = new net.Socket();
function connectWithServer () {

    let host=basic_info['hmiSettings']['java_server_ip_address'];
    let port=basic_info['hmiSettings']['java_server_port'];
    console.log(new Date().toString(),":Connecting with Host="+host+" Port="+port);
    //logger.info("Connecting with Host="+host+" Port="+port);
    if(!basic_info['connected'] && host && port && port>=0 && port<65536){
        //The Socket.IO client will automatically try to reconnect after a small delay.
        clientSocket.connect(port, host);
    }
    else{//for incomplete settings
        setTimeout(connectWithServer, 2000);
    }
}
function connectClientSocketHandler() {
    logger.info("Connected with JavaServer.");
    basic_info['connected']=true;
    //immediate sending request does not receive by server
    setTimeout(function (){
        sendRequestToServer({"request" :'getSystemConstants','params':{},"requestData":[]});
    }, 100);

}
function closeClientSocketHandler () {
    if(basic_info['connected']){
        logger.error("DisConnected with JavaServer.");
        changeMenu({'connected':false,'selectedMachineId':0})//or only send disconnect event
    }
    setTimeout(connectWithServer, 2000);
}
function sendRequestToServer(requestJson){
    if(basic_info['connected']){
        try{
            clientSocket.write('<begin>'+JSON.stringify(requestJson)+'</begin>');
        }
        catch(ex) {
            logger.error("Data Sending Error."+requestJson.toString())
            logger.error(ex)
        }
    }
    else{
        logger.error("Not Connected with Java server."+JSON.stringify(requestJson))
    }
}

let buffer = "";
const startTag="<begin>";
const endTag="</begin>";
function dataReceivedClientSocketHandler(data) {
    buffer += data.toString(); // Add string on the end of the variable 'chunk'
    let startPos=buffer.indexOf(startTag);
    let endPos=buffer.indexOf(endTag);
    while (startPos>-1 && endPos>-1){
        if(startPos>0){
            logger.warn("[START_POS_ERROR] Message did not started with begin.");
            logger.warn("[MESSAGE]"+buffer);
        }
        if(startPos>endPos){
            logger.warn("[END_POS_ERROR] End tag found before start tag.");
            logger.warn("[MESSAGE]"+buffer);
            buffer=buffer.substring(startPos);
        }
        else{
            let messageString=buffer.substring(startPos+startTag.length,endPos);
            try {
                //let jo = JSON.parse(messageString.replace(/\}\s*\{/g, '},{') )
                let jo = JSON.parse( messageString.replace(/\}\s*\{/g, '},{'))
                processReceivedJsonObjects(jo);
            }
            catch (er) {
                console.log("Failed to convert Json");
                logger.error("[INVALID_DATA] "+messageString)
            }
            buffer=buffer.substring(endPos+endTag.length);
        }
        startPos=buffer.indexOf(startTag);
        endPos=buffer.indexOf(endTag);
    }
}
function processReceivedJsonObjects(jsonObject) {
    //TODO
    //let request = jsonObject['request'];
    console.log(jsonObject)
    // if(request=='basic_info'){
    //     for(let key in jsonObject['data']){
    //         basic_info[key]=jsonObject['data'][key];
    //     }
    //     for(let key in basic_info['machines']){
    //         if(basic_info['hmiSettings']['cm_ip_address']==basic_info['machines'][key]['maintenance_gui_ip']){
    //             basic_info['selectedMachineId']=basic_info['machines'][key]['machine_id'];
    //         }
    //     }
    //     let doors={}
    //     for(let key in basic_info['inputs']){
    //         let input=basic_info['inputs'][key];
    //         if(input['device_type']==6){
    //             if(!doors[input['device_number']]){
    //                 doors[input['device_number']]={}
    //             }
    //             doors[input['device_number']][input['device_fct']]=input;
    //         }
    //     }
    //     basic_info['doors']=doors;
    //     changeMenu({})
    // }
    // else if(request=='getLoginUser'){
    //     if(jsonObject['data']['status']){
    //         let currentUser=jsonObject['data']['user'];
    //         basic_info['currentUser']=currentUser;
    //         menu = Menu.buildFromTemplate(getMenu());
    //         Menu.setApplicationMenu(menu);
    //         changeMenu({'currentMenu':settingsPage})
    //     }
    //     mainWindow.webContents.send(request,jsonObject);
    // }
    // else{
    //     mainWindow.webContents.send(request,jsonObject);
    // }
}
clientSocket.on('connect', connectClientSocketHandler);
clientSocket.on('data',    dataReceivedClientSocketHandler);
clientSocket.on('end',     ()=>{console.log('end')});
clientSocket.on('timeout', ()=>{console.log('timeout')});
clientSocket.on('drain',   ()=>{console.log('drain')});
clientSocket.on('error',   ()=>{console.log('error')});
clientSocket.on('close',   closeClientSocketHandler);

ipcMain.on("sendRequestToServer", function(e, responseName,params,requestData=[]) {
    params['machine_id']=basic_info['selectedMachineId']//including machine_id
    sendRequestToServer({"request" :responseName,'params':params,"requestData":requestData});
})
app.whenReady().then(() => {
    createWindow()
})
app.on('window-all-closed', () => {
    let params={
        'machine_id':basic_info['selectedMachineId'],
        'message_id':120,
        'mode':0
    };
    sendRequestToServer({"request" :'forward_ape_message','params':params,"requestData":[]});
    app.exit()
})