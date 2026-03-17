"""
Core Models - Hostel Management System
Covers: Users, Students, Hostels, Rooms, Beds, Bookings, Payments
"""

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone
from django.core.validators import RegexValidator


# ─────────────────────────────────────────────
# User Manager
# ─────────────────────────────────────────────

class UserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError('Username is required')
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(username, password, **extra_fields)


# ─────────────────────────────────────────────
# User (Custom Auth)
# ─────────────────────────────────────────────

class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('warden', 'Warden'),
        ('admin', 'Admin'),
    ]

    username = models.CharField(max_length=50, unique=True)
    email = models.EmailField(blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    must_change_password = models.BooleanField(default=True)

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.username} ({self.role})"


# ─────────────────────────────────────────────
# Academic Year
# ─────────────────────────────────────────────

class AcademicYear(models.Model):
    name = models.CharField(max_length=20, unique=True)  # e.g. "2024-2025"
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)
    application_open = models.BooleanField(default=False)
    application_start = models.DateField(null=True, blank=True)
    application_end = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-name']

    def save(self, *args, **kwargs):
        if self.is_current:
            AcademicYear.objects.exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────
# Department & Course
# ─────────────────────────────────────────────

class Department(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10)

    def __str__(self):
        return self.name


class Course(models.Model):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=20)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True)
    duration_years = models.PositiveIntegerField(default=4)

    def __str__(self):
        return f"{self.code} - {self.name}"


# ─────────────────────────────────────────────
# Student
# ─────────────────────────────────────────────

reg_no_validator = RegexValidator(
    regex=r'^[A-Z]{2}\d{3}/\d{4}/\d{4}$',
    message='Registration number format: SC211/0530/2022'
)


class Student(models.Model):
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female')]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('deferred', 'Deferred'),
        ('graduated', 'Graduated'),
        ('suspended', 'Suspended'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student')
    reg_number = models.CharField(max_length=20, unique=True, validators=[reg_no_validator])
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    middle_name = models.CharField(max_length=50, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    date_of_birth = models.DateField()
    national_id = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=15)
    email = models.EmailField()
    photo = models.ImageField(upload_to='students/photos/', null=True, blank=True)

    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True)
    current_year = models.PositiveIntegerField(default=1)
    current_semester = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    # Admission info
    admission_date = models.DateField()
    admission_year = models.CharField(max_length=9)  # e.g. "2022-2023"

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['reg_number']

    @property
    def full_name(self):
        return f"{self.first_name} {self.middle_name} {self.last_name}".strip()

    @property
    def birth_number(self):
        """Default password = date of birth in DDMMYYYY format"""
        return self.date_of_birth.strftime('%d%m%Y')

    def is_eligible_for_hostel(self, academic_year: AcademicYear) -> tuple[bool, str]:
        """
        Eligibility rules:
        - Must be Year 1, Semester 1 (fresh students)
        - OR deferred students who were Year 1 Sem 1 in a previous year
        """
        if self.status == 'active' and self.current_year == 1 and self.current_semester == 1:
            return True, "Eligible as Year 1, Semester 1 student"

        if self.status == 'deferred':
            # Check if they qualify as a deferred Y1S1 student
            enrollment = self.enrollments.filter(year=1, semester=1).first()
            if enrollment:
                return True, f"Eligible as deferred student (originally Y1S1 in {enrollment.academic_year})"

        return False, "Hostel booking is only available for Year 1, Semester 1 students"

    def __str__(self):
        return f"{self.reg_number} - {self.full_name}"


# ─────────────────────────────────────────────
# Student Enrollment (per academic year)
# ─────────────────────────────────────────────

class Enrollment(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='enrollments')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    year = models.PositiveIntegerField()
    semester = models.PositiveIntegerField()
    status = models.CharField(max_length=20, default='enrolled')

    class Meta:
        unique_together = ('student', 'academic_year', 'year', 'semester')

    def __str__(self):
        return f"{self.student.reg_number} | Y{self.year}S{self.semester} | {self.academic_year}"


# ─────────────────────────────────────────────
# Hostel & Block
# ─────────────────────────────────────────────

class Hostel(models.Model):
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('Mixed', 'Mixed')]

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, unique=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    description = models.TextField(blank=True)
    total_floors = models.PositiveIntegerField(default=1)
    has_kitchen = models.BooleanField(default=False)
    has_toilet = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    photo = models.ImageField(upload_to='hostels/', null=True, blank=True)
    warden = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        limit_choices_to={'role': 'warden'}, related_name='managed_hostels'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    @property
    def total_rooms(self):
        return self.rooms.count()

    @property
    def total_beds(self):
        return Bed.objects.filter(room__hostel=self).count()

    @property
    def available_beds(self):
        return Bed.objects.filter(room__hostel=self, status='available').count()

    def __str__(self):
        return f"{self.name} ({self.get_gender_display()})"


# ─────────────────────────────────────────────
# Room
# ─────────────────────────────────────────────

class Room(models.Model):
    ROOM_TYPE_CHOICES = [
        ('standard', 'Standard'),
        ('ensuite', 'En-Suite'),
        ('shared', 'Shared Facilities'),
    ]

    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name='rooms')
    room_number = models.CharField(max_length=10)
    floor = models.PositiveIntegerField(default=1)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES, default='standard')
    capacity = models.PositiveIntegerField(default=4)  # 2, 4, or 6
    has_toilet = models.BooleanField(default=False)
    has_kitchen = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('hostel', 'room_number')
        ordering = ['room_number']

    @property
    def available_beds_count(self):
        return self.beds.filter(status='available').count()

    @property
    def is_full(self):
        return self.available_beds_count == 0

    def __str__(self):
        return f"{self.hostel.code} - Room {self.room_number}"


# ─────────────────────────────────────────────
# Bed
# ─────────────────────────────────────────────

class Bed(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('occupied', 'Occupied'),
        ('locked', 'Temporarily Locked'),
        ('maintenance', 'Under Maintenance'),
    ]

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='beds')
    bed_number = models.CharField(max_length=5)  # e.g. "A", "B", "1", "2"
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    locked_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='locked_beds'
    )
    locked_at = models.DateTimeField(null=True, blank=True)
    lock_expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('room', 'bed_number')
        ordering = ['bed_number']

    def __str__(self):
        return f"{self.room} | Bed {self.bed_number} [{self.status}]"

    def lock(self, user):
        from django.utils import timezone
        from datetime import timedelta
        from django.conf import settings
        self.status = 'locked'
        self.locked_by = user
        self.locked_at = timezone.now()
        self.lock_expires_at = timezone.now() + timedelta(seconds=settings.BED_LOCK_TIMEOUT)
        self.save()

    def unlock(self):
        self.status = 'available'
        self.locked_by = None
        self.locked_at = None
        self.lock_expires_at = None
        self.save()

    def is_lock_expired(self):
        if self.lock_expires_at:
            return timezone.now() > self.lock_expires_at
        return False


# ─────────────────────────────────────────────
# Booking Application
# ─────────────────────────────────────────────

class BookingApplication(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Payment'),
        ('payment_initiated', 'Payment Initiated'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='bookings')
    bed = models.ForeignKey(Bed, on_delete=models.CASCADE, related_name='bookings')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.SET_NULL, null=True)

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    applied_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    check_in_date = models.DateField(null=True, blank=True)
    check_out_date = models.DateField(null=True, blank=True)

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True)

    class Meta:
        # One active booking per student per academic year
        unique_together = ('student', 'academic_year')
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.student.reg_number} | {self.bed} | {self.academic_year} [{self.status}]"


# ─────────────────────────────────────────────
# M-Pesa Payment
# ─────────────────────────────────────────────

class MpesaPayment(models.Model):
    STATUS_CHOICES = [
        ('initiated', 'Initiated'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('timeout', 'Timeout'),
    ]

    booking = models.OneToOneField(BookingApplication, on_delete=models.CASCADE, related_name='payment')
    phone_number = models.CharField(max_length=15)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    checkout_request_id = models.CharField(max_length=100, blank=True)
    merchant_request_id = models.CharField(max_length=100, blank=True)
    mpesa_receipt_number = models.CharField(max_length=50, blank=True)
    transaction_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='initiated')
    result_code = models.CharField(max_length=10, blank=True)
    result_description = models.TextField(blank=True)
    raw_response = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # DEV MODE: bypass flag
    is_dev_bypass = models.BooleanField(default=False)

    def __str__(self):
        return f"Payment | {self.booking.student.reg_number} | {self.status} | KES {self.amount}"


# ─────────────────────────────────────────────
# Warden
# ─────────────────────────────────────────────

class Warden(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='warden')
    staff_id = models.CharField(max_length=20, unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    phone = models.CharField(max_length=15)
    email = models.EmailField()
    photo = models.ImageField(upload_to='wardens/photos/', null=True, blank=True)

    class Meta:
        ordering = ['last_name']

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __str__(self):
        return f"{self.staff_id} - {self.full_name}"


# ─────────────────────────────────────────────
# Occupancy History
# ─────────────────────────────────────────────

class OccupancyHistory(models.Model):
    """Tracks who occupied which bed in which academic year - immutable record"""
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='occupancy_history')
    bed = models.ForeignKey(Bed, on_delete=models.CASCADE, related_name='occupancy_history')
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE)
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    booking = models.ForeignKey(BookingApplication, on_delete=models.SET_NULL, null=True)

    check_in = models.DateField()
    check_out = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-academic_year__name', 'hostel__name', 'room__room_number', 'bed__bed_number']

    def __str__(self):
        return (f"{self.student.reg_number} | {self.hostel.name} "
                f"Rm {self.room.room_number} Bed {self.bed.bed_number} | {self.academic_year}")


# ─────────────────────────────────────────────
# Notification
# ─────────────────────────────────────────────

class Notification(models.Model):
    TYPE_CHOICES = [
        ('info', 'Information'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=100)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='info')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} | {self.title}"