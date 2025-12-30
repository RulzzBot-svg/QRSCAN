from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Text, Float, Date, DateTime, Boolean, ForeignKey
)
from sqlalchemy.orm import relationship
from db import db

# -------------------------
# HOSPITAL
# -------------------------
class Hospital(db.Model):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    address = Column(String(300))
    city = Column(String(200))
    active = Column(Boolean, default=True)

    ahus = relationship("AHU", back_populates="hospital", cascade="all, delete-orphan")


# -------------------------
# AHU
# -------------------------
class AHU(db.Model):
    __tablename__ = "ahus"

    id = Column(String(100), primary_key=True)  # QR CODE = ID
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)

    name = Column(String(150), nullable=False)
    location = Column(String(200))
    notes = Column(Text)

    hospital = relationship("Hospital", back_populates="ahus")
    filters = relationship("Filter", back_populates="ahu", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="ahu", cascade="all, delete-orphan")


# -------------------------
# FILTER
# -------------------------
class Filter(db.Model):
    __tablename__ = "filters"

    id = Column(Integer, primary_key=True)
    ahu_id = Column(String(100), ForeignKey("ahus.id"), nullable=False)

    phase = Column(String(50))
    part_number = Column(String(100))
    size = Column(String(50))
    quantity = Column(Integer)

    # ✅ SERVICE LOGIC BELONGS HERE
    frequency_days = Column(Integer, nullable=False)
    last_service_date = Column(Date)

    ahu = relationship("AHU", back_populates="filters")
    job_filters = relationship(
        "JobFilter",
        back_populates="filter",
        cascade="all, delete-orphan"
    )

# -------------------------
# TECHNICIAN
# -------------------------
class Technician(db.Model):
    __tablename__ = "technicians"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    pin = Column(String(20), nullable=False)
    active = Column(Boolean, default=True)

    jobs = relationship("Job", back_populates="technician", cascade="all, delete-orphan")


# -------------------------
# JOB
# -------------------------
class Job(db.Model):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True)
    ahu_id = Column(String(100), ForeignKey("ahus.id"), nullable=False)
    tech_id = Column(Integer, ForeignKey("technicians.id"), nullable=False)

    completed_at = Column(DateTime, default=datetime.utcnow)
    overall_notes = Column(Text)
    gps_lat = Column(Float)
    gps_long = Column(Float)

    ahu = relationship("AHU", back_populates="jobs")
    technician = relationship("Technician", back_populates="jobs")
    job_filters = relationship("JobFilter", back_populates="job", cascade="all, delete-orphan")


# -------------------------
# JOB FILTERS
# -------------------------
class JobFilter(db.Model):
    __tablename__ = "job_filters"

    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    filter_id = Column(Integer, ForeignKey("filters.id"), nullable=False)

    is_completed = Column(Boolean, default=False)
    note = Column(Text)

    job = relationship("Job", back_populates="job_filters")
    filter = relationship("Filter", back_populates="job_filters")
    signature = relationship(
    "JobSignature",
    uselist=False,
    back_populates="job",
    cascade="all, delete-orphan"
)
#added a "inspected" checbox




class JobSignature(db.Model):
    __tablename__ = "job_signatures"

    id = Column(Integer, primary_key=True)
    job_id = Column(
        Integer,
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    signer_name = Column(String(150))
    signer_role = Column(String(150))
    signature_data = Column(Text, nullable=False)
    signed_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="signature")
