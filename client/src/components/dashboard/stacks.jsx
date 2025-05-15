import React from "react";
import axios from "axios";
import StackManager from "../StackManager/StackManager";

// Use environment variable for base API URL
const API_BASE_URL = process.env.REACT_APP_API_URL;

const fetchData = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/stacks`);
  return res.data;
};

const saveData = async (stackData) => {
  if (stackData.id) {
    await axios.put(`${API_BASE_URL}/api/stacks/${stackData.id}`, stackData);
  } else {
    await axios.post(`${API_BASE_URL}/api/stacks`, stackData);
  }
};

const deleteData = async (id) => {
  await axios.delete(`${API_BASE_URL}/api/stacks/${id}`);
};

const Stacks = () => (
  <StackManager
    title="Stacks Details"
    fetchData={fetchData}
    saveData={saveData}
    deleteData={deleteData}
  />
);

export default Stacks;
