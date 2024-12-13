// Initialize the API Gateway client
const apigClient = apigClientFactory.newClient();

// Get DOM elements
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendMessageButton = document.getElementById('sendMessage');

// Function to add a message to the chat window
function addMessage(message, type) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);
    messageElement.textContent = message;
    messagesContainer.appendChild(messageElement);
    
    // Scroll to the bottom of the messages
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Function to send a message to the Lex chatbot via API Gateway
async function sendMessage() {
    const message = userInput.value.trim();
    
    // Check if message is not empty
    if (!message) return;
    
    // Add user message to chat
    addMessage(message, 'user-message');
    
    // Clear input
    userInput.value = '';
    
    try {
        const idToken = localStorage.getItem("idToken");
        if (!idToken) {
            alert("You need to log in to chat with the bot.");
            window.location.href = "login.html";
            return;
        }

        const userId = localStorage.getItem('userId');
        
        // Prepare the additional parameters with the authorization
        const additionalParams = {
            headers: {
                'Authorization': idToken
            }
        };
        
        // Prepare the request body
        const body = { 
            message: message,
            user_id: userId 
        };
        
        // Send message to API Gateway
        const response = await apigClient.chatbotPost({}, body, additionalParams);

        console.log('RESPONSE', response);
        
        // Extract the Lex bot's response
        const responseBody = JSON.parse(response.data.body);
        const lexResponse = responseBody.messages[0].unstructured.text;
        
        // Add bot response to chat
        addMessage(lexResponse, 'bot-message');
    } catch (error) {
        console.error('Full error:', error);
        
        // More detailed error handling
        if (error.response) {
            // The request was made and the server responded with a status code
            console.error('Error response:', error.response.data);
            console.error('Status code:', error.response.status);
            
            if (error.response.status === 401) {
                addMessage('Authorization failed. Please log in again.', 'bot-message');
                // Redirect to login or refresh token
                window.location.href = "login.html";
            } else {
                addMessage(`Sorry, there was an error: ${error.response.data.message || 'Unknown error'}`, 'bot-message');
            }
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received:', error.request);
            addMessage('No response from server. Please check your connection.', 'bot-message');
        } 
    }
}

// Event listener for send button
sendMessageButton.addEventListener('click', sendMessage);

// Event listener for Enter key in input field
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});