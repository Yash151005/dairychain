import requests
import json

# Step 1: Create a chat session
chat_response = requests.post(
    'http://localhost:8000/api/ai/chats',
    json={
        'farmer_id': 'test@test.com',
        'language': 'en',
        'title': 'Test Chat'
    }
)
print('Chat Creation Response:', chat_response.status_code, chat_response.json())

if chat_response.status_code == 200:
    chat_id = chat_response.json()['chat']['id']
    print(f'Created chat: {chat_id}\n')
    
    # Step 2: Send messages to the chat
    queries = ['Hello', 'What is milk price?', 'I have not received payment']
    
    for query in queries:
        print(f'--- Testing: {query} ---')
        msg_response = requests.post(
            'http://localhost:8000/api/ai/chat',
            json={
                'message': query,
                'chat_id': chat_id,
                'farmer_id': 'test@test.com',
                'language': 'en',
                'history': []
            }
        )
        print(f'Response status: {msg_response.status_code}')
        resp_json = msg_response.json()
        print(f'Full response: {json.dumps(resp_json, indent=2)}\n')

