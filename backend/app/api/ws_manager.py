from fastapi import WebSocket
from typing import Dict, List
from datetime import datetime

class UnifiedConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.group_connections: Dict[str, List[str]] = {}
        self.user_status: Dict[str, Dict] = {}
        self.typing_status: Dict[str, Dict] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str, accept: bool = True):
        if accept:
            await websocket.accept()
        self.active_connections[user_id] = websocket
        self.user_status[user_id] = {"online": True, "last_seen": datetime.utcnow()}
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if user_id in self.user_status:
            self.user_status[user_id]["online"] = False
        if user_id in self.typing_status:
            del self.typing_status[user_id]
        
        for group_id, users in self.group_connections.items():
            if user_id in users:
                users.remove(user_id)
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
                return True
            except:
                return False
        return False
    
    # Aliases
    send_to_user = send_personal_message
    
    async def send_to_users(self, user_ids: List[str], message: dict):
        for user_id in user_ids:
            await self.send_to_user(message, user_id)
            
    async def broadcast_typing(self, user_id: str, receiver_id: str, is_typing: bool):
        if is_typing:
            self.typing_status[user_id] = {
                "typing_to": receiver_id,
                "since": datetime.now().isoformat()
            }
        elif user_id in self.typing_status:
            del self.typing_status[user_id]

        await self.send_personal_message({
            "type": "typing",
            "from": user_id,
            "typing": is_typing
        }, receiver_id)

    async def send_to_group(self, group_id: str, message: dict, exclude_user: str = None):
        if group_id in self.group_connections:
            for user_id in self.group_connections[group_id]:
                if user_id != exclude_user and user_id in self.active_connections:
                    try:
                        await self.active_connections[user_id].send_json(message)
                    except:
                        pass

    async def join_group(self, user_id: str, group_id: str):
        if group_id not in self.group_connections:
            self.group_connections[group_id] = []
        
        if user_id not in self.group_connections[group_id]:
            self.group_connections[group_id].append(user_id)
        
        await self.send_to_group(group_id, {
            "type": "user_online",
            "user_id": user_id,
            "group_id": group_id
        }, exclude_user=user_id)
    
    async def leave_group(self, user_id: str, group_id: str):
        if group_id in self.group_connections and user_id in self.group_connections[group_id]:
            self.group_connections[group_id].remove(user_id)
        
        await self.send_to_group(group_id, {
            "type": "user_offline",
            "user_id": user_id,
            "group_id": group_id
        }, exclude_user=user_id)
    
    def is_user_online(self, user_id: str) -> bool:
        return user_id in self.user_status and self.user_status[user_id]["online"]
    
    def get_online_users(self, group_id: str) -> List[str]:
        if group_id not in self.group_connections:
            return []
        
        online_users = []
        for user_id in self.group_connections[group_id]:
            if self.is_user_online(user_id):
                online_users.append(user_id)
        
        return online_users

ws_manager = UnifiedConnectionManager()
