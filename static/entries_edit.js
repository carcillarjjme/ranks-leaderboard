
$("#listCodesPanel").on("click",function(event){
    const target  = event.target;
    const subject_id = target.dataset.subject_id;
    const subject_name = target.dataset.subject_name;
    const school_year = target.dataset.school_year;
    const subject_display = `${subject_name} (${school_year})`

    $("#inputSubjectId").val(Number(subject_id));
    $("#inputSubjectPanel").val(subject_display);
    $.ajax({
        type : 'POST',
        url : "{{url_for('update_current_subject')}}",
        contentType: 'application/json;charset=UTF-8',
        data : JSON.stringify({current_subject_id:subject_id}),
        success : function(response){
            success = response['isUpdated'];
            if (success){
                $("#toastTitle").text("Subject Changed Successfully");
                $("#toastMuted").text("");
                $("#toastMessage").text(`Current setting will be editing ${subject_display}`);
                $(".toast").toast("show");
            
            } else {
                $("#toastTitle").text("Subject Change Error");
                $("#toastMuted").text("Check connection.");
                $("#toastMessage").text("An error occured while trying to change current subject.");
                $(".toast").toast("show");
            }
            window.location.reload();
        },
        error: function(error){
            $("#toastTitle").text("Subject Change Error");
            $("#toastMuted").text("Check connection.");
            $("#toastMessage").text("An error occured while trying to change current subject.");
            $(".toast").toast("show");
        }
    });


    console.log(subject_id);
})




$("#btnChangeName").on("click",function(event){
    const new_name = $("#inputTeacherName")[0].value;
    $.ajax({
        type : 'POST',
        url : "{{url_for('update_name')}}",
        contentType: 'application/json;charset=UTF-8',
        data : JSON.stringify({new_name:new_name}),
        success : function(response){
            const isUpdated = response['isUpdated'];
            if (isUpdated){
                $("#toastTitle").text("Name Updated");
                $("#toastMuted").text("Verify recent modifications.");
                $("#toastMessage").text("Teacher name updated sucessfully.");
                $(".toast").toast("show");
            } else {
                $("#toastTitle").text("Name Update Error");
                $("#toastMuted").text("Check connection.");
                $("#toastMessage").text("An error occured while updating the teacher's name field.");
                $(".toast").toast("show");
            }
        },
        error: function(error){
            console.log(error)
            $("#toastTitle").text("Name Update Error");
            $("#toastMuted").text("Check connection.");
            $("#toastMessage").text("An error occured while updating the teacher's name field.");
            $(".toast").toast("show");
        }
    });
});


function getSectionsChecked(){
    //get the state of the section filters
    const filterSection = document.getElementById("filterSection");
    var filterInputs = filterSection.getElementsByTagName("input");
    var checkedSections = {};
    for (var i = 0; i < filterInputs.length; i++){
        var checked  = filterInputs[i].checked;
        const inputName = filterInputs[i].name;
        const inputState = filterInputs[i].checked;
        checkedSections[inputName] = inputState;
    }
    return checkedSections;
}

function getExamChecked(){
    //get the state of the exam filters
    const filterExam = document.getElementById("filterExam");
    const filterInputs = filterExam.getElementsByTagName("input");
    var checkedExams = {};
    for (var i = 0; i < filterInputs.length; i++){
        var checked  = filterInputs[i].checked;
        const inputName = filterInputs[i].name;
        const inputState = filterInputs[i].checked;
        checkedExams[inputName] = inputState;
    }
    return checkedExams;
}


function getFilterData(){
    // only call this when filter is valid()
    var filterSection = document.getElementById("filterSection");
    var filterExam = document.getElementById("filterExam");
    var filterSectionList = filterSection.getElementsByTagName("input");
    var filterExamList = filterExam.getElementsByTagName("input");
    var filterSectionChecked = [];
    var filterExamChecked = [];
    for (var i = 0; i < filterSectionList.length; i++){
        if (filterSectionList[i].checked){
            filterSectionChecked.push(filterSectionList[i].nextSibling.data);
        }
    }
    for (var i = 0; i < filterExamList.length; i++){
        if (filterExamList[i].checked){
            filterExamChecked.push(filterExamList[i].nextSibling.data);
        }
    }
    var filterData = {
        "filterSectionChecked": filterSectionChecked,
        "filterExamChecked": filterExamChecked
    }
    return filterData;
}

function filter(){
    var filterData = getFilterData()
    const filterSectionChecked = filterData["filterSectionChecked"];
    const filterExamChecked = filterData["filterExamChecked"];

    //checck if the checklist is empty
    if (filterSectionChecked.length == 0){
        //alert user
        $("#AlertFilterMessage").text("Please select at least one section");
        $('#AlertFilter').modal('show');
        //flash drop down once closed
        $("#AlertFilter").on('hidden.bs.modal', function(){
            $('#filterSectionLabel').delay(100).fadeTo(100, 0.3, function(){ $(this).fadeTo(500, 1.0); });
        });
        return false;
    }
    if (filterExamChecked.length == 0){
        //alert user
        $("#AlertFilterMessage").text("Please select at least one exam code");
        $('#AlertFilter').modal('show');
        //flash drop down once closed
        $("#AlertFilter").on('hidden.bs.modal', function(){
            $('#filterExamLabel').delay(100).fadeTo(100, 0.3, function(){ $(this).fadeTo(500, 1.0); });
        });
        return false;
    }
    return true;				
}

function selectAllSections(){
    var filterSection = document.getElementById("filterSection");
    var filterSectionList = filterSection.getElementsByTagName("input");
    if (filterSectionList[0].checked == true) {
        for (var i = 1; i < filterSectionList.length; i++){
            filterSectionList[i].checked = true;
            filterSectionList[i].disabled = true;
        }
    } else {
        for (var i = 1; i < filterSectionList.length; i++){
            filterSectionList[i].checked = false;
            filterSectionList[i].disabled = false;
        }
    }
}

function selectAllExams(){
    var filterExam = document.getElementById("filterExam");
    var filterExamList = filterExam.getElementsByTagName("input");
    if (filterExamList[0].checked == true) {
        for (var i = 1; i < filterExamList.length; i++){
            filterExamList[i].checked = true;
            filterExamList[i].disabled = true;
        }
    } else {
        for (var i = 1; i < filterExamList.length; i++){
            filterExamList[i].checked = false;
            filterExamList[i].disabled = false;
        }
    }
}

function windowOnloadFilter(){
    //select all checkboxes if "All" is selected
    var previous_state = {{ previous_filter | tojson}};
    console.log(previous_state)
    $("#filterSection input").each(function(){
        var all_flag = false; //check if the "All is selected"
        if (previous_state.sections.includes("all_sections")){
            all_flag = true;
        }
        if (previous_state.sections.includes(this.name)){
            this.checked = true;
            if (all_flag == true && this.name != "all_sections"){
                this.disabled = true;
            } else {
                this.disabled = false;
            }
        }else{
            this.checked = false;
            if (all_flag == true && this.name != "all_sections"){
                this.disabled = true;
            } else {
                this.disabled = false;
            }
        }
    });

    $("#filterExam input").each(function(){
        var all_flag = false; // check if the "All" is selected
        if (previous_state.exam_codes.includes("all_codes")){
            all_flag = true;
        }
        if (previous_state.exam_codes.includes(this.name)){
            this.checked = true;
            if (all_flag == true && this.name != "all_codes"){
                this.disabled = true;
            } else {
                this.disabled = false;
            }
        }else{
            this.checked = false;
            if (all_flag == true && this.name != "all_codes"){
                this.disabled = true;
            } else {
                this.disabled = false;
            }
        }
    });
}




$("#btnUploadFile").on("click",function(event){
    var file = $("#inputFile")[0].files[0]
    var upload = new Upload(file)
    upload.doUpload();
})

$("#btnChooseFile").on("click",function(event){
    $("#inputFile").click();
});

$("#inputFile").change(function(){
    var file = $("#inputFile")[0].files[0]
    var filename = file.name;
    var path = (window.URL || window.webkitURL).createObjectURL(file);
    console.log(path)
    $("#fileNameDisplay").val(filename);
})

function AddFile(){
    $("#fileDialog").modal("show");
}

//var typingTimer;
//var doneTypingInterval = 100;

//sends update data to server only sends fields that received keypress events
var update_content = []
var fieldsToUpdate = [];
function updateFields(){
    fieldsToUpdate.forEach(function(item,index){
        var field = $("#"+item).data("field")
        var id = Number($("#"+item).data("id"));
        var value = $("#"+item)[0].value;
        if (field == "score"){
            //convert to numeric value for the score
            value = Number(value);
        }
        update_content.push({"id":id,"field":field,"value":value});
    });

    if (fieldsToUpdate.length>0){
        $.ajax({
            type : 'POST',
            url : "{{url_for('update_field')}}",
            contentType: 'application/json;charset=UTF-8',
            data : JSON.stringify({to_update:update_content}),
            success : function(response){
                console.log(response);
                const isUpdated = response['isUpdated'];
                if (isUpdated){
                    $("#toastTitle").text("Data Updated");
                    $("#toastMuted").text("Verify recent modifications.");
                    $("#toastMessage").text("The modified fields were successfully updated.");
                    $(".toast").toast("show");
                } else {
                    $("#toastTitle").text("Update Error");
                    $("#toastMuted").text("Check connection.");
                    $("#toastMessage").text("An error occured while updating the modifield fields.");
                    $(".toast").toast("show");
                }
                //return response
            },
            error: function(error){
                console.log(error);
            }
        });
        //reset colors
        fieldsToUpdate.forEach(function(item,index){
            $("#"+item).css(
                {"background-color":'#ffffff',
                "border-width" : "1px",
                "border-radius" : "2px",
                "font-family" : "inherit",
                "font-size" : "inherit",
                "line-height" : "inherit",
                "padding-top" : "2px",
                "padding-right" : "2px",
                "padding-bottom" : "2px",
                "padding-left" : "2px",}
            );
        });
        //reset the queue when data is successfully received
        update_content = [];
        fieldsToUpdate = [];
    } else {
        $("#AlertUpdateRecordMessage").text("No modifications were made.");
        $('#alertUpdateRecord').modal('show'); //alert user if there empty fields
    }
}

//trigger updating using CTRL + S
$(window).on("keydown",function(event) {
    if (event.key.toLowerCase() == "s" && event.ctrlKey){
        event.preventDefault();
        updateFields();
    }
});

//save field ids that need to be updated will reset when fields are
//successfully updated
$("#tableRecords").on("keyup",function(event){
    var modified_field = event.target.id;
    if (!fieldsToUpdate.includes(modified_field)){
            fieldsToUpdate.push(modified_field);
            $("#"+modified_field).css({"background-color":"antiquewhite"});
    }
    console.log(modified_field);
    
    /*clearTimeout(typingTimer);
    typingTimer = setTimeout(function(event){
        fieldsToUpdate.forEach(function(item,index){
            var split = item.split("-");
            var field = split[0];
            var id = Number(split[1]);
            var value = $("#"+item)[0].value;
            if (field == "score"){
                //convert to numeric value for the score
                value = Number(value);
            }
            update_content.push({"id":id,"field":field,"value":value});
        });

        console.log(update_content);
        //console.log("Done typing. Resetting fields to update.");
        //fieldsToUpdate = [];
        //content = [];
    },doneTypingInterval);*/
});


/*
$("#tableRecords").on("keydown",function(event){
    clearTimeout(typingTimer);
})*/

$("#switchFirstPage").click(function(){
    changePage("first");
});

$("#switchPrevPage").click(function(){
    changePage("prev");
});

$("#switchNextPage").click(function(){
    changePage("next");
});

$("#switchLastPage").click(function(){
    changePage("last");
});


function changePage(method){
    var lendata = {{database_length}};
    var dx = Number($("#pageDx")[0].value);
    var pages = getNumPages(lendata,dx);
    var pagenumber = Number($("#pageStart")[0].value);

    if (method=="next"){
        pagenumber +=1;
    } else if (method =="prev"){
        pagenumber -=1;
    } else if (method == "last"){
        pagenumber = pages;
    } else if (method == "first"){
        pagenumber = 1;
    }
    pagenumber = Math.max(pagenumber,1);
    pagenumber = Math.min(pagenumber,pages);
    $("#pageStart").val(pagenumber);
    gotoPage();
}

function gotoPage(){
    var lendata = {{database_length}};
    var dx = Number($("#pageDx")[0].value);
    var pages = getNumPages(lendata,dx);
    console.log([lendata,dx,pages]);

    var gotoThis = Number($("#pageStart")[0].value);

    //prevent page number from going beyond valid values
    gotoThis = Math.max(gotoThis,1);
    gotoThis = Math.min(gotoThis,pages);

    const start_indices = range(1,lendata+1,dx);
    var index = gotoThis-1;
    if (index<0){
        var start = 1;
    } else {
        var start = start_indices[index];
    }
    var end = start + dx;
    
    /*
    if  (filter()){
        const filterData = getFilterData()
        var filterSectionChecked = filterData["filterSectionChecked"];
        var filterExamChecked = filterData["filterExamChecked"];
        if (filterSectionChecked.includes(" All")){
            filterSectionChecked = ["all_sections"]
        }
        if (filterExamChecked.includes(" All")){
            filterExamChecked = ["all_codes"]
        }

        //send newSection so that it will get ticked during refresh
        if (newSection != null){
            filterSectionChecked.push(newSection);
        }

        //send newExam so that it will get ticked during refresh
        if (newExam != null){
            filterExamChecked.push(newExam);
        }


    } else {
        alert("Invalid filter.");
        return false;
    }*/

    const sectionState = getSectionsChecked();
    const examState = getExamChecked();
    const numSectionChecked = countTrueDict(sectionState);
    const numExamChecked = countTrueDict(examState);




    var nameSearch = $("#nameSearchDisplay")[0].value;
    var url = "{{url_for('admin')}}?"+`start=${start}&end=${end}&dx=${dx}&prevStart=${gotoThis}&prevDx=${dx}&prevPages=${pages}&name=${nameSearch}&sections=${filterSectionChecked}&codes=${filterExamChecked}`;

    console.log(url);
    window.location.href = url;
}


function confirmDelete(){
    $("#alertDeleteRecord").modal("show");
}

function deleteSelected(){
    var checked = $("#tableRecords tbody tr input:checked");
    //if (checked.length>0){
        //$("#formCheckedDelete").submit();
    //}
    var id_list = [];
    checked.each(function(){
        var row_id = this.value;
        id_list.push(row_id);
    });

    if (checked.length>0){
        $.ajax({
            type : 'POST',
            url : "{{url_for('deleteRecords')}}",
            contentType: 'application/json;charset=UTF-8',
            data : JSON.stringify({ids:id_list}),
            success : function(response){
                console.log(response);
                var remove_ids = response["deleted_ids"];
                var numberRows = $("#tableRecords tbody tr").length;
                for (const row of remove_ids){
                    deleteRowUI(row);
                }

                //add an empty row if no records are left so the table wont shrink
                if (remove_ids.length>=numberRows){
                    $("#tableRecords tbody").html('<tr>\
                            <td><span>&emsp;</span></td>\
                            <td><span>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;</span></td>\
                            <td><span>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;</span></td>\
                            <td><span>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;</span></td>\
                            <td><span>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;</span></td>\
                            <td><span>&emsp;</span></td>\
                        </tr>');
                }
                

                $("#toastMessage").text("Some data were deleted.");
                $(".toast").toast("show");
                return response
            },
            error: function(error){
                console.log(error);
            }
        });
    }
}

function deleteRowUI(id){
    $("#row_"+id).remove();
}

$('html').on('click', function(e) {
    //hide popovers when clicking somewhere else
    if (typeof $(event.target).data('original-title') == 'undefined' && !$(event.target).parents().is('.popover.in')) {
        $('[data-original-title]').popover('hide');
    }
});

$('#btndeleteRecord').on('mouseover', function(e) {
    //hide popovers when clicking somewhere else
    if (typeof $(event.target).data('original-title') == 'undefined' && !$(event.target).parents().is('.popover.in')) {
        $('[data-original-title]').popover('hide');
    }
});

// check or uncheck all checkboxes
$("#checkDeleteAll").click(function(){
    if($(this).is(":checked")){
        $("input:checkbox").prop('checked', true);
    }
    else if($(this).is(":not(:checked)")){
        $("input:checkbox").prop('checked', false);
    }
});

//align heading to left of table
/*function offsetCalculate(){
    if(window.innerHeight < window.innerWidth){
        var parentTop = $('#tableRecords').offset();
        $('#divPanel').offset({'top': parentTop.top});
    }
}
$(document).ready(function () {
    offsetCalculate();
});
$(window).resize(function(){
    offsetCalculate();
});*/


window.onload = function(){
    const userdata = {{ userdata | safe}};
    console.log(userdata);
    const prev_subject_id = userdata.current_subject_id;
    
    
    const subject_loads = {{ subjects_handled | tojson}};
    subject_loads.forEach(function(item,index){
        console.log(item);
        if (item.subject_id == prev_subject_id){
            const subject_display = `${item.subject_name} (${item.school_year})`;
            $("#inputSubjectPanel").val(subject_display);
        }
    });


    console.log(subject_loads);
    $("#progress-wrp").hide();
    $("#inputTeacherName").val(userdata.name);


    windowOnloadFilter(); //initialize filter form
    const database_length = {{database_length}};
    var pagesetup = {{page_setup | safe}};
    var prevStart = pagesetup["prevStart"];
    var prevDx = pagesetup["prevDx"];
    var prevPages = pagesetup["prevPages"];
    var prevName = pagesetup["prevName"];
    console.log(pagesetup)

    if ((database_length==0) && (prevStart==1)){
        prevStart = 0;
    }

    $('[data-toggle="popover"]').popover();
    $('.toast').toast({
        animation:true,
        autohide:true,
        delay:6000,
    });
    /*var dataLength = {{database_length}};
    if (dataLength<=50){
        prevPages = 1;
    }*/
    $("#nameSearchDisplay").val(prevName);
    $("#textNumPage").text("of "+prevPages);
    $("#pageStart").val(prevStart);
    $("#pageDx").val(prevDx);

};