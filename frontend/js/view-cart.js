document.addEventListener('DOMContentLoaded', () => {
    const idToken = localStorage.getItem("idToken");
    if (!idToken) {
        alert("You need to log in to access the cart.");
        window.location.href = "login.html";
        return;
    }

    const userId = localStorage.getItem("userId");

    getCartContent(userId, idToken);
});
async function getCartContent(userId, idToken) {
    try {
        const response = await fetch(`https://930lk1e388.execute-api.us-east-1.amazonaws.com/dev/cart/get?user_id=${encodeURIComponent(userId)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${idToken}`, // Add the authorization header
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch cart content. Status: ${response.status}`);
        }
        
        const responseBody = await response.json();
        const cart = JSON.parse(responseBody.body).cart;
        
        const items = cart.item_list;
        console.log('Cart content:', cart);
        const itemContainer = document.getElementById("items");
        const summaryContainer = document.getElementById("summary") 
        itemContainer.innerHTML = "";
        summaryContainer.innerHTML = "";
        items.forEach(item => {
            const itemElement = `
                <div class="item">
                    <img src="images/food.jpeg" alt="food" />
                    <div class="details">
                        <h3>${item.item_name}</h3>
                        <p>$${item.item_price} dollars</p>
                        <div class="quantity">
                            <input type="number" value="${item.item_quantity}" min="0" step="1" />
                        </div>
                    </div>
                    <p class="price">$${(item.item_price * item.item_quantity).toFixed(2)}</p>
                </div>
            `;

            // Append the HTML to the container
            itemContainer.innerHTML += itemElement;
        });
        summaryContainer.innerHTML += `
        <h3>Order summary</h3>
          <p>Subtotal: $${cart.total_price}</p>
          <p><strong>Total: $${cart.total_price }</strong></p>
          <button id="placeOrderBtn">Continue to payment</button>`;
        
        document.getElementById('placeOrderBtn').addEventListener('click', () => {
            placeOrder(cart, idToken);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}
async function placeOrder(cartContent, idToken) {
    try {
        const requestBody = {
            restaurant_id: cartContent.restaurant_id,
            items: cartContent.item_list.map(item => ({
                item_id: item.item_id,
                quantity: item.item_quantity
            })),
            total_price: cartContent.total_price
        };

        const response = await fetch('https://930lk1e388.execute-api.us-east-1.amazonaws.com/dev/orders', { // Replace with your actual API endpoint
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`, // Add the authorization header
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Failed to place order. Status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Order placed successfully:', result);
        alert('Order placed successfully!');
        window.location.href='order-list.html'
    } catch (error) {
        console.error('Error placing order:', error);
        alert('Failed to place order. Please try again.');
    }
}
