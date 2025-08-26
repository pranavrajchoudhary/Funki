# 🛒 FUNKI.com – Full-Stack E-commerce Platform

**FUNKI.com** is a full-stack E-commerce web application built using **Node.js, Express, MySQL, and Stripe Payments**. The project replicates key functionalities of modern online stores, offering features for both users and admins.

---

## 🌟 Features

### 👤 User Features
- User Registration & Login (with bcrypt password encryption)  
- Browse All Products  
- Product Details View  
- Add to Cart (single-item cart style)  
- Secure Stripe Payment Integration (Test Mode)  
- Order History  
- Profile Page  
- Contact Page  

### 🛠 Admin Features
- Admin Dashboard  
- Add / Delete Products  
- Mark Product as In/Out of Stock  
- View All Orders  
- Update Order Status (Pending → Shipped → Delivered)  
- Wallet Balance Tracking (via `admin_wallet`)  

### 🧠 Future Features (Work in Progress)
- Fake Review Detection using ML (NLP sentiment-based)  
- Order Tracking System  
- Invoice Generation  
- Admin Sales Dashboard (charts, analytics)  
- JWT & Rate Limiting Security Enhancements  

---

## 🛠 Tech Stack

| Layer       | Technology |
|------------|------------|
| Frontend    | HTML, CSS, EJS Templates |
| Backend     | Node.js, Express.js |
| Database    | MySQL |
| Payments    | Stripe API (Test Mode) |
| Authentication | express-session + bcrypt |
| Deployment  | In Progress |

---

## 🧪 Stripe Test Details

Use these dummy card details during checkout:

- **Card Number:** 4242 4242 4242 4242  
- **Expiry:** 12/34  
- **CVC:** 123  
- **ZIP:** Any  

---

## 🚀 How to Run Locally

1. Clone the repository:  
   `git clone https://github.com/pranavrajchoudhary/Funki.git`  
2. Install dependencies:  
   `npm install`  
3. Setup MySQL database and configure credentials in `config.js`.  
4. Run the app:  
   `npm start`  
5. Open [http://localhost:3000](http://localhost:3000) in your browser.  

---

## 💡 Learning Outcomes

- Built a **full-stack web application** with Node.js, Express, and MySQL.  
- Integrated **Stripe payments** and handled secure transactions.  
- Implemented **user authentication** with sessions and bcrypt.  
- Developed an **admin panel** with order management and inventory tracking.  
- Learned how to structure and maintain a **production-level application**.  

---

## 🔗 Live Demo

Coming soon
