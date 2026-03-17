from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Student, Warden, Hostel, Room, Bed,
    BookingApplication, MpesaPayment, AcademicYear,
    OccupancyHistory, Notification, Enrollment, Course, Department
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'role', 'is_active', 'must_change_password', 'date_joined')
    list_filter = ('role', 'is_active')
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Info', {'fields': ('email', 'role', 'must_change_password')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('username', 'role', 'password1', 'password2')}),
    )
    search_fields = ('username',)
    ordering = ('username',)


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_current', 'application_open', 'start_date', 'end_date')
    list_editable = ('is_current', 'application_open')


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('reg_number', 'full_name', 'gender', 'current_year', 'current_semester', 'status')
    list_filter = ('gender', 'current_year', 'status')
    search_fields = ('reg_number', 'first_name', 'last_name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Hostel)
class HostelAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'gender', 'total_rooms', 'total_beds', 'available_beds', 'is_active')
    list_filter = ('gender', 'is_active')


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('hostel', 'room_number', 'floor', 'capacity', 'available_beds_count', 'is_active')
    list_filter = ('hostel', 'floor', 'is_active')


@admin.register(Bed)
class BedAdmin(admin.ModelAdmin):
    list_display = ('room', 'bed_number', 'status', 'locked_by', 'lock_expires_at')
    list_filter = ('status', 'room__hostel')
    actions = ['release_locks']

    @admin.action(description='Release bed locks')
    def release_locks(self, request, queryset):
        queryset.filter(status='locked').update(
            status='available', locked_by=None, locked_at=None, lock_expires_at=None
        )


@admin.register(BookingApplication)
class BookingApplicationAdmin(admin.ModelAdmin):
    list_display = ('student', 'bed', 'academic_year', 'status', 'amount', 'applied_at')
    list_filter = ('status', 'academic_year')
    search_fields = ('student__reg_number', 'student__first_name')


@admin.register(MpesaPayment)
class MpesaPaymentAdmin(admin.ModelAdmin):
    list_display = ('booking', 'phone_number', 'amount', 'status', 'mpesa_receipt_number', 'is_dev_bypass')
    list_filter = ('status', 'is_dev_bypass')
    readonly_fields = ('raw_response',)


@admin.register(OccupancyHistory)
class OccupancyHistoryAdmin(admin.ModelAdmin):
    list_display = ('student', 'hostel', 'room', 'bed', 'academic_year', 'check_in', 'check_out')
    list_filter = ('hostel', 'academic_year')
    search_fields = ('student__reg_number',)


admin.site.register(Department)
admin.site.register(Course)
admin.site.register(Warden)
admin.site.register(Enrollment)
admin.site.register(Notification)