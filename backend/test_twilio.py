import os
from dotenv import load_dotenv
from twilio.rest import Client

# Load .env
load_dotenv()

# Get settings
account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")
from_number = os.getenv("TWILIO_WHATSAPP_FROM")
to_number = os.getenv("TWILIO_WHATSAPP_TO")

print(f"DEBUG: SID={account_sid}")
print(f"DEBUG: FROM='{from_number}'")
print(f"DEBUG: TO='{to_number}'")

if not all([account_sid, auth_token, from_number, to_number]):
    print("ERROR: Missing Twilio credentials in environment.")
    exit(1)

# Clean numbers (remove comments if they exist)
from_number = from_number.split('#')[0].strip()
to_number = to_number.split('#')[0].strip()

try:
    client = Client(account_sid, auth_token)
    message = client.messages.create(
        from_=from_number,
        body="✅ NETRA: Test Connection Successful!",
        to=to_number
    )
    print(f"SUCCESS! Message SID: {message.sid}")
except Exception as e:
    print(f"FAILED: {e}")
