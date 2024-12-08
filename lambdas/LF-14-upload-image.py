import boto3
import base64
import uuid

s3 = boto3.client('s3')

def lambda_handler(event, context):
    # Decode the incoming base64-encoded image
    body = event['body']
    image_data = base64.b64decode(body)
    
    # Generate a unique filename for the image
    image_name = str(uuid.uuid4()) + ".jpg"
    
    # Upload image to S3
    bucket_name = "food-images-s3"
    s3.put_object(Bucket=bucket_name, Key=image_name, Body=image_data)
    
    return {
        'statusCode': 200,
        'body': f"Image uploaded successfully with key: {image_name}"
    }
}
