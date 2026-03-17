"""
Core Serializers - Hostel Management System
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import (
    Student, Warden, Hostel, Room, Bed, BookingApplication,
    MpesaPayment, AcademicYear, OccupancyHistory, Notification,
    Enrollment, Course, Department
)

User = get_user_model()


# ─────────────────────────────────────────────
# Auth Serializers
# ─────────────────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['role'] = user.role
        data['must_change_password'] = user.must_change_password
        data['username'] = user.username

        if user.role == 'student':
            try:
                student = user.student
                data['student_id'] = student.id
                data['reg_number'] = student.reg_number
                data['full_name'] = student.full_name
                data['gender'] = student.gender
                data['photo'] = student.photo.url if student.photo else None
            except Student.DoesNotExist:
                pass

        elif user.role == 'warden':
            try:
                warden = user.warden
                data['warden_id'] = warden.id
                data['full_name'] = warden.full_name
                data['staff_id'] = warden.staff_id
            except Warden.DoesNotExist:
                pass

        return data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    confirm_password = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("New passwords do not match.")
        return data


# ─────────────────────────────────────────────
# Academic Year
# ─────────────────────────────────────────────

class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = '__all__'


# ─────────────────────────────────────────────
# Department & Course
# ─────────────────────────────────────────────

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'


class CourseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Course
        fields = '__all__'


# ─────────────────────────────────────────────
# Student
# ─────────────────────────────────────────────

class StudentSerializer(serializers.ModelSerializer):
    full_name    = serializers.ReadOnlyField()
    course_name  = serializers.CharField(source='course.name', read_only=True)
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    # write-only: accepted on create but never returned in responses
    password            = serializers.CharField(write_only=True, required=False)
    must_change_password = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = Student
        fields = [
            'id', 'reg_number', 'first_name', 'last_name', 'middle_name',
            'full_name', 'gender', 'gender_display', 'date_of_birth',
            'phone', 'email', 'photo', 'course', 'course_name',
            'current_year', 'current_semester', 'status',
            'admission_date', 'admission_year', 'created_at',
            'password', 'must_change_password',
        ]
        read_only_fields = ['created_at']

    def validate_reg_number(self, value):
        # On update (instance exists) reg_number is read-only — skip uniqueness check
        if self.instance:
            return self.instance.reg_number
        return value


class StudentEligibilitySerializer(serializers.ModelSerializer):
    eligible = serializers.SerializerMethodField()
    eligibility_message = serializers.SerializerMethodField()
    current_academic_year = serializers.SerializerMethodField()
    existing_booking = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            'id', 'reg_number', 'full_name', 'gender', 'current_year',
            'current_semester', 'status', 'eligible', 'eligibility_message',
            'current_academic_year', 'existing_booking',
        ]

    def get_current_academic_year(self, obj):
        ay = AcademicYear.objects.filter(is_current=True).first()
        return AcademicYearSerializer(ay).data if ay else None

    def get_eligible(self, obj):
        ay = AcademicYear.objects.filter(is_current=True).first()
        if not ay:
            return False
        eligible, _ = obj.is_eligible_for_hostel(ay)
        return eligible

    def get_eligibility_message(self, obj):
        ay = AcademicYear.objects.filter(is_current=True).first()
        if not ay:
            return "No active academic year configured."
        _, msg = obj.is_eligible_for_hostel(ay)
        return msg

    def get_existing_booking(self, obj):
        ay = AcademicYear.objects.filter(is_current=True).first()
        if not ay:
            return None
        booking = obj.bookings.filter(academic_year=ay).first()
        if booking:
            return BookingApplicationSerializer(booking).data
        return None


# ─────────────────────────────────────────────
# Warden
# ─────────────────────────────────────────────

class WardenSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = Warden
        fields = ['id', 'staff_id', 'first_name', 'last_name', 'full_name', 'phone', 'email', 'photo']


# ─────────────────────────────────────────────
# Bed
# ─────────────────────────────────────────────

class BedSerializer(serializers.ModelSerializer):
    is_locked = serializers.SerializerMethodField()
    lock_expires_in = serializers.SerializerMethodField()
    current_occupant = serializers.SerializerMethodField()

    class Meta:
        model = Bed
        fields = [
            'id', 'bed_number', 'status', 'is_locked',
            'lock_expires_in', 'current_occupant',
        ]

    def get_is_locked(self, obj):
        return obj.status == 'locked' and not obj.is_lock_expired()

    def get_lock_expires_in(self, obj):
        if obj.status == 'locked' and obj.lock_expires_at:
            remaining = (obj.lock_expires_at - timezone.now()).total_seconds()
            return max(0, int(remaining))
        return None

    def get_current_occupant(self, obj):
        ay = AcademicYear.objects.filter(is_current=True).first()
        if not ay:
            return None
        booking = obj.bookings.filter(
            academic_year=ay, status='confirmed'
        ).select_related('student').first()
        if booking:
            return {
                'reg_number': booking.student.reg_number,
                'full_name': booking.student.full_name,
            }
        return None


# ─────────────────────────────────────────────
# Room
# ─────────────────────────────────────────────

class RoomSerializer(serializers.ModelSerializer):
    beds = BedSerializer(many=True, read_only=True)
    available_beds_count = serializers.ReadOnlyField()
    is_full = serializers.ReadOnlyField()

    class Meta:
        model = Room
        fields = [
            'id', 'room_number', 'floor', 'room_type', 'capacity',
            'has_toilet', 'has_kitchen', 'is_active',
            'available_beds_count', 'is_full', 'beds',
        ]


class RoomListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for room lists"""
    available_beds_count = serializers.ReadOnlyField()

    class Meta:
        model = Room
        fields = [
            'id', 'room_number', 'floor', 'room_type', 'capacity',
            'has_toilet', 'has_kitchen', 'available_beds_count',
        ]


# ─────────────────────────────────────────────
# Hostel
# ─────────────────────────────────────────────

class HostelSerializer(serializers.ModelSerializer):
    rooms = RoomListSerializer(many=True, read_only=True)
    total_rooms = serializers.ReadOnlyField()
    total_beds = serializers.ReadOnlyField()
    available_beds = serializers.ReadOnlyField()
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    warden_name = serializers.SerializerMethodField()
    occupancy_rate = serializers.SerializerMethodField()

    class Meta:
        model = Hostel
        fields = [
            'id', 'name', 'code', 'gender', 'gender_display',
            'description', 'total_floors', 'has_kitchen', 'has_toilet',
            'is_active', 'monthly_fee', 'photo', 'warden_name',
            'total_rooms', 'total_beds', 'available_beds',
            'occupancy_rate', 'rooms',
        ]

    def get_warden_name(self, obj):
        if obj.warden:
            try:
                return obj.warden.warden.full_name
            except Exception:
                return obj.warden.username
        return None

    def get_occupancy_rate(self, obj):
        total = obj.total_beds
        if total == 0:
            return 0
        occupied = total - obj.available_beds
        return round((occupied / total) * 100, 1)


class HostelListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for hostel list"""
    total_beds = serializers.ReadOnlyField()
    available_beds = serializers.ReadOnlyField()
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)

    class Meta:
        model = Hostel
        fields = [
            'id', 'name', 'code', 'gender', 'gender_display',
            'has_kitchen', 'has_toilet', 'monthly_fee', 'photo',
            'total_beds', 'available_beds',
        ]


# ─────────────────────────────────────────────
# Booking
# ─────────────────────────────────────────────

class BookingApplicationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_reg = serializers.CharField(source='student.reg_number', read_only=True)
    hostel_name = serializers.SerializerMethodField()
    room_number = serializers.SerializerMethodField()
    bed_number = serializers.CharField(source='bed.bed_number', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    payment = serializers.SerializerMethodField()

    class Meta:
        model = BookingApplication
        fields = [
            'id', 'student_name', 'student_reg', 'hostel_name',
            'room_number', 'bed_number', 'academic_year_name',
            'status', 'applied_at', 'confirmed_at', 'amount',
            'check_in_date', 'check_out_date', 'payment',
        ]

    def get_hostel_name(self, obj):
        return obj.bed.room.hostel.name

    def get_room_number(self, obj):
        return obj.bed.room.room_number

    def get_payment(self, obj):
        try:
            return MpesaPaymentSerializer(obj.payment).data
        except Exception:
            return None


class BookingCreateSerializer(serializers.Serializer):
    bed_id = serializers.IntegerField()
    phone_number = serializers.CharField(max_length=15)

    def validate_bed_id(self, value):
        try:
            bed = Bed.objects.get(id=value)
        except Bed.DoesNotExist:
            raise serializers.ValidationError("Bed not found.")
        if bed.status == 'occupied':
            raise serializers.ValidationError("This bed is already occupied.")
        if bed.status == 'maintenance':
            raise serializers.ValidationError("This bed is under maintenance.")
        if bed.status == 'locked' and not bed.is_lock_expired():
            # Allow if the lock belongs to the current user (their own lock from step 2)
            request = self.context.get('request')
            if request and bed.locked_by == request.user:
                return value
            raise serializers.ValidationError("This bed is temporarily locked. Please try again shortly.")
        return value


# ─────────────────────────────────────────────
# M-Pesa Payment
# ─────────────────────────────────────────────

class MpesaPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MpesaPayment
        fields = [
            'id', 'phone_number', 'amount', 'checkout_request_id',
            'mpesa_receipt_number', 'status', 'result_description',
            'transaction_date', 'is_dev_bypass', 'created_at',
        ]
        read_only_fields = ['checkout_request_id', 'mpesa_receipt_number', 'is_dev_bypass']


# ─────────────────────────────────────────────
# Occupancy History
# ─────────────────────────────────────────────

class OccupancyHistorySerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_reg = serializers.CharField(source='student.reg_number', read_only=True)
    hostel_name = serializers.CharField(source='hostel.name', read_only=True)
    room_number = serializers.CharField(source='room.room_number', read_only=True)
    bed_number = serializers.CharField(source='bed.bed_number', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)

    class Meta:
        model = OccupancyHistory
        fields = [
            'id', 'student_name', 'student_reg', 'hostel_name',
            'room_number', 'bed_number', 'academic_year_name',
            'check_in', 'check_out',
        ]


# ─────────────────────────────────────────────
# Notification
# ─────────────────────────────────────────────

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'notification_type', 'is_read', 'created_at']