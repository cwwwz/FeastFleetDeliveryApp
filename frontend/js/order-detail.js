async function fetchOrderDetails() {
    try {
        console.log('Current URL search params:', window.location.search);

        const idToken = localStorage.getItem("idToken");
        if (!idToken) {
            alert("You need to log in to make a reservation.");
            window.location.href = "login.html";
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('orderId'); // Matches 'orderId' in the URL
        console.log('Extracted orderId:', orderId);

        if (!orderId) {
            alert('No order ID provided');
            return;
        }

        const API_URL = 'https://930lk1e388.execute-api.us-east-1.amazonaws.com/dev/orders';

        console.log('Fetching from:', `${API_URL}/${orderId}`);
        const response = await fetch(`${API_URL}/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${idToken}`, // Replace with the actual token
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch order details: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('API Response:', JSON.stringify(data, null, 2));

        // Validate response structure
        if (!data.order_info) {
            console.error('Missing order_info:', data);
            alert('Order details not available');
            return;
        }

        // Populate order details
        document.getElementById('orderId').textContent = data.order_info.order_id;
        document.getElementById('orderStatus').textContent = data.order_info.status;

        const orderItemsContainer = document.getElementById('orderItems');
        orderItemsContainer.innerHTML = ''; // Clear previous content

        data.order_info.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'order-item';
            itemElement.innerHTML = `
                <span>${item.quantity}x ${item.item_name}</span>
                <span>$${item.price}</span>
            `;
            orderItemsContainer.appendChild(itemElement);
        });

        document.getElementById('totalPrice').textContent = `$${data.order_info.total_price}`;
        document.getElementById('restaurantName').textContent = data.restaurant_info.name || 'N/A';
        document.getElementById('restaurantAddress').textContent = data.restaurant_info.address || 'N/A';

        if (data.delivery_info) {
            const lastUpdatedTimestamp = data.delivery_info.last_updated;
            document.getElementById('eta').textContent = data.delivery_info.eta || 'Not available';
            document.getElementById('lastUpdated').textContent = lastUpdatedTimestamp
                ? formatTimestamp(lastUpdatedTimestamp)
                : '-';
        } else {
            document.getElementById('eta').textContent = 'Not available';
            document.getElementById('lastUpdated').textContent = '-';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error loading order details');
    }
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

document.addEventListener('DOMContentLoaded', fetchOrderDetails);
