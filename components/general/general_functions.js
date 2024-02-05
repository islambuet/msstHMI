/**
 * Created by Shaiful Islam on 2023-08-02.
 */
// ---------------
/* global basic_info */
/* global ipcRenderer */
$('#switch_legend_production').change(function () {
    if ($(this).is(":checked")) {
        $('#svg_general_colors').hide();
        $('#container_production').show();
        ipcRenderer.send("sendRequestToIpcMain", "saveSettings",{'general_show_production':1});
    } else {
        $('#svg_general_colors').show();
        $('#container_production').hide();
        ipcRenderer.send("sendRequestToIpcMain", "saveSettings",{'general_show_production':0});
    }
});
$('.bin.cursor-pointer').on('click',function (){
    let bin_id=$(this).attr('bin-id');
    if(basic_info['bins'][basic_info['selectedMachineId']+'_'+bin_id] !=undefined){
        basic_info['pageParams']={'bin':basic_info['bins'][basic_info['selectedMachineId']+'_'+bin_id]}
        ipcRenderer.send("sendRequestToIpcMain", "changeMenu",
            {
                'currentMenu':{'file':'general_bin_details',
                'title':'Bins Detail: '+basic_info['pageParams']['bin']['bin_label'],
                'name':'general_bin_details','members':'general'},
                'pageParams':basic_info['pageParams']
            });
    }


})
function setActiveAlarmSettings(){
    let hmiSettings= basic_info['hmiSettings']
    if(hmiSettings['detailed_active_alarm'] ==1){
        $('#table_active_alarms').show()
        $('#container_ticker_active_alarms').hide()
    }
    else{
        $('#table_active_alarms').hide()
        $('#container_ticker_active_alarms').show()
    }
}
function setBinsLabel(){
    let bins=basic_info['bins']
    let layoutNo=basic_info['hmiSettings']['general_layout_no']
    if(bins!=undefined){
        let num_bins=Math.max(...Object.values(bins).map(bin => bin['gui_id']!='999'?bin['gui_id']:0), 0);
        let bin_width=0;
        if(num_bins>0){
            if(layoutNo=="5"){
                bin_width=Math.trunc(1120/Math.ceil(num_bins/2))
            }
            else{
                bin_width=Math.trunc(1500/Math.ceil(num_bins/2))
            }
        }
        for(let key in bins){
            if(bins[key]['gui_id']>0){
                if(bins[key]['gui_id']!="999"){
                    let binIndex=(Math.ceil(bins[key]['gui_id']/2));
                    let posRect=0;
                    let posText=0;
                    if((layoutNo=="1")||(layoutNo=="3"))
                    {
                        posRect=201-1+(binIndex-1)*bin_width;
                    }
                    else if(layoutNo==5){
                        posRect=1280-(binIndex)*bin_width;
                    }
                    else {
                        posRect=1650-(binIndex)*bin_width;
                    }
                    posText=posRect-20+(bin_width/2);
                    $('.bin[gui-bin-id='+bins[key]['gui_id']+'] rect').attr('width',bin_width-10).attr('x',posRect)
                    $('.bin[gui-bin-id='+bins[key]['gui_id']+'] text').attr('x',posText);
                }
                $('.bin[gui-bin-id='+bins[key]['gui_id']+'] .bin-label').text(bins[key]['bin_label']);
                $('.bin[gui-bin-id='+bins[key]['gui_id']+']').attr('bin-id',bins[key]['bin_id']).show();
            }
        }

    }
}
function setConveyorsLabel(){
    let conveyors=basic_info['conveyors'];
    if(conveyors!=undefined){
        Object.values(conveyors).forEach(record => {
            if(record['gui_id']>0){
                $('.conveyor[gui-conveyor-id='+record['gui_id']+']').attr('conveyor-id',record['conveyor_id']).attr('data-original-title',record['conveyor_name']).show();
                $('.conveyor-bg[gui-conveyor-id='+record['gui_id']+']').show();
            }
        })
    }
}
function setDevicesLabel(){
    let devices=basic_info['devices'];
    for(let key in devices){
        let device=devices[key];
        if(device['gui_id']>0 ){
            $('.device[gui-device-id='+device["gui_id"]+']').attr('device-id',device["device_id"]).attr('data-original-title',device['device_name']+'<br>'+device['ip_address']).show();
        }
    }
}
function setEstopsLabel(){
    let inputs=basic_info['inputs']
    for(let key in inputs){
        let input=inputs[key];
        if((input['input_type']==3) && input['gui_id']>0 &&  (input['device_type']==0) && (input['device_number']==0) ){
            $('.estop[gui-input-id='+input["gui_id"]+']').attr('input-id',input["input_id"]).attr('data-original-title',input['electrical_name']+'<br>'+input['description']).show();
        }
    }
}
function setPhotoeyesLabel(){
    let inputs=basic_info['inputs']
    if(inputs!=undefined){
        Object.values(inputs).forEach(record => {
            if(record['gui_id']>0 && (record['input_type']==0)&& (record['device_type']==0)&& (record['device_number']==0) ){
                $('.photoeye[gui-input-id='+record['gui_id']+']').attr('input-id',record['input_id']).attr('data-original-title',record['electrical_name']+'<br>'+record['description']).show();
            }
        })
    }
}
function setTestButtonsStatus(outputStates){
    let machine_id=basic_info['selectedMachineId'];
    if(outputStates[machine_id+"_49"] && outputStates[machine_id+"_49"]['state']==1){
        $("#btn-test-red-light").attr('data-started',1).css('background-color',$("#btn-test-red-light").attr('data-started-color'));
    }
    if(outputStates[machine_id+"_50"] && outputStates[machine_id+"_50"]['state']==1){
        $("#btn-test-amber-light").attr('data-started',1).css('background-color',$("#btn-test-amber-light").attr('data-started-color'));
    }
    if(outputStates[machine_id+"_51"] && outputStates[machine_id+"_51"]['state']==1){
        $("#btn-test-blue-light").attr('data-started',1).css('background-color',$("#btn-test-blue-light").attr('data-started-color'));
    }
}
/* global secondsToDhms */
let ticker_active_alarms = $('#ticker_active_alarms').newsTicker({
    row_height: 100,
    max_rows: 2,
    duration: 4000,
    pauseOnHover: 0
});
let ticker_data_current = []
function setActiveAlarms(active_alarms){
    let alarms=basic_info['alarms']
    let machine_id=basic_info['selectedMachineId'];
    let now_timestamp=moment().unix();
    let alarm_class_names = {"0" : "Error", "1" : "Warning", "2" : "Message"};
    $("#table_active_alarms tbody").empty();
    let tickers_data_new = [];
    if(active_alarms.length>0){
        for(let i=0;(i<active_alarms.length && i<5);i++){
            let key=machine_id+'_'+active_alarms[i]['alarm_id']+'_'+active_alarms[i]['alarm_type'];
            if(alarms[key]!=undefined) {
                let html = '<tr>' +
                    '<td>' + moment.unix(active_alarms[i]['date_active_timestamp']).format("MMM D Y, H:mm:ss") + '</td>' +
                    '<td>' + secondsToDhms(now_timestamp-active_alarms[i]['date_active_timestamp']) + '</td>' +
                    '<td>' + alarm_class_names[alarms[key]['alarm_class']] + '</td>' +
                    '<td>' + alarms[key]['location'] + '</td>' +
                    '<td>' + alarms[key]['description'] + '</td>' +
                    '<td>' + alarms[key]['variable_name'] + '</td>' +
                    '</tr>';
                $("#table_active_alarms tbody").append(html);
                tickers_data_new.push(alarms[key]['description']);
            }
        }
    }
    let ticker_data_count = tickers_data_new.length;
    if(ticker_data_count>0){
        if(tickers_data_new.sort().join(',') !== ticker_data_current.sort().join(',')){
            $('#ticker_active_alarms').empty();
            ticker_active_alarms.newsTicker('pause');
            ticker_data_current=tickers_data_new;
            if(ticker_data_count == 1){
                let html = '<li class="ticker-single-item">' + ticker_data_current[0] + '</li>';
                $("#ticker_active_alarms").append(html);
            }
            else {
                ticker_data_current.forEach(elem => {
                    let html = '<li>' + elem + '</li>';
                    $("#ticker_active_alarms").append(html);
                });
                if(ticker_data_count>2){
                    ticker_active_alarms.newsTicker('unpause');
                }
            }
        }
    }
    else{
        ticker_data_current=[]
        $('#ticker_active_alarms').empty();
        ticker_active_alarms.newsTicker('pause');

        let html = '<tr><td colspan="6">No active alarm to display</td></tr>';
        $("#table_active_alarms tbody").append(html);
    }
}
function setBinsStates(bin_states){
    let bin_state_colors=basic_info['bin_state_colors'];
    for(let bin_key in bin_states){
        let bin_color='#27e22b';
        for(let i=0;i<bin_state_colors.length;i++)
        {
            let bin_state_color=bin_state_colors[i];
            if(bin_states[bin_key][bin_state_color['name']]==1){
                bin_color=bin_state_color['color_active'];
                break;
            }
        }
        $('.bin[bin-id='+bin_states[bin_key]['bin_id']+'] rect').css('fill',bin_color);
    }
}
function setConveyorsStates(conveyor_states){
    let conveyor_colors = { "0" : "#ccc",  "1" : "#27e22b", "2" : "#ffc000", "3" : "red","4":"#87cefa"};
    for(let key in conveyor_states){
        $('.conveyor[conveyor-id='+conveyor_states[key]['conveyor_id']+'] .status').css('fill',conveyor_colors[conveyor_states[key]['state']]);
    }
}
function setDevicesStates(device_states){
    let device_colors = {"0" : "#f00", "1" : "#27e22b"};
    for(let key in basic_info['devices']){
        let device=basic_info['devices'][key];
        if(device['gui_id']>0 ){
            let state=0;
            if(device_states[key]!=undefined){
                state=device_states[key]['state'];
            }
            $('.device[device-id='+device["device_id"]+'] .status').css('fill',device_colors[state]);
        }
    }
}
function setDoorsStates(input_states){
    let machine_id=basic_info['selectedMachineId'];
    $('.door').hide();//hide all buttons
    let doors=basic_info['doors']
    for(let door_no in doors){
        let door=doors[door_no];
        let door_closed='in-active';
        let door_locked='in-active';
        let door_safe='in-active';
        if(door[1] !=undefined){
            if(input_states[machine_id+'_'+door[1]['input_id']] !=undefined){
                if(input_states[machine_id+'_'+door[1]['input_id']]['state']==door[1]['active_state']){
                    door_closed='active';
                }
            }
        }
        if(door[2]){
            if(input_states[machine_id+'_'+door[2]['input_id']]){
                if(input_states[machine_id+'_'+door[2]['input_id']]['state']==door[2]['active_state']){
                    door_locked='active';
                }
            }
        }
        if(door[3]){
            if(input_states[machine_id+'_'+door[3]['input_id']]){
                if(input_states[machine_id+'_'+door[3]['input_id']]['state']==door[3]['active_state']){
                    door_safe='active';
                }
            }
        }
        if(door_closed=='active'){
            if((door_locked=='in-active')&&(door_safe=='in-active')){
                $('.door-lock[data-device-id='+(+door_no+90)+']').show();
            }
            else{
                $('.door-unlock[data-device-id='+(+door_no+90)+']').show();
            }
        }
        else{
            $('.door-open[data-device-id='+(+door_no+90)+']').show();
        }

    }
}
function setEstopsStates(input_states){
    let input_colors = {"in-active" : "#00ff00", "active" : "#ff0000"};
    for(let key in basic_info['inputs']){
        let input=basic_info['inputs'][key];
        if((input['input_type']==3) && input['gui_id']>0 &&  (input['device_type']==0) && (input['device_number']==0) ){
            let state='in-active'
            if(input_states[key] !=undefined){
                if(input['active_state']==input_states[key]['state']){
                    state='active'
                }
            }
            $('.estop[input-id='+input["input_id"]+'] .status').css('fill',input_colors[state]);

        }
    }
}
function setMotorsLabel(){
    for(let key in basic_info['motors']){
        let motor=basic_info['motors'][key];
        if(motor['gui_id']>0){
            $('.motor[gui-motor-id='+motor["gui_id"]+']').attr('motor-id',motor["motor_id"]).attr('data-original-title',motor['motor_name']+'<br>'+motor['ip_address']+'<br>Loc: '+motor['location']).show();
        }
    }
}
function setPhotoeyesStates(input_states){
    let input_colors = {"in-active" : "#39b54a", "active" : "#f7931e"};
    for(let key in basic_info['inputs']){
        let input=basic_info['inputs'][key];
        if((input['input_type']==0)&&(input['device_type']==0)&&(input['device_number']==0)&& (input['gui_id']>0)){
            let state='in-active'
            if(input_states[key]){
                if(input['active_state']==input_states[key]['state']){
                    state='active'
                }
            }
            $('.photoeye[input-id='+input["input_id"]+'] .status').css('fill',input_colors[state]);
        }
    }
}
function setStatisticsCounter(statistics_counter){
    if(statistics_counter.length>0){
        let shiftInfo=statistics_counter[0];
        let machine_errors = 0, non_machine_errors = 0
        Object.keys(shiftInfo).forEach(s_key => {
            if (['sc1', 'sc3', 'sc4', 'sc6', 'sc9', 'sc14', 'sc16', 'sc17', 'sc21'].includes(s_key)) {
                machine_errors += Number(shiftInfo[s_key]);
            }
            if (['sc5', 'sc7', 'sc8', 'sc10', 'sc12', 'sc18'].includes(s_key)) {
                non_machine_errors += Number(shiftInfo[s_key]);
            }
        });

        let production_data = {
            total_read: {label: 'Total inducted', count: 0},
            sc0: {label: 'Total good diverts', count: 0},
            machine_error: {label: 'Total machine error packages', count: 0},
            non_machine_error: {label: 'Total non-machine error packages', count: 0},
        };
        production_data['total_read']['count'] = shiftInfo['total_read'];
        production_data['sc0']['count'] = shiftInfo['sc0'];
        production_data['machine_error']['count'] = machine_errors;
        production_data['non_machine_error']['count'] = non_machine_errors;
        $('#table_production tbody').empty();
        Object.keys(production_data).forEach(key => {
            let html = '<tr>' + '<td>' + production_data[key]['label'] + '</td>' +
                '<td class="text-right">' + production_data[key]['count'] + '</td>' +
                '<td class="text-right">' + (shiftInfo['total_read'] > 0 ? (production_data[key]['count'] * 100 / shiftInfo['total_read']).toFixed(2) : '0') + '%' + '</td>'
                + '</tr>';
            $('#table_production tbody').append(html)
        });

        let scanner_data = {
            valid: {label: 'Good scan', count: 0},
            no_read: {label: 'No read', count: 0},
            no_code: {label: 'No code', count: 0},
            multiple_read: {label: 'Multiple read', count: 0},
        };
        scanner_data['valid']['count'] = shiftInfo['valid']
        scanner_data['no_read']['count'] = shiftInfo['no_read']
        scanner_data['no_code']['count'] = shiftInfo['no_code']
        scanner_data['multiple_read']['count'] = shiftInfo['multiple_read']

        $('#table_scanner tbody').empty();
        Object.keys(scanner_data).forEach(key => {
            let html = '<tr>' + '<td>' + scanner_data[key]['label'] + '</td>' +
                '<td class="text-right">' + scanner_data[key]['count'] + '</td>' +
                '<td class="text-right">' + (shiftInfo['total_read'] > 0 ? (scanner_data[key]['count'] * 100 / shiftInfo['total_read']).toFixed(2) : 0) + '%' + '</td>'
                + '</tr>';
            $('#table_scanner tbody').append(html)
        });
    }

}
function setStatisticsOee(statistics_oee){
    if(statistics_oee.length>0){
        let oeeInfo=statistics_oee[0];
        let oee_data = {
            cal_availability: {label: 'Availability'},
            cal_quality: {label: 'Quality'},
            cal_performance: {label: 'Performance'},
            cal_oee: {label: 'OEE'},
        };

        oeeInfo['cal_availability']= (+oeeInfo['tot_sec_blocked']) + (+oeeInfo['tot_sec_estop']) + (+oeeInfo['tot_sec_fault']) + (+oeeInfo['tot_sec_run'])
        oeeInfo['cal_availability']= (+oeeInfo['cal_availability'])>0? ((+oeeInfo['tot_sec_run'])/oeeInfo['cal_availability']).toFixed(2):'0';
        oeeInfo['cal_quality']= (+oeeInfo['packages_inducted'])>0?((+oeeInfo['successful_divert_packages'])/(+oeeInfo['packages_inducted'])).toFixed(2):'0';
        oeeInfo['cal_performance']= (+oeeInfo['tot_sec_run'])>0?((+oeeInfo['packages_inducted']) * (+oeeInfo['max_3min_tput'])/(+oeeInfo['tot_sec_run'])).toFixed(2):'0';
        oeeInfo['cal_oee']= ((+oeeInfo['cal_availability']) * (+oeeInfo['cal_quality']) * (+oeeInfo['cal_performance'])).toFixed(2)

        $('#table_oee tbody').empty();
        Object.keys(oee_data).forEach(key => {
            let html = '<tr>' + '<td>' + oee_data[key]['label'] + '</td>' +
                '<td class="text-right">' + oeeInfo[key] + '</td>' +
                + '</tr>';
            $('#table_oee tbody').append(html)
        });
    }
}