
/* =========================================
   SHOPNOW - LABS 1 TO 6
   Main JavaScript File
========================================= */

// SUPABASE CONNECTION
const SUPABASE_URL = "https://nrocrmherkkprjydhmyl.supabase.co";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb2NybWhlcmtrcHJqeWRobXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExOTg3OTMsImV4cCI6MjEwNjc3NDc5M30._U3cLoI0F-KzcvZErpBGcnanHAzNj3frVMEg4tPelrE";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// GLOBAL VARIABLES
let allProducts = [];
let currentCategory = "All";
let searchTerm = "";
let sortOrder = "default";

// SECURITY HELPER
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// =========================================
// PRODUCTS - LAB 2 AND LAB 4
// =========================================

function stockLabel(stock) {
  if (stock <= 0) return '<span class="badge out">Out of stock</span>';
  if (stock <= 5) return `<span class="badge low">Only ${stock} left</span>`;
  return '<span class="badge in">In stock</span>';
}

function renderProducts(products, containerId = "product-list") {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!products.length) {
    container.innerHTML = "<p>No products found.</p>";
    return;
  }

  container.innerHTML = products.map(p => {
    const id = Number(p.product_id);
    const price = Number(p.price);
    const stock = Number(p.stock);
    const category = p.category?.category_name || "";

    return `
      <div class="product">
        <p class="category-tag">${escapeHTML(category)}</p>
        <h3>${escapeHTML(p.name)}</h3>
        <p class="muted">${escapeHTML(p.description || "")}</p>
        <p class="price">AED ${price.toFixed(2)}</p>
        <p>${stockLabel(stock)}</p>

        <button class="add-cart-btn btn"
          data-id="${id}"
          ${stock <= 0 ? "disabled" : ""}>
          ${stock <= 0 ? "Out of Stock" : "Add to Cart"}
        </button>

        <a href="product-detail.html?id=${id}">
          View Details
        </a>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".add-cart-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const product = allProducts.find(
        p => Number(p.product_id) === Number(btn.dataset.id)
      );

      if (product) addToCart(product);
    });
  });
}

function updateProductView() {
  let products = [...allProducts];

  if (currentCategory !== "All") {
    products = products.filter(p =>
      p.category?.category_name === currentCategory
    );
  }

  if (searchTerm) {
    products = products.filter(p =>
      p.name.toLowerCase().includes(searchTerm)
    );
  }

  if (sortOrder === "low-high") {
    products.sort((a, b) =>
      Number(a.price) - Number(b.price)
    );
  }

  if (sortOrder === "high-low") {
    products.sort((a, b) =>
      Number(b.price) - Number(a.price)
    );
  }

  renderProducts(products);
}

async function loadProducts() {
  const container = document.getElementById("product-list");
  if (!container) return;

  container.innerHTML = "<p>Loading products...</p>";

  const { data, error } = await supabaseClient
    .from("product")
    .select("*, category(category_name)");

  if (error) {
    console.error("Product error:", error);
    container.textContent = "Could not load products.";
    return;
  }

  allProducts = data || [];

  const categories = [...new Set(
    allProducts
      .map(p => p.category?.category_name)
      .filter(Boolean)
  )].sort();

  const categoryContainer =
    document.getElementById("category-filters") ||
    document.querySelector(".category-filters");

  if (categoryContainer) {
    categoryContainer.innerHTML = "";

    ["All", ...categories].forEach(category => {
      const button = document.createElement("button");
      button.textContent = category;
      button.className = "category-btn";
      button.dataset.category = category;

      button.addEventListener("click", () => {
        currentCategory = category;
        updateProductView();
      });

      categoryContainer.appendChild(button);
    });
  }

  updateProductView();
}

if (document.getElementById("product-list")) {
  const search = document.getElementById("search-box");
  const sort = document.getElementById("sort-select");

  if (search) {
    search.addEventListener("input", e => {
      searchTerm = e.target.value.toLowerCase().trim();
      updateProductView();
    });
  }

  if (sort) {
    sort.addEventListener("change", e => {
      sortOrder = e.target.value;
      updateProductView();
    });
  }

  loadProducts();
}

// =========================================
// SHOPPING CART - LAB 3
// =========================================

function getCart() {
  try {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = getCart().reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const element = document.getElementById("cart-count");
  if (element) element.textContent = count;
}

function addToCart(product) {
  const cart = getCart();
  const id = Number(product.product_id);
  const stock = Number(product.stock);

  if (!Number.isInteger(id) || stock <= 0) {
    alert("This product is unavailable.");
    return;
  }

  const existing = cart.find(
    item => Number(item.product_id) === id
  );

  if (existing) {
    if (Number(existing.quantity) >= stock) {
      alert("Not enough stock available.");
      return;
    }

    existing.quantity = Number(existing.quantity) + 1;
  } else {
    cart.push({
      product_id: id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      stock: stock
    });
  }

  saveCart(cart);
  alert("Product added to cart!");
}

function removeFromCart(productId) {
  const cart = getCart().filter(
    item => Number(item.product_id) !== Number(productId)
  );

  saveCart(cart);
  renderCart();
}

function updateQuantity(productId, quantity) {
  const cart = getCart();

  const item = cart.find(
    p => Number(p.product_id) === Number(productId)
  );

  if (!item) return;

  const qty = Number(quantity);

  if (
    !Number.isInteger(qty) ||
    qty < 1 ||
    qty > Number(item.stock)
  ) {
    alert("Invalid quantity or insufficient stock.");
    renderCart();
    return;
  }

  item.quantity = qty;
  saveCart(cart);
  renderCart();
}

function renderCart() {
  const container = document.getElementById("cart-items");
  if (!container) return;

  const cart = getCart();
  const subtotalElement = document.getElementById("subtotal");

  if (cart.length === 0) {
    container.innerHTML = "<p>Your cart is empty.</p>";

    if (subtotalElement) {
      subtotalElement.textContent = "0.00";
    }

    return;
  }

  let subtotal = 0;

  container.innerHTML = cart.map(item => {
    const id = Number(item.product_id);
    const quantity = Number(item.quantity);
    const price = Number(item.price);
    const total = price * quantity;

    subtotal += total;

    return `
      <div class="cart-item">
        <h3>${escapeHTML(item.name)}</h3>

        <p>Price: AED ${price.toFixed(2)}</p>

        <label>Quantity:</label>
        <input
          type="number"
          min="1"
          max="${Number(item.stock)}"
          value="${quantity}"
          class="cart-quantity"
          data-id="${id}"
        >

        <p>Total: AED ${total.toFixed(2)}</p>

        <button class="remove-cart-btn" data-id="${id}">
          Remove
        </button>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".cart-quantity").forEach(input => {
    input.addEventListener("change", () => {
      updateQuantity(input.dataset.id, input.value);
    });
  });

  container.querySelectorAll(".remove-cart-btn").forEach(button => {
    button.addEventListener("click", () => {
      removeFromCart(button.dataset.id);
    });
  });

  if (subtotalElement) {
    subtotalElement.textContent = subtotal.toFixed(2);
  }
}

if (document.getElementById("cart-items")) {
  renderCart();
}

// PROCEED TO CHECKOUT
if (document.getElementById("checkout-btn")) {
  document.getElementById("checkout-btn")
    .addEventListener("click", async () => {

      if (getCart().length === 0) {
        alert("Your cart is empty!");
        return;
      }

      const user = await requireLogin();
      if (!user) return;

      window.location.href = "checkout.html";
    });
}

// =========================================
// AUTHENTICATION - LAB 5
// =========================================

async function updateNavForAuth() {
  const slot = document.getElementById("auth-nav-slot");
  if (!slot) return;

  const { data: { user }, error } =
    await supabaseClient.auth.getUser();

  if (error || !user) {
    slot.innerHTML = `
      <a href="login.html">Login</a>
      <a href="Register.html">Register</a>
    `;
    return;
  }

  slot.innerHTML = `
    <span class="user-email">Hi, ${escapeHTML(user.email)}</span>
    <a href="#" id="logout-link">Log out</a>
  `;

  document.getElementById("logout-link")
    .addEventListener("click", async e => {
      e.preventDefault();
      await logout();
    });
}

async function logout() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert(error.message);
    return;
  }

  window.location.href = "index.html";
}

async function requireLogin() {
  const { data: { user }, error } =
    await supabaseClient.auth.getUser();

  if (error || !user) {
    alert("Please log in to continue.");
    // Remember where the user was so login can send them back (e.g. to the cart).
    try {
      sessionStorage.setItem("returnTo", window.location.pathname.split("/").pop() || "index.html");
    } catch {}
    window.location.href = "login.html";
    return null;
  }

  return user;
}

// REGISTER
if (document.getElementById("register-form")) {
  document.getElementById("register-form")
    .addEventListener("submit", async e => {
      e.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      const { error } = await supabaseClient.auth.signUp({
        email,
        password
      });

      if (error) {
        alert("Registration error: " + error.message);
      } else {
        alert("Registration successful!");
        window.location.href = "login.html";
      }
    });
}

// LOGIN
if (document.getElementById("login-form")) {
  document.getElementById("login-form")
    .addEventListener("submit", async e => {
      e.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      const { error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        alert("Login error: " + error.message);
      } else {
        let target = "index.html";
        try {
          const saved = sessionStorage.getItem("returnTo");
          // Only allow local page names (no external redirects).
          if (saved && /^[\w-]+\.html$/.test(saved) && saved !== "login.html") target = saved;
          sessionStorage.removeItem("returnTo");
        } catch {}
        window.location.href = target;
      }
    });
}

// =========================================
// CHECKOUT - LAB 6
// =========================================

let orderSaving = false;

async function placeOrder(name, address, phone) {
  if (orderSaving) return false;

  name = String(name || "").trim();
  address = String(address || "").trim();
  phone = String(phone || "").trim();

  if (!name || !address) {
    alert("Please enter your name and address.");
    return false;
  }

  if (!/^\+?[0-9]{7,15}$/.test(phone.replace(/\s/g, ""))) {
    alert("Please enter a valid phone number.");
    return false;
  }

  const user = await requireLogin();
  if (!user) return false;

  const cart = getCart();

  if (cart.length === 0) {
    alert("Your cart is empty.");
    return false;
  }

  for (const item of cart) {
    const id = Number(item.product_id);
    const qty = Number(item.quantity);
    const price = Number(item.price);

    if (
      !Number.isInteger(id) || id < 1 ||
      !Number.isInteger(qty) || qty < 1 ||
      !Number.isFinite(price) || price < 0
    ) {
      alert("Your cart contains invalid product information.");
      return false;
    }
  }

  orderSaving = true;

  try {
    // Fetch current product prices and stock.
    const productIds = cart.map(item =>
      Number(item.product_id)
    );

    const { data: products, error: productError } =
      await supabaseClient
        .from("product")
        .select("product_id, name, price, stock")
        .in("product_id", productIds);

    if (productError) throw productError;

    const items = [];
    let total = 0;

    for (const cartItem of cart) {
      const product = (products || []).find(p =>
        Number(p.product_id) === Number(cartItem.product_id)
      );

      if (!product) {
        alert("A product in your cart is no longer available.");
        return false;
      }

      const quantity = Number(cartItem.quantity);
      const price = Number(product.price);

      if (quantity > Number(product.stock)) {
        alert("Not enough stock for " + product.name);
        return false;
      }

      total += price * quantity;

      items.push({
        product_id: Number(product.product_id),
        quantity,
        price
      });
    }

    // Save order using actual table and column names.
    const { data: order, error: orderError } =
      await supabaseClient
        .from("order")
        .insert([{
          customer_id: user.id,
          status: "Pending",
          total: Number(total.toFixed(2))
        }])
        .select()
        .single();

    if (orderError) {
      console.error("Order error:", orderError);
      alert("Could not place order: " + orderError.message);
      return false;
    }

    // Save order items.
    const orderItems = items.map(item => ({
      order_id: Number(order.orderr_id),
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: itemError } = await supabaseClient
      .from("orderr_item")
      .insert(orderItems);

    if (itemError) {
      console.error("Order item error:", itemError);

      alert(
        "Order #" + order.orderr_id +
        " was created, but saving the items failed. " +
        "Please do not submit another order yet. " +
        "Your cart has been kept. Error: " +
        itemError.message
      );

      return false;
    }

    // Clear cart only after both inserts succeed.
    localStorage.removeItem("cart");
    updateCartCount();

    window.location.href =
      "order-confirmation.html?id=" +
      encodeURIComponent(order.orderr_id);

    return true;

  } catch (error) {
    console.error("Checkout error:", error);
    alert("Checkout failed: " + error.message);
    return false;
  } finally {
    orderSaving = false;
  }
}

// CHECKOUT PAGE
if (document.getElementById("checkout-form")) {
  const form = document.getElementById("checkout-form");

  const button =
    document.getElementById("place-order-btn") ||
    form.querySelector('button[type="submit"]');

  const cart = getCart();

  const total = cart.reduce(
    (sum, item) =>
      sum + Number(item.price) * Number(item.quantity),
    0
  );

  const totalElement = document.getElementById("checkout-total");

  if (totalElement) {
    totalElement.textContent = total.toFixed(2);
  }

  if (cart.length === 0 && button) {
    button.disabled = true;
  }

  requireLogin();

  form.addEventListener("submit", async e => {
    e.preventDefault();

    if (orderSaving || !getCart().length) return;

    const name = document.getElementById("name").value.trim();
    const address = document.getElementById("address").value.trim();
    const phone = document.getElementById("phone").value.trim();

    if (!name || !address) {
      alert("Name and address are required.");
      return;
    }

    if (!/^\+?[0-9]{7,15}$/.test(phone.replace(/\s/g, ""))) {
      alert("Please enter a valid phone number.");
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Placing Order...";
    }

    try {
      await placeOrder(name, address, phone);
    } finally {
      if (button) {
        button.disabled = getCart().length === 0;
        button.textContent = "Place Order";
      }
    }
  });
}

// =========================================
// ORDER CONFIRMATION - LAB 6
// =========================================

async function loadConfirmation() {
  const numberElement = document.getElementById("order-number");
  const itemsElement = document.getElementById("items");

  if (!numberElement || !itemsElement) return;

  const orderId = new URLSearchParams(
    window.location.search
  ).get("id");

  if (!orderId || !/^[1-9]\d*$/.test(orderId)) {
    numberElement.textContent = "Invalid";
    itemsElement.textContent = "Invalid order number.";
    return;
  }

  const user = await requireLogin();
  if (!user) return;

  // Order table primary key is orderr_id.
  const { data: order, error: orderError } =
    await supabaseClient
      .from("order")
      .select("*")
      .eq("orderr_id", Number(orderId))
      .eq("customer_id", user.id)
      .single();

  if (orderError || !order) {
    console.error("Order lookup:", orderError);
    itemsElement.textContent =
      "Order not found or access denied.";
    return;
  }

  // Order items foreign key is order_id.
  const { data: items, error: itemsError } =
    await supabaseClient
      .from("orderr_item")
      .select("*, product(name)")
      .eq("order_id", Number(orderId));

  if (itemsError) {
    console.error("Order items:", itemsError);
    itemsElement.textContent =
      "Could not load order items: " + itemsError.message;
    return;
  }

  numberElement.textContent = order.orderr_id;

  const statusElement = document.getElementById("order-status");

  if (statusElement) {
    statusElement.textContent = order.status;
  }

  if (!items || items.length === 0) {
    itemsElement.textContent =
      "No items found for this order.";
  } else {
    itemsElement.innerHTML = items.map(item => {
      const quantity = Number(item.quantity);
      const price = Number(item.price);

      return `
        <p>
          ${escapeHTML(item.product?.name || "Product")}
          × ${quantity}
          — AED ${(price * quantity).toFixed(2)}
        </p>
      `;
    }).join("");
  }

  const totalElement = document.getElementById("order-total");

  if (totalElement) {
    totalElement.textContent =
      Number(order.total).toFixed(2);
  }
}

if (
  document.getElementById("order-number") &&
  document.getElementById("items")
) {
  loadConfirmation();
}

// =========================================
// HOME PAGE - FEATURED PRODUCTS
// =========================================

async function loadFeatured() {
  const container = document.getElementById("featured-products");
  if (!container) return;

  const { data, error } = await supabaseClient
    .from("product")
    .select("*, category(category_name)")
    .gt("stock", 0)
    .order("price", { ascending: false })
    .limit(8);

  if (error) {
    console.error("Featured error:", error);
    container.textContent = "Could not load products.";
    return;
  }

  allProducts = data || [];
  renderProducts(allProducts, "featured-products");
}

if (document.getElementById("featured-products")) {
  loadFeatured();
}

// =========================================
// PRODUCT DETAIL PAGE - LAB 4
// =========================================

async function loadProductDetail() {
  const detail = document.getElementById("detail");
  if (!detail) return;

  const productId = new URLSearchParams(window.location.search).get("id");

  if (!productId || !/^[1-9]\d*$/.test(productId)) {
    detail.innerHTML = "<p>Product ID is missing or invalid.</p>";
    return;
  }

  const { data, error } = await supabaseClient
    .from("product")
    .select("*, category(category_name)")
    .eq("product_id", Number(productId))
    .maybeSingle();

  if (error) {
    console.error("Supabase error:", error);
    detail.innerHTML = "<p>Error loading product details.</p>";
    return;
  }

  if (!data) {
    detail.innerHTML = "<p>Product not found.</p>";
    return;
  }

  const stock = Number(data.stock);
  document.title = `${data.name} — ShopNow`;

  detail.innerHTML = `
    <p class="category-tag">${escapeHTML(data.category?.category_name || "")}</p>
    <h2>${escapeHTML(data.name)}</h2>
    <p class="muted">${escapeHTML(data.description || "")}</p>
    <p class="price">AED ${Number(data.price).toFixed(2)}</p>
    <p>${stockLabel(stock)} <span class="muted">(${stock} available)</span></p>
    <button id="detail-add-btn" class="btn" ${stock <= 0 ? "disabled" : ""}>
      ${stock <= 0 ? "Out of Stock" : "Add to Cart"}
    </button>
  `;

  document.getElementById("detail-add-btn")
    .addEventListener("click", () => addToCart(data));
}

if (document.getElementById("detail")) {
  loadProductDetail();
}

// =========================================
// INITIALIZE NAVIGATION
// =========================================

if (document.getElementById("auth-nav-slot")) {
  updateNavForAuth();
}

updateCartCount();

// =========================================
// SMART PRODUCT SEARCH - LAB 9
// (plain keyword scoring - not real AI)
// =========================================

// Step 1: score a product by how many query words appear in its text.
function scoreProduct(product, queryWords) {
  const categoryName =
    typeof product.category === "object"
      ? product.category?.category_name
      : product.category;

  const text =
    `${product.name} ${product.description || ""} ${categoryName || ""}`
      .toLowerCase();

  let score = 0;
  queryWords.forEach(word => {
    if (text.includes(word)) score += 1;
  });

  return score;
}

// Step 2: simple rule-based price understanding ("under 500" / "below 500").
function extractMaxPrice(query) {
  const match = query.match(/(?:under|below)\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function smartSearch(query, products) {
  const maxPrice = extractMaxPrice(query);

  const candidates = maxPrice !== null
    ? products.filter(p => Number(p.price) <= maxPrice)
    : products;

  // Remove the price phrase so "under" and "200" are not scored as keywords.
  const cleaned = query
    .toLowerCase()
    .replace(/(?:under|below)\s+\d+/g, " ");

  // length > 2 drops short filler words (a simple "stopword removal").
  const queryWords = cleaned.split(/\s+/).filter(w => w.length > 2);

  // Price-only query (e.g. "under 300"): return the cheapest matches.
  if (queryWords.length === 0) {
    return candidates
      .slice()
      .sort((a, b) => Number(a.price) - Number(b.price))
      .slice(0, 5);
  }

  return candidates
    .map(p => ({ product: p, score: scoreProduct(p, queryWords) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => r.product);
}

// Step 3: wire the search box into products.html.
const smartBox = document.getElementById("smart-search");

if (smartBox) {
  smartBox.addEventListener("input", async e => {
    const query = e.target.value.trim();
    const resultsDiv = document.getElementById("smart-results");

    if (query.length < 3) {
      resultsDiv.innerHTML = "";
      return;
    }

    // Use the catalogue already loaded; fetch it if it is not there yet.
    if (!allProducts.length) {
      const { data } = await supabaseClient
        .from("product")
        .select("*, category(category_name)");
      allProducts = data || [];
    }

    const matches = smartSearch(query, allProducts);

    resultsDiv.innerHTML = matches.length
      ? matches.map(p =>
          `<p class="smart-hit">${escapeHTML(p.name)} — AED ${Number(p.price).toFixed(2)}</p>`
        ).join("")
      : "<p>No matches. Try different words.</p>";
  });
}
