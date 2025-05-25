const API_BASE_URL = 'http://localhost:8080/api/v1';
let accessToken = localStorage.getItem('accessToken') || null;
let currentUsername = localStorage.getItem('currentUsername') || null;
let currentUserRole = localStorage.getItem('currentUserRole') || null;

// Utility function to show alerts
function showAlert(message, type = 'danger') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.getElementById('content').prepend(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

// Update navbar based on auth state and role
function updateNavbar() {
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    const logoutLink = document.getElementById('logoutLink');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const ordersLink = document.getElementById('ordersLink');
    const adminLink = document.getElementById('adminLink');

    if (accessToken) {
        loginLink.style.display = 'none';
        registerLink.style.display = 'none';
        logoutLink.style.display = 'block';
        usernameDisplay.style.display = 'block';
        document.getElementById('username').textContent = currentUsername;
        if (currentUserRole === 'user') {
            ordersLink.style.display = 'block';
            adminLink.style.display = 'none';
        } else if (currentUserRole === 'admin') {
            ordersLink.style.display = 'none';
            adminLink.style.display = 'block';
        } else {
            console.error('Unknown role:', currentUserRole);
            ordersLink.style.display = 'none';
            adminLink.style.display = 'none';
        }
    } else {
        loginLink.style.display = 'block';
        registerLink.style.display = 'block';
        logoutLink.style.display = 'none';
        usernameDisplay.style.display = 'none';
        ordersLink.style.display = 'none';
        adminLink.style.display = 'none';
    }
}

// Login handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            accessToken = data.access_token;
            currentUsername = username;
            try {
                const tokenPayload = JSON.parse(atob(data.access_token.split('.')[1]));
                currentUserRole = tokenPayload.role || 'user';
                console.log('JWT role:', currentUserRole); // Debug
            } catch (error) {
                console.error('Error parsing JWT:', error);
                currentUserRole = 'user'; // Fallback
            }
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('currentUsername', currentUsername);
            localStorage.setItem('currentUserRole', currentUserRole);
            showAlert('Успешный вход в аккаунт!', 'success');
            updateNavbar();
            bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
            if (currentUserRole === 'admin') {
                showAdminPanel();
            } else {
                showRestaurants();
            }
        } else {
            showAlert(data.detail || 'Не удалось войти в аккаунт');
        }
    } catch (error) {
        showAlert('Ошибка при входе в систему: ' + error.message);
    }
});

// Register handler
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const phone_number = document.getElementById('registerPhone').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/users/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role: 'user', phone_number })
        });
        const data = await response.json();
        if (response.ok) {
            showAlert('Регистрация прошла успешно! Пожалуйста, войдите в аккаунт.', 'success');
            bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
        } else {
            showAlert(data.detail || 'Не удалось зарегистрировать');
        }
    } catch (error) {
        showAlert('Ошибка регистрации: ' + error.message);
    }
});

// Logout handler
function logout() {
    accessToken = null;
    currentUsername = null;
    currentUserRole = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUsername');
    localStorage.removeItem('currentUserRole');
    updateNavbar();
    showAlert('Вы вышли из аккаунта!', 'success');
    showRestaurants();
}

// Fetch restaurants (available to all)
async function showRestaurants() {
    try {
        const response = await fetch(`${API_BASE_URL}/restaurants/`);
        const restaurants = await response.json();
        let html = '<h2>Рестораны</h2><div class="row">';
        restaurants.forEach(r => {
            html += `
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${r.name}</h5>
                            <p class="card-text">${r.description || 'No description'}</p>
                            <p class="card-text">Адрес: ${r.address}</p>
                            <p class="card-text">Телефон: ${r.phone_number || 'N/A'}</p>
                            <p class="card-text">Почта: ${r.email || 'N/A'}</p>
                            <button class="btn btn-primary" onclick="showMenu('${r.restaurant_id}')">Посмотреть меню</button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        document.getElementById('content').innerHTML = html;
    } catch (error) {
        showAlert('Не найдены рестораны: ' + error.message);
    }
}

// Fetch restaurant menu (available to all, order form only for logged-in users)
async function showMenu(restaurantId) {
    try {
        const response = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}`);
        const data = await response.json();
        let html = `<h2>Меню для ${data.name}</h2><p>Адрес: ${data.address}</p>`;
        if (!accessToken) {
            html += `
                <div class="alert alert-warning alert-dismissible fade show" role="alert">
                    Чтобы сделать заказ, войдите в аккаунт!
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
        }
        html += `<div class="row">`;
        if (accessToken && currentUserRole === 'user') {
            html += `
                <form id="orderForm" onsubmit="createOrder(event, '${restaurantId}')">
                    <div class="mb-3">
                        <label for="deliveryAddress" class="form-label">Адрес доставки</label>
                        <input type="text" class="form-control" id="deliveryAddress" required minlength="5" maxlength="500">
                    </div>
                    <h4>Меню</h4>
            `;
        }
        data.menu_items.forEach(item => {
            const price = parseFloat(item.price);
            const formattedPrice = isNaN(price) ? 'N/A' : `${price.toFixed(2)}₽`;
            html += `
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${item.name}</h5>
                            <p class="card-text">${item.description || 'No description'}</p>
                            <p class="card-text">Цена: ${formattedPrice}</p>
                            <p class="card-text">Категория: ${item.category || 'N/A'}</p>
                            ${accessToken && currentUserRole === 'user' ? `
                                <input type="number" min="0" class="form-control mb-2" id="quantity_${item.item_id}" placeholder="${!item.is_available ? 'Пока недоступно для заказа!' : 'Quantity'}" ${!item.is_available ? 'disabled' : ''}>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        if (accessToken && currentUserRole === 'user') {
            html += `
                <button type="submit" class="btn btn-success mt-3">Заказать</button>
                </form>
            `;
        }
        html += '</div>';
        document.getElementById('content').innerHTML = html;
    } catch (error) {
        showAlert('Меню не найдено: ' + error.message);
    }
}

// Create order (user only)
async function createOrder(event, restaurantId) {
    event.preventDefault();
    if (!accessToken || currentUserRole !== 'user') {
        showAlert('Пожалуйста, войдите в аккаунт, чтобы сделать заказ');
        return;
    }
    const deliveryAddress = document.getElementById('deliveryAddress').value;
    const items = [];
    document.querySelectorAll('input[id^="quantity_"]').forEach(input => {
        const quantity = parseInt(input.value);
        if (quantity > 0) {
            const itemId = input.id.replace('quantity_', '');
            items.push({ item_id: itemId, quantity });
        }
    });
    if (items.length === 0) {
        showAlert('Вы не выбрали позицию в меню!');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/orders/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ restaurant_id: restaurantId, delivery_address: deliveryAddress, items })
        });
        const data = await response.json();
        if (response.ok) {
            showAlert('Заказ успешно создан!', 'success');
            document.getElementById('orderForm').reset();
            showOrders(data.order_id); // Pass order_id to showOrders
        } else {
            showAlert(data.detail || 'Упс! Ошибка создания заказа');
        }
    } catch (error) {
        showAlert('Ошибка создания заказа: ' + error.message);
    }
}

// Fetch user orders (user only)
async function showOrders(newOrderId = null) {
    if (!accessToken || currentUserRole !== 'user') {
        showAlert('Пожалуйста, войдите в аккаунт, чтобы посмотреть заказы');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/orders/`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const orders = await response.json();
        let html = '<h2>Мои заказы</h2>';
        if (newOrderId) {
            html += `
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    Заказ #${newOrderId} успешно создан!
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
        }
        orders.forEach(order => {
            const totalAmount = parseFloat(order.total_amount);
            const formattedTotal = isNaN(totalAmount) ? 'N/A' : `${totalAmount.toFixed(2)}₽`;
            const createdDate = order.created_at ? new Date(order.created_at) : null;
            const formattedCreated = createdDate && !isNaN(createdDate) ? createdDate.toLocaleString() : 'Date unavailable';
            const updatedDate = order.updated_at ? new Date(order.updated_at) : null;
            const formattedUpdated = updatedDate && !isNaN(updatedDate) ? updatedDate.toLocaleString() : 'Date unavailable';
            html += `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Заказ #${order.order_id}</h5>
                        <p class="card-text">Ресторан: ${order.restaurant?.name || 'N/A'}</p>
                        <p class="card-text">Статус: ${order.status}</p>
                        <p class="card-text">Сумма: ${formattedTotal}</p>
                        <p class="card-text">Адрес доставки: ${order.delivery_address}</p>
                        <p class="card-text">Создан: ${formattedCreated}</p>
                        <p class="card-text">Обновлен: ${formattedUpdated}</p>
                        <h6>Состав заказа:</h6>
                        <ul>
                            ${order.items.map(item => {
                                const itemTotal = (parseFloat(item.price_per_item) * item.quantity).toFixed(2);
                                return `
                                    <li>
                                        ${item.menu_item?.name || 'N/A'} - ${item.quantity} x ${parseFloat(item.price_per_item).toFixed(2)}₽ = ${itemTotal}₽
                                    </li>
                                `;
                            }).join('')}
                        </ul>
                    </div>
                </div>
            `;
        });
        document.getElementById('content').innerHTML = html;
    } catch (error) {
        showAlert('Заказы не найдены: ' + error.message);
    }
}

// Admin panel (admin only)
async function showAdminPanel() {
    if (currentUserRole !== 'admin') {
        showAlert('Доступ запрещен: только для администратора');
        return;
    }
    let html = `
        <h2>Панель администратора</h2>
        <div class="row">
            <div class="col-md-4">
                <button class="btn btn-primary mb-3 w-100" onclick="showAllOrders()">Список заказов</button>
            </div>
            <div class="col-md-4">
                <button class="btn btn-primary mb-3 w-100" data-bs-toggle="modal" data-bs-target="#orderDetailsModal">Посмотреть детали заказа</button>
            </div>
            <div class="col-md-4">
                <button class="btn btn-primary mb-3 w-100" onclick="showAllRestaurants()">Список ресторанов</button>
            </div>
            <div class="col-md-4">
                <button class="btn btn-primary mb-3 w-100" onclick="showAllUsers()">Список пользователей</button>
            </div>
        </div>
        <div id="adminContent"></div>
    `;
    document.getElementById('content').innerHTML = html;
}

// Fetch and display order details (admin only)
async function showOrderDetails(event) {
    event.preventDefault();
    if (currentUserRole !== 'admin') {
        showAlert('Доступ запрещен: только для администратора');
        return;
    }
    const orderId = document.getElementById('orderId').value;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
        showAlert('Invalid Order ID format. Must be a valid UUID.');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) {
            const data = await response.json();
            showAlert(data.detail || 'Не найдены детали заказа');
            return;
        }
        const order = await response.json();
        const totalAmount = parseFloat(order.total_amount);
        const formattedTotal = isNaN(totalAmount) ? 'N/A' : `${totalAmount.toFixed(2)}₽`;
        const createdDate = order.created_at ? new Date(order.created_at) : null;
        const formattedCreated = createdDate && !isNaN(createdDate) ? createdDate.toLocaleString() : 'Date unavailable';
        const updatedDate = order.updated_at ? new Date(order.updated_at) : null;
        const formattedUpdated = updatedDate && !isNaN(updatedDate) ? updatedDate.toLocaleString() : 'Date unavailable';
        let html = `
            <h3>Детали заказа</h3>
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Заказ #${order.order_id}</h5>
                    <p class="card-text"><strong>ID пользователя:</strong> ${order.user_id}</p>
                    <p class="card-text"><strong>ID ресторана:</strong> ${order.restaurant_id}</p>
                    <p class="card-text"><strong>Название ресторана:</strong> ${order.restaurant?.name || 'N/A'}</p>
                    <p class="card-text"><strong>Статус:</strong> ${order.status}</p>
                    <p class="card-text"><strong>Общая сумма:</strong> ${formattedTotal}</p>
                    <p class="card-text"><strong>Адрес доставки:</strong> ${order.delivery_address}</p>
                    <p class="card-text"><strong>Создан:</strong> ${formattedCreated}</p>
                    <p class="card-text"><strong>Обновлен:</strong> ${formattedUpdated}</p>
                    <h6>Блюда:</h6>
                    <ul>
                        ${order.items.map(item => {
                            const itemTotal = (parseFloat(item.price_per_item) * item.quantity).toFixed(2);
                            return `
                                <li>
                                    <strong>ID блюда:</strong> ${item.item_id}<br>
                                    <strong>Название:</strong> ${item.menu_item?.name || 'N/A'}<br>
                                    <strong>Количество:</strong> ${item.quantity}<br>
                                    <strong>Цена за ед.:</strong> ${parseFloat(item.price_per_item).toFixed(2)}₽<br>
                                    <strong>Сумма:</strong> ${itemTotal}₽
                                </li>
                            `;
                        }).join('')}
                    </ul>
                    <button class="btn btn-secondary mt-3" data-bs-dismiss="modal">Закрыть</button>
                </div>
            </div>
        `;
        document.getElementById('orderDetailsContent').innerHTML = html;
    } catch (error) {
        showAlert('Ошибка нахождения деталей заказа: ' + error.message);
    }
}

// Fetch all orders (admin only)
async function showAllOrders() {
    if (currentUserRole !== 'admin') {
        showAlert('Доступ запрещен: только для администратора');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/admin/orders/`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const orders = await response.json();
        let html = `
            <h3>Все заказы</h3>
            <button class="btn btn-secondary mb-3" onclick="showAdminPanel()">Закрыть</button>
        `;
        orders.forEach(order => {
            const totalAmount = parseFloat(order.total_amount);
            const formattedTotal = isNaN(totalAmount) ? 'N/A' : `${totalAmount.toFixed(2)}₽`;
            const createdDate = order.created_at ? new Date(order.created_at) : null;
            const formattedCreated = createdDate && !isNaN(createdDate) ? createdDate.toLocaleString() : 'Date unavailable';
            const updatedDate = order.updated_at ? new Date(order.updated_at) : null;
            const formattedUpdated = updatedDate && !isNaN(updatedDate) ? updatedDate.toLocaleString() : 'Date unavailable';
            html += `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Order #${order.order_id}</h5>
                        <p class="card-text"><strong>ID пользователя:</strong> ${order.user_id}</p>
                        <p class="card-text"><strong>ID ресторана:</strong> ${order.restaurant_id}</p>
                        <p class="card-text"><strong>Название ресторана:</strong> ${order.restaurant?.name || 'N/A'}</p>
                        <p class="card-text"><strong>Статус:</strong> ${order.status}</p>
                        <p class="card-text"><strong>Сумма:</strong> ${formattedTotal}</p>
                        <p class="card-text"><strong>Адрес доставки:</strong> ${order.delivery_address}</p>
                        <p class="card-text"><strong>Создан:</strong> ${formattedCreated}</p>
                        <p class="card-text"><strong>Обновлен:</strong> ${formattedUpdated}</p>
                        <h6>Блюда:</h6>
                        <ul>
                            ${order.items.map(item => {
                                const itemTotal = (parseFloat(item.price_per_item) * item.quantity).toFixed(2);
                                return `
                                    <li>
                                        <strong>ID блюла:</strong> ${item.item_id}<br>
                                        <strong>Имя:</strong> ${item.menu_item?.name || 'N/A'}<br>
                                        <strong>Количество:</strong> ${item.quantity}<br>
                                        <strong>Цена за шт.:</strong> ${parseFloat(item.price_per_item).toFixed(2)}₽<br>
                                        <strong>Сумма:</strong> ${itemTotal}₽
                                    </li>
                                `;
                            }).join('')}
                        </ul>
                        <select onchange="updateOrderStatus('${order.order_id}', this.value)">
                            <option value="">Обновить статус</option>
                            <option value="pending_confirmation">Pending Confirmation</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="preparing">Preparing</option>
                            <option value="ready_for_pickup">Ready for Pickup</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <button class="btn btn-primary ms-2" onclick="showOrderDetailsById('${order.order_id}')">Посмотреть детали</button>
                    </div>
                </div>
            `;
        });
        document.getElementById('adminContent').innerHTML = html;
    } catch (error) {
        showAlert('Ошибка нахождения заказов: ' + error.message);
    }
}

// Helper function to show order details by ID (admin only)
function showOrderDetailsById(orderId) {
    if (currentUserRole !== 'admin') {
        showAlert('Доступ запрещен: только для администратора');
        return;
    }
    document.getElementById('orderId').value = orderId;
    const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
    document.getElementById('orderDetailsContent').innerHTML = '';
    modal.show();
    showOrderDetails({ preventDefault: () => {} });
}

// Update order status (admin only)
async function updateOrderStatus(orderId, status) {
    if (currentUserRole !== 'admin') {
        showAlert('Доступ запрещен: только для администратора');
        return;
    }
    if (!status) return;
    try {
        const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ status })
        });
        if (response.ok) {
            showAlert('Статус заказа обновлен!', 'success');
            showAllOrders();
        } else {
            const data = await response.json();
            showAlert(data.detail || 'Ошибка обновления статуса заказа');
        }
    } catch (error) {
        showAlert('Ошибка обновления статуса заказа: ' + error.message);
    }
}

async function showAllRestaurants() {
    if (currentUserRole !== 'admin') {
        showAlert('Доступ запрещен: только для администратора', 'danger');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/admin/restaurants/`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const restaurants = await response.json();
        let html = `
            <h3>Все рестораны</h3>
            <button class="btn btn-success mb-3" onclick="showCreateRestaurantForm()">Создать ресторан</button>
            <button class="btn btn-secondary mb-3" onclick="showAdminPanel()">Закрыть</button>
            <div id="createRestaurantForm" style="display: none;" class="mb-4">
                <form id="restaurantForm" onsubmit="createRestaurant(event)">
                    <div class="mb-3">
                        <label class="form-label">Название</label>
                        <input type="text" class="form-control" id="restaurantName" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Описание</label>
                        <textarea class="form-control" id="restaurantDescription"></textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Адрес</label>
                        <input type="text" class="form-control" id="restaurantAddress" required minlength="5" maxlength="500">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Номер телефона</label>
                        <input type="text" class="form-control" id="restaurantPhone" pattern="\\+?[0-9]{10,15}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Электронная почта</label>
                        <input type="email" class="form-control" id="restaurantEmail">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Широта</label>
                        <input type="number" step="any" class="form-control" id="restaurantLatitude">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Долгота</label>
                        <input type="number" step="any" class="form-control" id="restaurantLongitude">
                    </div>
                    <button type="submit" class="btn btn-primary">Создать</button>
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('createRestaurantForm').style.display='none'">Отмена</button>
                </form>
            </div>
        `;
        restaurants.forEach(r => {
            const createdDate = r.created_at ? new Date(r.created_at) : null;
            const formattedCreated = createdDate && !isNaN(createdDate) ? createdDate.toLocaleString() : 'Дата недоступна';
            const updatedDate = r.updated_at ? new Date(r.updated_at) : null;
            const formattedUpdated = updatedDate && !isNaN(updatedDate) ? updatedDate.toLocaleString() : 'Дата недоступна';
            html += `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${r.name}</h5>
                        <p class="card-text"><strong>ID ресторана:</strong> ${r.restaurant_id}</p>
                        <p class="card-text"><strong>Описание:</strong> ${r.description || 'Без описания'}</p>
                        <p class="card-text"><strong>Адрес:</strong> ${r.address}</p>
                        <p class="card-text"><strong>Номер телефона:</strong> ${r.phone_number || 'Н/Д'}</p>
                        <p class="card-text"><strong>Электронная почта:</strong> ${r.email || 'Н/Д'}</p>
                        <p class="card-text"><strong>Активен:</strong> ${r.is_active ? 'Да' : 'Нет'}</p>
                        <p class="card-text"><strong>Широта:</strong> ${r.latitude || 'Н/Д'}</p>
                        <p class="card-text"><strong>Долгота:</strong> ${r.longitude || 'Н/Д'}</p>
                        <p class="card-text"><strong>Создан:</strong> ${formattedCreated}</p>
                        <p class="card-text"><strong>Обновлен:</strong> ${formattedUpdated}</p>
                        <button class="btn btn-primary" onclick="showRestaurantMenu('${r.restaurant_id}')">Посмотреть меню</button>
                        <button class="btn btn-danger" onclick="deleteRestaurant('${r.restaurant_id}')">Удалить</button>
                    </div>
                </div>
            `;
        });
        document.getElementById('adminContent').innerHTML = html;
        // Ensure DOM is updated before accessing form
        setTimeout(() => {
            const form = document.getElementById('restaurantForm');
            console.log('Restaurant form after rendering:', form);
            if (!form) {
                console.error('Form not found in DOM after rendering');
            }
        }, 0);
    } catch (error) {
        showAlert('Ошибка загрузки ресторанов: ' + error.message, 'danger');
    }
}

// Create restaurant (admin only)

async function createRestaurant(event) {
    if (currentUserRole !== 'admin') {
        showAlert('Доступ запрещен: только для администратора', 'danger');
        return;
    }
    event.preventDefault();
    const now = new Date().toISOString(); // Текущая дата и время в формате ISO
    const restaurant = {
        name: document.getElementById('restaurantName').value,
        description: document.getElementById('restaurantDescription').value || null,
        address: document.getElementById('restaurantAddress').value,
        phone_number: document.getElementById('restaurantPhone').value || null,
        email: document.getElementById('restaurantEmail').value || null,
        latitude: parseFloat(document.getElementById('restaurantLatitude').value) || null,
        longitude: parseFloat(document.getElementById('restaurantLongitude').value) || null,
        is_active: false,
        created_at: now, // Добавляем created_at
        updated_at: now  // Добавляем updated_at
    };
    // Validation to prevent 400 Bad Request
    if (!restaurant.name || !restaurant.address) {
        showAlert('Имя и адрес ресторана обязательны!', 'danger');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/admin/restaurants/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(restaurant)
        });
        const data = await response.json();
        if (response.ok) {
            showAlert('Ресторан создан!', 'success');
            const form = document.getElementById('restaurantForm');
            if (form && form.tagName === 'FORM') {
                form.reset();
            } else {
                console.error('Form not found or not a form element:', form);
                showAlert('Не удалось сбросить форму, очищаем поля вручную', 'warning');
                const fields = [
                    'restaurantName', 'restaurantDescription', 'restaurantAddress',
                    'restaurantPhone', 'restaurantEmail', 'restaurantLatitude', 'restaurantLongitude'
                ];
                fields.forEach(id => {
                    const input = document.getElementById(id);
                    if (input) input.value = '';
                });
            }
            document.getElementById('createRestaurantForm').style.display = 'none';
            await showAllRestaurants();
        } else {
            let errorMessage = 'Ресторан не создан!';
            if (data.detail) {
                if (Array.isArray(data.detail)) {
                    errorMessage = data.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ');
                } else if (typeof data.detail === 'string') {
                    errorMessage = data.detail;
                } else {
                    errorMessage = JSON.stringify(data.detail);
                }
            }
            showAlert(errorMessage, 'danger');
        }
    } catch (error) {
        showAlert('Ошибка создания ресторана: ' + error.message, 'danger');
        console.error('Create restaurant error:', error);
    }
}

// Delete restaurant (admin only)
async function deleteRestaurant(restaurantId) {
    if (currentUserRole !== 'admin') {
        showAlert('Доступ запрещен: только для администратора');
        return;
    }
    if (!confirm('Вы уверены, что хотите удалить ресторан?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/admin/restaurants/${restaurantId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.ok) {
            showAlert('Ресторан удален!', 'success');
            showAllRestaurants();
        } else {
            const data = await response.json();
            showAlert(data.detail || 'Ресторан не удален!', 'danger');
        }
    } catch (error) {
        showAlert('Ошибка удаления ресторана: ' + error.message, 'danger');
    }
}

// Show restaurant menu (admin only)
async function showRestaurantMenu(restaurantId) {
    if (currentUserRole !== 'admin') {
        showAlert('Доступ запрещен: только для администратора');
        return;
    }
    try {
        const restaurantResponse = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}`);
        const restaurant = await restaurantResponse.json();
        const response = await fetch(`${API_BASE_URL}/admin/restaurants/${restaurantId}/menu/`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const items = await response.json();
        let html = `
            <h3>Меню for ${restaurant.name}</h3>
            <button class="btn btn-success mb-3" onclick="showCreateMenuItemForm('${restaurantId}')">Создать пункт меню</button>
            <button class="btn btn-secondary mb-3" onclick="showAllRestaurants()">Закрыть</button>
            <div id="createMenuItemForm" style="display: none;" class="mb-4">
                <form id="menuItemForm" onsubmit="createMenuItem(event, '${restaurantId}')"> <!-- Added id="menuItemForm" -->
                    <div class="mb-3">
                        <label class="form-label">Name</label>
                        <input type="text" class="form-control" id="menuItemName" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Description</label>
                        <textarea class="form-control" id="menuItemDescription"></textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Price</label>
                        <input type="number" step="0.01" class="form-control" id="menuItemPrice" required min="0">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Category</label>
                        <input type="text" class="form-control" id="menuItemCategory">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Available</label>
                        <input type="checkbox" id="menuItemAvailable" checked>
                    </div>
                    <button type="submit" class="btn btn-primary">Создать</button>
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('createMenuItemForm').style.display='none'">Отменить</button>
                </form>
            </div>
        `;
        items.forEach(item => {
            const price = parseFloat(item.price);
            const formattedPrice = isNaN(price) ? 'N/A' : `${price.toFixed(2)}₽`;
            const createdDate = item.created_at ? new Date(item.created_at) : null;
            const formattedCreated = createdDate && !isNaN(createdDate) ? createdDate.toLocaleString() : 'Date unavailable';
            const updatedDate = item.updated_at ? new Date(item.updated_at) : null;
            const formattedUpdated = updatedDate && !isNaN(updatedDate) ? updatedDate.toLocaleString() : 'Date unavailable';
            html += `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${item.name}</h5>
                        <p class="card-text"><strong>ID блюда:</strong> ${item.item_id}</p>
                        <p class="card-text"><strong>ID ресторана:</strong> ${item.restaurant_id}</p>
                        <p class="card-text"><strong>Описание:</strong> ${item.description || 'No description'}</p>
                        <p class="card-text"><strong>Цена:</strong> ${formattedPrice}</p>
                        <p class="card-text"><strong>Категория:</strong> ${item.category || 'N/A'}</p>
                        <p class="card-text"><strong>Доступность:</strong> ${item.is_available ? 'Yes' : 'No'}</p>
                        <p class="card-text"><strong>Создан:</strong> ${formattedCreated}</p>
                        <p class="card-text"><strong>Обновлен:</strong> ${formattedUpdated}</p>
                        <button class="btn btn-danger" onclick="deleteMenuItem('${item.item_id}', '${restaurantId}')">Удалить</button>
                    </div>
                </div>
            `;
        });
        document.getElementById('adminContent').innerHTML = html;
    } catch (error) {
        showAlert('Ошибка нахождения меню: ' + error.message, 'danger');
    }
}

// Create menu item (admin only)
async function createMenuItem(event, restaurantId) {
    if (currentUserRole !== 'admin') {
        showAlert('Доступ запрещен: только для администратора');
        return;
    }
    event.preventDefault();
    const menuItem = {
        restaurant_id: restaurantId,
        name: document.getElementById('menuItemName').value,
        description: document.getElementById('menuItemDescription').value || null,
        price: parseFloat(document.getElementById('menuItemPrice').value),
        category: document.getElementById('menuItemCategory').value || null,
        is_available: document.getElementById('menuItemAvailable').checked
    };
    // Added validation
    if (!menuItem.name || isNaN(menuItem.price) || menuItem.price < 0) {
        showAlert('Имя и корректная цена обязательны!', 'danger');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/admin/menu-items/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(menuItem)
        });
        if (response.ok) {
            showAlert('Новый пункт меню добавлен!', 'success');
            const form = document.getElementById('menuItemForm'); // Changed to menuItemForm
            if (form && form.tagName === 'FORM') {
                form.reset();
            } else {
                console.error('Menu item form not found or not a form element');
            }
            document.getElementById('createMenuItemForm').style.display = 'none';
            showRestaurantMenu(restaurantId);
        } else {
            const data = await response.json();
            showAlert(data.detail || 'Не создан пункт меню', 'danger');
        }
    } catch (error) {
        showAlert('Ошибка добавления пункта меню: ' + error.message, 'danger');
    }
}

// Delete menu item (admin only)
async function deleteMenuItem(itemId, restaurantId) {
    if (currentUserRole !== 'admin') {
        showAlert('Доступ запрещен: только для администратора');
        return;
    }
    if (!confirm('Вы уверены, что хотите удалить пункт меню?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/admin/menu-items/${itemId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.ok) {
            showAlert('Пункт меню удален!', 'success');
            showRestaurantMenu(restaurantId);
        } else {
            const data = await response.json();
            showAlert(data.detail || 'Пункт меню не удален', 'danger');
        }
    } catch (error) {
        showAlert('Ошибка удаления пункта меню: ' + error.message, 'danger');
    }
}

// Show create restaurant form (admin only)
function showCreateRestaurantForm() {
    if (currentUserRole !== 'admin') {
        showAlert('Доступ запрещен: только для администратора');
        return;
    }
    document.getElementById('createRestaurantForm').style.display = 'block';
}

// Show create menu item form (admin only)
function showCreateMenuItemForm(restaurantId) {
    if (currentUserRole !== 'admin') {
        showAlert('Доступ запрещен: только для администратора');
        return;
    }
    document.getElementById('createMenuItemForm').style.display = 'block';
}

// Fetch all users (admin only)
async function showAllUsers() {
    if (currentUserRole !== 'admin') {
        showAlert('Доступ запрещен: только для администратора');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const users = await response.json();
        let html = `
            <h3>Все пользователи</h3>
            <button class="btn btn-secondary mb-3" onclick="showAdminPanel()">Закрыть</button>
        `;
        users.forEach(user => {
            const createdDate = user.created_at ? new Date(user.created_at) : null;
            const formattedCreated = createdDate && !isNaN(createdDate) ? createdDate.toLocaleString() : 'Date unavailable';
            const updatedDate = user.updated_at ? new Date(user.updated_at) : null;
            const formattedUpdated = updatedDate && !isNaN(updatedDate) ? updatedDate.toLocaleString() : 'Date unavailable';
            html += `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${user.username}</h5>
                        <p class="card-text"><strong>ID пользователя:</strong> ${user.user_id}</p>
                        <p class="card-text"><strong>Роль:</strong> ${user.role}</p>
                        <p class="card-text"><strong>Телефон:</strong> ${user.phone_number || 'N/A'}</p>
                        <p class="card-text"><strong>Активность:</strong> ${user.is_active ? 'Yes' : 'No'}</p>
                        <p class="card-text"><strong>Создан:</strong> ${formattedCreated}</p>
                        <p class="card-text"><strong>Обновлен:</strong> ${formattedUpdated}</p>
                    </div>
                </div>
            `;
        });
        document.getElementById('adminContent').innerHTML = html;
    } catch (error) {
        showAlert('Ошибка при нахождении пользователей: ' + error.message, 'danger');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
    // Check if token is valid and refresh if needed
    if (accessToken) {
        // Optionally validate token with server
        showRestaurants();
    } else {
        showRestaurants();
    }
});