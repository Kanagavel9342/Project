import React from "react";
import axios from "axios";
import StackManager from "../StackManager/StackManager";

const fetchData = async () => {
  const res = await axios.get("http://localhost:5000/api/stacks");
  return res.data;
};

const saveData = async (stackData) => {
  if (stackData.id) {
    await axios.put(`http://localhost:5000/api/stacks/${stackData.id}`, stackData);
  } else {
    await axios.post("http://localhost:5000/api/stacks", stackData);
  }
};

const deleteData = async (id) => {
  await axios.delete(`http://localhost:5000/api/stacks/${id}`);
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
