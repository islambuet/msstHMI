/**
 * Created by Shaiful Islam on 2023-06-07.
 */
// ---------------

const {ipcRenderer} = require('electron');
let basic_info={};

function startClock(){
    let now=new Date();
    $("#system_display_date").text((now.getMonth()+1).toString().padStart(2,"0")+"/"+now.getDate().toString().padStart(2,"0")+"/"+now.getFullYear())
    $("#system_display_time").text(now.getHours().toString().padStart(2,"0")+":"+now.getMinutes().toString().padStart(2,"0")+":"+now.getSeconds().toString().padStart(2,"0"))
}
function getPaginationHtml(totalRecords,per_page,page){
    let page_total=(per_page>0)?Math.ceil(totalRecords/per_page):1;
    let html='<div class="row"><div class="col-12"><ul class="pagination float-right"><li class="page-item'+(page<2?' disabled':'')+'"  data-page="-"><button class="page-link">Previous</button></li>';
    for(let i=1;i<=page_total;i++){
        html+='<li class="page-item'+(page==i?' active':'')+'" data-page="'+i+'"><button class="page-link">'+i+'</button></li>';
        if(((i%35)==0)&&((i+4)<page_total)){
            html+='<li class="page-item'+(page>=page_total?' disabled':'')+'"  data-page="+"><button class="page-link">Next</button></li></ul></div></div>';
            html+='<div class="row"><div class="col-12"><ul class="pagination float-right"><li class="page-item'+(page<2?' disabled':'')+'"  data-page="-"><button class="page-link">Previous</button></li>';
        }
    }
    html+='<li class="page-item'+(page>=page_total?' disabled':'')+'"  data-page="+"><button class="page-link">Next</button></li></ul></div></div>';
    return html;
}
function secondsToDhms(seconds) {
    seconds = Number(seconds);
    let d = Math.floor(seconds / (3600*24));
    let h = Math.floor(seconds % (3600*24) / 3600);
    let m = Math.floor(seconds % 3600 / 60);
    let s = Math.floor(seconds % 60);

    let parts = [];
    let dDisplay = d > 0 ? d + "d" : "";
    if(dDisplay !== "") parts.push(dDisplay);
    let hDisplay = h > 0 ? h + "h" : "";
    if(hDisplay !== "") parts.push(hDisplay);
    let mDisplay = m > 0 ? m + "m" : "";
    if(mDisplay !== "") parts.push(mDisplay);
    let sDisplay = s > 0 ? s + "s" : "";
    if(sDisplay !== "") parts.push(sDisplay);
    let returnDhms = parts.join(" ");

    if(returnDhms === "") returnDhms = "0s";

    return returnDhms;
}
$(document).on('click','.alert-close',function (event){
    $(this).parent().hide()
})
$(document).on('click','.menu',function (event){
    let file=$(this).attr('data-file');
    let title=$(this).attr('data-title');
    let name=$(this).attr('data-name');
    let members=$(this).attr('data-members');
    ipcRenderer.send("sendRequestToIpcMain", "changeMenu",{'currentMenu':{'file':file,'title':title,'name':name,'members':members},'pageParams':basic_info['pageParams']});
})
$(document).on('click','#menu_logout',function (event){
    ipcRenderer.send("sendRequestToIpcMain", "logout");
})
$(document).on('change','#system_machine_list',function (event){
    ipcRenderer.send("sendRequestToIpcMain", "changeMenu",{'selectedMachineId':$(this).val()});
});
$(document).on('click','.button-device-command',function (event){
    let params={
        'message_id':123,
        'device_id':$(this).attr('data-device-id'),
        'command':$(this).attr('data-command'),
        'parameter1':$(this).attr('data-parameter1')
    };
    ipcRenderer.send("sendRequestToServer", "forwardSMMessage",params,[]);
})
$(document).on('click','.button-device-command-press-release',function (event){
    let device_id=$(this).attr('data-device-id');
    let command_start=$(this).attr('data-command-start');
    let command_end=$(this).attr('data-command-end');
    let parameter1=$(this).attr('data-parameter1');
    let started=$(this).attr('data-started');//data-started is not set in the gui
    let startedColor=$(this).attr('data-started-color');
    let stoppedColor=$(this).attr('data-stopped-color');
    if(!startedColor){
        startedColor='#27e22b';
    }
    if(!stoppedColor){
        stoppedColor='darkgray';
    }

    if(started==1){
        let params={
            'message_id':123,
            'device_id':device_id,
            'command':command_end,
            'parameter1':parameter1
        };
        ipcRenderer.send("sendRequestToServer", "forward_ape_message",params,[]);
        $(this).attr('data-started',0);
        $(this).css('background-color',stoppedColor);
    }
    else{
        let params={
            'message_id':123,
            'device_id':device_id,
            'command':command_start,
            'parameter1':parameter1
        };
        ipcRenderer.send("sendRequestToServer", "forward_ape_message",params,[]);
        $(this).attr('data-started',1);
        $(this).css('background-color',startedColor);
    }
});
$(document).on('click','.system_button_mode',function (event){
    $(this).hide();
    let params={
        'message_id':120,
        'mode':$(this).attr('data-mode')
    };
    ipcRenderer.send("sendRequestToServer", "forwardSMMessage",params,[]);
})
$(document).on("input", ".float_positive", function(event)
{
    this.value = this.value.replace(/[^0-9.]/g, '').replace('.', 'x').replace(/\./g,'').replace('x','.');
});
$(document).on("input", ".integer_positive", function(event)
{
    this.value = this.value.replace(/[^0-9]/g, '');
});
$(document).on("input", ".float_all", function(event)
{
    this.value = this.value.replace(/[^0-9.-]/g, '').replace('.', 'x').replace(/\./g,'').replace('x','.').replace(/(?!^)-/g, '');
});
$(document).on("input", ".integer_all", function(event)
{
    this.value = this.value.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '');
});
$(document).ready(function ()
{
    //start clock
    startClock();//immediate
    setInterval(startClock,500);
    ipcRenderer.send("sendRequestToIpcMain", "basic_info");
});
ipcRenderer.on("basic_info", function(e, data) {
    basic_info=data;
    //setting page title
    let currentMenu=basic_info['currentMenu'];
    $('title').text(systemSiteName+" "+systemVersion+"--"+currentMenu['title'])
    //setting active menu
    let members=currentMenu['members'].split(" ");
    for(let i=0;i<members.length;i++){
        if(members[i]){
            $('.menu[data-name='+members[i]+']').addClass('active')
        }
    }
    //currentUser
    let currentUser=basic_info['currentUser'];
    $('#system_user_name').text(currentUser['name'])

    if(currentUser['role']>0){
        $("#menu_login").hide();
        $("#menu_logout").show();
    }
    else{
        $("#menu_login").show();
        $("#menu_logout").hide();
    }
    if((currentUser['role']>0)&&(currentUser['role']<4)){
        $("#menu_maint").show();
        $('#system_mode_buttons_container').show();
    }
    else{
        $("#menu_maint").hide();
        $('#system_mode_buttons_container').hide();
    }
    if(basic_info['connected']){
        $("#system_machine_status").css("color", "#0000FF");
        if(basic_info['machines']){
            for(let key in basic_info['machines']){
                $('#system_machine_list').append('<option value="'+basic_info['machines'][key]['machine_id']+'">'+basic_info['machines'][key]['machine_name']+'</option>');
            }
            $("#system_machine_list").val(basic_info['selectedMachineId']);
        }
        if(basic_info['selectedMachineId']>0){
            $('#system_machine_name').text(basic_info['machines'][basic_info['selectedMachineId']]['machine_name']);
            $('#system_machine_ip_address').text(basic_info['machines'][basic_info['selectedMachineId']]['ip_address']);
            $('.system_machine_info').hide();
            $('.system_machine_info[data-selected=1]').show();
            let requestData=[
                {'name':'machine_mode','params':{}},
                {'name':'disconnected_device_counter','params':{}},
                {'name':'alarms_active','params':{}}
            ];
            ipcRenderer.send("sendRequestToServer", "getCommonStatus",{},requestData);//send request now
            setInterval(() => {ipcRenderer.send("sendRequestToServer", "getCommonStatus",{},requestData);}, 2000);
        }
        else{
            $('.system_machine_info').hide();
            $('.system_machine_info[data-selected=0]').show();
        }
    }
    if (typeof systemPageLoaded === 'function') {
        systemPageLoaded();
    }
})
ipcRenderer.on("getCommonStatus", function(e, jsonObject) {
   // console.log("TODO getCommonStatus",jsonObject)
   //  let disconnected_device_counter = Number(jsonObject['data']['disconnected_device_counter']);
   //  if(disconnected_device_counter != 0) {
   //      $("#system_machine_status").css("color", "#FFBF00");
   //  }
   //  else {
   //      $("#system_machine_status").css("color", "#32CD32");
   //  }
    $('.system_button_mode').hide();
    if(jsonObject['data']['machine_mode'] == 1) {
        $('.system_machine_info').css('background-color','#d3d3d3').css('color','#FFF');
        $('.system_button_mode[data-mode=0]').show();
    }
    else if(jsonObject['data']['machine_mode'] == 0) {
        $('.system_machine_info').css('background-color','#2780E3').css('color','#FFF');
        $('.system_button_mode[data-mode=1]').show();
    }

})