const express = require('express');
const app = express();
const PORT = 5002;

const orders = [
  { id: 1, item: "Laptop", userId: 1 },
  { id: 2, item: "Keyboard", userId: 2 }
];

app.get('/health', (req, res) => {
  res.json({ status: "ok", service: "orders-service" });
});

app.get('/orders', (req, res) => {
  res.json(orders);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`orders-service running on port ${PORT}`);
});
