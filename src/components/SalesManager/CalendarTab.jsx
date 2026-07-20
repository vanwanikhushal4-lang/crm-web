import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle,
  FileText,
  Paperclip,
  Phone,
  Mail,
  Clock,
  MapPin,
  Camera,
  Activity,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  X,
  Loader
} from 'lucide-react';

import {
  getAllCustomersByUserId,
  saveCustomer,
  getAllMeetingLogs,
  getTaskLogs,
  getCalls,
  saveMeetingLog,
  schedulePlannedMeeting,
  meetingCheckIn,
  saveOrUpdateTaskLog,
  saveOrUpdateCall,
  getAttachmentForMeetingLog,
  getAttachmentForMeeting,
  uploadMeetingAttachment,
  saveMoMDetailsOfCustomer,
  getAllMomDetails,
  getAllProducts,
  getAllMomDetailsByCurrentUser
} from '../../api/apiFunctions/Login/Login_api_function';

export default function CalendarTab() {
  const [username, setUsername] = useState('User');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All'); // All, Meetings, Tasks, Calls
  const [isLoading, setIsLoading] = useState(false);

  const scrollContainerRef = useRef(null);

  const [selectedDate, setSelectedDate] = useState(new Date());

  const getLocalDatetimeString = (date, hours = 9) => {
    const localDate = new Date(date);
    localDate.setHours(hours, 0, 0, 0);
    const tzoffset = localDate.getTimezoneOffset() * 60000;
    return new Date(localDate - tzoffset).toISOString().slice(0, 16);
  };

  const getLocalDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Scroll active date button into view when selected date changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector('.active-day-btn');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [selectedDate]);

  // Mouse drag-to-scroll handlers for desktop usability
  const handleMouseDown = (e) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.isDragging = true;
    container.startX = e.pageX - container.offsetLeft;
    container.scrollLeftStart = container.scrollLeft;
  };

  const handleMouseMove = (e) => {
    const container = scrollContainerRef.current;
    if (!container || !container.isDragging) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - container.startX) * 1.5;
    container.scrollLeft = container.scrollLeftStart - walk;
  };

  const handleMouseUpOrLeave = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.isDragging = false;
  };

  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [activeMonth, setActiveMonth] = useState(new Date().getMonth()); // 0-indexed

  // Collapsible section states
  const [collapseMeetings, setCollapseMeetings] = useState(false);
  const [collapseTasks, setCollapseTasks] = useState(false);
  const [collapseCalls, setCollapseCalls] = useState(false);

  // Master lists from API
  const [customers, setCustomers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [calls, setCalls] = useState([]);

  // Modals visibility
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showActionOverlay, setShowActionOverlay] = useState(false);

  // Selected item context for actions modal
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  
  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Autocomplete & autocomplete lists
  const [companySearch, setCompanySearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [suggestedCompanies, setSuggestedCompanies] = useState([]);
  const [suggestedContacts, setSuggestedContacts] = useState([]);

  // Form input states
  // Meeting Log
  const [meetingForm, setMeetingForm] = useState({
    companyName: '',
    contactPersonName: '',
    locationName: '',
    startTime: '',
    endTime: '',
    isScheduled: false
  });
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [geoLocation, setGeoLocation] = useState('Location unavailable');
  const [showMomForm, setShowMomForm] = useState(false);

  // Task Log
  const [taskForm, setTaskForm] = useState({
    id: null,
    subject: '',
    dueDate: '',
    status: 'NOT_STARTED',
    priority: 'NORMAL'
  });

  // Call Log
  const [callForm, setCallForm] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    relatedTo: 'LEADS',
    callType: 'OUTGOING',
    callResult: 'NONE',
    subject: '',
    description: '',
    notes: ''
  });
  const [showDialerDirectory, setShowDialerDirectory] = useState(false);
  const [dialerSearch, setDialerSearch] = useState('');

  // Contact Profile autocomplete search state
  const [contactProfileSearch, setContactProfileSearch] = useState('');
  const [showContactProfileDropdown, setShowContactProfileDropdown] = useState(false);

  // New Customer entry form state inside Call outcome modal
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    designation: ''
  });

  // MOM Form state (inside Action Overlay)
  const [momNotes, setMomNotes] = useState('');
  const [productsCatalog, setProductsCatalog] = useState([]);
  const [momForm, setMomForm] = useState({
    productsPitched: [],
    budget: '',
    timeline: '0-3 Months',
    leadType: 'Warm',
    isInterested: true,
    competitorsMentioned: '',
    alreadyPitchedToOrg: false,
    pitchedToWhom: '',
    pitchedByWhom: '',
    currentBlockers: '',
    nextStep: 'Technical Discussion',
    followUpDate: ''
  });
  const [currentUserMoms, setCurrentUserMoms] = useState([]);

  // Fetch logged in salesperson name
  useEffect(() => {
    const userMail = localStorage.getItem('email') || '';
    const userRole = localStorage.getItem('role') || '';
    const userName = localStorage.getItem('username') || userMail.split('@')[0] || 'Salesperson';
    // Format capitalize
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    setUsername(userName.split(' ').map(capitalize).join(' '));
  }, []);

  // Fetch initial master lists from backend API
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Get all customers by current user ID
      const userId = localStorage.getItem('userId') || '2';
      const customerRes = await getAllCustomersByUserId(userId);
      if (customerRes && Array.isArray(customerRes.data)) {
        setCustomers(customerRes.data);
      } else if (Array.isArray(customerRes)) {
        setCustomers(customerRes);
      }

      // Get meetings logs
      const meetingsRes = await getAllMeetingLogs();
      if (meetingsRes && Array.isArray(meetingsRes.data)) {
        setMeetings(meetingsRes.data);
      } else if (Array.isArray(meetingsRes)) {
        setMeetings(meetingsRes);
      }

      // Get tasks list
      const tasksRes = await getTaskLogs();
      if (tasksRes && Array.isArray(tasksRes.data)) {
        setTasks(tasksRes.data);
      } else if (Array.isArray(tasksRes)) {
        setTasks(tasksRes);
      }

      // Get calls list
      const callsRes = await getCalls();
      if (callsRes && Array.isArray(callsRes.data)) {
        setCalls(callsRes.data);
      } else if (Array.isArray(callsRes)) {
        setCalls(callsRes);
      }

      // Get products list
      const productsRes = await getAllProducts().catch(() => []);
      const prodArr = Array.isArray(productsRes?.data) ? productsRes.data : Array.isArray(productsRes) ? productsRes : [];
      setProductsCatalog(prodArr);

      // Get MOMs for current user
      const momsRes = await getAllMomDetailsByCurrentUser().catch(() => []);
      const momsArr = Array.isArray(momsRes?.data) ? momsRes.data : Array.isArray(momsRes) ? momsRes : [];
      setCurrentUserMoms(momsArr);
    } catch (error) {
      console.error('Error fetching calendar API data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync selectedMeeting values to momForm when selectedMeeting changes
  useEffect(() => {
    if (selectedMeeting) {
      const initProducts = selectedMeeting.pitchedProducts 
        ? [selectedMeeting.pitchedProducts] 
        : selectedMeeting.product 
        ? [selectedMeeting.product] 
        : [];
      
      setMomNotes(selectedMeeting.notes || selectedMeeting.momDescription || '');
      
      setMomForm({
        productsPitched: initProducts,
        budget: selectedMeeting.dealValue || selectedMeeting.budget || '',
        timeline: selectedMeeting.timeline || '0-3 Months',
        leadType: selectedMeeting.priority || selectedMeeting.leadType || 'Warm',
        isInterested: selectedMeeting.isInterested !== undefined ? selectedMeeting.isInterested : true,
        competitorsMentioned: selectedMeeting.competitors || '',
        alreadyPitchedToOrg: selectedMeeting.alreadyPitched !== undefined ? selectedMeeting.alreadyPitched : false,
        pitchedToWhom: selectedMeeting.contactPersonName || selectedMeeting.contactPerson || '',
        pitchedByWhom: username || 'Sales Manager',
        currentBlockers: selectedMeeting.blockers || '',
        nextStep: selectedMeeting.nextStep || 'Technical Discussion',
        followUpDate: selectedMeeting.followUpDate ? getLocalDatetimeString(selectedMeeting.followUpDate).slice(0, 10) : ''
      });
    } else {
      setMomNotes('');
      setMomForm({
        productsPitched: [],
        budget: '',
        timeline: '0-3 Months',
        leadType: 'Warm',
        isInterested: true,
        competitorsMentioned: '',
        alreadyPitchedToOrg: false,
        pitchedToWhom: '',
        pitchedByWhom: '',
        currentBlockers: '',
        nextStep: 'Technical Discussion',
        followUpDate: ''
      });
    }
  }, [selectedMeeting, username]);

  // Product selection handler for MOM form
  const handleMOMProductCheck = (label) => {
    const isChecked = momForm.productsPitched.includes(label);
    if (isChecked) {
      setMomForm((prev) => ({
        ...prev,
        productsPitched: prev.productsPitched.filter((p) => p !== label)
      }));
    } else {
      setMomForm((prev) => ({
        ...prev,
        productsPitched: [...prev.productsPitched, label]
      }));
    }
  };

  // Check if MoM is completed for a meeting
  const isMomCompleted = (meeting) => {
    if (!meeting) return false;
    
    // Gather all possible meeting identifiers
    const meetingIds = [
      meeting.meetingId,
      meeting.plannedMeetingId,
      meeting.meetingLogId,
      meeting.logId,
      meeting.id
    ].map(id => String(id || '')).filter(Boolean);

    // 1. Match by meeting identifiers
    if (meetingIds.length > 0) {
      const matchedById = currentUserMoms.some((mom) => {
        const momMeetingIds = [
          mom.meetingId,
          mom.meeting_id,
          mom.plannedMeetingId,
          mom.planned_meeting_id,
          mom.meetingLogId,
          mom.meeting_log_id
        ].map(id => String(id || '')).filter(Boolean);

        // Also check if mom has meetingIds array
        if (Array.isArray(mom.meetingIds)) {
          mom.meetingIds.forEach((id) => {
            if (id) momMeetingIds.push(String(id));
          });
        }

        return momMeetingIds.some(momId => meetingIds.includes(momId));
      });
      
      if (matchedById) return true;
    }

    // 2. Match by customer name / company name (fallback)
    const mCompName = (meeting.companyName || meeting.name || '').toLowerCase().trim();
    if (mCompName) {
      const matchedByName = currentUserMoms.some((mom) => {
        const momCompName = (mom.customerName || mom.companyName || '').toLowerCase().trim();
        return momCompName === mCompName;
      });
      if (matchedByName) return true;
    }

    return false;
  };

  // Fetch attachments when a meeting is selected
  const fetchAttachments = async (meeting) => {
    if (!meeting) return;
    try {
      let attachmentRes;
      if (meeting.meetingLogId || meeting.id) {
        attachmentRes = await getAttachmentForMeetingLog(meeting.meetingLogId || meeting.id);
      } else if (meeting.meetingId) {
        attachmentRes = await getAttachmentForMeeting(meeting.meetingId);
      }

      if (attachmentRes && Array.isArray(attachmentRes.data)) {
        setAttachments(attachmentRes.data);
      } else if (attachmentRes && Array.isArray(attachmentRes)) {
        setAttachments(attachmentRes);
      } else {
        setAttachments([]);
      }
    } catch (err) {
      console.error('Error loading attachments:', err);
      setAttachments([]);
    }
  };

  // Reverse geocoding helper using OpenStreetMap Nominatim
  const getAddressFromCoords = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
    return `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
  };

  // Resolve current GPS address
  const handleResolveLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsResolvingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await getAddressFromCoords(latitude, longitude);
        setMeetingForm((prev) => ({ ...prev, locationName: address }));
        setIsResolvingLocation(false);
      },
      (error) => {
        console.error('GPS error:', error);
        alert('Failed to resolve GPS coordinates: ' + error.message);
        setIsResolvingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Helper to resolve customer company name
  const getCustomerCompanyName = (c) => {
    if (!c) return '';
    if (typeof c.companyName === 'string' && c.companyName.trim()) {
      return c.companyName.trim();
    }
    if (c.company && typeof c.company === 'object' && typeof c.company.companyName === 'string') {
      return c.company.companyName.trim();
    }
    if (typeof c.company === 'string' && c.company.trim() && isNaN(c.company)) {
      return c.company.trim();
    }
    if (typeof c.company_name === 'string' && c.company_name.trim()) {
      return c.company_name.trim();
    }
    return '';
  };

  // Helper to resolve customer contact display name
  const getCustomerDisplayName = (c) => {
    if (!c) return '';
    
    // 1. Check first and last name
    const first = typeof c.firstName === 'string' ? c.firstName.trim() : typeof c.first_name === 'string' ? c.first_name.trim() : '';
    const last = typeof c.lastName === 'string' ? c.lastName.trim() : typeof c.last_name === 'string' ? c.last_name.trim() : '';
    const full = `${first} ${last}`.trim();
    if (full) return full;

    // 2. Check explicit contact person / customer / name fields
    const names = [
      c.contactPersonName,
      c.contactPerson,
      c.contact_person_name,
      c.contact_person,
      c.customerName,
      c.customer_name,
      c.name
    ];
    for (const n of names) {
      if (typeof n === 'string' && n.trim()) {
        return n.trim();
      }
    }

    // 3. Fallback to company name if available
    const comp = getCustomerCompanyName(c);
    if (comp) return comp;

    // 4. Final fallback to ID
    return `Customer #${c.id || c.customerId || 'Entry'}`;
  };

  // Helper to resolve call customer display name
  const getCallCustomerName = (call) => {
    if (!call) return 'N/A';
    if (call.customerName) return call.customerName;
    if (typeof call.customer === 'string' && call.customer.trim()) return call.customer.trim();
    if (call.customer && typeof call.customer === 'object') {
      const name = getCustomerDisplayName(call.customer);
      if (name) return name;
    }
    if (call.customerId && customers && customers.length > 0) {
      const found = customers.find((c) => String(c.id) === String(call.customerId));
      if (found) return getCustomerDisplayName(found);
    }
    if (call.companyName) return call.companyName;
    return 'N/A';
  };

  // Helper to resolve call category
  const getCallCategory = (call) => {
    if (!call) return 'LEADS';
    const cat = call.relatedTo || call.category || call.related_to || 'LEADS';
    return String(cat).toUpperCase();
  };

  // Form autocomplete handlers
  const handleCompanyChange = (val) => {
    setCompanySearch(val);
    setMeetingForm((prev) => ({ ...prev, companyName: val }));
    if (val.trim().length > 1) {
      // Find matches in customer database
      const matches = customers.filter(
        (c) =>
          (c.companyName && c.companyName.toLowerCase().includes(val.toLowerCase())) ||
          (c.name && c.name.toLowerCase().includes(val.toLowerCase()))
      );
      setSuggestedCompanies(matches);
    } else {
      setSuggestedCompanies([]);
    }
  };

  const handleContactChange = (val) => {
    setContactSearch(val);
    setMeetingForm((prev) => ({ ...prev, contactPersonName: val }));
    if (val.trim().length > 1) {
      const matches = customers.filter(
        (c) => c.contactPerson && c.contactPerson.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestedContacts(matches);
    } else {
      setSuggestedContacts([]);
    }
  };

  const selectCompany = (cust) => {
    setMeetingForm((prev) => ({
      ...prev,
      companyName: cust.companyName || cust.name || '',
      contactPersonName: cust.contactPerson || cust.name || ''
    }));
    setCompanySearch(cust.companyName || cust.name || '');
    setContactSearch(cust.contactPerson || cust.name || '');
    setSuggestedCompanies([]);
  };

  const selectContact = (cust) => {
    setMeetingForm((prev) => ({
      ...prev,
      contactPersonName: cust.contactPerson || cust.name || '',
      companyName: cust.companyName || prev.companyName || ''
    }));
    setContactSearch(cust.contactPerson || cust.name || '');
    setSuggestedContacts([]);
  };

  // Action submit handlers
  const handleSaveMeeting = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        companyName: meetingForm.companyName,
        contactPersonName: meetingForm.contactPersonName,
        locationName: meetingForm.locationName || 'Mumbai Office',
        startTime: meetingForm.startTime ? new Date(meetingForm.startTime).toISOString() : new Date().toISOString(),
        endTime: meetingForm.endTime ? new Date(meetingForm.endTime).toISOString() : new Date(Date.now() + 3600000).toISOString()
      };

      if (meetingForm.isScheduled) {
        const schedulePayload = {
          meetingTitle: `Meeting with ${payload.contactPersonName}`,
          companyName: payload.companyName,
          contactPersonName: payload.contactPersonName,
          locationName: payload.locationName,
          scheduledDate: payload.startTime
        };
        await schedulePlannedMeeting(schedulePayload);
      } else {
        await saveMeetingLog(payload);
      }

      alert('Meeting saved successfully!');
      setShowMeetingModal(false);
      // Reset form
      setMeetingForm({ companyName: '', contactPersonName: '', locationName: '', startTime: '', endTime: '', isScheduled: false });
      setCompanySearch('');
      setContactSearch('');
      fetchData();
    } catch (error) {
      alert('Error saving meeting: ' + (error?.response?.data?.message || error.message));
    }
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        subject: taskForm.subject,
        dueDate: taskForm.dueDate || new Date().toISOString().split('T')[0],
        status: taskForm.status,
        priority: taskForm.priority
      };
      if (taskForm.id) {
        payload.id = taskForm.id;
        payload.taskLogId = taskForm.id;
      }
      await saveOrUpdateTaskLog(payload);
      alert(taskForm.id ? 'Task log updated successfully!' : 'Task log saved successfully!');
      setShowTaskModal(false);
      setTaskForm({ id: null, subject: '', dueDate: '', status: 'NOT_STARTED', priority: 'NORMAL' });
      fetchData();
    } catch (error) {
      alert('Error saving task: ' + (error?.response?.data?.message || error.message));
    }
  };

  const handleSaveCall = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        customerId: callForm.customerId ? Number(callForm.customerId) : null,
        relatedTo: callForm.relatedTo,
        callType: callForm.callType,
        callResult: callForm.callResult,
        subject: callForm.subject || `Call to ${callForm.customerName || 'client'}`,
        description: callForm.description,
        notes: callForm.notes
      };
      await saveOrUpdateCall(payload);
      alert('Call log saved successfully!');
      setShowCallModal(false);
      setCallForm({ customerId: '', customerName: '', customerPhone: '', relatedTo: 'LEADS', callType: 'OUTGOING', callResult: 'NONE', subject: '', description: '', notes: '' });
      fetchData();
    } catch (error) {
      alert('Error logging call: ' + (error?.response?.data?.message || error.message));
    }
  };

  const handleCreateCustomerInModal = async () => {
    if (!newCustomerForm.name.trim()) {
      alert('Please enter a customer contact name.');
      return;
    }
    setIsSavingCustomer(true);
    try {
      const userId = localStorage.getItem('userId') || '2';
      const nameTrimmed = newCustomerForm.name.trim();
      const nameParts = nameTrimmed.split(' ');
      const firstName = nameParts[0] || nameTrimmed;
      const lastName = nameParts.slice(1).join(' ') || '';

      const payload = {
        firstName: firstName,
        lastName: lastName,
        name: nameTrimmed,
        contactPersonName: nameTrimmed,
        contactPerson: nameTrimmed,
        customerName: nameTrimmed,
        companyName: newCustomerForm.companyName.trim() || nameTrimmed,
        phone: newCustomerForm.phone.trim(),
        phoneNo: newCustomerForm.phone.trim(),
        mobileNo: newCustomerForm.phone.trim(),
        email: newCustomerForm.email.trim(),
        designation: newCustomerForm.designation.trim(),
        userId: Number(userId)
      };
      const res = await saveCustomer(payload);
      alert('Customer saved successfully!');
      
      // Refresh customer list from API using getAllCustomersByUserId
      const freshListRes = await getAllCustomersByUserId(userId);
      const freshList = Array.isArray(freshListRes?.data) ? freshListRes.data : Array.isArray(freshListRes) ? freshListRes : [];
      setCustomers(freshList);

      const createdId = res?.data?.id || res?.id || (freshList.length > 0 ? freshList[0].id : '');
      setCallForm((prev) => ({
        ...prev,
        customerId: String(createdId || ''),
        customerName: payload.name,
        customerPhone: payload.phone,
        subject: `Call with ${payload.name}`
      }));

      setNewCustomerForm({ name: '', companyName: '', phone: '', email: '', designation: '' });
      setShowNewCustomerForm(false);
    } catch (err) {
      alert('Error saving customer: ' + (err?.response?.data?.message || err.message));
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Geolocation Check-in Action
  const handleCheckIn = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const payload = {
            meetingId: selectedMeeting?.meetingId || selectedMeeting?.id || null,
            meetingLogId: selectedMeeting?.meetingLogId || selectedMeeting?.id || null,
            latitude: latitude,
            longitude: longitude
          };
          await meetingCheckIn(payload);
          setGeoLocation(`${latitude}, ${longitude}`);
          alert('Checked into meeting successfully!');
        } catch (error) {
          alert('Check-in failed: ' + (error?.response?.data?.message || error.message));
        }
      },
      (error) => {
        alert('Failed to get geolocation for check-in: ' + error.message);
      }
    );
  };

  // Upload meeting attachment
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const meetingId = selectedMeeting?.meetingId || '';
      const meetingLogId = selectedMeeting?.meetingLogId || selectedMeeting?.id || '';
      await uploadMeetingAttachment({ file, meetingId, meetingLogId });
      alert('Attachment uploaded successfully!');
      fetchAttachments(selectedMeeting);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const getStageNumber = (stageVal) => {
    if (!stageVal) return 1;
    if (typeof stageVal === 'number') return stageVal;
    const clean = String(stageVal).toUpperCase().replace(/[\s-]+/g, '_');
    const mapping = {
      NEW_LEAD: 1,
      INITIAL_CONTACT: 1,
      CONTACTED: 2,
      TECH_DISCUSSION: 2,
      QUALIFIED: 3,
      DEMO: 3,
      PROPOSAL_SENT: 4,
      PROPOSAL: 4,
      NEGOTIATION: 5,
      WON: 6,
      LOST: 7
    };
    return mapping[clean] || 1;
  };

  // Submit MOM form details
  const handleMOMSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        account_id: String(selectedMeeting?.customerId || ''),
        salesman_id: String(localStorage.getItem('userId') || selectedMeeting?.createdBy || '2'),
        engagement_type: selectedMeeting?.meetingId ? 'Planned' : 'Ad-hoc',
        stage: getStageNumber(selectedMeeting?.stage),
        geoLocation: geoLocation || 'Location unavailable',
        
        // Root fields for compatibility/logging
        companyName: selectedMeeting?.companyName || selectedMeeting?.name || '',
        contactPersonName: selectedMeeting?.contactPersonName || selectedMeeting?.contactPerson || '',
        momDescription: momNotes,
        
        pitch_details: {
          products_pitched: momForm.productsPitched,
          budget: momForm.budget || 'TBD',
          timeline: momForm.timeline || '0-3 Months',
          lead_type: momForm.leadType || 'Warm',
          is_interested: momForm.isInterested
        },
        
        competition_and_history: {
          competitors_mentioned: momForm.competitorsMentioned || 'None',
          already_pitched_to_org: momForm.alreadyPitchedToOrg,
          pitched_to_whom: momForm.pitchedToWhom || 'Unassigned',
          pitched_by_whom: momForm.pitchedByWhom || username || 'Sales Manager',
          current_blockers: momForm.currentBlockers || 'None'
        },
        
        outcome: {
          next_step: momForm.nextStep || 'Technical Discussion',
          follow_up_date: momForm.followUpDate ? new Date(momForm.followUpDate).toISOString() : null,
          notes: momNotes
        }
      };

      if (selectedMeeting?.meetingId) {
        payload.meetingId = String(selectedMeeting.meetingId);
        payload.meeting_id = String(selectedMeeting.meetingId);
        payload.plannedMeetingId = String(selectedMeeting.meetingId);
      }
      const mLogId = selectedMeeting?.meetingLogId || selectedMeeting?.logId || selectedMeeting?.id;
      if (mLogId) {
        payload.meetingLogId = String(mLogId);
        payload.meeting_log_id = String(mLogId);
      }

      await saveMoMDetailsOfCustomer(payload);
      alert('MOM Details submitted successfully!');
      setMomNotes('');
      setGeoLocation('Location unavailable');
      setShowMomForm(false);
      setShowActionOverlay(false);
      fetchData(); // Refresh data to display the update
    } catch (error) {
      alert('MOM Submission failed: ' + (error?.response?.data?.message || error.message));
    }
  };

  // Direct Phone Dialing helper
  const handlePlaceCall = (contact) => {
    if (contact.phone) {
      window.location.href = `tel:${contact.phone}`;
      // Autofill call logging form
      setCallForm((prev) => ({
        ...prev,
        customerId: contact.id || '',
        customerName: contact.name || contact.contactPerson || '',
        customerPhone: contact.phone,
        subject: `Call with ${contact.name || contact.contactPerson || ''}`
      }));
      setShowDialerDirectory(false);
      setShowCallModal(true);
    } else {
      alert('This contact does not have a phone number registered.');
    }
  };

  // Generate day strip centered on current month date list
  const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const daysInMonthList = getDaysInMonth(activeYear, activeMonth);

  // Month navigation
  const prevMonth = () => {
    if (activeMonth === 0) {
      setActiveMonth(11);
      setActiveYear(activeYear - 1);
    } else {
      setActiveMonth(activeMonth - 1);
    }
  };

  const nextMonth = () => {
    if (activeMonth === 11) {
      setActiveMonth(0);
      setActiveYear(activeYear + 1);
    } else {
      setActiveMonth(activeMonth + 1);
    }
  };

  const jumpToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setActiveMonth(today.getMonth());
    setActiveYear(today.getFullYear());
  };

  // Shift selection day-by-day
  const shiftDay = (direction) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + direction);
    setSelectedDate(nextDate);
    setActiveMonth(nextDate.getMonth());
    setActiveYear(nextDate.getFullYear());
  };

  const getMonthName = (monthIdx) => {
    return [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ][monthIdx];
  };

  // Filter items matching search and selected date
  const isSameDay = (d1, d2) => {
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  // Filtered lists for rendering
  const getDailyMeetings = () => {
    return meetings.filter((m) => {
      const matchSearch =
        searchQuery === '' ||
        (m.companyName && m.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.contactPersonName && m.contactPersonName.toLowerCase().includes(searchQuery.toLowerCase()));

      const dateObj = m.startTime ? new Date(m.startTime) : null;
      return dateObj && isSameDay(dateObj, selectedDate) && matchSearch;
    });
  };

  const getDailyTasks = () => {
    return tasks.filter((t) => {
      const matchSearch =
        searchQuery === '' ||
        (t.subject && t.subject.toLowerCase().includes(searchQuery.toLowerCase()));

      const dateObj = t.dueDate ? new Date(t.dueDate) : null;
      return dateObj && isSameDay(dateObj, selectedDate) && matchSearch;
    });
  };

  const getDailyCalls = () => {
    return calls.filter((c) => {
      const matchSearch =
        searchQuery === '' ||
        (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.subject && c.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.callResult && c.callResult.toLowerCase().includes(searchQuery.toLowerCase()));

      // Note: check date comparison fields in call endpoint logs.
      const dateObj = c.createdAt ? new Date(c.createdAt) : c.dueDate ? new Date(c.dueDate) : new Date();
      return isSameDay(dateObj, selectedDate) && matchSearch;
    });
  };

  // Counter badge helper for day strip
  const getDayActivitiesCount = (dateVal) => {
    const mCount = meetings.filter((m) => {
      const d = m.startTime ? new Date(m.startTime) : null;
      return d && isSameDay(d, dateVal);
    }).length;

    const tCount = tasks.filter((t) => {
      const d = t.dueDate ? new Date(t.dueDate) : null;
      return d && isSameDay(d, dateVal);
    }).length;

    const cCount = calls.filter((c) => {
      const d = c.createdAt ? new Date(c.createdAt) : c.dueDate ? new Date(c.dueDate) : new Date();
      return isSameDay(d, dateVal);
    }).length;

    return mCount + tCount + cCount;
  };

  const displayMeetings = getDailyMeetings();
  const displayTasks = getDailyTasks();
  const displayCalls = getDailyCalls();

  return (
    <div className="space-y-6 text-slate-100 relative z-20 animate-fade">
      
      {/* HEADER & DYNAMIC USER CONTEXT */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0b1628]/60 backdrop-blur-md border border-white/5 p-5 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            {username}'s Calendar
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage planned visits, tasks, and follow-ups</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search meetings, tasks, results..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-900/60 border border-white/5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Refresh Action */}
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-900/60 border border-white/5 hover:border-blue-500/20 text-slate-400 hover:text-white transition-all shadow"
            title="Refresh logs"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* MONTH NAVIGATOR & DATE NAVIGATION STRIP */}
      <div className="bg-[#0b1628]/60 border border-white/5 rounded-2xl p-5 shadow-lg space-y-4">
        
        {/* Month Selector */}
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-white transition">
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <button
              onClick={jumpToToday}
              className="px-4 py-1 rounded-xl text-sm font-bold text-slate-200 hover:bg-slate-800 transition uppercase tracking-wider"
              title="Jump to today"
            >
              {getMonthName(activeMonth)} {activeYear}
            </button>

            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-white transition">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={jumpToToday}
            className="px-3 py-1 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 hover:border-blue-500 rounded-lg text-xs font-bold transition uppercase tracking-widest"
          >
            Today
          </button>
        </div>

        {/* Day Selector Strip */}
        <div className="flex items-center gap-2">
          {/* Previous Day arrow */}
          <button
            onClick={() => shiftDay(-1)}
            className="p-2 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Horizontal scroll week strip */}
          <div
            ref={scrollContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className="flex-1 flex overflow-x-auto gap-2 py-2 hide-scrollbar scroll-smooth cursor-grab active:cursor-grabbing select-none"
          >
            {daysInMonthList.map((day, idx) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const count = getDayActivitiesCount(day);
              
              const dayStr = day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
              const dateNum = day.getDate();

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`flex-1 min-w-[56px] py-2 flex flex-col items-center justify-center rounded-xl transition-all duration-300 relative border ${
                    isSelected
                      ? 'active-day-btn bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/15'
                      : isToday
                      ? 'bg-slate-900/80 border-slate-700 text-slate-100'
                      : 'bg-slate-900/40 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="text-[9px] font-bold tracking-widest">{dayStr}</span>
                  <span className="text-sm font-bold font-mono mt-0.5">{dateNum}</span>
                  
                  {/* Activity Badge Count */}
                  {count > 0 && (
                    <span className={`absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      isSelected ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Next Day arrow */}
          <button
            onClick={() => shiftDay(1)}
            className="p-2 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

      </div>

      {/* FILTER PILLS */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        {['All', 'Meetings', 'Tasks', 'Calls'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 ${
              filterType === type
                ? 'bg-blue-600 text-white shadow shadow-blue-500/20'
                : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* DAILY AGENDA WRAPPER LISTS */}
      <div className="space-y-4">
        
        {/* SECTION 1: MEETINGS */}
        {(filterType === 'All' || filterType === 'Meetings') && (
          <div className="bg-[#0b1628]/40 border border-white/5 rounded-2xl overflow-hidden shadow">
            
            {/* Header section */}
            <div className="w-full flex justify-between items-center px-5 py-4 bg-slate-900/30 border-b border-white/5">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
                  Meetings
                </h3>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-bold">
                  {displayMeetings.length}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setMeetingForm((prev) => ({
                      ...prev,
                      startTime: getLocalDatetimeString(selectedDate, 9),
                      endTime: getLocalDatetimeString(selectedDate, 10)
                    }));
                    setShowMeetingModal(true);
                  }}
                  className="px-2.5 py-1 bg-blue-600/10 hover:bg-blue-600 border border-blue-500/20 hover:border-blue-500 text-blue-400 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 animate-fade shadow"
                  title="Log Meeting"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Log Meeting</span>
                </button>
                <button
                  onClick={() => setCollapseMeetings(!collapseMeetings)}
                  className="p-1 text-slate-400 hover:text-white transition"
                >
                  {collapseMeetings ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4 animate-fade" />}
                </button>
              </div>
            </div>

            {/* Table block for Meetings */}
            {!collapseMeetings && (
              <div className="overflow-x-auto">
                {displayMeetings.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-slate-900/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-5">Company / Contact</th>
                        <th className="py-3.5 px-4">Time</th>
                        <th className="py-3.5 px-4">Location</th>
                        <th className="py-3.5 px-4">MoM Status</th>
                        <th className="py-3.5 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {displayMeetings.map((meeting) => {
                        const momDone = isMomCompleted(meeting);
                        return (
                          <tr
                            key={meeting.id || meeting.meetingLogId}
                            onClick={() => {
                              setSelectedMeeting(meeting);
                              fetchAttachments(meeting);
                              setShowActionOverlay(true);
                            }}
                            className="hover:bg-slate-900/60 transition cursor-pointer group"
                          >
                            {/* Company & Contact */}
                            <td className="py-3.5 px-5">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-100 text-sm group-hover:text-blue-400 transition">
                                  {meeting.companyName || meeting.name || 'Client Visit'}
                                </span>
                                {meeting.contactPersonName && (
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    👤 {meeting.contactPersonName}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Time */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-300">
                                <Clock className="h-3.5 w-3.5 text-blue-400" />
                                {meeting.startTime ? new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Flexible'}
                              </span>
                            </td>

                            {/* Location */}
                            <td className="py-3.5 px-4">
                              {meeting.locationName ? (
                                <span className="inline-flex items-center gap-1 text-slate-300 truncate max-w-xs">
                                  <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                  <span className="truncate">{meeting.locationName}</span>
                                </span>
                              ) : (
                                <span className="text-slate-500 font-mono text-[11px]">N/A</span>
                              )}
                            </td>

                            {/* Status Badge */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {momDone ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                  <CheckCircle className="h-3 w-3" />
                                  Completed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                                  <Clock className="h-3 w-3" />
                                  Pending MOM
                                </span>
                              )}
                            </td>

                            {/* Action */}
                            <td className="py-3.5 px-5 text-right whitespace-nowrap">
                              {momDone ? (
                                <span className="text-xs text-emerald-400 font-semibold inline-flex items-center gap-1">
                                  MOM Submitted ✓
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMeeting(meeting);
                                    fetchAttachments(meeting);
                                    setShowActionOverlay(true);
                                  }}
                                  className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 border border-blue-500/20 hover:border-blue-500 text-blue-400 hover:text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                                >
                                  <span>Log MOM / Check In</span>
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 border-t border-white/5 flex flex-col items-center justify-center gap-3 text-center bg-slate-950/20">
                    <p className="text-xs text-slate-500 font-medium">No meetings scheduled for this day</p>
                    <button
                      onClick={() => {
                        setMeetingForm((prev) => ({
                          ...prev,
                          startTime: getLocalDatetimeString(selectedDate, 9),
                          endTime: getLocalDatetimeString(selectedDate, 10)
                        }));
                        setShowMeetingModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600 border border-blue-500/20 hover:border-blue-500 text-blue-400 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Log Meeting
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: TASKS */}
        {(filterType === 'All' || filterType === 'Tasks') && (
          <div className="bg-[#0b1628]/40 border border-white/5 rounded-2xl overflow-hidden shadow">
            
            <div className="w-full flex justify-between items-center px-5 py-4 bg-slate-900/30 border-b border-white/5">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
                  Tasks
                </h3>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-bold">
                  {displayTasks.length}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setTaskForm({
                      id: null,
                      subject: '',
                      dueDate: getLocalDateString(selectedDate),
                      status: 'NOT_STARTED',
                      priority: 'NORMAL'
                    });
                    setShowTaskModal(true);
                  }}
                  className="px-2.5 py-1 bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 animate-fade shadow"
                  title="Create Task"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Task</span>
                </button>
                <button
                  onClick={() => setCollapseTasks(!collapseTasks)}
                  className="p-1 text-slate-400 hover:text-white transition"
                >
                  {collapseTasks ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4 animate-fade" />}
                </button>
              </div>
            </div>

            {/* Table block for Tasks */}
            {!collapseTasks && (
              <div className="overflow-x-auto">
                {displayTasks.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-slate-900/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-5">Task Subject</th>
                        <th className="py-3.5 px-4">Due Date</th>
                        <th className="py-3.5 px-4">Priority</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {displayTasks.map((task) => (
                        <tr
                          key={task.id || task.taskLogId}
                          onClick={() => {
                            setTaskForm({
                              id: task.id || task.taskLogId,
                              subject: task.subject || '',
                              dueDate: task.dueDate || getLocalDateString(selectedDate),
                              status: task.status || 'NOT_STARTED',
                              priority: task.priority || 'NORMAL'
                            });
                            setShowTaskModal(true);
                          }}
                          className="hover:bg-slate-900/60 transition cursor-pointer group"
                        >
                          {/* Subject */}
                          <td className="py-3.5 px-5 font-bold text-slate-100 text-sm group-hover:text-emerald-400 transition">
                            {task.subject}
                          </td>

                          {/* Due Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-300 font-mono text-xs">
                            📅 {task.dueDate || 'No Date'}
                          </td>

                          {/* Priority Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                              task.priority === 'HIGH' || task.priority === 'HIGHEST'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : task.priority === 'NORMAL'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-slate-800 text-slate-400 border-white/5'
                            }`}>
                              {task.priority || 'NORMAL'}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                              task.status === 'COMPLETED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : task.status === 'IN_PROGRESS'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-slate-800 text-slate-400 border-white/5'
                            }`}>
                              {(task.status || 'PENDING').replace(/_/g, ' ')}
                            </span>
                          </td>

                          {/* Action Button */}
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaskForm({
                                  id: task.id || task.taskLogId,
                                  subject: task.subject || '',
                                  dueDate: task.dueDate || getLocalDateString(selectedDate),
                                  status: task.status || 'NOT_STARTED',
                                  priority: task.priority || 'NORMAL'
                                });
                                setShowTaskModal(true);
                              }}
                              className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                            >
                              <span>Edit Task</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 border-t border-white/5 flex flex-col items-center justify-center gap-3 text-center bg-slate-950/20">
                    <p className="text-xs text-slate-500 font-medium">No tasks logged for this day</p>
                    <button
                      onClick={() => {
                        setTaskForm((prev) => ({
                          ...prev,
                          dueDate: getLocalDateString(selectedDate)
                        }));
                        setShowTaskModal(true);
                      }}
                      className="px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create Task
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: CALLS */}
        {(filterType === 'All' || filterType === 'Calls') && (
          <div className="bg-[#0b1628]/40 border border-white/5 rounded-2xl overflow-hidden shadow">
            
            {/* Header section */}
            <div className="w-full flex justify-between items-center px-5 py-4 bg-slate-900/30 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
                  Calls
                </h3>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-bold">
                  {displayCalls.length}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCallModal(true)}
                  className="px-2.5 py-1 bg-purple-600/10 hover:bg-purple-600 border border-purple-500/20 hover:border-purple-500 text-purple-400 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 animate-fade shadow"
                  title="Log Call"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Log Call</span>
                </button>
                <button
                  onClick={() => setCollapseCalls(!collapseCalls)}
                  className="p-1 text-slate-400 hover:text-white transition"
                >
                  {collapseCalls ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4 animate-fade" />}
                </button>
              </div>
            </div>

            {/* Table block for Calls */}
            {!collapseCalls && (
              <div className="overflow-x-auto">
                {displayCalls.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-slate-900/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-5">Call Subject / Notes</th>
                        <th className="py-3.5 px-4">Customer</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Call Type</th>
                        <th className="py-3.5 px-5 text-right">Result Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {displayCalls.map((call) => (
                        <tr
                          key={call.id || call.callId}
                          className="hover:bg-slate-900/60 transition group"
                        >
                          {/* Subject & Notes */}
                          <td className="py-3.5 px-5">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-100 text-sm group-hover:text-purple-400 transition">
                                {call.subject || 'Call Outcome Log'}
                              </span>
                              {call.notes && (
                                <span className="text-[11px] text-slate-400 italic">
                                  {call.notes}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium">
                              <span className="text-blue-400 font-bold">👤</span>
                              <span>{getCallCustomerName(call)}</span>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/5 tracking-wider">
                              {getCallCategory(call)}
                            </span>
                          </td>

                          {/* Call Type */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                              call.callType === 'INCOMING'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : call.callType === 'OUTGOING'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              {call.callType || 'OUTGOING'}
                            </span>
                          </td>

                          {/* Result Outcome */}
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-white/5">
                              Result: {(call.callResult || 'NONE').replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 border-t border-white/5 flex flex-col items-center justify-center gap-3 text-center bg-slate-950/20">
                    <p className="text-xs text-slate-500 font-medium">No calls logged for this day</p>
                    <button
                      onClick={() => setShowCallModal(true)}
                      className="px-4 py-2 bg-purple-600/10 hover:bg-purple-600 border border-purple-500/20 hover:border-purple-500 text-purple-400 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Log Call
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL 1: LOG MEETING */}
      {showMeetingModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMeetingModal(false);
              setCompanySearch('');
              setContactSearch('');
              setSuggestedCompanies([]);
              setSuggestedContacts([]);
            }
          }}
          className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl animate-fade relative max-h-[90vh] overflow-y-auto hide-scrollbar cursor-default"
          >
            
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-slate-100">Log Customer Meeting</h3>
              <button
                onClick={() => {
                  setShowMeetingModal(false);
                  setCompanySearch('');
                  setContactSearch('');
                  setSuggestedCompanies([]);
                  setSuggestedContacts([]);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMeeting} className="space-y-4">
              
              {/* Autocomplete Company Name */}
              <div className="relative">
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Company Name</label>
                <input
                  type="text"
                  placeholder="Type to search company..."
                  value={companySearch}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  required
                />
                
                {suggestedCompanies.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-slate-900 border border-white/10 rounded-lg max-h-40 overflow-y-auto shadow-2xl divide-y divide-white/5">
                    {suggestedCompanies.map((c) => (
                      <li
                        key={c.id}
                        onClick={() => selectCompany(c)}
                        className="px-4 py-2.5 hover:bg-slate-800 text-xs cursor-pointer text-slate-300 hover:text-white"
                      >
                        {c.companyName || c.name} {c.contactPerson ? `(${c.contactPerson})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Autocomplete Contact Person */}
              <div className="relative">
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Contact Person Name</label>
                <input
                  type="text"
                  placeholder="Type to search contact..."
                  value={contactSearch}
                  onChange={(e) => handleContactChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  required
                />

                {suggestedContacts.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-slate-900 border border-white/10 rounded-lg max-h-40 overflow-y-auto shadow-2xl divide-y divide-white/5">
                    {suggestedContacts.map((c) => (
                      <li
                        key={c.id}
                        onClick={() => selectContact(c)}
                        className="px-4 py-2.5 hover:bg-slate-800 text-xs cursor-pointer text-slate-300 hover:text-white"
                      >
                        {c.contactPerson} {c.companyName ? `(${c.companyName})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Geolocation Resolver Location */}
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Location Address</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Auto-fills from coordinates"
                    value={meetingForm.locationName}
                    onChange={(e) => setMeetingForm({ ...meetingForm, locationName: e.target.value })}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleResolveLocation}
                    disabled={isResolvingLocation}
                    className="px-3 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 hover:border-blue-500 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                  >
                    {isResolvingLocation ? <Loader className="h-4 w-4 animate-spin text-blue-400" /> : <MapPin className="h-4 w-4" />}
                    GPS
                  </button>
                </div>
              </div>

              {/* Date times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Start Time</label>
                  <input
                    type="datetime-local"
                    value={meetingForm.startTime}
                    onChange={(e) => setMeetingForm({ ...meetingForm, startTime: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-150 cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">End Time</label>
                  <input
                    type="datetime-local"
                    value={meetingForm.endTime}
                    onChange={(e) => setMeetingForm({ ...meetingForm, endTime: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-150 cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                    required
                  />
                </div>
              </div>

              {/* Dual scheduling toggle */}
              <div className="flex items-center gap-3 bg-slate-900/40 p-4 rounded-xl border border-white/5">
                <input
                  type="checkbox"
                  id="schedToggle"
                  checked={meetingForm.isScheduled}
                  onChange={(e) => setMeetingForm({ ...meetingForm, isScheduled: e.target.checked })}
                  className="rounded bg-slate-950 border-white/10 h-4 w-4 text-blue-600 focus:ring-0"
                />
                <label htmlFor="schedToggle" className="text-xs text-slate-300 cursor-pointer select-none">
                  <span className="font-bold block">Reserve Itinerary Slot</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Checking this schedules the meeting log into planned visits calendar.</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
              >
                SAVE MEETING LOG
              </button>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG TASK */}
      {showTaskModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTaskModal(false);
            }
          }}
          className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-fade cursor-default"
          >
            
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-slate-100">{taskForm.id ? 'Edit Task Log' : 'Create Task Log'}</h3>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Follow-up proposal delivery"
                  value={taskForm.subject}
                  onChange={(e) => setTaskForm({ ...taskForm, subject: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Due Date</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                  required
                />
              </div>

              {/* Status pills selector */}
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-2 block">Status</label>
                <div className="flex flex-wrap gap-2">
                  {['NOT_STARTED', 'IN_PROGRESS', 'WAITING_FOR_INPUT', 'DEFERRED', 'COMPLETED'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTaskForm({ ...taskForm, status: st })}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider transition ${
                        taskForm.status === st
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority selector */}
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-2 block">Priority</label>
                <div className="flex flex-wrap gap-2">
                  {['LOWEST', 'LOW', 'NORMAL', 'HIGH', 'HIGHEST'].map((pr) => (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => setTaskForm({ ...taskForm, priority: pr })}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider transition ${
                        taskForm.priority === pr
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {pr}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
              >
                {taskForm.id ? 'UPDATE TASK LOG' : 'SAVE TASK LOG'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DIALER DIRECTORY (Direct Phone placement select) */}
      {showDialerDirectory && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDialerDirectory(false);
            }
          }}
          className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-fade cursor-default"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <Phone className="h-4 text-purple-400" />
                Contact Directory Dialer
              </h3>
              <button onClick={() => setShowDialerDirectory(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search contact or phone..."
                value={dialerSearch}
                onChange={(e) => setDialerSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm text-slate-100 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-white/5 pr-1 hide-scrollbar">
              {customers
                .filter((cust) => {
                  const query = dialerSearch.toLowerCase();
                  return (
                    (cust.contactPerson && cust.contactPerson.toLowerCase().includes(query)) ||
                    (cust.companyName && cust.companyName.toLowerCase().includes(query)) ||
                    (cust.phone && cust.phone.includes(query)) ||
                    (cust.name && cust.name.toLowerCase().includes(query))
                  );
                })
                .map((cust) => (
                  <div
                    key={cust.id}
                    onClick={() => handlePlaceCall(cust)}
                    className="py-3 flex justify-between items-center cursor-pointer hover:bg-slate-900/40 px-2 rounded transition"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{cust.contactPerson || cust.name}</h4>
                      <p className="text-[10px] text-slate-500">{cust.companyName || 'Individual'}</p>
                    </div>
                    <span className="text-[11px] font-mono text-purple-400 flex items-center gap-1 bg-purple-500/10 px-2.5 py-1 rounded-xl border border-purple-500/15">
                      <Phone className="h-3 w-3" />
                      {cust.phone || 'No phone'}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: LOG CALL RESULTS */}
      {showCallModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCallModal(false);
            }
          }}
          className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-fade relative max-h-[90vh] overflow-y-auto hide-scrollbar cursor-default"
          >
            
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <Phone className="h-4 text-purple-400" />
                Log Call Outcome
              </h3>
              <button onClick={() => setShowCallModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCall} className="space-y-4">
              
              {/* Customer Select dropdown / Add Customer block */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-slate-400 font-semibold block">Contact Profile</label>
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="h-3 w-3" />
                    {showNewCustomerForm ? 'Cancel New Customer' : 'Add New Customer'}
                  </button>
                </div>

                {!showNewCustomerForm ? (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type customer name or company to search..."
                      value={contactProfileSearch}
                      onFocus={() => setShowContactProfileDropdown(true)}
                      onChange={(e) => {
                        setContactProfileSearch(e.target.value);
                        setShowContactProfileDropdown(true);
                        setCallForm(prev => ({ ...prev, customerId: '', customerName: e.target.value }));
                      }}
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100 placeholder-slate-500"
                      required
                    />

                    {showContactProfileDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto hide-scrollbar text-left">
                        {/* Trigger to create new entry */}
                        <div
                          onClick={() => {
                            setShowContactProfileDropdown(false);
                            setNewCustomerForm(prev => ({
                              ...prev,
                              name: contactProfileSearch && !contactProfileSearch.startsWith('Customer #') ? contactProfileSearch : '',
                              companyName: ''
                            }));
                            setShowNewCustomerForm(true);
                          }}
                          className="p-3 hover:bg-blue-600/20 text-blue-400 text-xs font-semibold cursor-pointer border-b border-white/5 flex items-center gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5 shrink-0" />
                          <span>Add New Customer Entry: "{contactProfileSearch || 'New Customer'}"</span>
                        </div>

                        {/* Filtered customer entries */}
                        {customers
                          .filter((c) => {
                            if (!contactProfileSearch.trim()) return true;
                            const q = contactProfileSearch.toLowerCase();
                            const name = getCustomerDisplayName(c).toLowerCase();
                            const comp = getCustomerCompanyName(c).toLowerCase();
                            const phone = (c.phoneNo || c.phone || c.mobileNo || '').toLowerCase();
                            const email = (c.email || '').toLowerCase();
                            return name.includes(q) || comp.includes(q) || phone.includes(q) || email.includes(q);
                          })
                          .map((c) => {
                            const name = getCustomerDisplayName(c);
                            const comp = getCustomerCompanyName(c);
                            const phone = c.phoneNo || c.phone || c.mobileNo || '';

                            return (
                              <div
                                key={c.id}
                                onClick={() => {
                                  setCallForm({
                                    ...callForm,
                                    customerId: String(c.id),
                                    customerName: name,
                                    customerPhone: phone,
                                    subject: `Call with ${name}`
                                  });
                                  setContactProfileSearch(comp ? `${name} (${comp})` : name);
                                  setShowContactProfileDropdown(false);
                                }}
                                className="p-3 hover:bg-slate-800 text-slate-200 text-xs cursor-pointer border-b border-white/5 last:border-0 flex justify-between items-center gap-2"
                              >
                                <div>
                                  <p className="font-bold text-slate-100 text-sm">{name}</p>
                                  {comp && <p className="text-[11px] text-blue-400 font-medium">{comp}</p>}
                                </div>
                                {phone && <span className="text-[10px] text-slate-400 font-mono shrink-0">{phone}</span>}
                              </div>
                            );
                          })}

                        {customers.filter((c) => {
                          if (!contactProfileSearch.trim()) return true;
                          const q = contactProfileSearch.toLowerCase();
                          return getCustomerDisplayName(c).toLowerCase().includes(q) || getCustomerCompanyName(c).toLowerCase().includes(q);
                        }).length === 0 && (
                          <div className="p-3 text-xs text-slate-500 text-center">
                            No matching customers found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950/60 border border-blue-500/30 rounded-xl space-y-3 animate-fade text-left">
                    <p className="text-xs font-bold text-blue-400 border-b border-white/5 pb-1">New Customer Entry</p>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold mb-1 block">Full Name / Contact Person *</label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={newCustomerForm.name}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs focus:outline-none focus:border-blue-500 text-slate-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold mb-1 block">Company Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Tech Pvt Ltd"
                        value={newCustomerForm.companyName}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, companyName: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs focus:outline-none focus:border-blue-500 text-slate-100"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold mb-1 block">Phone Number</label>
                        <input
                          type="text"
                          placeholder="+91 98765 43210"
                          value={newCustomerForm.phone}
                          onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs focus:outline-none focus:border-blue-500 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold mb-1 block">Email</label>
                        <input
                          type="email"
                          placeholder="rahul@apex.com"
                          value={newCustomerForm.email}
                          onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs focus:outline-none focus:border-blue-500 text-slate-100"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateCustomerInModal}
                      disabled={isSavingCustomer}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow"
                    >
                      {isSavingCustomer ? 'Saving Customer...' : 'Save & Select Customer'}
                    </button>
                  </div>
                )}
              </div>

              {/* Related To Category */}
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Related To Category</label>
                <select
                  value={callForm.relatedTo}
                  onChange={(e) => setCallForm({ ...callForm, relatedTo: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                >
                  {['ACCOUNTS', 'CAMPAIGNS', 'CASES', 'DEALS', 'INVOICES', 'LEADS', 'PRODUCTS', 'PURCHASE_ORDERS', 'QUOTES', 'SALES_ORDERS', 'VENDORS'].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Call Type selector */}
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-2 block">Call Type</label>
                <div className="flex gap-2">
                  {['OUTGOING', 'INCOMING', 'MISSED'].map((tp) => (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => setCallForm({ ...callForm, callType: tp })}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition ${
                        callForm.callType === tp
                          ? 'bg-purple-600 text-white shadow'
                          : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Call Result select */}
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Call Result Outcome</label>
                <select
                  value={callForm.callResult}
                  onChange={(e) => setCallForm({ ...callForm, callResult: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                >
                  {['NONE', 'INTERESTED', 'NOT_INTERESTED', 'NO_RESPONSE_BUSY', 'REQUESTED_MORE_INFO', 'REQUESTED_CALL_BACK', 'INVALID_NUMBER'].map((res) => (
                    <option key={res} value={res}>{res.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Text fields */}
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Call Subject Title</label>
                <input
                  type="text"
                  value={callForm.subject}
                  onChange={(e) => setCallForm({ ...callForm, subject: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Outcome Description</label>
                <textarea
                  rows="2"
                  placeholder="Record summary of outcome..."
                  value={callForm.description}
                  onChange={(e) => setCallForm({ ...callForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 resize-none text-slate-100"
                ></textarea>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Action Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Next call scheduled in two days"
                  value={callForm.notes}
                  onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
              >
                LOG CALL RECORD
              </button>

            </form>
          </div>
        </div>
      )}

      {/* OVERLAY: MEETING CORE ACTIONS OVERLAY */}
      {showActionOverlay && selectedMeeting && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowActionOverlay(false);
              setSelectedMeeting(null);
              setAttachments([]);
              setMomNotes('');
              setShowMomForm(false);
            }
          }}
          className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl animate-fade max-h-[90vh] overflow-y-auto hide-scrollbar cursor-default"
          >
            
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  {selectedMeeting.companyName || selectedMeeting.name || 'Client Meeting'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Contact: {selectedMeeting.contactPersonName || selectedMeeting.contactPerson || 'Unassigned'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowActionOverlay(false);
                  setSelectedMeeting(null);
                  setAttachments([]);
                  setMomNotes('');
                  setShowMomForm(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ACTION 1: GPS MEETING CHECK-IN */}
            <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-200">1. On-site Check In</span>
                <button
                  onClick={handleCheckIn}
                  className="px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-white rounded-xl text-[11px] font-bold transition flex items-center gap-1.5"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Punch Check In
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Verifies geolocation boundary logs against scheduled meetings on database servers.
              </p>
            </div>

            {/* ACTION 2: FILE ATTACHMENTS MANAGER */}
            <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                  <Paperclip className="h-3.5 w-3.5 text-blue-400" />
                  2. Meeting Attachments
                </span>
                
                {/* Upload Trigger Input wrapper */}
                <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-semibold cursor-pointer shadow-md transition flex items-center gap-1">
                  {isUploading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Attach File
                  <input type="file" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
                </label>
              </div>

              {/* List files */}
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-slate-950/40 rounded border border-white/5 text-xs">
                    <span className="text-slate-300 truncate max-w-xs">{file.fileName || file.name || `Attachment #${idx+1}`}</span>
                    <a
                      href={file.fileUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline text-[10px] font-mono"
                    >
                      Download
                    </a>
                  </div>
                ))}
                {attachments.length === 0 && (
                  <p className="text-[11px] text-slate-500 italic py-2">No attachments uploaded for this log.</p>
                )}
              </div>
            </div>

            {/* ACTION 3: MINUTES OF MEETING FORM */}
            <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-3">
              <span className="text-xs font-bold text-slate-200 flex items-center justify-between border-b border-white/5 pb-2">
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-indigo-400" />
                  3. Fill Minutes of Meeting (MOM)
                </span>
                {isMomCompleted(selectedMeeting) && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    MOM Submitted ✓
                  </span>
                )}
              </span>

              {!showMomForm ? (
                <button
                  onClick={() => setShowMomForm(true)}
                  className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 hover:border-indigo-500 text-indigo-400 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                >
                  <FileText className="h-4 w-4" />
                  {isMomCompleted(selectedMeeting) ? 'Update MOM Details' : 'Fill MOM Details'}
                </button>
              ) : (
                <form onSubmit={handleMOMSubmit} className="space-y-4 animate-fade text-left">
                  
                  {/* Section: Pitch Details */}
                  <div className="space-y-2.5">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 border-b border-white/5 pb-1">
                      Pitch Details
                    </div>
                    
                    {/* Pitched Products Checklist */}
                    <div>
                      <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Pitched Products</label>
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-white/5 max-h-24 overflow-y-auto hide-scrollbar">
                        {productsCatalog.map((prod, idx) => {
                          const label = prod.name || prod.label || prod;
                          const isChecked = momForm.productsPitched.includes(label);
                          return (
                            <label key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-300 hover:text-white cursor-pointer select-none transition">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleMOMProductCheck(label)}
                                className="rounded bg-slate-900 border-white/10 text-indigo-600 focus:ring-0 h-3.5 w-3.5"
                              />
                              {label}
                            </label>
                          );
                        })}
                        {productsCatalog.length === 0 && (
                          <p className="text-[9px] text-slate-500 italic col-span-2">No products available</p>
                        )}
                      </div>
                    </div>

                    {/* Budget & Timeline */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Budget</label>
                        <input
                          type="text"
                          placeholder="e.g. 1-5 Cr"
                          value={momForm.budget}
                          onChange={(e) => setMomForm({ ...momForm, budget: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Timeline</label>
                        <select
                          value={momForm.timeline}
                          onChange={(e) => setMomForm({ ...momForm, timeline: e.target.value })}
                          className="w-full px-2 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 transition"
                        >
                          <option value="0-3 Months">0-3 Months</option>
                          <option value="3-6 Months">3-6 Months</option>
                          <option value="6 Months">6 Months</option>
                          <option value="6-12 Months">6-12 Months</option>
                          <option value="12 Months+">12 Months+</option>
                        </select>
                      </div>
                    </div>

                    {/* Lead Type & Interested flag */}
                    <div className="grid grid-cols-2 gap-2 items-center">
                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Lead Type</label>
                        <select
                          value={momForm.leadType}
                          onChange={(e) => setMomForm({ ...momForm, leadType: e.target.value })}
                          className="w-full px-2 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 transition"
                        >
                          <option value="Cold">Cold</option>
                          <option value="Warm">Warm</option>
                          <option value="Hot">Hot</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5 mt-4">
                        <input
                          type="checkbox"
                          id="momIsInterested"
                          checked={momForm.isInterested}
                          onChange={(e) => setMomForm({ ...momForm, isInterested: e.target.checked })}
                          className="rounded bg-slate-950 border-white/10 text-indigo-600 focus:ring-0 h-3.5 w-3.5 cursor-pointer"
                        />
                        <label htmlFor="momIsInterested" className="text-[11px] text-slate-300 cursor-pointer select-none font-semibold">
                          Client Interested?
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Section: Competition & History */}
                  <div className="space-y-2.5 pt-1">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 border-b border-white/5 pb-1">
                      Competition & History
                    </div>

                    {/* Competitors & Blockers */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Competitors</label>
                        <input
                          type="text"
                          placeholder="e.g. Tata Tech, LexCorp"
                          value={momForm.competitorsMentioned}
                          onChange={(e) => setMomForm({ ...momForm, competitorsMentioned: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Blockers</label>
                        <input
                          type="text"
                          placeholder="e.g. Legal team approval"
                          value={momForm.currentBlockers}
                          onChange={(e) => setMomForm({ ...momForm, currentBlockers: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>

                    {/* Pitched To & Pitched By */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Pitched To Whom</label>
                        <input
                          type="text"
                          placeholder="Contact person"
                          value={momForm.pitchedToWhom}
                          onChange={(e) => setMomForm({ ...momForm, pitchedToWhom: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Pitched By Whom</label>
                        <input
                          type="text"
                          placeholder="Sales rep name"
                          value={momForm.pitchedByWhom}
                          onChange={(e) => setMomForm({ ...momForm, pitchedByWhom: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>

                    {/* Already pitched */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="momAlreadyPitched"
                        checked={momForm.alreadyPitchedToOrg}
                        onChange={(e) => setMomForm({ ...momForm, alreadyPitchedToOrg: e.target.checked })}
                        className="rounded bg-slate-950 border-white/10 text-indigo-600 focus:ring-0 h-3.5 w-3.5 cursor-pointer"
                      />
                      <label htmlFor="momAlreadyPitched" className="text-[11px] text-slate-300 cursor-pointer select-none font-semibold">
                        Already Pitched to Organization?
                      </label>
                    </div>
                  </div>

                  {/* Section: Outcome & Notes */}
                  <div className="space-y-2.5 pt-1">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 border-b border-white/5 pb-1">
                      Outcome & Notes
                    </div>

                    {/* Next step & Follow Up */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Next Step</label>
                        <select
                          value={momForm.nextStep}
                          onChange={(e) => setMomForm({ ...momForm, nextStep: e.target.value })}
                          className="w-full px-2 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 transition"
                        >
                          <option value="Technical Discussion">Technical Discussion</option>
                          <option value="Demo">Demo</option>
                          <option value="POC Request">POC Request</option>
                          <option value="Proposal">Proposal</option>
                          <option value="Negotiations">Negotiations</option>
                          <option value="Closure">Closure</option>
                          <option value="Won">Won</option>
                          <option value="Lost">Lost</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Follow Up Date</label>
                        <input
                          type="date"
                          value={momForm.followUpDate}
                          onChange={(e) => setMomForm({ ...momForm, followUpDate: e.target.value })}
                          className="w-full px-2 py-1.5 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 transition [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-150 cursor-pointer"
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>
                    </div>

                    {/* Notes text area */}
                    <div>
                      <label className="text-[11px] text-slate-400 font-semibold mb-1 block">MOM Discussion Summary</label>
                      <textarea
                        rows="3"
                        placeholder="Type meeting discussion summary, decisions, next steps..."
                        value={momNotes}
                        onChange={(e) => setMomNotes(e.target.value)}
                        className="w-full px-3 py-2 rounded bg-slate-950 border border-white/5 text-[11px] text-slate-100 focus:outline-none focus:border-indigo-500 resize-none transition"
                        required
                      ></textarea>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    SUBMIT MOM DETAILS
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
