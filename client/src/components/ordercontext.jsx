import React, { createContext, useContext, useState, useEffect } from "react";

const OrderContext = createContext();

export const OrdersProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all orders from backend
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/api/orders");
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete an order by id
  const deleteOrder = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to delete order");
      }

      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update a specific product in an order
  const updateOrder = async (orderId, productIndex, updatedProduct) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:5000/api/orders/${orderId}/products/${productIndex}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedProduct),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to update product");
      }

      const updated = await response.json();

      // Update state locally
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.orderId === orderId
            ? {
                ...order,
                products: order.products.map((product, index) =>
                  index === productIndex ? updated : product
                ),
              }
            : order
        )
      );
    } catch (err) {
      console.error("Update error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mark an order as completed
  const markAsCompleted = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:5000/api/orders/${id}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update order status");
      }

      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== id));

      return true;
    } catch (err) {
      console.error("Completion error:", err);
      setError(err.message);
      await fetchOrders();
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Load orders on mount and set polling
  useEffect(() => {
    fetchOrders();

    const interval = setInterval(fetchOrders, 5000);

    const handleNewOrder = (event) => {
      setOrders((prev) => [event.detail, ...prev]);
    };

    window.addEventListener("new-order", handleNewOrder);

    return () => {
      clearInterval(interval);
      window.removeEventListener("new-order", handleNewOrder);
    };
  }, []);

  return (
    <OrderContext.Provider
      value={{
        orders,
        loading,
        error,
        fetchOrders,
        deleteOrder,
        updateOrder,
        markAsCompleted,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => useContext(OrderContext);
