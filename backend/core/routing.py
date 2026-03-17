from django.urls import path
from .consumers import BedStatusConsumer

websocket_urlpatterns = [
    path('ws/beds/', BedStatusConsumer.as_asgi()),
]