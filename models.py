
from email.policy import default
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import declarative_base, relationship
Base = declarative_base()

db = SQLAlchemy()
class Entry(db.Model):
    __tablename__ = "entries"
    id = db.Column(
        db.Integer,
        primary_key = True,
    )
    name = db.Column(
        db.String(200),
        nullable=False,
        unique=False
    )
    section = db.Column(
        db.String(100),
        nullable=False,
        unique=False
    )
    score = db.Column(
        db.Float(100),
        nullable=False,
        unique=False
    )
    exam = db.Column(
        db.String(200),
        nullable=False,
        unique=False
    )
    subject_id = db.Column( #subject FK
        db.Integer,
        db.ForeignKey('subjects.id',ondelete = "CASCADE"),
        nullable = False,
        index = True
    )

class Subject(db.Model):
    __tablename__ = "subjects"
    id = db.Column(
        db.Integer,
        primary_key=True
    )
    subject_name = db.Column(
        db.String(300),
        nullable = False,
        unique = False
    )
    school_year = db.Column(
        db.String(50),
        nullable = False,
        unique = False
    )
    pin = db.Column(
        db.Integer,
        nullable = False,
        unique = False,
        default = 1234
    )
    views = db.Column(
        db.Integer,
        nullable = False,
        unique = False,
        default = 0
    )
    teacher_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id',ondelete = "CASCADE"),
        nullable = False,
        index = True
    )
    entry = db.relationship('Entry',backref = 'subject') #relationship to Entry


class User(UserMixin, db.Model):
    """User account model."""
    __tablename__ = 'users'
    id = db.Column(
        db.Integer,
        primary_key=True
    )
    username = db.Column(
        db.String(100),
        nullable=False,
        unique=True
    )
    name = db.Column(
        db.String(100),
        nullable=False,
        unique=False
    )
    password = db.Column(
        db.String(200),
        primary_key=False,
        unique=False,
        nullable=False
	)
    current_subject_id = db.Column( #current subject being edited by the user
        db.Integer,
        nullable = True,
        unique = False
    )

    def set_password(self, password):
        """Create hashed password."""
        self.password = generate_password_hash(
            password,
            method='sha256'
        )

    def check_password(self, password):
        """Check hashed password."""
        return check_password_hash(self.password, password)

    def __repr__(self):
        return '<User {}>'.format(self.username)

    def get_user_details(self):
        current_sid = self.current_subject_id
        current_sid = current_sid if not current_sid is None else "NULL"
        return {"name":self.name,"username":self.username,"id":self.id,"current_subject_id":current_sid}

    subject = db.relationship('Subject',backref = 'user') #relationship to subject