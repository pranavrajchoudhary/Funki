const express = require('express');
const mysql = require('mysql2');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const methodOverride = require('method-override');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 2000;

const saltRounds = 10;

// Middleware Setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1000 * 60 * 60 * 24 * 3  // 3 days
}

}));

// MySQL Connection
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS
});


connection.connect(err => {
    if (err) {
        console.error('Database connection error:', err.stack);
        return;
    }
    console.log('Connected to DB. ID:', connection.threadId);
});

// Authentication Middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.user) next();
    else res.redirect('/funki/auth');
};

 

app.get("/", (req, res) => {
    res.redirect("/funki/home");
});

app.get("/funki/auth", (req, res) => {
    res.render("auth.ejs", { msg: req.query.msg || false });
});



 
// Registration
app.post("/funki/register", async (req, res) => {
    const { name, email, password, phone } = req.body;
    const id = uuidv4();

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const query = "INSERT INTO user (id, name, email, password, phone) VALUES (?, ?, ?, ?, ?)";
        connection.query(query, [id, name, email, hashedPassword, phone], (err) => {
            if (err) {
                console.error("Registration error:", err);
                return res.redirect("/funki/auth?msg=Email already in use.");
            }
            res.redirect("/funki/auth?msg=Registration successful! Please log in.");
        });
    } catch (error) {
        console.error("Hashing error:", error);
        res.redirect("/funki/auth?msg=Server error.");
    }
});

// Login
app.post("/funki/login", (req, res) => {
    const { email, password } = req.body;
    const query = "SELECT * FROM user WHERE email = ?";

    connection.query(query, [email], async (err, result) => {
        if (err || result.length === 0) {
            return res.redirect("/funki/auth?msg=Incorrect email or password.");
        }

        const user = result[0];
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            };

            return user.role === 'admin'
                ? res.redirect("/funki/admin")
                : res.redirect("/funki/home");
        } else {
            return res.redirect("/funki/auth?msg=Incorrect email or password.");
        }


    });
});
function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    return res.status(403).send("Access Denied: Admins only | go back to <a href = '/funki/auth'>login with admin account</a>");
}

// Logout
app.get("/funki/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) return res.redirect("/funki/home");
        res.redirect("/funki/auth");
    });
});
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

 

app.get("/funki/home", isAuthenticated, (req, res) => {
    const user = req.session.user;
    const query = "SELECT * FROM product";

    connection.query(query, (err, products) => {
        if (err) {
            return res.status(500).render("home.ejs", {
                products: [],
                user,
                error: "Product loading error."
            });
        }
        res.render("home.ejs", { products, user });
    });
});

// Single Product Page
app.get("/funki/product/:id", isAuthenticated, (req, res) => {
    const { id } = req.params;
    const query = "SELECT * FROM product WHERE id = ?";

    connection.query(query, [id], (err, result) => {
        if (err || result.length === 0) {
            return res.status(404).send("Product not found");
        }
        res.render("product.ejs", { product: result[0] });
    });
});

// User Profile
app.get("/funki/profile", isAuthenticated, (req, res) => {
    res.render("profile.ejs", { user: req.session.user });
});
app.get("/funki/contact", isAuthenticated,(req, res) => {
    res.render("ctc.ejs");
});
// =======================
// Cart Routes
// =======================

// View Cart
app.get("/funki/cart", isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const query = `
        SELECT p.id, p.title, p.amt, p.img, p.isAvailable, c.quantity 
        FROM product p 
        JOIN cart c ON p.id = c.product_id 
        WHERE c.user_id = ?
    `;

    connection.query(query, [userId], (err, cartItems) => {
        if (err) return res.redirect('/funki/home');
        res.render("cart.ejs", { cartItems, user: req.session.user });
    });
});

// Add to cart (overwrites previous)
app.post("/funki/cart/add/:productId", isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const productId = req.params.productId;

    const clearOld = "DELETE FROM cart WHERE user_id = ?";
    const insertNew = "INSERT INTO cart (user_id, product_id) VALUES (?, ?)";

    connection.query(clearOld, [userId], (err) => {
        if (err) return res.redirect("back");

        connection.query(insertNew, [userId, productId], (err2) => {
            if (err2) return res.redirect("back");
            res.redirect("/funki/cart");
        });
    });
});

// View Cart
app.get("/funki/cart", isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const query = `
        SELECT p.id, p.title, p.amt, p.img, p.isAvailable 
        FROM product p 
        JOIN cart c ON p.id = c.product_id 
        WHERE c.user_id = ?
    `;

    connection.query(query, [userId], (err, cartItems) => {
        if (err) return res.redirect("/funki/home");
        res.render("cart.ejs", { cartItems, user: req.session.user });
    });
});


// Remove from Cart
app.post("/funki/cart/remove/:productId", isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const productId = req.params.productId;
    const query = "DELETE FROM cart WHERE user_id = ? AND product_id = ?";

    connection.query(query, [userId, productId], () => res.redirect('/funki/cart'));
});


app.post("/checkout", isAuthenticated, (req, res) => {
    const userId = req.session.user.id;

    const getCart = `
        SELECT p.id AS product_id, p.title, p.amt
        FROM cart c JOIN product p ON p.id = c.product_id
        WHERE c.user_id = ?
    `;

    connection.query(getCart, [userId], async (err, items) => {
        if (err || items.length === 0) return res.redirect("/funki/cart");

        const product = items[0];
        const amount = product.amt * 100; // ₹ => paise

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
                price_data: {
                    currency: "inr",
                    product_data: {
                        name: product.title,
                    },
                    unit_amount: amount
                },
                quantity: 1
            }],
            mode: "payment",
            success_url: `http://localhost:2000/payment-success?...`,
cancel_url: `http://localhost:2000/funki/cart`

        });

        res.redirect(session.url);
    });
});

app.post("/checkout", isAuthenticated, (req, res) => {
    const userId = req.session.user.id;

    const getCart = `
        SELECT p.id AS product_id, p.title, p.amt
        FROM cart c JOIN product p ON p.id = c.product_id
        WHERE c.user_id = ?
    `;

    connection.query(getCart, [userId], async (err, items) => {
        if (err || items.length === 0) return res.redirect("/funki/cart");

        const product = items[0];
        const amount = product.amt * 100; // ₹ => paise

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
                price_data: {
                    currency: "inr",
                    product_data: {
                        name: product.title,
                    },
                    unit_amount: amount
                },
                quantity: 1
            }],
            mode: "payment",
            success_url: `http://localhost:2000/payment-success?pid=${product.product_id}`,
            cancel_url: `http://localhost:2000/funki/cart`
        });

        res.redirect(session.url);
    });
});

// ✅ After Stripe Success
app.get("/payment-success", isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const pid = req.query.pid;

    const amtQuery = `SELECT amt FROM product WHERE id = ?`;
    connection.query(amtQuery, [pid], (err, result) => {
        if (err || result.length === 0) return res.redirect("/funki/cart");

        const total = result[0].amt;

        // 1. Insert order
        const insertOrder = `
            INSERT INTO orders (user_id, product_id, quantity, total_amt)
            VALUES (?, ?, 1, ?)
        `;

        connection.query(insertOrder, [userId, pid, total], (err) => {
            if (err) return res.redirect("/funki/cart");

            // 2. Mark unavailable
            connection.query("UPDATE product SET isAvailable = 0 WHERE id = ?", [pid]);

            // 3. Empty cart
            connection.query("DELETE FROM cart WHERE user_id = ?", [userId]);

            // 4. Add to wallet
            connection.query("UPDATE admin_wallet SET total_balance = total_balance + ?", [total]);

            res.render("thankyou.ejs");
        });
    });
});


app.get("/funki/orders", isAuthenticated, (req, res) => {
  const userId = req.session.user.id;
  const query = `
    SELECT o.id, o.quantity, o.total_amt, o.order_time, o.status,
           p.title AS product_title, p.img AS product_img
    FROM orders o
    JOIN product p ON o.product_id = p.id
    WHERE o.user_id = ?
    ORDER BY o.order_time DESC
  `;

  connection.query(query, [userId], (err, orders) => {
    if (err) {
      console.log(err);
      return res.send("Error fetching your orders.");
    }

    res.render("user_orders.ejs", { orders });
  });
});

 
// Admin Panel
 

// Admin Dashboard
app.get('/funki/admin', isAdmin, (req, res) => {
    connection.query('SELECT * FROM product', (err, results) => {
        if (err) return res.status(500).send("DB Error");
        res.render('admin.ejs', { products: results });
    });
});

app.get("/admin/orders", isAdmin, (req, res) => {
    const query = `
        SELECT o.id, o.quantity, o.total_amt, o.order_time, o.status,
               u.name AS user_name, p.title AS product_title
        FROM orders o
        JOIN user u ON o.user_id = u.id
        JOIN product p ON o.product_id = p.id
        ORDER BY o.order_time DESC
    `;

    connection.query(query, (err, orders) => {
        if (err) {
            console.log(err);
            return res.send("Error fetching orders");
        }

        res.render("admin_orders.ejs", { orders });
    });
});

app.patch("/admin/orders/:id", isAdmin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const updateQuery = "UPDATE orders SET status = ? WHERE id = ?";
    connection.query(updateQuery, [status, id], (err) => {
        if (err) {
            console.log("Error updating status:", err);
        }
        res.redirect("/admin/orders");
    });
});

// Add Product
app.post('/funki/admin/products/add', isAdmin, (req, res) => {
    const { id, img, title, description, specifications, amt, isAvailable } = req.body;
    const query = `
        INSERT INTO product (id, img, title, discription, specifications, amt, isAvailable) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [id, img, title, description, specifications, amt, !!isAvailable];
    connection.query(query, values, (err) => {
        if (err) return res.status(500).send("Insert Error");
        res.redirect('/funki/admin');
    });
});
// Delete Product
app.delete("/funki/admin/pro/:id", isAdmin, (req, res) => {
    const { id } = req.params;
    const query = "DELETE FROM product WHERE id = ?";
    connection.query(query, [id], (err) => {
        if (err) return res.status(500).send("Delete failed");
        res.redirect("/funki/admin");
    });
});
app.patch("/funki/admin/pro/:id", isAdmin, (req, res) => {
    const { id } = req.params;
    const getQuery = "SELECT isAvailable FROM product WHERE id = ?";

    connection.query(getQuery, [id], (err, results) => {
        if (err || results.length === 0) return res.redirect("/funki/admin");

        const currentStatus = results[0].isAvailable;
        const newStatus = !currentStatus;

        const updateQuery = "UPDATE product SET isAvailable = ? WHERE id = ?";
        connection.query(updateQuery, [newStatus, id], () => res.redirect("/funki/admin"));
    });
});


 
 
app.use((req, res) => {
    res.status(404).render("404");
});

// Start Server
app.listen(port, () => {
    console.log(`Funki.com server is running at http://localhost:${port}`);
});
