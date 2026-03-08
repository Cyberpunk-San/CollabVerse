from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from app.api.chat import handle_chat_message, handle_file_message, handle_read_receipt
from app.api.ws_manager import ws_manager
from datetime import datetime
import json
import uuid
from app.core.database import get_db
from app.models.student import Student
from app.models.group import GroupMessageRead, GroupMessage

router = APIRouter(tags=["websocket"])

@router.websocket("/{user_id}")
async def unified_websocket(websocket: WebSocket, user_id: str):
    # Open a short-lived session just to validate the user, then close it immediately
    db = next(get_db())
    try:
        user = db.query(Student).filter(Student.id == user_id).first()
        user_exists = user is not None
    finally:
        db.close()

    if not user_exists:
        await websocket.close(code=1008)
        return

    await ws_manager.connect(websocket, user_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            # --- Chat Handlers ---
            if message_type == "chat":
                await handle_chat_message(user_id, data)
            elif message_type == "file":
                await handle_file_message(user_id, data)
            elif message_type == "typing":
                # Distinguished by 'to' (chat) or 'group_id' (group)
                if "group_id" in data:
                    group_id = data.get("group_id")
                    is_typing = data.get("typing", True)
                    await ws_manager.send_to_group(group_id, {
                        "type": "typing",
                        "group_id": group_id,
                        "user_id": user_id,
                        "typing": is_typing
                    }, exclude_user=user_id)
                else:
                    receiver_id = data.get("to")
                    is_typing = data.get("typing", True)
                    if receiver_id:
                        await ws_manager.broadcast_typing(user_id, receiver_id, is_typing)
            elif message_type == "read":
                message_id = data.get("message_id")
                if message_id:
                    await handle_read_receipt(user_id, message_id)
            
            # --- Group Handlers ---
            elif message_type == "join_group":
                group_id = data.get("group_id")
                if group_id:
                    await ws_manager.join_group(user_id, group_id)
                    await websocket.send_json({
                        "type": "group_joined",
                        "group_id": group_id,
                        "online_count": len(ws_manager.get_online_users(group_id))
                    })
            elif message_type == "leave_group":
                group_id = data.get("group_id")
                if group_id:
                    await ws_manager.leave_group(user_id, group_id)
                    await websocket.send_json({
                        "type": "group_left",
                        "group_id": group_id
                    })
            elif message_type == "group_message":
                # Logic usually handled via HTTP POST, but if sent via WS:
                pass 
            elif message_type == "group_typing":
                 group_id = data.get("group_id")
                 is_typing = data.get("typing", True)
                 if group_id:
                     await ws_manager.send_to_group(group_id, {
                         "type": "typing",
                         "group_id": group_id,
                         "user_id": user_id,
                         "typing": is_typing
                     }, exclude_user=user_id)
            elif message_type == "group_read":
                group_id = data.get("group_id")
                message_id = data.get("message_id")
                if group_id and message_id:
                    read_record = GroupMessageRead(
                        id=str(uuid.uuid4()),
                        message_id=message_id,
                        user_id=user_id
                    )
                    db.add(read_record)
                    db.commit()
                    
                    message = db.query(GroupMessage).filter(GroupMessage.id == message_id).first()
                    if message and message.sender_id != user_id:
                        await ws_manager.send_to_user(message.sender_id, {
                            "type": "message_read",
                            "group_id": group_id,
                            "message_id": message_id,
                            "read_by": user_id
                        })
            
            # --- Common Handlers ---
            elif message_type == "heartbeat":
                if user_id in ws_manager.user_status:
                    ws_manager.user_status[user_id]["last_seen"] = datetime.utcnow()
                
                for group_id in ws_manager.group_connections.get(user_id, []):
                    online_users = ws_manager.get_online_users(group_id)
                    await websocket.send_json({
                        "type": "online_status",
                        "group_id": group_id,
                        "online_count": len(online_users)
                    })
            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})
            
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                })
                
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id)
    except Exception as e:
        print(f"WS Error: {e}")
        ws_manager.disconnect(user_id)
