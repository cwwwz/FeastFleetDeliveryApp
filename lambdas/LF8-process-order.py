import boto3
import json
from botocore.exceptions import ClientError
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name="us-east-1")
ses = boto3.client('ses', region_name="us-east-1")

ORDER_TABLE = "Order"
DELIVERY_TRACKING_TABLE = "Delivery_Tracking"
USER_TABLE = "User"
RESTAURANT_TABLE = "Restaurant"
SENDER_EMAIL = ""

order_table = dynamodb.Table(ORDER_TABLE)
delivery_tracking_table = dynamodb.Table(DELIVERY_TRACKING_TABLE)
user_table = dynamodb.Table(USER_TABLE)
restaurant_table = dynamodb.Table(RESTAURANT_TABLE)

def lambda_handler(event, context):
    """
    Lambda function to process SQS messages, update DynamoDB tables, and send email notifications.
    """
    for record in event['Records']:
        try:
            # Parse the message from SQS
            message = json.loads(record['body'])
            order_id = message['order_id']
            user_id = message['user_id']
            restaurant_id = message['restaurant_id']
            new_status = message['status']
            timestamp = message['timestamp']

            print(f"Processing order {order_id}: New status {new_status}")

            # Update Order Table with the new status
            update_order_status(order_id, new_status, timestamp)

            # Update Delivery Tracking Table if applicable
            if new_status in ["OUT_FOR_DELIVERY", "DELIVERED"]:
                update_delivery_status(order_id, user_id, restaurant_id, new_status, timestamp)

            # Retrieve user email from User Table
            user_email = get_user_email(user_id)
            if not user_email:
                print(f"No email found for user {user_id}. Skipping notification.")
                continue

            # Send email notification to the user
            send_email_notification(order_id, new_status, user_email)

        except Exception as e:
            print(f"Error processing message: {str(e)}")
            raise e

    return {"message": "Successfully processed messages from SQS"}

# Function to update the Order Table
def update_order_status(order_id, new_status, timestamp):
    try:
        order_table.update_item(
            Key={"order_id": order_id},
            UpdateExpression="SET #s = :new_status, #ts = :timestamp",
            ExpressionAttributeNames={"#s": "status", "#ts": "timestamp"},
            ExpressionAttributeValues={":new_status": new_status, ":timestamp": timestamp}
        )
        print(f"Order {order_id} status updated to {new_status}")
    except ClientError as e:
        print(f"Error updating order status for {order_id}: {e.response['Error']['Message']}")
        raise

# Function to update the Delivery Tracking Table
def update_delivery_status(order_id, user_id, restaurant_id, new_status, timestamp):
    """
    Updates the delivery tracking table or creates a new entry if it doesn't exist.
    """
    try:
        if new_status == "OUT_FOR_DELIVERY":
            # Fetch restaurant coordinates
            restaurant_coordinates = get_restaurant_coordinates(restaurant_id)
            if not restaurant_coordinates:
                print(f"Failed to fetch coordinates for restaurant {restaurant_id}")
                return

            # Fetch user coordinates
            user_coordinates = get_user_coordinates(user_id)
            if not user_coordinates:
                print(f"Failed to fetch coordinates for user {user_id}")
                return

            # Create a new delivery entry
            delivery_tracking_table.update_item(
                Key={"order_id": order_id},
                UpdateExpression="""
                    SET order_status = :status,
                        user_id = :user,
                        restaurant_id = :restaurant,
                        current_location = :location,
                        destination = :destination,
                        eta = :eta,
                        last_updated = :timestamp
                """,
                ExpressionAttributeValues={
                    ":status": new_status,
                    ":user": user_id,
                    ":restaurant": restaurant_id,
                    ":location": restaurant_coordinates,  # Use restaurant coordinates as the initial location
                    ":destination": user_coordinates,  # User's address as the destination
                    ":eta": "Unknown",  # Placeholder for ETA
                    ":timestamp": timestamp
                }
            )
            print(f"New delivery entry created for order {order_id} with status {new_status}")

        elif new_status == "DELIVERED":
            # Update existing delivery entry
            delivery_tracking_table.update_item(
                Key={"order_id": order_id},
                UpdateExpression="SET order_status = :status, last_updated = :timestamp",
                ExpressionAttributeValues={":status": "DELIVERED", ":timestamp": timestamp}
            )
            print(f"Delivery tracking for {order_id} updated to {new_status}")

    except Exception as e:
        print(f"Error updating delivery tracking for {order_id}: {str(e)}")
        raise

# Function to retrieve restaurant coordinates from the Restaurant Table
def get_restaurant_coordinates(restaurant_id):
    try:
        response = restaurant_table.get_item(Key={"restaurant_id": restaurant_id})
        if "Item" in response:
            return response["Item"].get("coordinates")
        return None
    except ClientError as e:
        print(f"Error retrieving coordinates for restaurant {restaurant_id}: {e.response['Error']['Message']}")
        raise

# Function to retrieve user coordinates from the User Table
def get_user_coordinates(user_id):
    try:
        response = user_table.get_item(Key={"user_id": user_id})
        if "Item" in response:
            return response["Item"].get("coordinates")
        return None
    except ClientError as e:
        print(f"Error retrieving coordinates for user {user_id}: {e.response['Error']['Message']}")
        raise

# Function to retrieve user email from User Table
def get_user_email(user_id):
    try:
        response = user_table.get_item(Key={"user_id": user_id})
        if "Item" in response:
            return response["Item"].get("email")
        return None
    except ClientError as e:
        print(f"Error retrieving email for user {user_id}: {e.response['Error']['Message']}")
        raise

# Function to send email notification
def send_email_notification(order_id, new_status, user_email):
    """
    Sends email notification using SES.
    """
    subject = f"Order Status Update: {new_status}"
    body = f"""
    Hello,

    Your order with ID {order_id} has been updated to the following status: **{new_status}**.

    Thank you for using our service!

    Best regards,
    FeastFleet Team
    """
    try:
        ses.send_email(
            Source=SENDER_EMAIL,
            Destination={"ToAddresses": [user_email]},
            Message={
                "Subject": {"Data": subject},
                "Body": {
                    "Text": {"Data": body}
                }
            }
        )
        print(f"Email sent to {user_email} for order {order_id} with status {new_status}")
    except ClientError as e:
        print(f"Error sending email to {user_email}: {e.response['Error']['Message']}")
        raise