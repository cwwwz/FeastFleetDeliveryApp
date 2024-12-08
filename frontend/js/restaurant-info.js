document.addEventListener("DOMContentLoaded", () => {
    fetch("navbar.html")
        .then((response) => response.text())
        .then((data) => {
        document.getElementById("navbar").innerHTML = data;

        // Initialize navbar logic after it's added to the DOM
        const navbarScript = document.createElement("script");
        navbarScript.src = "js/navbar.js";
        navbarScript.defer = true;
        document.body.appendChild(navbarScript);
        })
        .catch((error) => console.error("Error loading navbar:", error));
    
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('query');

    if (query) {
        getRestaurantInfo(query);
    } else {
        console.error('No query found in URL');
    }
});

async function getRestaurantInfo(query) {
    const apiUrl = `https://930lk1e388.execute-api.us-east-1.amazonaws.com/dev/restaurants/`;
        const infoContainer = document.getElementsByClassName('rest-info');
        infoContainer.innerHTML = '';
        try {
            const response = await fetch(`${apiUrl}${query}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch restaurant data for ID: ${query}`);
            }
            const restaurantData = await response.json();
            console.log(restaurantData);
            const parsedData = JSON.parse(restaurantData.body);
            console.log(parsedData)
            if (parsedData) {
                const resultItem = `
                    <h1 id="restaurant-name">${parsedData.restaurantDetails.name}</h1>
                    <p id="restaurant-address">Address: ${parsedData.restaurantDetails.address}</p>
                    <p id="restaurant-cuisine">Cuisine Type: ${parsedData.restaurantDetails.cuisine}.</p>

                `;
                infoContainer.innerHTML += resultItem;
            }
            return restaurantData;
        }
        catch (error) {
            console.log(error);
            return null;
        }
}