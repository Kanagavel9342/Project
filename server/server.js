const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
  console.log("✅ Connected to MySQL database");
});

// Reusable DB query handler
const handleQuery = (res, query, params, callback) => {
  db.query(query, params, (err, results) => {
    if (err) {
      console.error("❌ Database error:", err);
      return res.status(500).json({
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? err.message : null,
      });
    }
    callback(results);
  });
};

// ---------- Login Routes ----------
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  const query = "SELECT * FROM users WHERE username = ? AND password = ?";
  handleQuery(res, query, [username, password], (results) => {
    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = results[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
    });
  });
});

app.post("/api/production-login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  const query =
    "SELECT * FROM production_users WHERE username = ? AND password = ?";
  handleQuery(res, query, [username, password], (results) => {
    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid production credentials" });
    }

    const user = results[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  });
});

// ---------- Stack Routes ----------
app.post("/api/stacks", (req, res) => {
  const { micron, meter, size, color, stock } = req.body;
  const query =
    "INSERT INTO stacks (micron, meter, size, color, stock) VALUES (?, ?, ?, ?, ?)";
  handleQuery(res, query, [micron, meter, size, color, stock], (result) => {
    res.status(201).json({ message: "Stack created", id: result.insertId });
  });
});

app.get("/api/stacks", (req, res) => {
  handleQuery(res, "SELECT * FROM stacks", [], (results) => res.json(results));
});

app.put("/api/stacks/:id", (req, res) => {
  const { id } = req.params;
  const { micron, meter, size, color, stock } = req.body;
  const query =
    "UPDATE stacks SET micron=?, meter=?, size=?, color=?, stock=? WHERE id=?";
  handleQuery(res, query, [micron, meter, size, color, stock, id], () =>
    res.json({ message: "Stack updated", id })
  );
});

app.delete("/api/stacks/:id", (req, res) => {
  handleQuery(res, "DELETE FROM stacks WHERE id = ?", [req.params.id], () =>
    res.json({ message: "Stack deleted", id: req.params.id })
  );
});

// ---------- Place Order Route ----------
app.post("/api/place-order", (req, res) => {
  const { customerName, contactNumber, district, transport, products } =
    req.body;

  if (
    !customerName ||
    !contactNumber ||
    !Array.isArray(products) ||
    products.length === 0
  ) {
    return res.status(400).json({
      error: "Missing required fields",
      message:
        "Customer name, contact number, and at least one product are required",
    });
  }

  db.beginTransaction(async (err) => {
    if (err) {
      console.error("❌ Transaction error:", err);
      return res.status(500).json({ error: "Failed to start transaction" });
    }

    try {
      const [orderResult] = await db.promise().query(
        `INSERT INTO orders 
         (customerName, contactNumber, district, transport)
         VALUES (?, ?, ?, ?)`,
        [customerName, contactNumber, district, transport]
      );

      const orderId = orderResult.insertId;

      const productInserts = products.map((product) => [
        orderId,
        product.micron,
        product.meter,
        product.size,
        product.color,
        product.nos || "",
        product.unit || "Pcs",
        product.quantity,
      ]);

      await db.promise().query(
        `INSERT INTO order_products 
         (order_id, micron, meter, size, color, nos, unit, quantity)
         VALUES ?`,
        [productInserts]
      );

      await db.promise().commit();

      res.status(201).json({
        success: true,
        orderId,
        message: "Order placed successfully",
      });
    } catch (error) {
      await db.promise().rollback();
      console.error("❌ Order placement error:", error);
      res.status(500).json({
        error: "Failed to place order",
        message: error.message,
        details: process.env.NODE_ENV === "development" ? error : undefined,
      });
    }
  });
});

// ---------- Get All Orders ----------
app.get("/api/orders", (req, res) => {
  console.log("✅ /api/orders route hit");

  const query = `
    SELECT o.id AS orderId, o.customerName, o.contactNumber, o.district, o.transport, o.created_at,
           o.status,
           op.id AS productId, op.micron, op.meter, op.size, op.color, op.nos, op.unit, op.quantity
    FROM orders o
    LEFT JOIN order_products op ON o.id = op.order_id
    ORDER BY o.created_at DESC
  `;

  handleQuery(res, query, [], (results) => {
    const ordersMap = {};

    results.forEach((row) => {
      if (!ordersMap[row.orderId]) {
        ordersMap[row.orderId] = {
          orderId: row.orderId,
          customerName: row.customerName,
          contactNumber: row.contactNumber,
          district: row.district,
          transport: row.transport,
          created_at: row.created_at,
          status: row.status,
          products: [],
        };
      }

      if (row.productId) {
        ordersMap[row.orderId].products.push({
          productId: row.productId,
          micron: row.micron,
          meter: row.meter,
          size: row.size,
          color: row.color,
          nos: row.nos,
          unit: row.unit,
          quantity: row.quantity,
        });
      }
    });

    const orders = Object.values(ordersMap);
    res.json(orders);
  });
});

// ---------- Update Order Status ----------
app.patch("/api/orders/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  const query = "UPDATE orders SET status = ? WHERE id = ?";
  handleQuery(res, query, [status, id], (result) => {
    if (result.affectedRows === 0) {
      res.status(404).json({ error: "Order not found" });
    } else {
      res.json({ message: "Order status updated successfully" });
    }
  });
});

// ---------- Mark Order as Completed ----------
app.post('/api/orders/:orderId/complete', async (req, res) => {
const { orderId } = req.params;

 const query = "UPDATE orders SET status = 'completed' WHERE id = ?";
handleQuery(res, query, [orderId], (result) => {

    if (result.affectedRows === 0) {
      res.status(404).json({ error: "Order not found" });
    } else {
      res.json({ success: true, message: "Order marked as completed" });
    }
  });
});

//

app.delete('/api/orders/:orderId', async (req, res) => {
  const { orderId } = req.params;

  try {
    // First delete associated products
    await db.promise().query('DELETE FROM order_products WHERE order_id = ?', [orderId]);

    // Then delete the main order
    await db.promise().query('DELETE FROM orders WHERE id = ?', [orderId]);

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ message: 'Failed to delete order' });
  }
});




// 



// ─── UPDATE A SINGLE PRODUCT IN AN ORDER ────────────────────────────────────────
// PUT /api/orders/:orderId/products/:productId
app.put('/api/orders/:orderId/products/:productId', async (req, res) => {
  const { orderId, productId } = req.params;
  const {
    micron,
    meter,
    size,
    color,
    nos,
    quantity,
    unit,
    customerName,
    contactNumber,
    district,
  } = req.body;

  try {
    // (Optional) update order-level fields if they were sent
    if (customerName || contactNumber || district) {
      await db.query(
        `UPDATE orders
           SET customer_name   = COALESCE(?, customer_name),
               contact_number  = COALESCE(?, contact_number),
               district        = COALESCE(?, district)
         WHERE id = ?`,
        [customerName, contactNumber, district, orderId]
      );
    }

    // update the specific product row
    await db.query(
      `UPDATE order_products
         SET micron    = COALESCE(?, micron),
             meter     = COALESCE(?, meter),
             size      = COALESCE(?, size),
             color     = COALESCE(?, color),
             nos       = COALESCE(?, nos),
             quantity  = COALESCE(?, quantity),
             unit      = COALESCE(?, unit)
       WHERE id        = ?
         AND order_id  = ?`,
      [micron, meter, size, color, nos, quantity, unit, productId, orderId]
    );

    res.json({ message: 'Product updated successfully.' });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ message: 'Failed to update product.' });
  }
});


// ---------- 404 Handler ----------
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    message: `Route ${req.method} ${req.path} does not exist`,
  });
});

// ---------- Global Error Handler ----------
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: "An unexpected error occurred",
    details: process.env.NODE_ENV === "development" ? err.message : null,
  });
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
