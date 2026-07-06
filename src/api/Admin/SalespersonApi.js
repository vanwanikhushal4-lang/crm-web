import apiMethods from "../methods/apiMethods";

export const fetchSalesPersonList = async () => {
  try {
    const response = await apiMethods.get('/customerMaster/salesManagers');
    return response;
  } catch (error) {
    console.error('Error fetching sales person list:', error);
    throw error;
  }
};

export const fetchSalesPersonActivity = async (id) => {
  try {
    const response = await apiMethods.get(`/salesperson/fetchDailyLocations/${id}`);
    return response;
  } catch (error) {
    console.error(`Error fetching activity for user ${id}:`, error);
    throw error;
  }
};

export const updateSalesPersonStatus = async (id, payload) => {
  try {
    const response = await apiMethods.put(`/salesperson/updatestatusOfCurrentsalesperson/${id}`, payload);
    return response;
  } catch (error) {
    console.error(`Error updating status for user ${id}:`, error);
    throw error;
  }
};

export const fetchMOMDetails = async () => {
  try { return await apiMethods.get('/customerMaster/getAllMomDetails'); } catch (e) { console.error(e); throw e; }
};

export const fetchTaskLogs = async () => {
  try { return await apiMethods.get('/TaskLog/getTaskLogs'); } catch (e) { console.error(e); throw e; }
};

export const fetchCalls = async () => {
  try { return await apiMethods.get('/Call/getCalls'); } catch (e) { console.error(e); throw e; }
};

export const fetchMeetingLogs = async () => {
  try { return await apiMethods.get('/customerMaster/getAllMeetingLogs'); } catch (e) { console.error(e); throw e; }
};

export const fetchCompanies = async () => {
  try { return await apiMethods.get('/customerMaster/getCompanies'); } catch (e) { console.error(e); throw e; }
};

export const fetchCustomers = async () => {
  try { return await apiMethods.get('/customerMaster/getAllCustomers'); } catch (e) { console.error(e); throw e; }
};
