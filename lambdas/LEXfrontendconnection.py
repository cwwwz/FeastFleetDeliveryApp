import json
import boto3
import uuid

def lambda_handler(event, context):

    print('EVENT ', event)
    # Extract the user message from the API request (assuming it's in the 'body')
    # body = json.loads(event['body'])
    user_message = event['message']
    print('USER_MESSAGE', user_message)

    user_id = event['user_id']
    print('USER_ID', user_id)
    session_id = user_id
    
    # Ensure user_message is not empty
    if not user_message:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'message': 'No user message found in request body'
            })
        }
    
    # Call the Lex chatbot
    client = boto3.client('lexv2-runtime')
    
    try:
        response = client.recognize_text(
            botId='VCDJAHG0YE',       # Lex bot ID
            botAliasId='TSTALIASID',# bot alias ID
            localeId='en_US', # bot's locale (e.g., en_US)
            sessionId=session_id, # Unique session ID (could be a user ID or random)
            text=user_message,
            sessionState={
                "sessionAttributes": {
                    "user_id": user_id
                }
            }
        )
        print('RESPONSE: ', response)
        
        # Extract the chatbot's response message
        lex_message = response['messages'][0]['content'] if 'messages' in response else 'Sorry, I didn’t understand that.'
        print('LEX_MESSAGE: ', lex_message)
        # Return the Lex response back to the API caller
        return {
            'statusCode': 200,
            'body': json.dumps({
                'messages': [
                    {
                        'type': 'unstructured',
                        'unstructured': {
                            'text': lex_message
                        }
                    }
                ]
            }),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        }
    
    except Exception as e:
        print('error calling lex bot')
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Error calling Lex bot',
                'error': str(e)
            })
        }