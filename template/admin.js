var delete_subject_id = null; //global subject id to be deleted
var btnDeleteSubject = document.getElementById("btnConfirmDeleteSubject");
btnDeleteSubject.addEventListener('click', function(){
    deleteSubject(delete_subject_id);
});

//delete subject along with all entries for the said subject
function deleteSubject(subject_id){
    $.ajax({
            type : 'POST',
            url : "{{url_for('delete_subject')}}",
            contentType: 'application/json;charset=UTF-8',
            data : JSON.stringify({id:subject_id}),
            success : function(response){
                const isDeleted = response.isDeleted;
                if (isDeleted){
                    const subject_row = $(`#panelScroller div[data-id = "${subject_id}"][data-role = "subject_row"]`)[0];
                    subject_row.remove();
                    updateSubjectList(); //update the dropwdown menu for currently editing
                    gotoPage(); //update current table
                    $("#toastTitle").text("Subject Deleted");
                    $("#toastMuted").text("");
                    $("#toastMessage").text("Selected subject was succesfully removed along with all associated entries.");
                    $(".toast").toast("show");
                } else {
                    $("#toastTitle").text("Subject Deletion Failed");
                    $("#toastMuted").text("");
                    $("#toastMessage").text("Some errors occured while trying to delete the selected subject.");
                    $(".toast").toast("show");
                }
            },
            error: function(error){
                console.log(error)
                $("#toastTitle").text("Subject Deletion Failed");
                $("#toastMuted").text("");
                $("#toastMessage").text("Some errors occured while trying to delete the selected subject.");
                $(".toast").toast("show");
            }
    });
}

//update Subjects in Currently Editing dropdown
function updateSubjectList(){
    $.get("{{url_for('request_subjects_handled')}}",
        function(response){
            const subjects_handled = response.subjects_handled;
            const current_sid = response.current_sid;
            const subject_list = $("#listCodesPanel");
            subject_list.html("");
            subjects_handled.forEach(row => {
                const name = row.subject_name;
                const year = row.school_year;
                const id = row.subject_id;
                if (id==current_sid){
                    //change current text in the dropdown (current subject to be edited.)
                    const subject_display = `${name} (${year})`
                    $("#inputSubjectPanel").val(subject_display);
                }
                subject_list.append(
                    `<div class = "indentlist" style = "word-wrap:break-word;"
                        data-subject_id = "${id}"
                        data-school_year = "${year}"
                        data-subject_name = "${name}">
                        <small data-subject_id = "${id}"
                            data-school_year = "${year}"
                            data-subject_name = "${name}">
                            ${name}&nbsp;
                        </small>

                        <small class = "text-muted"
                            data-subject_id = "${id}"
                            data-school_year = "${year}"
                            data-subject_name = "${name}">
                                (${year})&nbsp;
                        </small>
                        <hr style = "padding-right:5px;"/>
                    </div>`
                )
            });
        }
    );
}

function sectionUpdate(target){
    const old_section = target.getAttribute("data-section");
    const section_field = $(`input[data-purpose="section_name"][data-section="${old_section}"]`)[0];
    const new_section = section_field.value;
    if (new_section.length ==0){
        $("#toastTitle").text("Section Update Failed");
        $("#toastMuted").text("");
        $("#toastMessage").text(`Cannot update ${old_section}. Input is invalid.`);
        $(".toast").toast("show");
        return
    }

    if (new_section != old_section){
        $.ajax({
            type : 'POST',
            url : "{{url_for('update_section')}}",
            contentType: 'application/json;charset=UTF-8',
            data : JSON.stringify({old_section:old_section,new_section:new_section}),
            success : function(response){
                const isUpdated = response.isUpdated;
                if (isUpdated){
                    //change the text beside the checkbox (div has no text property)
                    $("#filterSection div").each(function(){
                        const box = this.getElementsByTagName("input")[0];
                        if (box.name == old_section){
                            const span = this.getElementsByTagName("span")[0];
                            span.innerHTML = new_section;
                        }
                    })

                    //change the name attribute of the check box
                    $("#filterSection div input").each(function(){
                        if (this.name == old_section){
                            this.name = new_section; 
                        }   
                    });

                    //update data-section for the exam fields
                    $(`input[data-purpose="exam_name"][data-section="${old_section}"]`).each(function(){
                        this.dataset.section = new_section;
                    })

                    //update exam delete icons
                    let delete_exam_icon = $(`i[data-purpose="exam_delete"][data-section="${old_section}"]`);
                    delete_exam_icon.each(function(){
                        this.dataset.section = new_section;
                    })

                    //update section delete icon
                    let delete_section_icon = $(`i[data-purpose="section_delete"][data-section="${old_section}"]`)[0];
                    delete_section_icon.dataset.section = new_section;


                    //update data-section for the section field and target
                    section_field.dataset.section = new_section;
                    target.dataset.section = new_section;
                    gotoPage(); //update the table entries

                    $("#toastTitle").text("Section Updated Successfully");
                    $("#toastMuted").text("");
                    $("#toastMessage").text(`All entries in ${old_section} were successfully updated to ${new_section}.`);
                    $(".toast").toast("show");
                } else {
                    const reason = response.reason;
                    console.log(reason);
                    $("#toastTitle").text("Section Update Failed");
                    $("#toastMuted").text("");
                    $("#toastMessage").text(`Some error occured while trying to update ${old_section} to ${new_section}.`);
                    $(".toast").toast("show");
                }
                
            },
            error: function(error){
                console.log(error);
                $("#toastTitle").text("Section Update Failed");
                $("#toastMuted").text("");
                $("#toastMessage").text(`Some error occured while trying to update ${old_section} to ${new_section}. Check connection.`);
                $(".toast").toast("show");
            }
        });
    } else {
        $("#toastTitle").text("Section Update Failed");
        $("#toastMuted").text("");
        $("#toastMessage").text("No changes were made to the section field.");
        $(".toast").toast("show");
        return
    }
}

function examUpdate(target){
    const old_exam = target.getAttribute("data-exam");
    const section = target.getAttribute("data-section");
    const name_field = $(`input[data-purpose="exam_name"][data-exam="${old_exam}"][data-section="${section}"]`)[0];
    const new_exam = name_field.value;
   
    if (new_exam.length ==0){
        $("#toastTitle").text("Exam Update Failed");
        $("#toastMuted").text("");
        $("#toastMessage").text(`Cannot update ${old_exam} of ${section}. Input is invalid.`);
        $(".toast").toast("show");
        return
    }

    if (new_exam != old_exam){
        $.ajax({
            type : 'POST',
            url : "{{url_for('update_exam')}}",
            contentType: 'application/json;charset=UTF-8',
            data : JSON.stringify({old_exam:old_exam,new_exam:new_exam,section:section}),
            success : function(response){
                const isUpdated = response.isUpdated;
                if (isUpdated){
                    const rename_exam = response.rename_exam;
                    var exam_names = [];
                    $("#filterExam div input").each(function(){
                            exam_names.push(this.name);
                    });
                    examExists = exam_names.includes(new_exam)
                    if (rename_exam){
                        //rename first but remove after if it already exists
                        //change the text beside the checkbox (div has no text property)
                        $("#filterExam div").each(function(){
                            const box = this.getElementsByTagName("input")[0];
                            if (box.name == old_exam){
                                const span = this.getElementsByTagName("span")[0];
                                span.innerHTML = new_exam;
                            }
                        })
                        //change the name attribute of the check box
                        $("#filterExam div input").each(function(){
                            if (this.name == old_exam){
                                this.name = new_exam; 
                            }   
                        });

                        //remove the renamed entry if there are more than one instance of it
                        if (examExists){
                            $("#filterExam div").each(function(){
                                const box = this.getElementsByTagName("input")[0];
                                if (box.name == new_exam){
                                    this.remove();
                                    return false; //break "each" so only the fist element is removed.
                                }
                            })
                        }
                    } else {
                        if (!examExists){
                            //add as new exam in the filter dropdown if the exam does not exist yet
                            $("#filterExam").append(
                                `<div class = "indentlist"><input type = "checkbox" name = "${new_exam}" checked>
                                    <span>${new_exam}</span>
                                </div>`
                            )
                        }
                    }

                    //update the delete icons
                    let delete_icon = $(`i[data-purpose="exam_delete"][data-section="${section}"][data-exam="${old_exam}"]`)[0];
                    delete_icon.dataset.exam = new_exam;

                    gotoPage();
                    target.dataset.exam = new_exam;
                    name_field.dataset.exam = new_exam;

                    $("#toastTitle").text("Exam Updated Successfully");
                    $("#toastMuted").text(`In Section: ${section}`);
                    $("#toastMessage").text(`All entries in ${old_exam} were successfully updated to ${new_exam}`);
                    $(".toast").toast("show");
                } else {
                    const reason = response.reason;
                    console.log(reason);
                    $("#toastTitle").text("Exam Update Failed");
                    $("#toastMuted").text("");
                    $("#toastMessage").text(`Some error occured while trying to update ${old_exam} of ${section} to ${new_exam}.`);
                    $(".toast").toast("show");
                }
            },
            error: function(error){
                console.log(error);
                $("#toastTitle").text("Exam Update Failed");
                $("#toastMuted").text("");
                $("#toastMessage").text(`Some error occured while trying to update ${old_exam} of ${section} to ${new_exam}. Check connection.`);
                $(".toast").toast("show");
            }
        });
    } else {
        $("#toastTitle").text("Exam Update Failed");
        $("#toastMuted").text("");
        $("#toastMessage").text("No changes were made to the exam field.");
        $(".toast").toast("show");
        return
    }
}

function examDelete(target){
    const exam_name = target.getAttribute("data-exam");
    const section = target.getAttribute("data-section");
    $.ajax({
        type : 'POST',
        url : "{{url_for('delete_exam')}}",
        contentType: 'application/json;charset=UTF-8',
        data : JSON.stringify({exam_name:exam_name,section:section}),
        success : function(response){
            const isDeleted = response.isDeleted;
            if (isDeleted){
                const remove_exam = response.remove_exam;
                const remove_section = response.remove_section;
                if (remove_exam){
                    //remove from check box
                    $("#filterExam div").each(function(){
                        const box = this.getElementsByTagName("input")[0];
                        if (box.name == exam_name){
                            this.remove();
                        }
                    })
                    //remove from sections panel
                    const container = target.closest("li");
                    container.remove();
                }
                if (remove_section){ 
                    //remove section from filter if no exams under it remains
                    $("#filterSection div").each(function(){
                        const box = this.getElementsByTagName("input")[0];
                        if (box.name == section){
                            this.remove();
                        }
                    })
                    const section_container = $(`.section_exam_container[data-section="${section}"]`)[0];
                    section_container.remove(); 
                }
                gotoPage();

                $("#toastTitle").text("Exam Deleted Successfully");
                $("#toastMuted").text("");
                $("#toastMessage").text(`All entries in ${exam_name} from ${section} were successfully removed.`);
                $(".toast").toast("show");
            } else {
                const reason = response.reason;
                console.log(reason);
                $("#toastTitle").text("Exam Deletion Failed");
                $("#toastMuted").text("");
                $("#toastMessage").text(`Some error occured while trying to delete ${exam_name} from ${section}.`);
                $(".toast").toast("show");
            }
        },
        error: function(error){
            console.log(error);
            $("#toastTitle").text("Exam Deletion Failed");
            $("#toastMuted").text("");
            $("#toastMessage").text(`Some error occured while trying to delete ${exam_name} from ${section}. Check connection.`);
            $(".toast").toast("show");
        }
    });  
}

function sectionDelete(target){
    const section = target.getAttribute("data-section");
    $.ajax({
        type : 'POST',
        url : "{{url_for('delete_section')}}",
        contentType: 'application/json;charset=UTF-8',
        data : JSON.stringify({section:section}),
        success : function(response){
            const isDeleted = response.isDeleted;
            if (isDeleted){
                //remove exam from filters if they are not found anymore
                const to_remove = response.to_remove;
                console.log(to_remove);
                to_remove.forEach(function(item,index){
                    $("#filterExam div").each(function(){
                        const box = this.getElementsByTagName("input")[0];
                        if (box.name == item){
                            this.remove();
                        }
                    });
                });

                //remove section from filter
                $("#filterSection div").each(function(){
                    const box = this.getElementsByTagName("input")[0];
                    if (box.name == section){
                        this.remove();
                    }
                });

                //remove from panel
                const container = target.closest(".section_exam_container");
                container.remove();

                gotoPage();
                $("#toastTitle").text("Section Deleted Successfully");
                $("#toastMuted").text("");
                $("#toastMessage").text(`All entries in ${section} were successfully removed.`);
                $(".toast").toast("show");
            } else {
                const reason = response.reason;
                console.log(reason);
                $("#toastTitle").text("Section Deletion Failed");
                $("#toastMuted").text("");
                $("#toastMessage").text(`Some error occured while trying to delete ${section}.`);
                $(".toast").toast("show");
            }
        },
        error: function(error){
            console.log(error);
            $("#toastTitle").text("Section Deletion Failed");
            $("#toastMuted").text("");
            $("#toastMessage").text(`Some error occured while trying to delete ${section}. Check connection.`);
            $(".toast").toast("show");
        }
    });
}

//add an event listener for subject or exam deletion
var delete_target = null; //global subject id to be deleted
var delete_what = null;
var btnDeleteSectionExam = document.getElementById("btnConfirmDeleteSectionExam");
btnDeleteSectionExam.addEventListener('click', function(){
    if ((delete_target != null) && (delete_what != null)){
        if (delete_what == "exam"){
            examDelete(delete_target)
        } else if (delete_what == "section"){
            sectionDelete(delete_target);
        }
    }
});

//updates or deletes subjects
$("#panelScroller").on("click",function(event){
    const target = event.target;
    if (target.tagName == "I"){
        const purpose = target.getAttribute("data-purpose");
        if (purpose == "section_edit"){
            sectionUpdate(target);
            return
        } else if (purpose == "section_delete"){
            delete_target =target;
            delete_what = "section";
            const section = target.getAttribute("data-section");
            $("#alertDeleteSectionExamMessage").html(`Delete <b>${section}</b> along with all associated entries?`);
            $('#alertDeleteSectionExam').modal('show');
            return
        } else if (purpose == "exam_edit"){
            examUpdate(target);
            return
        } else if (purpose == "exam_delete"){
            delete_target = target;
            delete_what = "exam";
            const section = target.getAttribute("data-section");
            const exam = target.getAttribute("data-exam");
            $("#alertDeleteSectionExamMessage").html(`Delete all entries in <b>${exam}</b> from <b>${section}?</b>`);
            $('#alertDeleteSectionExam').modal('show');
            return
        }


        const subject_id = target.getAttribute("data-id");
        
        const input_name = $(`#panelScroller input[data-id = "${subject_id}"][data-role = "name"]`)[0];
        const input_year = $(`#panelScroller input[data-id = "${subject_id}"][data-role = "school_year"]`)[0];
        const input_pin = $(`#panelScroller input[data-id = "${subject_id}"][data-role = "access_key"]`)[0];
        const subject_name = input_name.value;
        const school_year = input_year.value.toString();
        const pin = input_pin.value;
        console.log(purpose);
        if (purpose == "update"){
            $.ajax({
                type : 'POST',
                url : "{{url_for('update_subject')}}",
                contentType: 'application/json;charset=UTF-8',
                data : JSON.stringify({id:subject_id,subject_name:subject_name,school_year:school_year,pin:pin}),
                success : function(response){
                    isUpdated = response.isUpdated;
                    if (isUpdated){
                        updateSubjectList();
                        $("#toastTitle").text("Subject Updated");
                        $("#toastMuted").text("");
                        $("#toastMessage").text(`Updated to  ${subject_name} (${school_year}) with access key: ${pin}`);
                        $(".toast").toast("show");
                    } else {
                        reason = response.reason;
                        $("#toastTitle").text("Subject Update Failed");
                        $("#toastMuted").text("");
                        $("#toastMessage").text(reason);
                        $(".toast").toast("show");
                    }
                },
                error: function(error){
                    console.log(error);
                    $("#toastTitle").text("Subject Update Field");
                    $("#toastMuted").text("");
                    $("#toastMessage").text("Verify entries and connection.");
                    $(".toast").toast("show");
                }
            });
        } else if (purpose == "delete"){
            //set global variable for subject_id to be deleted
            delete_subject_id = subject_id;
            //show subject delete dialog
            request_count_dialog(subject_id,subject_name,school_year);
        }
    }
});

//show subject deletion comfirmation box
function request_count_dialog(subject_id,subject_name,school_year){
    $.ajax({
        type : 'POST',
        url : "{{url_for('count_entries')}}",
        contentType: 'application/json;charset=UTF-8',
        data : JSON.stringify({id:subject_id}),
        success : function(response){
            count = response.count;
            var plural =  count<2? "entry":"entries";
            $("#alertDeleteSubjectMessage").html(`Delete <b>${subject_name} (${school_year})</b> along with <b>${count}</b> associated ${plural}?`);
            $('#alertDeleteSubject').modal('show');
        },
        error: function(error){
            console.log(error);
        }
    });
}

//activate tooltips
function activateToolTips(){
    $("body").tooltip({
        selector: '[data-toggle="tooltip"]'
    });
}  

var current_panel = "subject_panel"; //default panel displayed
//displays subjects handled and show editing UI for each
function panelSubjectDisplay(){
    current_panel = "subject_panel";  //update global variable to keep track of current panel
    $("#subjectPanel").addClass("is-active");
    $("#sectionPanel").removeClass("is-active");
    $("#examPanel").removeClass("is-active");
    $.get("{{url_for('request_subjects_handled')}}",
        function(response){
            const subjects_handled = response.subjects_handled;
            const panelScroller = $("#panelScroller");
            panelScroller.html("");
            subjects_handled.forEach(row => {
                const name = row.subject_name;
                const year = row.school_year;
                const id = row.subject_id;
                const pin  = row.pin;
                panelScroller.append(
                    `<div class = "addSubjectField" data-id = "${id}" data-role = "subject_row">
                        <input
                            data-id = "${id}"
                            data-field = "subject_name"
                            data-role = "name"
                            type = "text"
                            class = "form-control"
                            placeholder="Subject Name"
                            value = "${name}"
                        >
                        <input
                            data-id = "${id}"
                            data-field = "school_year"
                            data-role = "school_year"
                            type = "text"
                            class = "form-control"
                            placeholder="School Year (eg. 2022-2023)"
                            value = "${year}"
                        >
                        <input
                            data-id = "${id}"
                            data-field = "access_key"
                            data-role = "access_key"
                            type = "password"
                            oninput="this.value=this.value.replace(/[^0-9]/g,'');"
                            class = "form-control"
                            placeholder="Access Key"
                            value = "${pin}"
                        >
                        <i 
                            class="bi bi-pencil-square"
                            data-id = "${id}"
                            data-purpose = "update"
                            data-toggle="tooltip"
                            data-placement="top"
                            title="Save changes.">
                        </i>
                        <i 
                            class="bi bi-trash3-fill"
                            data-id = "${id}"
                            data-purpose = "delete"
                            data-toggle="tooltip"
                            data-placement="top"
                            title="Delete subject.">
                        </i>
                    </div>`);      
            });
            activateToolTips();
    });
}

function panelSectionDisplay(){
    current_panel = "section_panel";  //update global variable to keep track of current panel
    $("#subjectPanel").removeClass("is-active");
    $("#sectionPanel").addClass("is-active");
    $("#examPanel").removeClass("is-active");
    const panelScroller = $("#panelScroller");
    panelScroller.html("");

    $.get("{{url_for('get_sections')}}",
        function(response){
            details = response.details;
            for (var section in details){
                const exam_counts = details[section];
                const num_exams = Object.keys(exam_counts).length;
                const plural = num_exams>1? "Exams":"Exam";
                panelScroller.append(
                    `<div style= "margin-bottom:3px;">
                        <div
                            class = "section_exam_container"
                            data-section = "${section}"
                        >
                            <div class = "row py-2 pl-2" style = "align-items:baseline;">
                                <div class = "col-2">
                                    <span style = "padding-left:18px;"><b>Section:</b></span>
                                </div>
                                <div class = "col-6">
                                    <input
                                        class = "form-control"
                                        placeholder = "Section"
                                        data-purpose = "section_name"
                                        data-section = "${section}" 
                                        value = "${section}">
                                </div>
                                <div class = "col-1">
                                    <i
                                        data-section = "${section}"
                                        data-purpose = "section_edit"
                                        class="bi bi-pencil-square"
                                        data-toggle="tooltip"
                                        data-placement="top"
                                        title="Modify section name">
                                    </i>
                                </div>
                                <div class = "col-1">
                                    <i
                                        data-section = "${section}"
                                        data-purpose = "section_delete"
                                        class="bi bi-trash3-fill"
                                        data-toggle="tooltip"
                                        data-placement="top" 
                                        title="Delete section along with entries">
                                    </i>
                                </div>
                                <div class ="col-1">
                                    <span class="badge badge-secondary badge-pill" data-toggle="tooltip" data-placement="top" title="Number of exams">${num_exams}</span>
                                </div>
                            </div>
                            <ul class="list-group list-group-flush" data-type = "examNameCount" data-section="${section}"></ul>

                        </div>
                    </div>`
                );

                const namecount = $(`ul[data-type="examNameCount"][data-section="${section}"]`);
                for (var exam in exam_counts){
                    count = exam_counts[exam];
                    const plural = count>1? "Entries": "Entry";
                    namecount.append(
                        `<li
                            class = "list-group-item list-group-item-secondary" 
                            style = "padding-top:0px;padding-bottom:0px;"
                            data-purpose = "entry-container"
                        >
                            <div class = "row">
                                <div class = "col-2">
                                    <span class="badge badge-primary badge-pill">${count} ${plural}</span>
                                </div>
                                <div class = "col-lg">
                                    <input
                                        data-purpose = "exam_name"
                                        data-section = "${section}"
                                        data-exam = "${exam}"
                                        class="form-control"
                                        style = "max-height:2em;"
                                        placeholder = "Exam" 
                                        value = "${exam}">
                                </div>
                                <div class = "col-1">
                                    <i  
                                        data-purpose = "exam_edit"
                                        data-section = "${section}"
                                        data-exam = "${exam}"
                                        class="bi bi-pencil-square"
                                        data-toggle="tooltip"
                                        data-placement="top"
                                        title="Modify exam code">
                                    </i>
                                </div>
                                <div class = "col-1">
                                    <i
                                        data-purpose = "exam_delete"
                                        data-section = "${section}"
                                        data-exam = "${exam}"
                                        class="bi bi-trash3-fill"
                                        data-toggle="tooltip"
                                        data-placement="top"
                                        title="Delete exam along with entries">
                                    </i>
                                </div>
                            </div>
                        </li>`
                    )
                }
            }
            activateToolTips();
        });
}


$("#panelSwitcher").on("click",function(event){
    const target = event.target;
    if (target.id == "subjectPanel"){
        panelSubjectDisplay();
    } else if (target.id == "sectionPanel"){
        panelSectionDisplay();
    }
});

function alertSubject(message){
        //alert user if the section and/or exam filter is/are empty.
        $("#alertAddSubjectMessage").text(message);
        $('#alertAddSubject').modal('show');
    }
//validate add subject
function validateAddSubject(){
    var subjectName = $("#subjectName")[0].value;
    const subjectSchoolYear = $("#subjectSchoolYear")[0].value;
    const re_subject = new RegExp("^(?! )[A-Za-z0-9\\s\\-]*(?<! )$", 'gm')
    const re_year = new RegExp("^\\d+-\\d+$", 'gm')
    
    const isSubjectValid = re_subject.test(subjectName);
    subjectName = subjectName.replace(/\s+/g, ' ');//replace double spaces by single space

    const isYearValid = re_year.test(subjectSchoolYear);
    if (!isSubjectValid && !isYearValid){
        alertSubject("Subject name and school year invalid. Remove extra spaces and follow the suggested format.");
        return false;
    } else if (!isSubjectValid){
        alertSubject("Subject name is invalid. Remove leading and trailing spaces.");
        return false;
    } else if (!isYearValid){
        alertSubject("School year is invalid. Follow the suggested format.");
        return false;
    }
    $.ajax({
        type : 'POST',
        url : "{{url_for('add_subject')}}",
        contentType: 'application/json;charset=UTF-8',
        data : JSON.stringify({subject_name:subjectName,school_year:subjectSchoolYear}),
        success : function(response){
            isUpdated = response.isUpdated;
            if (!isUpdated){
                reason = response.reason;
                alertSubject(`Subject: ${subjectName} (${subjectSchoolYear}) already exists.`);
            } else {
                isNewUser = response.isNewUser;
                if (isNewUser){
                    updateSubjectList();
                }

                $("#toastTitle").text("Subject Added");
                $("#toastMuted").text("");
                $("#toastMessage").text(`${subjectName} (${subjectSchoolYear}) successfully added.`);
                $(".toast").toast("show");
                panelSubjectDisplay(); //update the list of subjects on the panel
                updateSubjectList(); //update the list of subjects in the dropdown menu
            }
        },
        error: function(error){
            console.log(error)
        }
    });
}

//script for the filter bar
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
            const success = response['isUpdated'];
            const sections = response['sections'];
            const exams = response['exams'];
            if (success){
                //remove all checkboxes that are not the "all" selectors
                //needed since sections might change depending on the subject load
                $("#filterSection div").each(function(){
                    const box = this.getElementsByTagName("input")[0];
                    if (box.name != "all_sections"){
                        this.remove();
                    }
                });
                //Append the new sections
                sections.forEach(function(item,index){
                    $("#filterSection").append(
                        //make sure all new sections are selected when changing
                        `<div class = "indentlist"><input type = "checkbox" name = "${item}" checked><span>${item}</span></div>`
                    )
                });
                
                //do the same for the exam codes
                $("#filterExam div").each(function(){
                    const box = this.getElementsByTagName("input")[0];
                    if (box.name != "all_codes"){
                        this.remove();
                    }
                });
                exams.forEach(function(item,index){
                    $("#filterExam").append(
                        `<div class = "indentlist"><input type = "checkbox" name = "${item}" checked><span>${item}</span></div>`
                    )
                });

                //change the sections in the add entry modal
                $("#listSections div").each(function(){
                    this.remove();
                });
                sections.forEach(function(item,index){
                    $("#listSections").append(
                        `<div class = "indentlist"><li>${item}</li></div>`
                    );
                })

                //change the exam codes in the add enty modal
                $("#listCodes div").each(function(){
                    this.remove();
                });
                exams.forEach(function(item,index){
                    $("#listCodes").append(
                        `<div class = "indentlist"><li>${item}</li></div>`
                    );
                })

                //update table once section is changed
                gotoPage();
                //update the sections panel once the section is changed (only if the current panel is the section panel)
                if (current_panel == "section_panel"){
                    panelSectionDisplay();
                }
                
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
        },
        error: function(error){
            $("#toastTitle").text("Subject Change Error");
            $("#toastMuted").text("Check connection.");
            $("#toastMessage").text("An error occured while trying to change current subject.");
            $(".toast").toast("show");
        }
    });
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

function getExamsChecked(){
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
    var file = document.getElementById('inputFile').files[0];
    if (file.size > 2100000){
        alert("File exceeded 2MB.")
        return false;
    }
    var form_data = new FormData();
    form_data.append("file",file);

    $("#progress-wrp").show();
    $("#progress-wrp .progress-bar").css("width","0%");
    $("#progress-wrp .status").text("0%");

    $.ajax({
        url: "{{url_for('upload')}}",
        type: "POST",
        data: form_data,
        dataType: 'json',
        processData: false,
        contentType: false,
        cache: false,
        timeout: 90000,
        success: function(response){
            isUploaded = response.success;
            if (isUploaded){
                duplicates = response.duplicates;
                len_added = response.len_added;
                len_duplicates = duplicates.length;

                new_sections = response.new_sections;
                new_exams = response.new_exams;
                new_sections.forEach(function(item,index){
                    $("#filterSection").append(
                        `<div class = "indentlist"><input type = "checkbox" name = "${item}" checked><span>${item}</span></div>`
                    )
                });
                new_exams.forEach(function(item,index){
                    $("#filterExam").append(
                        `<div class = "indentlist"><input type = "checkbox" name = "${item}" checked><span>${item}</span></div>`
                    )
                });
                gotoPage();

                if (len_duplicates>0){
                    duplicates.forEach(function(item,index){
                        duplicate_name = item.name;
                        duplicate_section = item.section;
                        duplicate_code = item.exam_code;
                        duplicate_score = item.score;
                        $("#alertAddFromFileTable tbody").append(`
                        <tr>
                            <td>${duplicate_name}</td>
                            <td>${duplicate_section}</td>
                            <td>${duplicate_code}</td>
                            <td>${duplicate_score}</td>
                        </tr>`);
                    });
                    $("#alertAddFromFileTable").show();
                } else {
                    $("#alertAddFromFileTable").hide();
                }

                //TODO: Verify why the confirmation modal won't show unless there are duplicates
                $("#alertAddFromFileTitle").text("File Upload Results");
                $("#alertAddFromFileMessage").html(`
                    <small>
                        Entries Added: ${len_added}, Duplicates Found: ${len_duplicates}
                    </small><br>
                    <small>
                        Refresh page to view changes.
                    </small>`);
                $("#alertAddFromFile").modal("show");

            } else {
                //server encountered an error while deleting
                reason = response.reason;
                $("#alertAddFromFileTable").hide();
                $("#alertAddFromFileTitle").text("File upload failed.");
                $("#alertAddFromFileMessage").text(reason);
                $("#alertAddFromFile").modal("show");
            }

            setTimeout(function(){
                $("#progress-wrp").hide();
            },3000)
        },
        error: function (request,status,error){
            console.log(error);
            if (status == "timeout") {
                $("#toastTitle").text("File Upload Timeout");
                $("#toastMuted").text("Check network connection.");
                $("#toastMessage").text(`Server response is taking too long. Reload page to check for changes.`);
                $(".toast").toast("show");
            } else {
                $("#toastTitle").text("File Upload Error");
                $("#toastMuted").text("Try reloading the page to check for changes.");
                $("#toastMessage").text(`Some error occured while trying to upload data.`);
                $(".toast").toast("show");
            }
        },
        xhr: function (){
            var xhr = new window.XMLHttpRequest()
            //xhr.upload.addEventListener("progress",updateProgressBar,false);
            xhr.upload.onprogress = function(event){updateProgressBar(event)};
            return xhr;
        }
    })

})

function updateProgressBar(event) {
    var percent = 0;
    var position = event.loaded || event.position;
    var total = event.total;
    var progress_bar_id = "#progress-wrp";
    if (event.lengthComputable) {
        percent = Math.ceil(position / total * 100);
    }
    // update progressbars classes so it fits your code
    $(progress_bar_id + " .progress-bar").css("width", +percent + "%");
    $(progress_bar_id + " .status").text(percent + "%");
};

$("#btnChooseFile").on("click",function(event){
    $("#inputFile").trigger('click');
});


$("#inputFile").change(function(){
    var file = $("#inputFile")[0].files[0]
    var filename = file.name;
    //var path = (window.URL || window.webkitURL).createObjectURL(file);
    //console.log(path)
    $("#fileNameDisplay").val(filename);
})

//show modal for file upload
function AddFile(){
    $("#fileDialog").modal("show");
}

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

//submit filters when enter key is pressed to update the table
$(window).on("keydown",function(event) {
    if (event.key  == "Enter"){
        //event.preventDefault();
        gotoPage();
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
});

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

//handler for the page change buttons (last,prev,next,last)
var global_lendata = {{database_length}}; //placeholder value
function changePage(method){
    var lendata = global_lendata;
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

function getStartEnd(pagestart,lendata,dx,pages){
    //calculates the start and end indices for the display
    pagestart = Math.max(pagestart,1);
    pagestart = Math.min(pagestart,pages);
    const start_indices = range(1,lendata+1,dx);
    var index = pagestart-1;
    var start = 1
    if (index>0){
        start = start_indices[index];
    }
    var end  = start + dx;
    return {"start":start,"end":end}
}

function filterAlert(message){
    //alert user if the section and/or exam filter is/are empty.
    $("#alertFilterMessage").text(message);
    $('#alertFilter').modal('show');
    /*//flash drop down once closed
    $("#alertFilter").on('hidden.bs.modal', function(){
        $('#filterSectionLabel').delay(100).fadeTo(100, 0.3, function(){ $(this).fadeTo(500, 1.0); });
    });*/
}

function checkSectionExamFilters(){
    //check if the filters for the exam code and sections are valid
    const sectionState = getSectionsChecked();
    const examState = getExamsChecked();
    const numSectionChecked = countTrueDict(sectionState);
    const numExamChecked = countTrueDict(examState);

    if ((numSectionChecked==0) && (numExamChecked==0)){
        filterAlert("Please select at least one section and exam code.");
        return false;
    } else if (numSectionChecked==0) {
        const message = "Please select at least one section."
        filterAlert(message);
        return false;
    } else if (numExamChecked==0){
        filterAlert("Please select at least one exam code.");
        return false;
    }
    return true;
}

function updatePagination(numpages,lendata){
    var page = $("#pageStart")[0].value;
    page = Math.max(page,1);
    page = Math.min(numpages,page);
    if (lendata == 0){
        page = 0
    }
    $("#pageStart").val(page);
    $("#textNumPage").text("of " + numpages);
}

//changes the data contents of the table based on the given filters
function gotoPage(){
    const lendata = {{database_length}};
    const dx = Number($("#pageDx")[0].value);
    const pages = getNumPages(lendata,dx);
    const pagestart = Number($("#pageStart")[0].value);
    const nameSearch = $("#nameSearchDisplay")[0].value;
    const section_filter = getSectionsChecked();
    const exam_filter = getExamsChecked();

    const indices = getStartEnd(pagestart,lendata,dx,pages);
    start = indices.start;
    end = indices.end;

    //const isFilterValid = checkSectionExamFilters();
    //BYPASSED - issue with newly added subjects
    isFilterValid = true;
    if (isFilterValid){
        $.ajax({
            type : 'POST',
            url : "{{url_for('filter_table')}}",
            contentType: 'application/json;charset=UTF-8',
            data : JSON.stringify({
                dx:dx,
                pagestart:pagestart,
                table_indices:indices,
                name_search:nameSearch,
                section_filter:section_filter,
                exam_filter:exam_filter
            }),
            success : function(response){
                const data = response['data'];
                const lendata = response['lendata'];//length of total filtered data not the currently displayed data
                const pagesetup = response["pagesetup"];
                const unique_names = response["unique_names"];
                const numpages = pagesetup.pages;
                const start_index = pagesetup.start;
                //remove the old rows
                $("#tableRecords tbody tr").each(function(){
                    this.remove();
                });

                const table_body = $("#tableRecords tbody")
                if (lendata == 0){
                    //add an empty row
                    table_body.append(
                        "<tr>\
                            <td><span>&emsp;</span></td>\
                            <td><span>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;</span></td>\
                            <td><span>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;</span></td>\
                            <td><span>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;</span></td>\
                            <td><span>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;</span></td>\
                            <td><span>&emsp;</span></td>\
                        </tr>"
                    )                                
                } else {
                    //add the data sent as rows
                    data.forEach(function(row,index){
                        table_body.append(
                            `<tr id = "row_${row.id}">
                                <td><div class='edit' style = "text-align:center;" data-id = "${row.id}">${start_index + index + 1}</div></td>
                                <td> 
                                    <div class='edit'>
                                        <input type='text' class='txtedit' style = "width:300px;" value='${row.name}' id='name_${row.id}' data-field = "name" data-id = "${row.id}">
                                    </div> 
                                </td>
                                <td> 
                                    <div class='edit' style = "text-align: left;">
                                        <input type='text' class='txtedit' value='${row.section}' id='section_${row.id}' data-field = "section" data-id = "${row.id}" >
                                    </div> 
                                </td>
                                <td> 
                                    <div class='edit'>
                                        <input type='text' class='txtedit inputfield' value='${row.exam_code}' id='exam_code_${row.id}' data-field = "exam" data-id = "${row.id}">
                                    </div> 
                                </td>
                                <td> 
                                    <div class='edit'>
                                        <input type='number' class='txtedit inputield' value='${row.score}' id='score_${row.id}' data-field = "score" data-id = "${row.id}">
                                    </div> 
                                </td>
                                <td>
                                    <div class = "centerdiv">
                                        <input type="checkbox" name="${row.id}" value="${row.id}" id="checkDelete_${row.id}"
                                        data-toggle = 'popover' title = "Confirm" data-content = "Delete this record.">
                                    </div>
                                </td>
                            </tr>`
                        )
                    });
                }

                //update some global variable
                global_lendata = lendata;
                search_terms = unique_names;

                //update the page numbers
                updatePagination(numpages,lendata);
                updateCountFooter(data.length,lendata);
            },
            error: function(error){
                console.log(error);
                $("#toastTitle").text("Page Access Failed");
                $("#toastMuted").text("");
                $("#toastMessage").text(`Some error occured while trying to fetch the page`);
                $(".toast").toast("show");
            }
        });
    }
}

//updates the table footer
function updateCountFooter(current,total){
    $("#countShown").text(current);
    $("#countTotal").text(total);
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
                const isDeleted = response.isDeleted;
                if (isDeleted){
                    const remove_ids = response["deleted_ids"];
                    const numberRows = $("#tableRecords tbody tr").length;
                    for (const row of remove_ids){
                        $("#row_"+row).remove();
                    }

                    //remove exam from filters if they are not found anymore
                    const to_remove_exams = response.to_remove_exams;
                    to_remove_exams.forEach(function(item,index){
                        $("#filterExam div").each(function(){
                            const box = this.getElementsByTagName("input")[0];
                            if (box.name == item){
                                this.remove();
                            }
                        });
                    });

                    //remove section from filters if they are not found anymore
                    const to_remove_sections = response.to_remove_sections;
                    to_remove_sections.forEach(function(item,index){
                        $("#filterSection div").each(function(){
                            const box = this.getElementsByTagName("input")[0];
                            if (box.name == item){
                                this.remove();
                            }
                        });
                    });

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
                    
                    $("#toastTitle").text("Record Deletion Successful");
                    $("#toastMuted").text("");
                    $("#toastMessage").text(`Selected records (${remove_ids.length}) were successfuly removed.`);
                    $(".toast").toast("show");
                } else {
                    reason = response.reason;
                    console.log(reason);
                    $("#toastTitle").text("Record Deletion Failed");
                    $("#toastMuted").text("");
                    $("#toastMessage").text(`Some error occured while trying to delete the selected records.`);
                    $(".toast").toast("show");
                }

            },
            error: function(error){
                console.log(error);
                $("#toastTitle").text("Record Deletion Failed");
                $("#toastMuted").text("");
                $("#toastMessage").text(`Some error occured while trying to delete the selected records. Check your connection.`);
                $(".toast").toast("show");
            }
        });
    }
}

function deleteRowUI(id){
    $("#row_"+id).remove();
}

$('html').on('click', function(event) {
    //hide popovers when clicking somewhere else
    if (typeof $(event.target).data('original-title') == 'undefined' && !$(event.target).parents().is('.popover.in')) {
        $('[data-original-title]').popover('hide');
    }
});

$('#btndeleteRecord').on('mouseover', function(event) {
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

window.onload = function(){
    //initialize all tooltips
    $('[data-toggle="tooltip"]').tooltip()

    const userdata = {{ userdata | safe}};
    const prev_subject_id = userdata.current_subject_id;
    
    
    const subject_loads = {{ subjects_handled | tojson}};
    subject_loads.forEach(function(item,index){
        if (item.subject_id == prev_subject_id){
            const subject_display = `${item.subject_name} (${item.school_year})`;
            $("#inputSubjectPanel").val(subject_display);
        }
    });

    //console.log(subject_loads);
    $("#progress-wrp").hide();
    $("#inputTeacherName").val(userdata.name);


    windowOnloadFilter(); //initialize filter form
    const database_length = {{database_length}};
    var pagesetup = {{page_setup | safe}};
    var prevStart = pagesetup["prevStart"];
    var prevDx = pagesetup["prevDx"];
    var prevPages = pagesetup["prevPages"];
    var prevName = pagesetup["prevName"];

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

var newSection = null;
var newExam = null;
function validateAddRecordForm(){
    const name = $("#entryName")[0].value;
    const section = $("#inputSection")[0].value;
    const code = $("#inputCode")[0].value;

    var section_names = [];
    var exam_names = []
   
    async function getSectionExam(){
        const result = await $.ajax({
            url:"{{url_for('get_unique_section_exam')}}",
            type: 'GET'
        });
        return result;
    }

    async function addMain(){
        const response = await getSectionExam();
        if ("error" in response){
            $("#addRecord").modal("hide");
            $("#toastTitle").text("Add Record Failed");
            $("#toastMessage").text(response.error);
            $("#toastMuted").text("");
            $("#add_record_button").prop('disabled',false);
            $(".toast").toast("show");
            return
        }


        section_names = response.sections;
        exam_names = response.exams;
        $.ajax({
            type : 'POST',
            url : "{{url_for('checkDuplicate')}}",
            contentType: 'application/json;charset=UTF-8',
            data : JSON.stringify({name:name,section:section,code:code}),
            success : function(response){
                //console.log(response);
                const isDuplicate = response["isDuplicate"];
                const name = $("#entryName")[0].value;
                const section = $("#inputSection")[0].value;
                const code = $("#inputCode")[0].value;
                const score = $("#entryScore")[0].value;

                if (isDuplicate){   
                    const message = `Name: ${name}, Section: ${section}, Exam: ${code} already exists.`
                    //event.preventDefault();
                    $("#AlertAddRecordMessage").text(message);
                    $('#alertAddRecord').modal('show'); //alert user if there empty fields
                    return false
                }
                
                var validation = checkInfo();
                if (validation == false){
                    //event.preventDefault();
                    $("#AlertAddRecordMessage").text("Some fields were empty.");
                    $('#alertAddRecord').modal('show'); //alert user if there empty fields
                    return false
                }

                if (!isNumeric(score)){
                    $("#AlertAddRecordMessage").text("Enter a numeric score.");
                    $('#alertAddRecord').modal('show'); //alert user if there empty fields
                    return false;
                }
                //console.log("Form submitted.");
                //$("#formAddRecord").submit();
                $("#add_record_button").prop('disabled',true);
                $.ajax({
                    type : 'POST',
                    url : "{{url_for('add_record')}}",
                    contentType: 'application/json;charset=UTF-8',
                    data : JSON.stringify({name:name,section:section,code:code,score:score}),
                    success : function(response){
                        const isAdded = response.isAdded;

                        if (isAdded){
                            var toast_message = `${name} from ${section} was added to ${code} with a score of ${score}.`;
                            $("#addRecord").modal("hide");
                            $("#toastMessage").text(toast_message);
                            $("#add_record_button").prop('disabled',false);
                            $(".toast").toast("show");

                            console.log(section_names,exam_names);
                            //detect if the added section is new
                            if (!section_names.includes(section.trim())){
                                newSection = section.trim();
                                $("#filterSection").append(
                                    `<div class = "indentlist"><input type = "checkbox" name = "${newSection}" checked><span>${newSection}</span></div>`
                                )
                            }

                            //detect if the added exam code is new
                            if (!exam_names.includes(code.trim())){
                                newExam = code.trim();
                                $("#filterExam").append(
                                    `<div class = "indentlist"><input type = "checkbox" name = "${newExam}" checked><span>${newExam}</span></div>`
                                )
                            }
                            
                            //refresh table when new entry is added
                            gotoPage();

                            //refresh section/exam panel if its currently displayed
                            if (current_panel == "section_panel"){
                                panelSectionDisplay();
                            }
                            
                        } else {
                            const reason = response.reason;
                            $("#addRecord").modal("hide");
                            $("#add_record_button").prop('disabled',false);
                            $("#toastTitle").text("Add Record Failed");
                            $("#toastMuted").text("");
                            $("#toastMessage").text(reason);
                            $(".toast").toast("show");
                        }

                    },
                    error: function(error){
                        console.log(error);
                        $("#addRecord").modal("hide");
                        $("#add_record_button").prop('disabled',false);
                    }
                });
            },
            error: function(error){
                console.log(error);
                $("#add_record_button").prop('disabled',false);
            }
        });
    } 
    addMain(); //runs the async function above  
};

function checkInfo(){
    const name = $("#entryName")[0].value;
    const section = $("#inputSection")[0].value;
    const code = $("#inputCode")[0].value;
    const score = $("#entryScore")[0].value;
    if (!name || !section || !code || !score){
        return false;
    } else {
        return true;
    }
}


$("#btnShowAddRecordModal").on("click",function(event){
    $("#addRecord").modal("show");
});

// use "on" instead of "click" so jquery can bind to dynamically generated elements
$('#listSections').on("click","li",function(event) {
    const target = event.target;
    if (target.tagName == "LI"){
        const selected = target.textContent; //regular "target.text" won't work
        $("#inputSection").val(selected);

    }          
});

$('#listCodes').on("click","li",function(event) {
    const target = event.target;
    if (target.tagName == "LI"){
        const selected = target.textContent;
        $("#inputCode").val(selected);
    }
});

//replace name when clicking on the suggestions
$("#resultShow ul-li").click(function(e){
    var selected = $(this).text();
    $("#entryName").val(selected);
});

var search_terms = [
    {% for name in unique_names %}
        "{{ name }}",
    {% endfor %}
];

function autocompleteMatch(input) {
    if (input == '') {
        return [];
    }
    var reg = new RegExp(input)
    return search_terms.filter(function(term) {
        if (term.match(reg)) {
            return term;
        }
    });
};

function showResults(val) {
    res = document.getElementById("resultShow");
    res.innerHTML = '';
    let list = '';
    let terms = autocompleteMatch(val);
    let unique = [];
    for (i=0; i<Math.min(terms.length,10); i++) {
        list += '<a href = "#">' + terms[i] + '</a><br/>';
    }
    res.innerHTML = '<div class = "dropdown-content" id = "divSuggestions">' + list + '</div>';
};

//erase suggestion divs when clicking outsite
$('html').on('click', function(event) {
    //$("#addRecord").modal("hide");
    var target = event.target;
    res = document.getElementById("resultShow");
    //console.log(target.parentElement.id);
    if (target.nodeName == "A"){
        if (target.text != ""){
            if (target.parentElement.id == "divSuggestions"){
                $("#entryName").val(target.text);
            }
        }
    }
    res.innerHTML = "";
});

$("#btnDownloadData").on("click",function(){
    var ids = [];
    $("#tableRecords tbody tr td:first-child div").each(function(){
        ids.push(parseInt(this.dataset.id));
    })
    $.ajax({
        type : 'POST',
        url : "{{url_for('download_data')}}",
        contentType: 'application/json;charset=UTF-8',
        data : JSON.stringify({ids:ids}),
        success : function(response){
            const a = document.createElement("a")
            document.body.appendChild(a);
            a.style = "display:none;"

            const blob = new Blob(["\ufeff",response])
            const url = URL.createObjectURL(blob)
            a.href = url;
            a.download = "export.csv";
            a.click()
            document.body.removeChild(a);            
        },
        error: function(error){
            console.log(error);
        }
    });
    
})

$("#btnDeleteAccount").on("click",function(){
    console.log("Delete account");
    $("#deleteAccountModal").modal("show");
});

const pw_confirm_a = document.getElementById("pw_confirm_a");
const pw_confirm_b = document.getElementById("pw_confirm_b");
function check_pw_confirm(){
    const pwa = $("#pw_confirm_a")[0].value;
    const pwb = $("#pw_confirm_b")[0].value;
    if ((pwa.length > 0) && (pwb.length > 0) && (pwa==pwb)){
        $("#btnConfirmDeleteAccount").prop('disabled',false);
    } else {
        $("#btnConfirmDeleteAccount").prop('disabled',true);
    }
}

pw_confirm_a.addEventListener("keyup",(e) => {
    check_pw_confirm();
});

pw_confirm_b.addEventListener("keyup",(e) => {
    check_pw_confirm();
});


$("#btnConfirmDeleteAccount").on("click",function(){
    $("#deleteAccountModal").modal("hide");
    const pw = $("#pw_confirm_b")[0].value;
    $.ajax({
        type : 'POST',
        url : "{{url_for('delete_user_account')}}",
        contentType: 'application/json;charset=UTF-8',
        data : JSON.stringify({pw:pw}),
        success : function(response){
             if ("error" in response) {
                $("#toastTitle").text("Account Deletion Failed");
                $("#toastMuted").text("");
                $("#toastMessage").text(response.error);
                $(".toast").toast("show");
             } else {
                window.location.href = response.redirect;
             }
        },
        error: function(error){
            console.log(error)
            $("#toastTitle").text("Account Deletion Failed");
            $("#toastMuted").text("Check your connection.");
            $("#toastMessage").text("Some errors occured while trying to delete your account.");
            $(".toast").toast("show");
        }
    });
});


$("#btnViewCount").on("click",function(){
    $("#spinner_refresh_views").hide();
    show_view_count();
});

$("#btnUpdateViewCount").on("click",function(){
    $("#spinner_refresh_views").show();
    show_view_count();
});

function show_view_count(){
    $.ajax({
        type : 'POST',
        url : "{{url_for('get_view_count')}}",
        contentType: 'application/json;charset=UTF-8',
        data : JSON.stringify({}),
        success : function(response){
            data = response.data;
            $("#view_body").empty();
            
            data.map((row,index) => {
                id = row.id;
                year = row.school_year;
                subject = row.subject_name;
                views = row.views;
                $("#view_body").append(
                    `<hr>
                    <div class = "container">
                        <div class = "row justify-content-md-center" style = "align-items:center;">
                            <div class = "col-12 col-md-2">
                                ${index+1}
                            </div>
                            <div class = "col-12 col-md-6">
                                ${subject} (${year})
                            </div>
                            <div 
                                class = "col-12 col-md-2"
                                data-views_subject_id = "${id}"
                                >
                                ${views}
                            </div>
                            
                            <div class = "col-12 col-md-2">
                                <button
                                    type="button"
                                    class="btn btn-outline-danger btn-sm views-reset"
                                    data-subject_id = "${id}"
                                    >
                                    <i class="bi bi-arrow-clockwise"></i>Reset
                                </button>
                            </div>
                        </div>
                    </div>
                    `
                    );
            });
            setTimeout(
                function(){
                    $("#spinner_refresh_views").hide();
                },
            800);
            $("#view_body").append("<hr>");
            $("#showViewCountModal").modal("show");
        },
        error: function(error){
           console.log(error);
           setTimeout(
                function(){
                    $("#spinner_refresh_views").hide();
                },
            800);
        },
    })
}

$("#view_body").on('click',".views-reset",function(e){
    const subject_id = e.target.dataset.subject_id;
    $.ajax({
        type : 'POST',
        url : "{{url_for('reset_view_count')}}",
        contentType: 'application/json;charset=UTF-8',
        data : JSON.stringify({subject_id:subject_id}),
        success : function(response){
            console.log(response);
            isSuccess = response.isSuccess;
            if (isSuccess){
                e.target.disabled = true;
                $(`div[data-views_subject_id='${subject_id}']`).each(function(){
                    this.innerHTML = 0;
                });
            }
        },
        error: function(error){
            console.log(error);
        },
    });
});

$('[data-role="access_key"]').on("click",function(event){
    $(this).attr("type","number");
});

$('[data-role="access_key"]').on("focusout",function(event){
    $(this).attr("type","password");
});