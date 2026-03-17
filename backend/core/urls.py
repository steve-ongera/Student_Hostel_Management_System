"""
Core App URL Configuration - Hostel Management System
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomTokenObtainPairView, LogoutView, ChangePasswordView, MeView,
    AcademicYearViewSet, StudentViewSet, HostelViewSet, RoomViewSet,
    BedViewSet, BookingApplicationViewSet, WardenViewSet,
    NotificationViewSet, WardenDashboardViewSet,
    CourseViewSet, DepartmentViewSet,
)

router = DefaultRouter()
router.register(r'academic-years', AcademicYearViewSet, basename='academic-year')
router.register(r'students', StudentViewSet, basename='student')
router.register(r'hostels', HostelViewSet, basename='hostel')
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'beds', BedViewSet, basename='bed')
router.register(r'bookings', BookingApplicationViewSet, basename='booking')
router.register(r'wardens', WardenViewSet, basename='warden')
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'warden-dashboard', WardenDashboardViewSet, basename='warden-dashboard')

urlpatterns = [
    # Auth
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('auth/me/', MeView.as_view(), name='me'),

    # M-Pesa Callback (public, no auth)
    path('mpesa/callback/', BookingApplicationViewSet.as_view({'post': 'mpesa_callback'}), name='mpesa-callback'),

    # Router URLs
    path('', include(router.urls)),
]