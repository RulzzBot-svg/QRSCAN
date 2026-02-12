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
    id = Column(Integer, primary_key=True)  # QR CODE = ID
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=True)

    name = Column(String(150), nullable=False)
    location = Column(String(200))
    notes = Column(Text)
    excel_order = Column(Integer, nullable=True)

    hospital = relationship("Hospital", back_populates="ahus")
    building = relationship("Building", back_populates="ahus")
    filters = relationship("Filter", back_populates="ahu", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="ahu", cascade="all, delete-orphan")


# -------------------------
# BUILDING
# -------------------------
class Building(db.Model):
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    name = Column(String(200), nullable=False)
    floor_area = Column(String(200))
    active = Column(Boolean, default=True)

    hospital = relationship("Hospital")
    ahus = relationship("AHU", back_populates="building", cascade="all, delete-orphan")


# -------------------------
# FILTER
# -------------------------
class Filter(db.Model):
    __tablename__ = "filters"

    id = Column(Integer, primary_key=True)
    ahu_id = Column(Integer, ForeignKey("ahus.id"), nullable=False)

    phase = Column(String(50))
    part_number = Column(String(100))
    size = Column(String(50))
    quantity = Column(Integer)
    is_active = Column(Boolean, default=True, nullable=False)

    # ✅ SERVICE LOGIC BELONGS HERE
    frequency_days = Column(Integer, nullable=False)
    last_service_date = Column(Date)

    excel_order = Column(Integer, nullable=True)

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
    role = Column(String(20), default="technician", nullable=False)  # 'technician' or 'admin'

    jobs = relationship("Job", back_populates="technician", cascade="all, delete-orphan")


# -------------------------
# JOB
# -------------------------
class Job(db.Model):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True)
    ahu_id = Column(Integer, ForeignKey("ahus.id"), nullable=False)
    tech_id = Column(Integer, ForeignKey("technicians.id"), nullable=False)

    completed_at = Column(DateTime, default=datetime.utcnow)
    overall_notes = Column(Text)
    gps_lat = Column(Float)
    gps_long = Column(Float)

    ahu = relationship("AHU", back_populates="jobs")
    technician = relationship("Technician", back_populates="jobs")
    job_filters = relationship("JobFilter", back_populates="job", cascade="all, delete-orphan")
    signature = relationship(
        "JobSignature",
        uselist=False,
        back_populates="job",
        cascade="all, delete-orphan"
    )


# -------------------------
# JOB FILTERS
# -------------------------
class JobFilter(db.Model):
    __tablename__ = "job_filters"

    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    filter_id = Column(Integer, ForeignKey("filters.id"), nullable=False)
    is_inspected = Column(Boolean, default=False, nullable=False)
    is_completed = Column(Boolean, default=False)
    note = Column(Text)

    job = relationship("Job", back_populates="job_filters")
    filter = relationship("Filter", back_populates="job_filters")

#added a "inspected" checbox


# -------------------------
# JOB SIGNATURE
# -------------------------
class JobSignature(db.Model):
    __tablename__ = "job_signatures"

    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    signer_name = Column(String(150))
    signer_role = Column(String(100))
    signature_data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="signature")


# -------------------------
# SUPERVISOR SIGNOFF
# -------------------------
class SupervisorSignoff(db.Model):
    __tablename__ = "supervisor_signoffs"

    id = Column(Integer, primary_key=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    date = Column(Date, nullable=False)
    supervisor_name = Column(String(150), nullable=False)
    summary = Column(Text)
    signature_data = Column(Text, nullable=False)  # base64 PNG
    job_ids = Column(Text)  # Comma-separated job IDs for simplicity
    created_at = Column(DateTime, default=datetime.utcnow)

    hospital = relationship("Hospital")
