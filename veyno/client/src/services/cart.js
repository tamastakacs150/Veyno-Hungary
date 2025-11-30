//client/src/services/cart.js
import api from "../utils/api.js"

// --- Public cart retrieval with username ---
/*export async function getCartByUsername(username) {
    const res = await api.get(`/cart/${username}`);
    return res.data;
}*/

// --- Add to cart ---
export async function addToCart(token, productId, quantity = 1, size = null) {
    const res = await api.post(
        `/cart/add`,
        { productId, quantity, size },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
}
// --- Secure: get cart of the logged-in user ---
export async function getCart(token) {
    const res = await api.get(`/cart`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
}

// --- Remove from cart ---
export async function removeFromCart(token, productId, size = null) {
    const res = await api.post(
        `/cart/remove`,
        { productId, size },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
}
