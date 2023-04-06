//import { faker } from 'https://cdn.skypack.dev/@faker-js/faker';
const teacher_field = $("#teacher_field");
const teacher_btn = $("#teacher_btn");
const teacher_menu = $("#teacher_menu");

const class_field = $("#class_field");
const class_btn = $("#class_btn");
const class_menu = $("#class_menu");

const section_btn = $("#section_btn");
const section_menu= $("#section_menu");

const exam_btn = $("#exam_btn");
const exam_menu = $("#exam_menu");

const display_field = $("#display_field");
const display_btn = $("#display_btn");
const display_menu = $("#display_menu");

const submit_button = $("#submit_button");
const access_field = $("#access_field");

function disable_filters(){
    teacher_field.attr('disabled','disabled');

    class_field.attr('disabled','disabled');
    class_btn.attr('disabled','disabled');

    section_btn.attr('disabled','disabled');
    exam_btn.attr('disabled','disabled');
    display_field.attr('disabled','disabled');
    submit_button.attr('disabled','disabled');
}

//sends post data asynchronously without ajax
async function post_data(url = '', data = {}){
    const response = await fetch(url,{
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
    });
    return response.json();
}


$(".checkbox-menu").on("change", "input[type='checkbox']", function() {
    $(this).closest("li").toggleClass("active", this.checked);
 });

 //prevent closing of checkboxes to select multiple items
 $(document).on('click', '.allow-focus', function (e) {
    e.stopPropagation();
});

function update_classes(data){
    //remove existing children
    while (class_menu[0].firstChild){
        class_menu[0].removeChild(class_menu[0].firstChild);
    }
    const num_rows = data["id"].length;
    for (let i = 0; i< num_rows; i++){
        const id = data["id"][i];
        const subject_name = data["subject_name"][i];
        const school_year = data["school_year"][i];
        class_menu.append(`<a class="dropdown-item" data-id="${id}">${subject_name + " (" + school_year + ")"}</a>`)
    }
}

teacher_menu.on("click",function(e){
    teacher_field.attr('value',e.target.text);
    const teacher_id = e.target.dataset["id"];
    const current_teacher_id = teacher_menu[0].dataset["currentId"];
    
    if (teacher_id != null){

        const payload = {teacher_id:teacher_id};
        post_data("/stats_get_classes",payload).then(
            data => {
                update_classes(data);
                if (teacher_id != current_teacher_id){
                    class_field.attr("value","");
                    class_menu.attr("data-current-id","");
                    section_btn.prop("disabled",true);
                    exam_btn.prop("disabled",true);
                    submit_button.prop("disabled",true);
                }
                teacher_menu.attr('data-current-id',teacher_id);
                class_btn.prop('disabled',false);
            }
        ).catch(error => {
            console.error(error);
            general_error();
        });
    }
})


function update_sections(data){
    const sections = data.sections;
    while (section_menu[0].firstChild){
        section_menu[0].removeChild(section_menu[0].firstChild)
    }
    sections.forEach(section => {
        section_menu.append(`
                <li>
                    <label><input type="checkbox" data-id = "${section}"> ${section}</label>
                </li>`
                );
    });
}

class_menu.on("click",function(e){
    const class_name = e.target.text;
    const class_id = e.target.dataset['id'];
    const current_class_id = class_menu[0].dataset["currentId"];

    class_field.attr('value',class_name);
    if (class_id != null){
        post_data("{{url_for('stats_get_sections')}}",{class_id:class_id}).then(
            data => {
                update_sections(data);
                if (class_id != current_class_id){
                    exam_btn.prop('disabled',true);
                    submit_button.prop("disabled",true);
                }
                class_menu.attr("data-current-id",class_id);
                section_btn.prop('disabled',false);
            }
        ).catch(error =>{
            console.error(error);
            general_error();
        })
        
    }
})

function update_exams(data){
    const exams = data.exams;
    while (exam_menu[0].firstChild){
        exam_menu[0].removeChild(exam_menu[0].firstChild)
    }
    exams.forEach(exam => {
        exam_menu.append(`
                <li>
                    <label><input type="checkbox" data-id = "${exam}"> ${exam}</label>
                </li>`
                );
    });
}

function get_checked_exams(){
    let checked_inputs = $('#exam_menu input[type="checkbox"]:checked');
    let checked_exams = Array.from(checked_inputs).map(input=>{
            return input.dataset["id"]
        });
    if (checked_exams.includes("All")){
        //check all and update the arrays
        $('#exam_menu input[type = "checkbox"]').prop('checked',true);
        $('#exam_menu input[type = "checkbox"]').closest("li").toggleClass("active",this.checked);
        checked_inputs = $('#exam_menu input[type="checkbox"]:checked');
        checked_exams = Array.from(checked_inputs).map(input=>{
                return input.dataset["id"]
            });
    }
    return checked_exams
}


function get_checked_sections(){
    let checked_inputs = $('#section_menu input[type="checkbox"]:checked');
    let  checked_sections = Array.from(checked_inputs).map(input => {
            return input.dataset["id"]
        });
    if (checked_sections.includes("All")){
        //check all and update the arrays
        $('#section_menu input[type="checkbox"]').prop('checked',true);
        $('#section_menu input[type="checkbox"]').closest("li").toggleClass("active", this.checked);
        checked_inputs = $('#section_menu input[type="checkbox"]:checked');
        checked_sections = Array.from(checked_inputs).map(input => {
                return input.dataset["id"]
            });
    }
    return checked_sections
}


section_menu.on("click",function(e){
    let checked_sections = get_checked_sections();
    const class_id = class_menu[0].dataset["currentId"];
    post_data('{{url_for("stats_get_exams")}}',{sections:checked_sections,class_id:class_id}).then(
        data =>{
            update_exams(data);
            exam_btn.prop('disabled',false);

            //disable exam button if the exam menu changed (may change when sections are changed);
            let checked_exams = get_checked_exams();
            if (checked_exams.length == 0){
                submit_button.prop('disabled',true);
            }

    }).catch((error) => {
        console.error(error);
        general_error();
    });
})

exam_menu.on("click",function(e){
    let checked_exams = get_checked_exams();
    let access_code = access_field[0].value;
    //disable or enable submit button
    if (checked_exams.length > 0){
        submit_button.prop('disabled',false);
    } else {
        submit_button.prop('disabled',true);
    }
})

display_menu.on("click",function(e){
    display_field.attr("value",e.target.text);
})

//general error message
function general_error(){
    $("#toast_title").text("Error");
    $("#toast_muted").text("Check your connection.");
    $("#toast_message").text("Some error occcured while trying to fetch the required data.");
    $(".toast").toast("show");
}


function move_reminder(){
    //move reminder in the middle horizontally
    let chart_body_width = $("#chart_area").width();
    let reminder_width = $("#initial_reminder").width();
    let leftmost = $('#chart_area').offset()["left"];
    let offset = leftmost + 0.5*chart_body_width - 0.5*reminder_width;
    $("#initial_reminder").css("left",`${offset}px`);
}

window.onresize = function(){
    move_reminder();
    //$("#chart_canvas").css("width", "100% !important");
}

function create_dummy_plot(){
    //default bar size
    const dy = 20;
    const doffset = 15;

    //create initial plot as a placeholder (blurred out)
    const NUM_DATA = 50;
    const data_structure = []
    const section_list = ["Section A", "Section B"," Section C", 'Section D','Section E','Section F']
    const pallete = ["rgba(246, 76, 114,1)","rgba(153, 115, 142,1)","rgba(47, 47, 162,1)"];

    for (let i = 0; i < NUM_DATA; i++){
        let section = choose(section_list);
        let score = randrange(1,100);
        let name = `First Middle Last Name ${i}`;
        let row = {x:score,sec:section,lbl:name };

        data_structure.push(row);
    }

    const context = document.getElementById('chart_canvas');
    const config = get_bar_chart(data_structure,pallete,dy,"Never gonna give you up.");
    const myChart = new Chart(context,config);
    myChart.canvas.style.height = `${(dy+doffset)*data_structure.length}px`
}

$(document).ready(function(){
    //initialize toast messages
    $('.toast').toast({
        animation:true,
        autohide:true,
        delay:5000,
    });
});

window.onload = function(){
    //disable some inputs
    disable_filters();

    //initial blurred plot
    create_dummy_plot();
    
    //position tthe "select filter" in the middle
    move_reminder();
}


submit_button.on('click', function(){
    const pallete = ["rgba(246, 76, 114,1)","rgba(153, 115, 142,1)","rgba(47, 47, 162,1)"];
    const display = $("#display_field")[0].value;
    let dy = 20;
    let doffset = 15;
    let chart_title = "";
    const aggregate_by = $("input:radio[name ='aggregate_select']:checked").val();
    

    if (display == "Individual"){
        dy = 20;
        doffset = 15;
        if (aggregate_by == "sum"){
            chart_title = "TOTAL BY INDIVIDUAL";
        } else if (aggregate_by == "mean") {
            chart_title = "AVERAGE BY INDIVIDUAL";
        }
    } else if (display == "Section") {
        dy = 60;
        doffset = 30;
        if (aggregate_by == "sum"){
            chart_title = "TOTAL BY SECTION";
        } else if (aggregate_by == "mean") {
            chart_title = "AVERAGE BY SECTION";
        }
    } else if (display == "Distribution"){
        if  (aggregate_by == "sum"){
            chart_title = "DISTRIBUTION OF TOTAL SCORES";
        } else if (aggregate_by == "mean"){
            chart_title = "DISTRIBUTION OF AVERAGE SCORES";
        }
    }

    //get data
    const payload = {
        teacher_id: teacher_menu[0].dataset["currentId"],
        class_id: class_menu[0].dataset["currentId"],
        checked_sections: get_checked_sections(),
        checked_exams: get_checked_exams(),
        display_type: display,
        access_code: $("#access_field")[0].value,
        pallete: pallete,
        aggregate_by: aggregate_by,
    }

    post_data('{{url_for("stats_send_data")}}',payload).then(response => {
        if ("error" in response.data) {
            const error = response.data.error;

            $("#toast_title").text("Error");
            $("#toast_muted").text("");
            $("#toast_message").text(error);
            $(".toast").toast("show");
            return
        } else {
            //remove the reminder
            $("#initial_reminder").remove();
            $("#chart_body").removeClass("blurred");

            if (display == "Distribution"){
                //reset the canvas before creating new plot
                document.querySelector("#chart_body").innerHTML = '<canvas id="chart_canvas" height="auto" ></canvas>';

                const context = document.getElementById("chart_canvas").getContext('2d');

                //adjust height to the canvas
                const client_height = $("#chart_area")[0].clientHeight;
                $("#chart_canvas").css("min-height",Math.floor(0.98*client_height));

                let data_structure = response.data;
                const config = get_histogram(data_structure,pallete,0.95,chart_title);
                const myChart = new Chart(context,config);

            } else {
                let data_structure = response.data;
                
                //reset the canvas before creating new plot
                document.querySelector("#chart_body").innerHTML = '<canvas id="chart_canvas" height="auto" ></canvas>';

                //create plot
                const context = document.getElementById('chart_canvas');
                const config = get_bar_chart(data_structure,pallete,dy,chart_title);
                const myChart = new Chart(context,config);
                myChart.canvas.style.height = `${(dy+doffset)*data_structure.length}px`
            }
        }
    }).catch(error => {
        console.error(error);
        general_error();
    })
});



