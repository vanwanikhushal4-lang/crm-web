import apiMethods from "../../methods/apiMethods";
import { API_BASE_URL } from '../../AxiosInterceptor';

const CUSTOMER_MASTER_BASE_URL = API_BASE_URL;


// Login function 
export const loginUser = async (email, password) => {
  try {
    const res = await apiMethods.post("/login", {
      email: email.trim(),
      password: password.trim(),
    });

    return res; 
  } catch (error) {
    console.error("Login API Error:", error);
    throw error;
  }
};

export const getTodayMeetings = async (token) => {
  try {
    const res = await apiMethods.get("/meetings/todayMeetingDetails", {});
    return res;
  } catch (error) {
    console.error("Meetings API Error:", error);
    throw error;
  }
};

// 👇 FIXED API FUNCTION FOR ATTENDANCE 👇
export const submitDailyLogin = async (payload, selfieUri, isCheckOut) => {
  try {
    const apiUrl = isCheckOut ? "/dailyLogout" : "/dailyLogin";
    const formData = new FormData();

    // 👇 REVERTED: The Controller expects 'data'
    formData.append('data', JSON.stringify(payload));

    // 👇 REVERTED: The Controller expects 'image'
    formData.append('image', {
      uri: selfieUri,
      type: 'image/jpeg',
      name: isCheckOut ? 'checkout.jpg' : 'checkin.jpg',
    });

    console.log(`Submitting Daily ${isCheckOut ? 'Logout' : 'Login'}:`, apiUrl, formData);

    const res = await apiMethods.post(apiUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('Daily Attendance Response:', res.data);
    
    if (isCheckOut) {
      localStorage.clear();
    }
    
    return res;
  } catch (error) {
    console.error('Daily Attendance API Error:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export const fetchUserRoles = async () => {
  try {
    const json = await apiMethods.get('/getUserRoleListing');

    if (json.statusCode === 200 && Array.isArray(json.data)) {
      const opts = json.data.map(roleName => ({ label: roleName, value: roleName }));
      return opts;
    } else {
      alert('Error: ' + 'Unexpected response from server');
      return [];
    }
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }
};

export const createCustomerMaster = async (payload) => {
  try {
    const res = await apiMethods.post(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/saveCustomer`, payload);
    return res;
  } catch (error) {
    console.error('Create Customer API Error:', error);
    throw error;
  }
};
export const saveCustomer = createCustomerMaster;

export const saveCustomerWithCompany = async (payload) => {
  try {
    const res = await apiMethods.post(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/saveCustomerWithCompany`, payload);
    return res;
  } catch (error) {
    console.error('Save Customer With Company API Error:', error);
    throw error;
  }
};

export const getCompanies = async () => {
  try {
    const res = await apiMethods.get(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/getCompanies`);
    return res;
  } catch (error) {
    console.error('Get Companies API Error:', error);
    throw error;
  }
};

export const saveOrUpdateLead = async (payload) => {
  try {
    const res = await apiMethods.post('/lead/saveOrUpdateLead', payload);
    return res;
  } catch (error) {
    console.error('Save/Update Lead API Error:', error);
    throw error;
  }
};

export const getLeads = async () => {
  try {
    const res = await apiMethods.get('/lead/getLeads');
    return res;
  } catch (error) {
    console.error('Get Leads API Error:', error);
    throw error;
  }
};

export const getAllLeads = async () => {
  try {
    const res = await apiMethods.get('/lead/getAllLeads');
    return res;
  } catch (error) {
    console.error('Get All Leads API Error:', error);
    throw error;
  }
};

export const importLeadsExcel = async (fileOrFormData) => {
  try {
    let formData;
    if (fileOrFormData instanceof FormData) {
      formData = fileOrFormData;
    } else {
      formData = new FormData();
      formData.append('file', fileOrFormData);
    }
    const res = await apiMethods.post('/lead/importLeadsExcel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res;
  } catch (error) {
    console.error('Import Leads Excel API Error:', error);
    throw error;
  }
};

export const deleteLeadById = async (id) => {
  try {
    const res = await apiMethods.delete(`/lead/deleteById/${id}`);
    return res;
  } catch (error) {
    if (error?.response?.status === 405) {
      const res = await apiMethods.post(`/lead/deleteById/${id}`);
      return res;
    }
    console.error('Delete Lead By ID API Error:', error);
    throw error;
  }
};

export const saveOrUpdateTaskLog = async (payload) => {
  try {
    const res = await apiMethods.post('/TaskLog/saveOrUpdateTaskLog', payload);
    return res;
  } catch (error) {
    console.error('Save/Update TaskLog API Error:', error);
    throw error;
  }
};

export const getTaskLogs = async () => {
  try {
    const res = await apiMethods.get('/TaskLog/getTaskLogs');
    return res;
  } catch (error) {
    console.error('Get TaskLogs API Error:', error);
    throw error;
  }
};

export const saveMeetingLog = async (payload) => {
  try {
    const res = await apiMethods.post(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/saveMeetingLog`, payload);
    return res;
  } catch (error) {
    console.error('Save Meeting Log API Error:', error);
    throw error;
  }
};

export const saveOrUpdateCall = async (payload) => {
  try {
    const res = await apiMethods.post('/Call/saveOrUpdateCall', payload);
    return res;
  } catch (error) {
    console.error('Save/Update Call API Error:', error);
    throw error;
  }
};

export const getCalls = async () => {
  try {
    const res = await apiMethods.get('/Call/getCalls');
    return res;
  } catch (error) {
    console.error('Get Calls API Error:', error);
    throw error;
  }
};

export const getAllMeetingLogs = async () => {
  try {
    const res = await apiMethods.get(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/getAllMeetingLogs`);
    return res;
  } catch (error) {
    console.error('Get All Meeting Logs API Error:', error);
    throw error;
  }
};

export const updateCustomerWithCompany = async (id, payload) => {
  try {
    const res = await apiMethods.put(
      `${CUSTOMER_MASTER_BASE_URL}/customerMaster/updateCustomerWithCompany/${id}`,
      payload
    );
    return res;
  } catch (error) {
    console.error('Update Customer With Company API Error:', error);
    throw error;
  }
};

export const updateCustomer = async (payload) => {
  try {
    const id = payload.id;
    const res = await apiMethods.put(
      `${CUSTOMER_MASTER_BASE_URL}/customerMaster/updateCustomerWithCompany/${id}`,
      payload
    );
    return res;
  } catch (error) {
    console.error('Update Customer API Error:', error);
    throw error;
  }
};

export const deleteCustomerById = async (id) => {
  try {
    const res = await apiMethods.delete(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/deleteCustomerById?id=${id}`);
    return res;
  } catch (error) {
    console.error('Delete Customer API Error:', error);
    throw error;
  }
};

export const uploadCustomersExcel = async (formData) => {
  try {
    const res = await apiMethods.post(
      `${CUSTOMER_MASTER_BASE_URL}/customerMaster/uploadCustomersExcel`,
      formData
    );
    return res;
  } catch (error) {
    console.error('Upload customers Excel API Error:', error);
    throw error;
  }
};

export const uploadMeetingAttachment = async ({ file, meetingId, meetingLogId }) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (meetingId != null && meetingId !== '') formData.append('meetingId', String(meetingId));
    if (meetingLogId != null && meetingLogId !== '') formData.append('meetingLogId', String(meetingLogId));
    const res = await apiMethods.post('/attachments/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: (data) => data,
    });
    return res;
  } catch (error) {
    console.error('Upload Meeting Attachment API Error:', error);
    throw error;
  }
};

export const getAttachmentForMeetingLog = async (meetingLogId) => {
  try {
    const res = await apiMethods.get(`/attachments/getAttachmentForMeetingLog/${meetingLogId}`);
    return res;
  } catch (error) {
    console.error('Get Meeting Log Attachments API Error:', error);
    throw error;
  }
};

export const getAttachmentForMeeting = async (meetingId) => {
  try {
    const res = await apiMethods.get(`/attachments/getAttachmentForMeeting/${meetingId}`);
    return res;
  } catch (error) {
    console.error('Get Meeting Attachments API Error:', error);
    throw error;
  }
};

export const getAllCustomerDetails = async () => {
  try {
    const res = await apiMethods.get(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/getAllCustomers`);
    return res;
  } catch (error) {
    console.error('Get All Customers API Error:', error);
    throw error;
  }
};

export const getAllCustomersByUserId = async (userId) => {
  try {
    const res = await apiMethods.get(
      `${CUSTOMER_MASTER_BASE_URL}/customerMaster/getAllCustomersByUserId?userId=${userId}`
    );
    return res;
  } catch (error) {
    console.error('Get Customers By User ID API Error:', error);
    throw error;
  }
};

export const getSalesManagers = async () => {
  try {
    const res = await apiMethods.get(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/salesManagers`);
    return res;
  } catch (error) {
    console.error('Get Sales Managers API Error:', error);
    throw error;
  }
};

export const transferCustomers = async (payload) => {
  try {
    const res = await apiMethods.post(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/transferCustomers`, payload);
    return res;
  } catch (error) {
    console.error('Transfer Customers API Error:', error);
    throw error;
  }
};

export const getAllProducts = async () => {
  try {
    const res = await apiMethods.get(`${CUSTOMER_MASTER_BASE_URL}/productSuitMaster/getAllProducts`);
    return res;
  } catch (error) {
    try {
      const fallbackRes = await apiMethods.get(`${CUSTOMER_MASTER_BASE_URL}/ProductSuitMaster/getAllProducts`);
      return fallbackRes;
    } catch (fallbackError) {
      console.error('Get All Products API Error:', fallbackError);
      throw fallbackError;
    }
  }
};

export const saveSuiteWithProducts = async (payload) => {
  try {
    const res = await apiMethods.post(`${CUSTOMER_MASTER_BASE_URL}/productSuitMaster/saveSuiteWithProducts`, payload);
    return res;
  } catch (error) {
    console.error('Save Suite With Products API Error:', error);
    throw error;
  }
};

export const schedulePlannedMeeting = async (payload) => {
  try {
    const res = await apiMethods.post('/plannedMeetings/schedule', payload);
    return res;
  } catch (error) {
    console.error('Schedule Planned Meeting API Error:', error);
    throw error;
  }
};

export const getPlannedMeetingsByUserId = async (userId) => {
  try {
    const res = await apiMethods.get('/plannedMeetings/getMeetingsByUserId', { userId });
    return res;
  } catch (error) {
    console.error('Get Planned Meetings By User ID API Error:', error);
    throw error;
  }
};

export const getAllMeetingCheckInByUserId = async (userId) => {
  try {
    const res = await apiMethods.get('/plannedMeetings/getAllMeetingCheckInByUserId', { userId });
    return res;
  } catch (error) {
    console.error('Get Meeting Check-Ins By User ID API Error:', error);
    throw error;
  }
};

export const updatePlannedMeetingSchedule = async (payload) => {
  try {
    console.log('[updatePlannedMeetingSchedule] endpoint:', '/plannedMeetings/updateSchedule');
    console.log('[updatePlannedMeetingSchedule] method:', 'PUT');
    console.log('[updatePlannedMeetingSchedule] payload:', JSON.stringify(payload));
    const res = await apiMethods.put('/plannedMeetings/updateSchedule', payload);
    console.log('[updatePlannedMeetingSchedule] response:', res);
    return res;
  } catch (error) {
    console.error('[updatePlannedMeetingSchedule] error message:', error?.message);
    console.error('[updatePlannedMeetingSchedule] error status:', error?.response?.status);
    console.error('[updatePlannedMeetingSchedule] error data:', error?.response?.data);
    console.error('[updatePlannedMeetingSchedule] full error:', error);
    throw error;
  }
};

export const deletePlannedMeetingById = async ({ meetingId, customerId }) => {
  try {
    const res = await apiMethods.delete(
      `/plannedMeetings/deleteMeetingById?id=${meetingId}&customerId=${customerId}`,
    );
    return res;
  } catch (error) {
    console.error('Delete Planned Meeting API Error:', error);
    throw error;
  }
};

export const saveMoMDetailsOfCustomer = async (payload) => {
  try {
    const res = await apiMethods.post(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/saveMoMDetailsOfCustomer`, payload);
    return res;
  } catch (error) {
    console.error('MOM API Failure Status:', error?.response?.status);
    console.error('MOM API Failure Message:', error?.response?.data);
    throw error;
  }
};

export const updateMoMDetailsOfCustomer = async (payload) => {
  try {
    const res = await apiMethods.put(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/updateMoMDetailsOfCustomer`, payload);
    return res;
  } catch (error) {
    console.error('Update MOM API Failure Status:', error?.response?.status);
    console.error('Update MOM API Failure Message:', error?.response?.data);
    throw error;
  }
};

export const getCustomersByEngagementType = async (engagementType) => {
  try {
    const res = await apiMethods.get(
      `${CUSTOMER_MASTER_BASE_URL}/customerMaster/customers-by-engagementType?engagementType=${engagementType}`
    );
    return res;
  } catch (error) {
    console.error(`Fetch MOM Error (${engagementType}):`, error);
    throw error;
  }
};

export const getAllMomDetails = async () => {
  try {
    const res = await apiMethods.get(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/getAllMomDetails`);
    return res;
  } catch (error) {
    console.error('Get All MOM Details API Error:', error);
    throw error;
  }
};

export const getAllMomDetailsByCurrentUser = async () => {
  try {
    const res = await apiMethods.get(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/getAllMomDetailsByCurrentUser`);
    return res;
  } catch (error) {
    console.error('Get MOM Details By Current User API Error:', error);
    throw error;
  }
};

export const saveTargetDetails = async (payload) => {
  try {
    const res = await apiMethods.post('/Target/saveTargetDetails', payload);
    return res;
  } catch (error) {
    console.error('Save Target API Error:', error?.response?.data || error);
    throw error;
  }
};

export const getAllTargetUsers = async () => {
  try {
    const res = await apiMethods.get('/Target/getAllUsers');
    return res;
  } catch (error) {
    console.error('Get All Target Users API Error:', error);
    throw error;
  }
};

export const getAllTargetsByUserId = async (userId) => {
  try {
    const res = await apiMethods.get(`/Target/getAllTargetsByUserId?userId=${userId}`);
    return res;
  } catch (error) {
    console.error('Get Targets By User ID API Error:', error);
    throw error;
  }
};

export const getCustomersByStage = async (stage) => {
  try {
    const res = await apiMethods.get(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/customers-by-stage/${stage}`);
    return res;
  } catch (error) {
    console.error(`Get Customers by Stage ${stage} API Error:`, error);
    throw error;
  }
};

export const uploadResumeDetails = async (userId, docUri, docType, docName) => {
  try {
    const formData = new FormData();

    formData.append('userId', userId);
    formData.append('file', {
      uri: docUri,
      type: docType || 'application/pdf', 
      name: docName || 'resume.pdf',
    });

    const res = await apiMethods.post("/uploadResume", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return res;
  } catch (error) {
    console.error('Resume Upload API Error:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export const getDesignations = async () => {
  try {
    const res = await apiMethods.get(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/designations`);
    return res;
  } catch (error) {
    console.error('Get Designations API Error:', error);
    throw error;
  }
};

// export const createNewDesignation = async (designationText) => {
//   try {
//     const res = await apiMethods.post(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/addDesignation`, {
//       designationName: designationText
//     });
//     return res;
//   } catch (error) {
//     console.error('Add Designation API Error:', error);
//     throw error;
//   }
// };
export const createNewDesignation = async (designationText) => {
  try {
    const res = await apiMethods.post(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/addDesignation`, {
      name: designationText // ✅ Changed from designationName to name
    });
    return res;
  } catch (error) {
    console.error('Add Designation API Error:', error);
    throw error;
  }
};

export const getCustomerTypes = async () => {
  try {
    const res = await apiMethods.get(`${CUSTOMER_MASTER_BASE_URL}/customerMaster/customerTypes`);
    return res;
  } catch (error) {
    console.error('Get Customer Types API Error:', error);
    throw error;
  }
};

// 👇 ADD THESE TO YOUR API FUNCTIONS FILE 👇

// 1. ADMIN: Toggle Outsider Status
export const toggleOutsiderStatus = async (userId) => {
  try {
    // Assuming it's a POST or PUT request. Adjust if it's a GET.
    const res = await apiMethods.put(`/admin/outside/toggle?userId=${userId}`);
    return res;
  } catch (error) {
    console.error('Toggle Outsider API Error:', error);
    throw error;
  }
};

// 2. SALESMAN: Send Live Location Ping
export const sendOutsiderLocationPing = async (latitude, longitude) => {
  try {
    const payload = {
      latitude: Number(latitude),
      longitude: Number(longitude)
    };
    
    // Note: The JWT token in your apiMethods will automatically identify the user
    const res = await apiMethods.post(`/outside/location`, payload);
    return res;
  } catch (error) {
    console.error('Send Location Ping Error:', error);
    throw error;
  }
};

// 3. ADMIN: Get Active Outsiders for the Map
export const getActiveOutsiders = async () => {
  try {
    const res = await apiMethods.get(`/admin/outside/active`);
    return res;
  } catch (error) {
    console.error('Get Active Outsiders Error:', error);
    throw error;
  }
};

// Add this near the bottom of Login_api_function.js
export const getAllUsers = async () => {
  try {
    const res = await apiMethods.get(`/getAllUsers`);
    return res;
  } catch (error) {
    try {
      const fallbackRes = await apiMethods.get(`/api/v1/getAllUsers`);
      return fallbackRes;
    } catch (err) {
      console.error('Get All Users Error:', error);
      throw error;
    }
  }
};
// Add this right next to your getActiveOutsiders function
export const getOutsideUserLocations = async (userId) => {
  try {
    const res = await apiMethods.get(`/outside/getOutsideUserLocations?userId=${userId}`);
    return res;
  } catch (error) {
    console.error('Get User Locations API Error:', error);
    throw error;
  }
};

// 👇 ADD THESE TO YOUR API FILE 👇

export const submitPunchIn = async (lat, lng, photoUri) => {
  try {
    console.log('\n========== PUNCH IN REQUEST START ==========');
    console.log('[PunchIn] endpoint:', '/punchIn');
    console.log('[PunchIn] full URL:', `${API_BASE_URL}/punchIn`);
    console.log('[PunchIn] lat/lng:', lat, lng);
    console.log('[PunchIn] photoUri:', photoUri);

    const formData = new FormData();
    // Punch-in endpoint expects location body + photo
    const dataPayload = {
      latitude: Number(lat),
      longitude: Number(lng),
    };
    formData.append('data', JSON.stringify(dataPayload));
    console.log('[PunchIn] data payload:', JSON.stringify(dataPayload));
    
    if (photoUri) {
      if (typeof photoUri === 'string') {
        const filename = photoUri.split('/').pop();
        const uploadUri = photoUri;
        console.log('[PunchIn] image filename:', filename);
        console.log('[PunchIn] image upload uri:', uploadUri);
        formData.append('image', {
          uri: uploadUri,
          name: filename,
          type: 'image/jpeg',
        });
      } else {
        formData.append('image', photoUri, 'selfie.jpg');
      }
      console.log('[PunchIn] appended image key: image');
    } else {
      console.log('[PunchIn] WARNING: photoUri missing, image not appended');
    }

    const res = await apiMethods.post('/punchIn', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: (data) => data,
    });
    console.log('[PunchIn] success response:', res);
    console.log('[PunchIn] response status:', res?.status);
    console.log('[PunchIn] response statusCode:', res?.statusCode);
    console.log('[PunchIn] response message:', res?.message || res?.response);
    console.log('========== PUNCH IN REQUEST END ==========\n');
    return res;
  } catch (error) {
    console.error('[PunchIn] error message:', error?.message);
    console.error('[PunchIn] error name:', error?.name);
    console.error('[PunchIn] error code:', error?.code);
    console.error('[PunchIn] isAxiosError:', error?.isAxiosError);
    console.error('[PunchIn] error status:', error?.response?.status);
    console.error('[PunchIn] error data:', error?.response?.data);
    console.error('[PunchIn] error headers:', error?.response?.headers);
    console.error('[PunchIn] request response text:', error?.request?._response);
    if (typeof error?.toJSON === 'function') {
      console.error('[PunchIn] error json:', error.toJSON());
    }
    if (error?.message === 'Network Error' && !error?.response) {
      console.log('[PunchIn] Axios network error without response. Trying fetch multipart fallback...');
      try {
        const fallbackRes = await submitPunchInWithFetchFallback(lat, lng, photoUri);
        console.log('[PunchIn] fetch fallback success response:', fallbackRes);
        console.log('========== PUNCH IN REQUEST END (FETCH FALLBACK) ==========\n');
        return fallbackRes;
      } catch (fallbackError) {
        console.error('[PunchIn] fetch fallback error message:', fallbackError?.message);
        console.error('[PunchIn] fetch fallback error status:', fallbackError?.status);
        console.error('[PunchIn] fetch fallback error data:', fallbackError?.data);
      }
    }
    console.error('[PunchIn] full error:', error);
    console.log('========== PUNCH IN REQUEST FAILED ==========\n');
    throw error;
  }
};

const submitPunchInWithFetchFallback = async (lat, lng, photoUri) => {
  console.log('\n========== PUNCH IN FETCH FALLBACK START ==========');
  const token = localStorage.getItem('jwtToken');
  const formData = new FormData();
  const dataPayload = {
    latitude: Number(lat),
    longitude: Number(lng),
  };

  formData.append('data', JSON.stringify(dataPayload));
  console.log('[PunchIn:fetch] data payload:', JSON.stringify(dataPayload));

  if (photoUri) {
    if (typeof photoUri === 'string') {
      const filename = photoUri.split('/').pop();
      const uploadUri = photoUri;
      console.log('[PunchIn:fetch] image filename:', filename);
      console.log('[PunchIn:fetch] image upload uri:', uploadUri);
      formData.append('image', {
        uri: uploadUri,
        name: filename || 'checkin.jpg',
        type: 'image/jpeg',
      });
    } else {
      formData.append('image', photoUri, 'selfie.jpg');
    }
  }

  const response = await fetch(`${API_BASE_URL}/punchIn`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    body: formData,
  });

  const text = await response.text();
  console.log('[PunchIn:fetch] http status:', response.status);
  console.log('[PunchIn:fetch] raw response:', text);

  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch (parseError) {
    parsed = { response: text };
  }

  if (!response.ok) {
    const error = new Error(parsed?.message || parsed?.response || `Punch in failed with HTTP ${response.status}`);
    error.status = response.status;
    error.data = parsed;
    throw error;
  }

  console.log('========== PUNCH IN FETCH FALLBACK END ==========\n');
  return parsed;
};

export const submitPunchOut = async (lat, lng) => {
  try {
    console.log('\n========== PUNCH OUT REQUEST START ==========');
    console.log('[PunchOut] endpoint:', '/punchOut');
    console.log('[PunchOut] lat/lng:', lat, lng);
    // Punch out only needs a JSON body
    const payload = {
      latitude: Number(lat),
      longitude: Number(lng)
    };
    console.log('[PunchOut] payload:', JSON.stringify(payload));
    const res = await apiMethods.post('/punchOut', payload);
    console.log('[PunchOut] success response:', res);
    console.log('[PunchOut] response status:', res?.status);
    console.log('[PunchOut] response statusCode:', res?.statusCode);
    console.log('[PunchOut] response message:', res?.message || res?.response);
    console.log('========== PUNCH OUT REQUEST END ==========\n');
    return res;
  } catch (error) {
    console.error('[PunchOut] error message:', error?.message);
    console.error('[PunchOut] error status:', error?.response?.status);
    console.error('[PunchOut] error data:', error?.response?.data);
    console.error('[PunchOut] error headers:', error?.response?.headers);
    console.error('[PunchOut] full error:', error);
    console.log('========== PUNCH OUT REQUEST FAILED ==========\n');
    throw error;
  }
};

export const meetingCheckIn = async (payload) => {
  try {
    const normalizedPayload = {
      ...payload,
      meetingId: payload?.meetingId ?? null,
      meetingLogId: payload?.meetingLogId ?? payload?.meeting_log_id ?? null,
    };
    console.log('[meetingCheckIn] Sending payload:', normalizedPayload);
    const res = await apiMethods.post('/plannedMeetings/meetingCheckIn', normalizedPayload);
    console.log('[meetingCheckIn] Response:', res);
    return res;
  } catch (error) {
    console.error('[meetingCheckIn] API Error Status:', error?.response?.status);
    console.error('[meetingCheckIn] API Error Data:', error?.response?.data);
    console.error('[meetingCheckIn] Full Error:', error);
    throw error;
  }
};

export const saveOrUpdateDssr = async (payload) => {
  try {
    const res = await apiMethods.post(`${CUSTOMER_MASTER_BASE_URL}/dssr/saveOrUpdateDssr`, payload);
    return res;
  } catch (error) {
    console.error('Save or Update DSSR API Error:', error);
    throw error;
  }
};

export const getDssrById = async (id) => {
  try {
    const res = await apiMethods.get(`${CUSTOMER_MASTER_BASE_URL}/dssr/getDssr?id=${id}`);
    return res;
  } catch (error) {
    console.error('Get DSSR by ID API Error:', error);
    throw error;
  }
};



