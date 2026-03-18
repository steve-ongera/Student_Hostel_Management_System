"""
Core ViewSets - Hostel Management System
All business logic lives here.
"""

import base64
import hashlib
import requests
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.core.cache import cache
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    User, Student, Warden, Hostel, Room, Bed,
    BookingApplication, MpesaPayment, AcademicYear,
    OccupancyHistory, Notification, Enrollment
)
from .serializers import (
    CustomTokenObtainPairSerializer, ChangePasswordSerializer,
    StudentSerializer, StudentEligibilitySerializer, WardenSerializer,
    HostelSerializer, HostelListSerializer, RoomSerializer,
    BedSerializer, BookingApplicationSerializer, BookingCreateSerializer,
    MpesaPaymentSerializer, AcademicYearSerializer,
    OccupancyHistorySerializer, NotificationSerializer,
)


# ─────────────────────────────────────────────
# Permissions
# ─────────────────────────────────────────────

class IsStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'student'


class IsWarden(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('warden', 'admin')


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


# ─────────────────────────────────────────────
# Auth Views
# ─────────────────────────────────────────────

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Successfully logged out.'})
        except Exception:
            return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.must_change_password = False
        user.save()
        return Response({'message': 'Password changed successfully.'})


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'must_change_password': user.must_change_password,
        }
        if user.role == 'student':
            try:
                student = user.student
                data.update(StudentSerializer(student).data)
            except Student.DoesNotExist:
                pass
        elif user.role == 'warden':
            try:
                warden = user.warden
                data.update(WardenSerializer(warden).data)
            except Warden.DoesNotExist:
                pass
        return Response(data)


# ─────────────────────────────────────────────
# Academic Year ViewSet
# ─────────────────────────────────────────────

class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    @action(detail=False, methods=['get'])
    def current(self, request):
        ay = AcademicYear.objects.filter(is_current=True).first()
        if not ay:
            return Response({'error': 'No current academic year configured.'}, status=404)
        return Response(AcademicYearSerializer(ay).data)


# ─────────────────────────────────────────────
# Student ViewSet
# ─────────────────────────────────────────────

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related('user', 'course').all()
    serializer_class = StudentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['gender', 'current_year', 'current_semester', 'status', 'course']
    search_fields = ['reg_number', 'first_name', 'last_name']

    def get_permissions(self):
        if self.action in ['my_profile', 'my_eligibility', 'my_bookings', 'my_history']:
            return [IsStudent()]
        return [IsWarden()]

    def get_serializer_class(self):
        if self.action == 'my_eligibility':
            return StudentEligibilitySerializer
        return StudentSerializer

    def create(self, request, *args, **kwargs):
        """Create User account first, then Student profile directly"""
        data = request.data.copy()
        username    = data.get('reg_number', '').strip()
        password    = data.get('password', '').strip()
        must_change = data.get('must_change_password', False)

        if not username:
            return Response({'reg_number': ['Registration number is required.']}, status=400)
        if not password:
            return Response({'password': ['Password is required.']}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({'reg_number': [f'A user with username "{username}" already exists.']}, status=400)

        # Validate via serializer (this also strips unknown fields)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            # 1. Create the auth user
            user = User.objects.create_user(
                username=username,
                password=password,
                role='student',
                email=data.get('email', ''),
                must_change_password=bool(must_change),
            )
            # 2. Build clean student kwargs — only Student model fields
            vd = dict(serializer.validated_data)
            vd.pop('password', None)
            vd.pop('must_change_password', None)
            vd['user'] = user
            student = Student.objects.create(**vd)

        return Response(StudentSerializer(student).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='my-profile')
    def my_profile(self, request):
        student = request.user.student
        return Response(StudentSerializer(student).data)

    @action(detail=False, methods=['get'], url_path='my-eligibility')
    def my_eligibility(self, request):
        student = request.user.student
        serializer = StudentEligibilitySerializer(student)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='my-bookings')
    def my_bookings(self, request):
        student = request.user.student
        bookings = student.bookings.select_related('bed__room__hostel', 'academic_year').all()
        return Response(BookingApplicationSerializer(bookings, many=True).data)

    @action(detail=False, methods=['get'], url_path='my-history')
    def my_history(self, request):
        student = request.user.student
        history = student.occupancy_history.select_related(
            'hostel', 'room', 'bed', 'academic_year'
        ).all()
        return Response(OccupancyHistorySerializer(history, many=True).data)


# ─────────────────────────────────────────────
# Hostel ViewSet
# ─────────────────────────────────────────────

class HostelViewSet(viewsets.ModelViewSet):
    queryset = Hostel.objects.prefetch_related('rooms__beds').all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['gender', 'is_active']

    def get_permissions(self):
        if self.action in [
            'list', 'retrieve',
            'available_for_student',
            'rooms_with_availability',
            'occupancy_history',
            'room_bed_history',
        ]:
            return [permissions.IsAuthenticated()]
        return [IsWarden()]

    def get_serializer_class(self):
        if self.action == 'list':
            return HostelListSerializer
        return HostelSerializer

    @action(detail=False, methods=['get'], url_path='available-for-student')
    def available_for_student(self, request):
        """Return hostels matching the logged-in student's gender with available beds"""
        try:
            student = request.user.student
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found.'}, status=404)

        gender_filter = {'M': 'M', 'F': 'F'}
        hostels = Hostel.objects.filter(
            gender=gender_filter.get(student.gender, student.gender),
            is_active=True,
        ).prefetch_related('rooms__beds')

        # Filter to only hostels with available beds
        available_hostels = [h for h in hostels if h.available_beds > 0]
        return Response(HostelListSerializer(available_hostels, many=True).data)

    @action(detail=True, methods=['get'], url_path='rooms-with-availability')
    def rooms_with_availability(self, request, pk=None):
        """Get all rooms and their bed availability for a specific hostel"""
        hostel = self.get_object()
        rooms = hostel.rooms.filter(is_active=True).prefetch_related('beds')
        return Response(RoomSerializer(rooms, many=True).data)

    @action(detail=True, methods=['get'], url_path='occupancy-history')
    def occupancy_history(self, request, pk=None):
        hostel = self.get_object()
        year = request.query_params.get('year')
        history = OccupancyHistory.objects.filter(hostel=hostel)
        if year:
            history = history.filter(academic_year__name=year)
        history = history.select_related('student', 'room', 'bed', 'academic_year')
        return Response(OccupancyHistorySerializer(history, many=True).data)

    @action(detail=True, methods=['get'], url_path='room/(?P<room_number>[^/.]+)/bed-history')
    def room_bed_history(self, request, pk=None, room_number=None):
        """Who slept in a specific room, per bed, across all academic years"""
        hostel = self.get_object()
        try:
            room = hostel.rooms.get(room_number=room_number)
        except Room.DoesNotExist:
            return Response({'error': 'Room not found.'}, status=404)

        history = OccupancyHistory.objects.filter(
            room=room
        ).select_related('student', 'bed', 'academic_year').order_by(
            '-academic_year__name', 'bed__bed_number'
        )
        return Response(OccupancyHistorySerializer(history, many=True).data)


# ─────────────────────────────────────────────
# Room ViewSet
# ─────────────────────────────────────────────

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.prefetch_related('beds').all()
    serializer_class = RoomSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['hostel', 'floor', 'room_type', 'is_active']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsWarden()]


# ─────────────────────────────────────────────
# Bed ViewSet
# ─────────────────────────────────────────────

class BedViewSet(viewsets.ModelViewSet):
    queryset = Bed.objects.select_related('room__hostel').all()
    serializer_class = BedSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['room', 'status']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'lock_bed', 'unlock_bed']:
            return [permissions.IsAuthenticated()]
        return [IsWarden()]

    @action(detail=True, methods=['post'], url_path='lock')
    def lock_bed(self, request, pk=None):
        """Temporarily lock a bed during booking flow (real-time seat lock)"""
        bed = self.get_object()

        # Release expired locks first
        if bed.status == 'locked' and bed.is_lock_expired():
            bed.unlock()

        if bed.status != 'available':
            return Response(
                {'error': f'Bed is not available. Status: {bed.status}'},
                status=status.HTTP_409_CONFLICT
            )

        with transaction.atomic():
            bed.lock(request.user)

        # Broadcast lock via WebSocket
        _broadcast_bed_update(bed.id, {
            'type': 'bed_locked',
            'bed_id': bed.id,
            'room_id': bed.room.id,
            'locked_by': request.user.username,
            'expires_in': settings.BED_LOCK_TIMEOUT,
        })

        return Response({
            'message': 'Bed locked successfully.',
            'bed_id': bed.id,
            'expires_in': settings.BED_LOCK_TIMEOUT,
            'lock_expires_at': bed.lock_expires_at.isoformat(),
        })

    @action(detail=True, methods=['post'], url_path='unlock')
    def unlock_bed(self, request, pk=None):
        """Release a bed lock (user cancels booking)"""
        bed = self.get_object()
        if bed.status == 'locked' and bed.locked_by == request.user:
            bed.unlock()
            _broadcast_bed_update(bed.id, {
                'type': 'bed_unlocked',
                'bed_id': bed.id,
                'room_id': bed.room.id,
            })
            return Response({'message': 'Bed unlocked.'})
        return Response({'error': 'You do not hold a lock on this bed.'}, status=400)


# ─────────────────────────────────────────────
# Booking ViewSet
# ─────────────────────────────────────────────

class BookingApplicationViewSet(viewsets.ModelViewSet):
    queryset = BookingApplication.objects.select_related(
        'student', 'bed__room__hostel', 'academic_year'
    ).all()
    serializer_class = BookingApplicationSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'academic_year', 'student']

    def get_permissions(self):
        # Student-only actions
        if self.action in ['apply', 'create', 'initiate_payment']:
            return [IsStudent()]
        # Any authenticated user
        if self.action in [
            'list', 'retrieve', 'confirm', 'cancel',
            'payment_status', 'mpesa_callback',
        ]:
            return [permissions.IsAuthenticated()]
        # Warden/admin only
        return [IsWarden()]

    @action(detail=False, methods=['post'], url_path='apply')
    def apply(self, request):
        """
        Full booking flow:
        1. Check student eligibility
        2. Verify bed is available/lock exists
        3. Create booking record
        4. Initiate M-Pesa STK Push (or bypass in dev)
        """
        try:
            student = request.user.student
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found.'}, status=404)

        ay = AcademicYear.objects.filter(is_current=True).first()
        if not ay:
            return Response({'error': 'No active academic year.'}, status=400)

        if not ay.application_open:
            return Response({'error': 'Hostel applications are not currently open.'}, status=400)

        # Eligibility check
        eligible, msg = student.is_eligible_for_hostel(ay)
        if not eligible:
            return Response({'error': msg}, status=status.HTTP_403_FORBIDDEN)

        # Check for existing booking
        if student.bookings.filter(academic_year=ay).exclude(status='cancelled').exists():
            return Response({'error': 'You already have an active booking for this academic year.'}, status=400)

        serializer = BookingCreateSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        bed_id = serializer.validated_data['bed_id']
        phone = serializer.validated_data['phone_number']

        bed = Bed.objects.select_for_update().get(id=bed_id)

        # Verify bed is locked by this user
        if bed.status != 'locked' or bed.locked_by != request.user:
            if bed.status == 'available':
                return Response(
                    {'error': 'Please lock the bed first before completing booking.'},
                    status=status.HTTP_409_CONFLICT
                )
            return Response(
                {'error': 'This bed is not locked by you or the lock has expired.'},
                status=status.HTTP_409_CONFLICT
            )

        with transaction.atomic():
            # Get enrollment
            enrollment = student.enrollments.filter(
                academic_year=ay
            ).first()

            booking = BookingApplication.objects.create(
                student=student,
                bed=bed,
                academic_year=ay,
                enrollment=enrollment,
                status='payment_initiated',
                amount=bed.room.hostel.monthly_fee,
            )

            # Initiate payment
            if settings.DEBUG:
                # Dev bypass
                payment = MpesaPayment.objects.create(
                    booking=booking,
                    phone_number=phone,
                    amount=booking.amount,
                    status='success',
                    is_dev_bypass=True,
                    mpesa_receipt_number=f'DEV{booking.id:06d}',
                    transaction_date=timezone.now(),
                )
                booking.status = 'confirmed'
                booking.confirmed_at = timezone.now()
                booking.save()
                bed.status = 'occupied'
                bed.locked_by = None
                bed.locked_at = None
                bed.lock_expires_at = None
                bed.save()

                # Create occupancy history
                OccupancyHistory.objects.create(
                    student=student,
                    bed=bed,
                    hostel=bed.room.hostel,
                    room=bed.room,
                    academic_year=ay,
                    booking=booking,
                    check_in=timezone.now().date(),
                )

                _broadcast_bed_update(bed.id, {
                    'type': 'bed_occupied',
                    'bed_id': bed.id,
                    'room_id': bed.room.id,
                })

                _create_notification(
                    request.user,
                    'Booking Confirmed (Dev Mode)',
                    f'Your booking for {bed.room.hostel.name} Room {bed.room.room_number} Bed {bed.bed_number} has been confirmed.',
                    'success'
                )

                return Response({
                    'message': 'Booking confirmed (dev bypass).',
                    'booking': BookingApplicationSerializer(booking).data,
                    'payment': MpesaPaymentSerializer(payment).data,
                })
            else:
                # Real M-Pesa STK Push
                stk_result = _initiate_mpesa_stk_push(phone, booking.amount, booking.id)
                if stk_result.get('success'):
                    payment = MpesaPayment.objects.create(
                        booking=booking,
                        phone_number=phone,
                        amount=booking.amount,
                        checkout_request_id=stk_result.get('CheckoutRequestID'),
                        merchant_request_id=stk_result.get('MerchantRequestID'),
                        status='initiated',
                    )
                    return Response({
                        'message': 'Payment initiated. Complete payment on your phone.',
                        'checkout_request_id': stk_result.get('CheckoutRequestID'),
                        'booking_id': booking.id,
                    })
                else:
                    booking.status = 'cancelled'
                    booking.save()
                    bed.unlock()
                    return Response(
                        {'error': 'Failed to initiate payment. Please try again.'},
                        status=status.HTTP_502_BAD_GATEWAY
                    )

    @action(detail=False, methods=['post'], url_path='mpesa-callback')
    def mpesa_callback(self, request):
        """Handle M-Pesa callback"""
        data = request.data.get('Body', {}).get('stkCallback', {})
        checkout_id = data.get('CheckoutRequestID')
        result_code = str(data.get('ResultCode', '1'))
        result_desc = data.get('ResultDesc', '')

        try:
            payment = MpesaPayment.objects.get(checkout_request_id=checkout_id)
        except MpesaPayment.DoesNotExist:
            return Response({'ResultCode': 0})

        payment.result_code = result_code
        payment.result_description = result_desc
        payment.raw_response = data

        if result_code == '0':
            # Payment successful
            callback_metadata = data.get('CallbackMetadata', {}).get('Item', [])
            meta = {item['Name']: item.get('Value') for item in callback_metadata}

            payment.mpesa_receipt_number = meta.get('MpesaReceiptNumber', '')
            payment.transaction_date = timezone.now()
            payment.status = 'success'
            payment.save()

            booking = payment.booking
            booking.status = 'confirmed'
            booking.confirmed_at = timezone.now()
            booking.save()

            bed = booking.bed
            bed.status = 'occupied'
            bed.locked_by = None
            bed.locked_at = None
            bed.lock_expires_at = None
            bed.save()

            OccupancyHistory.objects.get_or_create(
                student=booking.student,
                bed=bed,
                academic_year=booking.academic_year,
                defaults={
                    'hostel': bed.room.hostel,
                    'room': bed.room,
                    'booking': booking,
                    'check_in': timezone.now().date(),
                }
            )

            _broadcast_bed_update(bed.id, {'type': 'bed_occupied', 'bed_id': bed.id, 'room_id': bed.room.id})
            _create_notification(
                booking.student.user,
                'Booking Confirmed!',
                f'Payment received. Your bed at {bed.room.hostel.name} Room {bed.room.room_number} Bed {bed.bed_number} is confirmed.',
                'success'
            )
        else:
            payment.status = 'failed'
            payment.save()
            booking = payment.booking
            booking.status = 'cancelled'
            booking.save()
            booking.bed.unlock()
            _create_notification(
                booking.student.user,
                'Payment Failed',
                f'Your payment could not be processed: {result_desc}. Please try again.',
                'error'
            )

        return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})

    @action(detail=True, methods=['get'], url_path='payment-status')
    def payment_status(self, request, pk=None):
        """Poll payment status"""
        booking = self.get_object()
        try:
            payment = booking.payment
            return Response({
                'booking_status': booking.status,
                'payment_status': payment.status,
                'receipt': payment.mpesa_receipt_number,
            })
        except Exception:
            return Response({'booking_status': booking.status, 'payment_status': None})


# ─────────────────────────────────────────────
# Warden ViewSet
# ─────────────────────────────────────────────

class WardenViewSet(viewsets.ModelViewSet):
    queryset = Warden.objects.select_related('user').all()
    serializer_class = WardenSerializer
    permission_classes = [IsAdmin]


# ─────────────────────────────────────────────
# Course & Department ViewSets
# ─────────────────────────────────────────────

from .models import Course, Department
from .serializers import CourseSerializer, DepartmentSerializer

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.select_related("department").all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["department"]

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]


# ─────────────────────────────────────────────
# Notification ViewSet
# ─────────────────────────────────────────────

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save()
        return Response({'status': 'marked as read'})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'all marked as read'})


# ─────────────────────────────────────────────
# Warden Dashboard ViewSet
# ─────────────────────────────────────────────

class WardenDashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsWarden]

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        ay = AcademicYear.objects.filter(is_current=True).first()
        total_beds = Bed.objects.count()
        occupied = Bed.objects.filter(status='occupied').count()
        available = Bed.objects.filter(status='available').count()
        locked = Bed.objects.filter(status='locked').count()
        total_bookings = BookingApplication.objects.filter(academic_year=ay).count() if ay else 0
        confirmed_bookings = BookingApplication.objects.filter(academic_year=ay, status='confirmed').count() if ay else 0
        pending_bookings = BookingApplication.objects.filter(academic_year=ay, status='payment_initiated').count() if ay else 0

        return Response({
            'total_beds': total_beds,
            'occupied_beds': occupied,
            'available_beds': available,
            'locked_beds': locked,
            'occupancy_rate': round((occupied / total_beds * 100), 1) if total_beds else 0,
            'total_bookings': total_bookings,
            'confirmed_bookings': confirmed_bookings,
            'pending_bookings': pending_bookings,
            'current_academic_year': ay.name if ay else None,
        })

    @action(detail=False, methods=['get'], url_path='all-bookings')
    def all_bookings(self, request):
        ay_name = request.query_params.get('year')
        bookings = BookingApplication.objects.select_related(
            'student', 'bed__room__hostel', 'academic_year'
        )
        if ay_name:
            bookings = bookings.filter(academic_year__name=ay_name)
        else:
            ay = AcademicYear.objects.filter(is_current=True).first()
            if ay:
                bookings = bookings.filter(academic_year=ay)
        return Response(BookingApplicationSerializer(bookings, many=True).data)

    @action(detail=False, methods=['get'], url_path='occupancy-matrix')
    def occupancy_matrix(self, request):
        """Full hostel → room → bed occupancy matrix"""
        hostels = Hostel.objects.prefetch_related('rooms__beds').filter(is_active=True)
        result = []
        for hostel in hostels:
            hostel_data = {'id': hostel.id, 'name': hostel.name, 'gender': hostel.gender, 'floors': []}
            floors = {}
            for room in hostel.rooms.filter(is_active=True):
                floor = room.floor
                if floor not in floors:
                    floors[floor] = []
                floors[floor].append({
                    'room_id': room.id,
                    'room_number': room.room_number,
                    'capacity': room.capacity,
                    'available': room.available_beds_count,
                    'beds': BedSerializer(room.beds.all(), many=True).data,
                })
            for floor_num in sorted(floors.keys()):
                hostel_data['floors'].append({'floor': floor_num, 'rooms': floors[floor_num]})
            result.append(hostel_data)
        return Response(result)

    @action(detail=False, methods=['get'], url_path='room-history')
    def room_history(self, request):
        hostel_id = request.query_params.get('hostel_id')
        room_number = request.query_params.get('room_number')
        bed_number = request.query_params.get('bed_number')
        year = request.query_params.get('year')

        qs = OccupancyHistory.objects.select_related(
            'student', 'hostel', 'room', 'bed', 'academic_year'
        )
        if hostel_id:
            qs = qs.filter(hostel_id=hostel_id)
        if room_number:
            qs = qs.filter(room__room_number=room_number)
        if bed_number:
            qs = qs.filter(bed__bed_number=bed_number)
        if year:
            qs = qs.filter(academic_year__name=year)

        return Response(OccupancyHistorySerializer(qs.order_by('-academic_year__name'), many=True).data)


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _broadcast_bed_update(bed_id, message):
    """Broadcast bed status change via WebSocket"""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'bed_updates',
            {'type': 'bed_update', 'message': message}
        )
    except Exception:
        pass  # Gracefully fail if channels not fully configured


def _create_notification(user, title, message, notif_type='info'):
    Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notif_type,
    )


def _get_mpesa_token():
    key = settings.MPESA_CONSUMER_KEY
    secret = settings.MPESA_CONSUMER_SECRET
    credentials = base64.b64encode(f"{key}:{secret}".encode()).decode()
    url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    if settings.MPESA_ENVIRONMENT == 'production':
        url = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    r = requests.get(url, headers={'Authorization': f'Basic {credentials}'})
    return r.json().get('access_token')


def _initiate_mpesa_stk_push(phone, amount, booking_id):
    try:
        token = _get_mpesa_token()
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        shortcode = settings.MPESA_SHORTCODE
        passkey = settings.MPESA_PASSKEY
        password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()

        url = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
        if settings.MPESA_ENVIRONMENT == 'production':
            url = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'

        payload = {
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone,
            "PartyB": shortcode,
            "PhoneNumber": phone,
            "CallBackURL": settings.MPESA_CALLBACK_URL,
            "AccountReference": f"HOSTEL-{booking_id}",
            "TransactionDesc": "Hostel Booking Payment",
        }

        r = requests.post(
            url,
            json=payload,
            headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
            timeout=30,
        )
        result = r.json()
        if result.get('ResponseCode') == '0':
            result['success'] = True
        else:
            result['success'] = False
        return result
    except Exception as e:
        return {'success': False, 'error': str(e)}