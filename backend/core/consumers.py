"""
WebSocket Consumer - Real-time bed status updates
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer


class BedStatusConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = 'bed_updates'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """Client can send ping/heartbeat"""
        data = json.loads(text_data)
        if data.get('type') == 'ping':
            await self.send(json.dumps({'type': 'pong'}))

    async def bed_update(self, event):
        """Relay bed status change to all connected clients"""
        await self.send(text_data=json.dumps(event['message']))