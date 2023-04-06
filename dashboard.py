#%% Run imports
from flask import Flask, render_template, redirect, url_for, make_response,send_from_directory,request,session
from flask_login import LoginManager, login_required, login_user, logout_user,current_user
from sqlalchemy import text,delete

import os
import math
import secrets
import numpy as np
import pandas as pd
from models import db,User,Subject,Entry

#%% Prepare Flask App
app = Flask(__name__,
                  static_url_path = '',
                  static_folder = 'static',
                  template_folder = 'template')
app.config['DEBUG'] = True
app.config['SECRET_KEY'] = secrets.token_hex(16)
app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///data/test.db"
app.config['SQLALCHEMY_ECHO'] = False
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
#app.config["SESSION_TYPE"] = "filesystem"
#app.config["SESSION_FILE_DIR"] = "/session_tmp"

login_manager = LoginManager()
login_manager.init_app(app)

db.app = app
db.init_app(app)

@app.before_first_request
def create_tables():
    with app.app_context():
        db.create_all()
        db.session.commit()
    
#%%
@app.route("/home")
def index():
    return render_template("home.html")

@app.route("/profile")
def profile():
    return render_template("profile.html")

@app.route("/login",methods = ["GET","POST"])
def login():
    if request.method == "POST":
        username = request.get_json()["username"]
        password = request.get_json()["password"]
        if current_user.is_authenticated:
            message = f"""An account is currenly signed in. <a href = '{url_for('logout')}'>Logout</a> instead?"""
            return {"success":False,"reason":message}
        try:
            user = User.query.filter_by(username = username).first()
            session["username"] = None
            if user and user.check_password(password=password):
                login_user(user)
                session["username"] = username
                next_page = request.args.get('next')
                return {"success":True}
            else:
                return {"success":False,"reason":"Username and/or password is/are incorrect."}
        except Exception as error:
            print("An error occured while signing in.")
            print(f"ERROR: {error}")
            return {"success":False,"reason":str(error)}
    return render_template("login.html")

@app.route("/session")
def showuser():
    username = current_user.username
    name = current_user.name
    id = current_user.id
    password = current_user.password
    userdata = [username,name,id,password]

    query = text(f"SELECT subject_name,school_year FROM subjects WHERE teacher_id = {current_user.id}")
    result = db.engine.execute(query)
    result = [{"subject_name":name,"school_year":sy} for name,sy in result]
    print(result)
    return {"username":session['username'],"currentuser":current_user.__repr__(),"userdata":userdata, "query":result}

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@login_manager.user_loader
def load_user(user_id):
    """Check if user is logged-in on every page load."""
    if user_id is not None:
        return User.query.get(user_id)
    return None

@login_manager.unauthorized_handler
def unauthorized_callback():
    return redirect(url_for('index'))

@app.route("/signup", methods = ["GET","POST"])
def signup(): 
    if request.method == "POST":
        username = request.get_json()["username"]
        password = request.get_json()["password"]
        realname = request.get_json()["displayname"]
        existing_user = User.query.filter_by(username = username).first()
        if existing_user is None:
            user = User(
                username=username,
                name=realname,
            )
            user.set_password(password)
            db.session.add(user)
            db.session.commit()  # Create new user
            login_user(user)  # Log in as newly created user
            return {"isExist":False}
        else:
            return {"isExist":True}
    elif request.method == "GET":
        return render_template("signup.html")

def isRowDuplicate(row):
    name = row["name"]
    section = row["section"]
    code = row["exam_code"]
    current_sid = current_user.current_subject_id
    query = f"""SELECT * FROM entries 
                WHERE subject_id = {current_sid} 
                AND name = '{name}' 
                AND section = '{section}'
                AND exam = '{code}';"""
    if current_sid is None:
        #handle new user, return false to skip validation (to be handled in add_record)
        #Reason: adding a new entry will not work if this is not bypassed since it would
        #check first for any duplicates.
        return False

    results = list(db.session.execute(query))
    if len(results)>0:
        return True
    return False

def add_from_df(df):
    current_sid = current_user.current_subject_id
    duplicates = []
    added = []
    query_sections = f"""SELECT DISTINCT(section) FROM entries WHERE subject_id = {current_sid};"""
    existing_sections = [val[0] for val in list(db.session.execute(query_sections))]
    query_exams = f"""SELECT DISTINCT(exam) FROM entries WHERE subject_id = {current_sid};"""
    existing_exams = [val[0] for val in list(db.session.execute(query_exams))]

    bool_sections = df.section.isin(existing_sections)
    bool_exams = df.exam_code.isin(existing_exams)

    new_sections = list(df.section[~bool_sections].unique())
    new_exams = list(df.exam_code[~bool_exams].unique())

    for row in df.to_dict("records"):
        name = row["name"]
        section = row["section"]
        code = row["exam_code"]
        score = float(row["score"])
        if isRowDuplicate(row):
            duplicates.append(row)
        else:
            added.append(row)
            entry = Entry(name = name, section = section, exam = code, score = score, subject_id = current_user.current_subject_id)
            db.session.add(entry)
            db.session.commit()
    return added,duplicates,new_sections,new_exams

def validate_df(df):
    df = df.copy()
    columns = ["name","section","exam_code","score"]
    types = [str,str,str,float]
    for col_name,col_type in zip(columns,types):
        if col_type == str:
            column = [val.strip() for val in df[col_name].fillna("NULL")]
        elif col_type == float:
            column = []
            for val in df[col_name]:
                try:
                    column.append(float(val))
                except ValueError:
                    return False
        df[col_name] = column
    return df

@app.route("/upload",methods = ["POST"])
@login_required
def upload():
    current_sid = current_user.current_subject_id
    if current_sid is None:
        return {"success": False,"reason":"Please specify the subject to work with."}

    columns = ["name","section","exam_code","score"]
    columns_present = []
    df = None
    if request.method == "POST":
        #_ = request.get_data() #add this even though the data is not used
        file = request.files["file"]
        file_ext = file.filename.split('.')[-1]
        if file_ext == "csv" or file_ext == "xls":
            df = pd.read_csv(file).fillna(0)
        elif file_ext == "xlsx":
            #df = pd.read_excel(file).fillna(0)
            return {"success": False,"reason":"File type not supported. Save file as CSV or XLS instead."}
        
        if df is None:
            return {"success": False,"reason":"File type not supported."}
        else:
            for col in columns:
                if col in df.columns:
                    columns_present.append(col)
            if len(columns) != len(columns_present):
                return {"success":False, "reason":"Columns required were not present."}
            else:
                validated_df = validate_df(df)
                if type(validated_df) != bool:
                    added,duplicates,new_sections,new_exams = add_from_df(df)
                    return {"success":True,"len_added":len(added),
                            "duplicates":duplicates,
                            "new_sections":new_sections,
                            "new_exams":new_exams}
                else:
                    return {"success":False, "reason":"Non-numeric data were found in the scores."}

@app.route("/update_current_subject",methods = ["POST"])
def update_current_subject():
    isUpdated = False
    sections,exams = [],[]
    if request.method == "POST":
        try:
            current_sid= request.get_json()["current_subject_id"]
            current_sid = int(current_sid)
            query = text(f"""UPDATE users
                            SET current_subject_id = {current_sid}
                            WHERE users.id = {current_user.id};""")
            db.session.execute(query)
            db.session.commit()

            #get the current sections and exams for the current subject load
            query = f"SELECT DISTINCT section FROM entries WHERE subject_id = {current_sid};"
            sections = [val[0] for val in db.session.execute(query)]
            query = f"SELECT DISTINCT exam FROM entries WHERE subject_id = {current_sid};"
            exams = [val[0] for val in db.session.execute(query)]
            isUpdated = True
        except Exception as error:
            print(f"Error encountered while trying to change current subject.")
            print(f"Error: {error}")
    return {"isUpdated":isUpdated,"sections":sections,"exams":exams}

#%% Main views
@app.route("/filtertable",methods = ["POST"])
def filter_table():
    data = request.get_json()
    pagestart,dx =  data["pagestart"],data["dx"]
    start,end = data["table_indices"]["start"], data["table_indices"]["end"]
    name_search = data["name_search"]
    section_filter = data["section_filter"]
    exam_filter = data["exam_filter"]
    
    current_sid = current_user.current_subject_id
    if current_sid is None:
        #handle new user, return empty data
        data = {"id":"","name":"","section":"","exam_code":"","score":""}
        pagesetup = {"start":0,"end":0,"pages":0}
        response = {"data":data,"pagesetup":pagesetup,"lendata":0,"unique_names":[]}
        return response

    query = f"SELECT * FROM entries WHERE subject_id = {current_sid};"
    if name_search != "":
        query = f"SELECT * FROM entries WHERE subject_id = {current_sid} AND LOWER(name) LIKE '%{name_search.lower()}%';"      

    df_unfiltered = pd.read_sql_query(query,db.get_engine())
    
    query = f"SELECT DISTINCT name FROM entries WHERE subject_id = {current_sid}"
    unique_names = [val[0] for val in db.session.execute(query)]
    
    section_find = [sec for sec,state in section_filter.items() if state]
    exam_find = [exam for exam,state in exam_filter.items() if state]

    df_filter = df_unfiltered.isin({"section":section_find,"exam":exam_find})
    df_filtered = df_unfiltered.loc[(df_filter.section) & (df_filter.exam)].copy()
    df_filtered.rename(columns = {"exam":"exam_code"},inplace = True)

    include = ["id","name","section","exam_code","score"]
    df_rows = df_filtered[include].to_dict("records")
    
    start,end,pages = get_page_setup(pagestart,len(df_filtered),dx)
    pagesetup = {"start":start,"end":end,"pages":pages}
    df_rows = df_rows[start:end]

    response = {"data":df_rows,"pagesetup":pagesetup,"lendata":len(df_filtered),"unique_names":unique_names}
    return response

def get_page_setup(pagestart,lendata,dx):
    """Returns the indices for start and end in the database
    given the page number pagestart, number of rows in the database
    given by lendata and the desired number of entries per page, dx.
    Notice that the start and end indices are starting from 1."""
    #get number of pages
    pages = int(np.floor(lendata/dx))
    excess = lendata - (pages*dx)
    pages = pages + 1 if excess>0 else pages
    
    if (lendata>0)  and (pagestart == 0):
        pagestart = 1

    page_start = max(pagestart,1)
    page_start = min(page_start,pages)
    indices = range(0,lendata,dx)
    index = max(page_start-1,0)
    if lendata>0:
        index = min(index,lendata-1)
    else:
        return 0,0,0
    start = indices[index]
    end = min(start + dx,lendata)
    return start, end, pages

@app.route("/add_subject",methods = ["POST"])
@login_required
def add_subject():
    teacher_id = current_user.id
    subject_name = request.get_json()["subject_name"]
    school_year = request.get_json()["school_year"]
    check = f"""SELECT * FROM subjects
            WHERE
                subject_name = "{subject_name}"
                AND school_year = "{school_year}"
                AND teacher_id = "{teacher_id}";"""
    results = list(db.session.execute(check))
    if len(results)>0:
        return {"isUpdated":False,"reason":"Subject already exists."}
    else:
        subject = Subject(subject_name = subject_name, school_year = school_year, teacher_id = teacher_id)
        db.session.add(subject)
        db.session.commit()
        #update_globals()

        query_subject_ids= f"""SELECT id FROM subjects  WHERE teacher_id = {teacher_id}"""
        subject_ids = list(db.session.execute(query_subject_ids))
        #handle new user, set added subject as current subject
        if len(subject_ids) == 1:
            new_id = subject_ids[0][0]
            query = text(f"""UPDATE users
                            SET current_subject_id = {new_id}
                            WHERE users.id = {current_user.id};""")
            db.session.execute(query)
            db.session.commit()
            return {"isUpdated":True,"isNewUser":True}
        return {"isUpdated":True,"isNewUser":False}

@app.route("/count_entries",methods = ["POST"])
@login_required
def count_entries():
    subject_id = int(request.get_json()["id"])
    query = f"""SELECT COUNT(id) FROM entries WHERE subject_id = {subject_id};"""
    count = db.session.execute(query).scalar()
    return {"count":count}


@app.route("/delete_subject",methods = ["POST"])
@login_required
def delete_subject():
    subject_id = int(request.get_json()["id"])
    current_sid = current_user.current_subject_id

    #note, deletetion was disabled implicitly when there is only one subject left
    if subject_id == current_sid:
        #change current_sid to the next subject if the deleted subject is the current subject
        get_ids = f"""SELECT id FROM subjects WHERE teacher_id = {current_user.id}"""
        results = [val[0] for val in db.session.execute(get_ids)]
        results.remove(subject_id)

        if len(results) > 0:
            next_sid = results[0] #get next id
        else:
            next_sid = None
        query = text(f"""UPDATE users
                        SET current_subject_id = {next_sid}
                        WHERE users.id = {current_user.id};""")
        db.session.execute(query)
        db.session.commit()
    try:
        remove_entries = f"""DELETE FROM entries WHERE subject_id = {subject_id}"""
        remove_subject = f"""DELETE FROM subjects WHERE id = {subject_id}"""
        db.session.execute(remove_entries)
        db.session.execute(remove_subject)
        db.session.commit()
    except Exception as e:
        return {"isDeleted":False,"reason":e}
    return {"isDeleted":True}

#TODO: Major:  change sid after subject deletion or else new entries will be added to the previously deleted subject id and will not be seen.

@app.route("/subjects_handled")
@login_required
def request_subjects_handled():
    subjects_handled = get_subjects_handled(current_user.id)
    current_sid = current_user.current_subject_id
    return {"subjects_handled":subjects_handled,"current_sid":current_sid}


@app.route('/admin')
@login_required
def admin():
    subjects_handled = get_subjects_handled(current_user.id)
    userdata = current_user.get_user_details()
    current_sid = current_user.current_subject_id

    query = f"SELECT * FROM entries WHERE subject_id = {current_sid};"
    if current_sid is None:
        #handle new user
        df_rows = [{"id":"","name":"","section":"","exam_code":""}]
        previous_filter = {"sections":[],"exam_codes":[]}
        return render_template("admin.html",datarows = df_rows,
                    section_list = [], exam_codes = [],
                    unique_names = [],database_length = 0,
                    page_setup = {"prevStart":0,"prevDx":50,"prevPages":0,"prevName":""},
                    previous_filter = previous_filter,userdata = current_user.get_user_details(),
                    subjects_handled = [],current_length = 0)

    df = pd.read_sql_query(query,db.get_engine())
    df.rename(columns = {"exam":"exam_code"},inplace = True)
    df["idx"] = df.index + 1;
    sections = list(df.section.unique())
    exam_codes = list(df.exam_code.unique())

    start,end,pages = get_page_setup(1,len(df),50)
    df_rows = df.to_dict("records")[start:end] #list of dictionaries
    

    previous_filter = {"sections": sections,"exam_codes": exam_codes}
    #return render_template("admin.html" subjects_handled = subjects_handled, userdata = userdata)
    return render_template("admin.html",datarows = df_rows,
                    section_list = sections, exam_codes = exam_codes,
                    unique_names = list(set(df.name)),database_length = len(df),
                    page_setup = {"prevStart":start+1,"prevDx":50,"prevPages":pages,"prevName":""},
                    previous_filter = previous_filter,userdata = current_user.get_user_details(),
                    subjects_handled = subjects_handled,current_length = len(df_rows))

def get_subjects_handled(teacher_id):
    query = text(f"SELECT id,subject_name,school_year,pin FROM subjects WHERE teacher_id = {teacher_id}")
    result = db.engine.execute(query)
    result = [{"subject_id":sid,"subject_name":name,"school_year":sy,"pin":pin} for (sid,name,sy,pin) in result]
    return result

def get_sections_handled(teacher_id):
    query = text(f"")

@app.route("/add_record", methods = ["POST"])
@login_required
def add_record(start = 1,end = 50,dx = 50):
    if request.method == "POST":
        """
        name = request.form["name"].strip()
        section = request.form["section"].strip()
        code = request.form["code"].strip()
        score = float(request.form["score"])
        """
        name = request.get_json()["name"].strip()
        section = request.get_json()["section"].strip()
        code = request.get_json()["code"].strip()
        score = float(request.get_json()["score"])

        current_sid = current_user.current_subject_id

        print("HERE")
        if current_sid is None:
            print(f"CURRENT_SID: {current_sid}")
            #handle new user, create new subject
            return {"isAdded":False,"reason":"Unknown subject. Create subject first."}


        entry = Entry(name = name, section = section, exam = code, score = score, subject_id = current_sid)
        db.session.add(entry)
        db.session.commit()

        #update_globals()#update the raw_data dataframe once a record is added
        return {"isAdded":True}

@app.route("/checkduplicate",methods = ["POST"])
@login_required
def checkDuplicate():
    if request.method == "POST":
        req_data = request.get_json()
        name = req_data["name"].strip()
        section = req_data["section"].strip()
        code = req_data["code"].strip()
        row =   {"name":name,"section":section,"exam_code":code}
        return {"isDuplicate":isRowDuplicate(row)}

@app.route("/deleteRecords",methods = ["POST"])
@login_required
def deleteRecords():
    current_sid = current_user.current_subject_id
    try:
        row_ids = request.get_json()["ids"]
        row_ids = [int(val) for val in row_ids]
        str_row_ids = ",".join([f"'{val}'" for val in row_ids])

        query_exams = f"""SELECT DISTINCT(exam) FROM entries
                    WHERE id IN ({str_row_ids});"""
        exams = [val[0] for val in list(db.session.execute(query_exams))]

        query_sections = f"""SELECT DISTINCT(section) FROM entries
                                WHERE id IN ({str_row_ids});"""
        sections = [val[0] for val in list(db.session.execute(query_sections))]

        statement = delete(Entry).where(Entry.id.in_(row_ids))
        db.session.execute(statement)
        db.session.commit()

        #exams to remove if they no longer exist
        #remove these entries from the exam filters
        to_remove_exams = []
        for exam in exams:
            query = f"""SELECT COUNT(exam) FROM entries
                        WHERE
                            exam = "{exam}"
                            AND subject_id = {current_sid};"""
            count = db.session.execute(query).scalar()
            if count==0:
                to_remove_exams.append(exam)

        to_remove_sections = []
        for section in sections:
            query = f"""SELECT COUNT(section) FROM entries
                        WHERE
                            section = "{section}"
                            AND subject_id = {current_sid};"""
            count = db.session.execute(query).scalar()
            if count == 0:
                to_remove_sections.append(section)
        return {'isDeleted':True,'deleted_ids':row_ids,
                "to_remove_exams":to_remove_exams,
                "to_remove_sections":to_remove_sections}
    except Exception as error:
        print(f"RECORD DELETION ERROR: {error}")
        return {"isDeleted":False,"reason":error}

@app.route("/update_subject",methods = ["POST"])
@login_required
def update_subject():
    subject_id = request.get_json()["id"]
    subject_name = request.get_json()["subject_name"]
    school_year = request.get_json()["school_year"]
    pin = request.get_json()["pin"]
    check_same = f"""SELECT id FROM subjects
                    WHERE
                        subject_name = "{subject_name}"
                        AND school_year = "{school_year}"
                        AND teacher_id = {current_user.id}
                        AND pin = {pin};"""
    results = list(db.session.execute(check_same))
    if len(results)>0:
        return {"isUpdated":False,"reason":"Subject already exists."}

    #check if the inputs are valid
    if (len(subject_name)==0) or (len(school_year)==0) or (len(str(pin))==0):
        return {"isUpdated":False,"reason":"Some fields were empty."}

    query = f"""UPDATE subjects
                SET subject_name = "{subject_name}", school_year = "{school_year}", pin = {pin}
                WHERE id = {subject_id}"""
    try:
        db.session.execute(query)
        db.session.commit()
        #update_globals()
        return {"isUpdated":True}
    except Exception as error:
        return {"isUpdated":False,"reason":"Internal error occured while updating subject."}


@app.route("/update_field",methods = ["POST"])
@login_required
def update_field():
    isUpdated = False
    if request.method == "POST":
        req_data = request.get_json()["to_update"]
        try:
            for row in req_data:
                entry_id,field,value = row["id"],row["field"],row["value"]
                #add quotes to strings 
                value_sql = f"'{value}'"
                if field == "score":
                    value_sql = value
                
                query = f"""UPDATE entries SET {field} = {value_sql} WHERE id = {entry_id};"""
                db.session.execute(query)
                db.session.commit()
                #update_globals()
                isUpdated = True
        except Exception as error:
            print("An error occured when updating some fields.")
            print(f"ERROR: {error}")
    return {"isUpdated":isUpdated}

@app.route("/update_name",methods = ["POST"])
@login_required
def update_name():
    isUpdated = False
    new_name = request.get_json()["new_name"]
    username = current_user.username
    try:
        user = User.query.filter_by(username=username).first()
        user.name = new_name
        db.session.commit()
        isUpdated = True
    except Exception as error:
        print(f"Error while trying to update name of {username} to {new_name}.\nError Statement: {error}")
    return {"isUpdated":isUpdated}

@app.route("/get_sections")
@login_required
def get_sections():
    current_id = current_user.id
    current_sid = current_user.current_subject_id
    query = f"""SELECT DISTINCT section FROM(
                SELECT * FROM entries
                INNER JOIN subjects on entries.subject_id = subjects.id
                INNER JOIN users on subjects.teacher_id = users.id
                WHERE
                    users.id = {current_id}
                    AND subjects.id = {current_sid}) as TeacherLoad
                ORDER BY exam ASC;"""
    sections = list(db.session.execute(query))
    sections = [val[0] for val in sections]

    details = {}
    for sec in sections:
        distinct_exams = f"""SELECT DISTINCT exam FROM entries
                        WHERE
                            subject_id = {current_sid}
                            AND section = "{sec}";"""
        exams = list(db.session.execute(distinct_exams))
        exams = [val[0] for val in exams]

        counts = []
        for exam in exams:
            count_entries = f"""SELECT COUNT(exam) FROM entries
                                WHERE
                                    subject_id = {current_sid}
                                    AND section = "{sec}"
                                    AND exam = "{exam}";"""
            count = db.session.execute(count_entries).scalar()
            counts.append(count)
        
        details[sec] = {e:c for e,c in zip(exams,counts)}
    return {"details":details}

@app.route("/get_unique_section_exam")
@login_required
def get_unique_section_exam():
    current_sid = current_user.current_subject_id
    if current_sid is None:
        return {"error": "Please specify the subject to work with."}

    query_exams = f"""SELECT DISTINCT(exam) FROM entries WHERE subject_id = {current_sid};"""
    query_sections = f"""SELECT DISTINCT(section) FROM entries WHERE subject_id = {current_sid};"""
    unique_exams = [val[0] for val in list(db.session.execute(query_exams))]
    unique_sections = [val[0] for val in list(db.session.execute(query_sections))]
    return {"sections":unique_sections,"exams":unique_exams}

@app.route("/update_section",methods = ["POST"])
@login_required
def update_section():
    current_sid = current_user.current_subject_id
    old = request.get_json()["old_section"]
    new = request.get_json()["new_section"]
    try:
        query = f"""UPDATE entries
                    SET section = "{new}"
                    WHERE
                        section = "{old}"
                        AND subject_id = {current_sid}
                    """
        db.session.execute(query)
        db.session.commit()
        return {"isUpdated":True}
    except Exception as error:
        print(f"Section Update Error: {error}")
        return {"isUpdated":False,"reason":error}

@app.route("/update_exam",methods = ["POST"])
@login_required
def update_exam():
    current_sid = current_user.current_subject_id
    old = request.get_json()["old_exam"]
    new = request.get_json()["new_exam"]
    section = request.get_json()["section"]
    try:
        query = f"""UPDATE entries
                    SET exam = "{new}"
                    WHERE
                        exam = "{old}"
                        AND section = "{section}"
                        AND subject_id = {current_sid}
                    """
        db.session.execute(query)
        db.session.commit()

        #check whether the checkboxes have to be edited
        #renaming should be done when there are no exams from other sections
        #that is the same as the old name
        count_same_exam = f"""SELECT COUNT(id) FROM entries
                            WHERE
                                exam = "{old}"
                                AND subject_id = {current_sid};"""
        #counts if there are still entries corresponding to the old name
        #if there are none, the old name must be replaced with the new name
        count = db.session.execute(count_same_exam).scalar() 
        rename_exam = False
        if count==0:
                rename_exam = True
        return {"isUpdated":True,"rename_exam":rename_exam}
    except Exception as error:
        print(f"Exam Update Error: {error}")
        return {"isUpdated":False,"reason":error}

@app.route("/delete_exam", methods = ["POST"])
@login_required
def delete_exam():
    current_sid = current_user.current_subject_id
    exam_name = request.get_json()["exam_name"]
    section = request.get_json()["section"]
    try:
        query = f"""DELETE FROM entries
                    WHERE
                        exam = "{exam_name}"
                        AND section = "{section}"
                        AND subject_id = {current_sid};
                    """
        db.session.execute(query)
        db.session.commit()
        
        query_count_exam = f"""SELECT COUNT(id) FROM entries 
                            WHERE
                                exam = "{exam_name}"
                                AND subject_id = {current_sid};
                                """
        #count remaining exam for all sections, if the exam is not present anymore,
        #remove the exam from the filter checkboxes
        count_exam  = db.session.execute(query_count_exam).scalar()

        query_count_section = f"""SELECT COUNT(id) FROM entries
                                    WHERE
                                        section = "{section}"
                                        AND subject_id = {current_sid};"""
        count_section = db.session.execute(query_count_section).scalar()

        remove_exam = False
        if count_exam==0:
            remove_exam = True

        remove_section = False
        if count_section == 0:
            remove_section = True
        return {"isDeleted":True,"remove_exam":remove_exam,"remove_section":remove_section}
    except Exception as error:
        print(f"Exam Delete Error: {error}")
        return {"isDeleted":False,"reason":error}

@app.route("/delete_section",methods = ["POST"])
@login_required
def delete_section():
    current_sid = current_user.current_subject_id
    section = request.get_json()["section"]
    try:
        query_exams_under = f"""SELECT DISTINCT(exam) FROM entries
                                WHERE
                                    section = "{section}"
                                    AND subject_id = {current_sid};"""
        exams_under = [val[0] for val in list(db.session.execute(query_exams_under))]

        query = f"""DELETE FROM entries
                    WHERE
                        section = "{section}"
                        AND subject_id = {current_sid};"""
        db.session.execute(query)
        db.session.commit()
        #count the remaining records for each of the exams regardless of sections
        #remove from filter checkboxes those exams that are not present anymore
        to_remove = []
        for exam in exams_under:
            query_count = f"""SELECT COUNT(exam) FROM entries
                            WHERE
                                exam = "{exam}"
                                AND subject_id = {current_sid};"""
            count = db.session.execute(query_count).scalar()
            if count==0:
                to_remove.append(exam)
        return {"isDeleted":True,"to_remove":to_remove}
    except Exception as error:
        print(f"Section Delete Error: {error}")
        return {"isDeleted":False,"reason":error}

@app.route("/download_data",methods = ["POST"])
@login_required
def download_data():
    current_sid = current_user.current_subject_id
    ids = request.get_json()["ids"]
    print(ids)
    str_ids = ",".join([f"'{val}'" for val in ids])
    query = f"""SELECT id,name,section,score,exam FROM entries
                WHERE
                    id IN ({str_ids})
                    AND subject_id = {current_sid};"""     

    df = pd.read_sql_query(query,db.get_engine())
    
    response = make_response(df.to_csv(index = False))
    response.headers["Content-Disposition"] = "attachment;  filename=export.csv"
    response.headers["Content-Type"] = "text/csv"
    return response


@app.route("/",methods = ["GET"])
def stats():
    #query for id and name of teacher that have actual data in their accounts.
    query = """SELECT DISTINCT u.id, u.name
            FROM users u
            INNER JOIN subjects s ON u.id = s.teacher_id
            INNER JOIN entries e ON s.id = e.subject_id
            WHERE e.subject_id IS NOT NULL;"""
    df = pd.read_sql_query(query,db.get_engine()).sort_values(["name"])
    return render_template("stats.html",teachers = list(zip(df.id,df.name)))

@app.route("/stats_get_classes",methods = ["POST"])
def stats_get_classes():
    teacher_id = request.get_json()["teacher_id"]
    query = f"""SELECT id,subject_name,school_year FROM subjects
                WHERE teacher_id = {teacher_id}"""  
    df = pd.read_sql_query(query,db.get_engine())
    return df.to_dict(orient = "list")

@app.route("/stats_get_sections",methods = ["POST"])
def stats_get_sections():
    class_id = request.get_json()["class_id"]
    query = f"""SELECT DISTINCT section FROM entries
                WHERE subject_id = {class_id}"""
    sections =  [i[0] for i in db.engine.execute(query)]
    sections.sort()
    if len(sections) == 0:
        return {"sections":[]}
    else:
        return {"sections":["All"] + sections}

@app.route("/stats_get_exams",methods = ["POST"])
def stats_get_exams():
    class_id  = request.get_json()["class_id"]
    sections = request.get_json()["sections"]
    sections_str = ",".join([f"'{sec}'" for sec in sections])
    query = f"""SELECT DISTINCT exam FROM entries
                WHERE subject_id = {class_id} AND
                section in ({sections_str})"""
    exams = db.engine.execute(query)
    exams = [exam[0] for exam in exams]
    if len(exams) > 0:
        return {"exams":["All"] + exams}
    else:
        return {"exams":[]}

@app.route("/static/favicon.ico") # 2 add get for favicon
def fav():
    print(os.path.join(app.root_path, 'static'))
    return send_from_directory(app.static_folder, 'favicon.ico')

def check_access_code(code,class_id):
    query = f"SELECT pin FROM subjects WHERE id = {class_id}"
    pin = list(db.engine.execute(query))[0][0]
    if code != str(pin):
        return False
    return True

def get_dataframe(payload):
    #check if the access code is correct return and error message if otherwise
    access_code = payload["access_code"]
    class_id = payload["class_id"]
    
    if not check_access_code(access_code,class_id):
        return {"error":"Incorrect access code."} 

    checked_sections = ",".join([f"'{sec}'" for sec in payload["checked_sections"] if sec != "All"])
    checked_exams = ",".join([f"'{exam}'" for exam in payload["checked_exams"] if exam != "All"])

    query = f"""SELECT name, section, score, exam FROM entries
                WHERE subject_id = {class_id} AND
                section in ({checked_sections}) AND
                exam in ({checked_exams});"""

    data = pd.read_sql_query(query,db.get_engine())
    return data

def get_individual_data(payload,aggregate_by = "sum"):
    data = get_dataframe(payload)
    if type(data) == dict:
        if "error" in data:
            return data

    name_duplicates = {}
    for name in data["name"]:
        sections = data.loc[data["name"] == name]["section"]
        sections = list(set(sections))
        if len(sections) > 1:
            name_duplicates[name] = sections

    for name,sections in name_duplicates.items():
        for i,section in enumerate(sections):
            data.loc[(data["name"] == name) &  (data["section"] == section), "name"]=  f"{name} - {i+1}"
    
    section_map = {}
    for name in data["name"]:
        section  = data.loc[data["name"] == name]["section"]
        if not name in section_map:
            section_map[name] = section.to_list()[0]
    if aggregate_by == "sum":
        grouped = data.groupby(["name"]).sum().sort_values(["score"],ascending=False)
    elif aggregate_by == "mean":
        grouped = data.groupby(["name"]).mean().sort_values(["score"],ascending=False)

    grouped["section"] = [section_map[name] for name in grouped.index]
    grouped.reset_index(inplace = True)
    grouped.rename({"score":"x", "section":"sec", "name": "lbl"}, axis = 1,inplace = True)
    
    to_send = grouped.to_dict(orient = "records")
    return to_send

def get_section_data(payload,aggregate_by = "sum"):
    #check if the access code is correct return and error message if otherwise
    access_code = payload["access_code"]
    class_id = payload["class_id"]
    if not check_access_code(access_code,class_id):
        return {"error":"Incorrect access code."} 

    data = get_dataframe(payload)
    if type(data) == dict:
        if "error" in data:
            return data
    if aggregate_by == "sum":
        grouped = data.groupby(["section"]).sum().sort_values(["score"],ascending=False)
    elif aggregate_by == "mean":
        grouped = data.groupby(["section"]).mean().sort_values(["score"],ascending=False)

    grouped.reset_index(inplace=True)
    grouped["lbl"] = grouped["section"]
    grouped.rename({"score":"x", "section":"sec"}, axis = 1,inplace = True)
    
    to_send = grouped.to_dict(orient = "records")
    return to_send

def rgba2hex(rgba,maxval = 255):
  split = rgba.strip().split(",")
  split = [part.strip().replace("rgba","").replace("(","").replace(")","") for part in split]
  for i in range(3):
    if maxval == 255:
      split[i] = hex(int(split[i]))[-2:]
    elif maxval == 1:
      split[i] = hex(math.floor(float(split[i])*255))[-2:]
  split[3] = hex(math.floor(float(split[3])*255))[-2:]
  return f'#{"".join(split)}'

def get_distribution_data(payload,aggregate_by = "sum"):
    records = get_individual_data(payload, aggregate_by=aggregate_by)
    if type(records) == dict:
        if "error" in records:
            return records

    data = pd.DataFrame(records)
    _,edges = np.histogram(data["x"],bins = "auto")

    frequencies = {}
    for section in data["sec"].unique():
        scores = data.loc[data["sec"] == section,"x"]
        freq, _ = np.histogram(scores,bins = edges)
        frequencies[section] = list(map(int,freq))

    str_bins = []
    for i in range(len(edges)-1):
        bin = f"{edges[i]:.2f} - {edges[i+1]:.2f}"
        str_bins.append(bin)

    return {"bins":str_bins,"freq":frequencies}

def count_views(subject_id,access_code):
    if check_access_code(access_code,subject_id):
        #add a list of accessed subject in this session
        if not "accessed" in session:
            session["accessed"] = []
        if not subject_id in session["accessed"]:
            accessed_tmp = session["accessed"] + [subject_id]
            session["accessed"]= accessed_tmp
            query = f"""UPDATE subjects
                        SET views = views + 1
                        WHERE id = {subject_id};"""
            db.engine.execute(query)

@app.route("/stats_send_data", methods = ["POST"])
def stats_send_data():
    payload = request.get_json()
    display_type = payload["display_type"]
    aggregate_method = payload["aggregate_by"]
    if display_type == "Individual":
        data = get_individual_data(payload,aggregate_by=aggregate_method)
    elif display_type == "Section":
        data = get_section_data(payload,aggregate_by=aggregate_method)
    elif display_type == "Distribution":
        data = get_distribution_data(payload,aggregate_by=aggregate_method)
    
    subject_id = payload["class_id"]
    access_code = payload["access_code"]
    count_views(subject_id,access_code)
    return {"data": data}

#returns a list from a list of tuple
def list_from_query(query):
    return [val[0] for val in db.engine.execute(query)]

#convert list of tuples to string query sequence
def list_to_query(data,data_type = "str"):
    if data_type == "str":
        str_data = [f"'{val}'" for val in data]
    elif data_type == "int":
        str_data = list(map(str,data))
    return ",".join(str_data)


@app.route("/delete_user_account", methods = ["POST"])
@login_required
def delete_user_account():
    #read the request data or else the second attempt will throw a 405
    password = request.get_json()["pw"]
    if not current_user.check_password(password=password):
        return {"error":"Password is incorrect."}
    
    #USER DELETION
    teacher_id = current_user.get_user_details()['id']
    deletion_query = f"""DELETE FROM users
                        WHERE id = {teacher_id};"""
    db.engine.execute(deletion_query)
    
    #SUBJECT DELETION
    query = f"""SELECT id FROM subjects
                WHERE teacher_id = {teacher_id};"""
    subject_ids = list_from_query(query)
    if len(subject_ids) > 0:
        deletion_query = f"""DELETE FROM subjects
                        WHERE id in ({list_to_query(subject_ids,data_type = "int")});"""
        db.engine.execute(deletion_query)


        #ENTRY DELETION
        query = f"""SELECT id FROM entries
                    WHERE subject_id in ({list_to_query(subject_ids,data_type = "int")});"""
        entry_ids = list_from_query(query)

        if len(entry_ids) > 0:
            deletion_query = f"""DELETE FROM entries
                                WHERE id in ({list_to_query(entry_ids,data_type = "int")});"""
            db.engine.execute(deletion_query)

    logout_user()
    return {"redirect":url_for("index")}

@app.route("/get_view_count",methods = ["POST"])
@login_required
def get_view_count():
    data = request.get_json()
    teacher_id = current_user.id
    query = f"""SELECT id,subject_name, school_year, views FROM subjects
                WHERE teacher_id = {teacher_id}"""
    data = pd.read_sql_query(query,db.get_engine())
    data.sort_values(["views","subject_name"], ascending = False,inplace = True)
    data = data.to_dict("records")
    return {"data":data}

@app.route("/reset_view_count",methods = ["POST"])
@login_required
def reset_view_count():
    data = request.get_json()
    if not "subject_id" in data:
        return {"isSuccess":False,"reason":"Did not receive subject id."}
    
    subject_id = data["subject_id"]
    query = f"""UPDATE subjects
                SET views = 0
                WHERE id = {subject_id};"""
    db.engine.execute(query)
    return {"isSuccess":True}

# add to exam code or section list if entry is new
if __name__ == "__main__":
    app.run(host = "0.0.0.0",port = 8000, debug = True)



# %%
