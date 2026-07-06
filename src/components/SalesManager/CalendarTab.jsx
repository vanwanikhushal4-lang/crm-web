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
  getAllCustomerDetails,
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
  getAllMomDetails
} from '../../api/apiFunctions/Login/Login_api_function';

export default function CalendarTab() {
  const [username, setUsername] = useState('User');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All'); // All, Meetings, Tasks, Calls
  const [isLoading, setIsLoading] = useState(false);

  const scrollContainerRef = useRef(null);

  // Selected date state
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  // Task Log
  const [taskForm, setTaskForm] = useState({
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

  // MOM Form state (inside Action Overlay)
  const [momNotes, setMomNotes] = useState('');

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
      // Get all customers (to compile autocompletes)
      const customerRes = await getAllCustomerDetails();
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

    } catch (error) {
      console.error('Error fetching calendar API data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      await saveOrUpdateTaskLog(payload);
      alert('Task log saved successfully!');
      setShowTaskModal(false);
      setTaskForm({ subject: '', dueDate: '', status: 'NOT_STARTED', priority: 'NORMAL' });
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

  // Submit MOM form details
  const handleMOMSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        companyName: selectedMeeting?.companyName || selectedMeeting?.name || '',
        contactPersonName: selectedMeeting?.contactPersonName || selectedMeeting?.contactPerson || '',
        momDescription: momNotes,
        meetingLogId: selectedMeeting?.meetingLogId || selectedMeeting?.id || null
      };
      await saveMoMDetailsOfCustomer(payload);
      alert('MOM Details submitted successfully!');
      setMomNotes('');
      setShowActionOverlay(false);
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
    <div className="space-y-6 text-slate-100 animate-fade">
      
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
            <button
              onClick={() => setCollapseMeetings(!collapseMeetings)}
              className="w-full flex justify-between items-center px-5 py-4 bg-slate-900/30 border-b border-white/5 hover:bg-slate-900/40 transition text-left"
            >
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
                  Meetings
                </h3>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-bold">
                  {displayMeetings.length}
                </span>
              </div>
              {collapseMeetings ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
            </button>

            {/* List block */}
            {!collapseMeetings && (
              <div className="p-4 space-y-3">
                {displayMeetings.map((meeting) => (
                  <div
                    key={meeting.id || meeting.meetingLogId}
                    onClick={() => {
                      setSelectedMeeting(meeting);
                      fetchAttachments(meeting);
                      setShowActionOverlay(true);
                    }}
                    className="p-4 bg-slate-900/50 hover:bg-slate-900/80 rounded-xl border border-white/5 hover:border-blue-500/25 transition cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-100 text-sm">
                          {meeting.companyName || meeting.name || 'Client Visit'}
                        </h4>
                        {meeting.contactPersonName && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                            {meeting.contactPersonName}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Clock className="h-3.5 w-3.5 text-blue-400" />
                          {meeting.startTime ? new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Flexible'}
                        </span>
                        {meeting.locationName && (
                          <span className="flex items-center gap-1 truncate max-w-sm">
                            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                            {meeting.locationName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-blue-400 font-semibold flex items-center gap-1 group">
                      Log MOM / Check In <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                ))}

                {displayMeetings.length === 0 && (
                  <div className="p-6 border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center gap-3 text-center bg-slate-950/20">
                    <p className="text-xs text-slate-500 font-medium">No meetings scheduled for this day</p>
                    <button
                      onClick={() => {
                        setMeetingForm((prev) => ({
                          ...prev,
                          startTime: new Date(selectedDate.setHours(9, 0, 0)).toISOString().slice(0, 16),
                          endTime: new Date(selectedDate.setHours(10, 0, 0)).toISOString().slice(0, 16)
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
            
            <button
              onClick={() => setCollapseTasks(!collapseTasks)}
              className="w-full flex justify-between items-center px-5 py-4 bg-slate-900/30 border-b border-white/5 hover:bg-slate-900/40 transition text-left"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
                  Tasks
                </h3>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-bold">
                  {displayTasks.length}
                </span>
              </div>
              {collapseTasks ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
            </button>

            {!collapseTasks && (
              <div className="p-4 space-y-3">
                {displayTasks.map((task) => (
                  <div
                    key={task.id || task.taskLogId}
                    className="p-4 bg-slate-900/50 rounded-xl border border-white/5 flex justify-between items-center gap-4"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-100 text-sm">{task.subject}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">Due: {task.dueDate}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                        task.priority === 'HIGH' || task.priority === 'HIGHEST'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : task.priority === 'NORMAL'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-slate-800 text-slate-400 border-white/5'
                      }`}>
                        {task.priority}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        task.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : task.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}

                {displayTasks.length === 0 && (
                  <div className="p-6 border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center gap-3 text-center bg-slate-950/20">
                    <p className="text-xs text-slate-500 font-medium">No tasks logged for this day</p>
                    <button
                      onClick={() => {
                        setTaskForm((prev) => ({
                          ...prev,
                          dueDate: selectedDate.toISOString().split('T')[0]
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
            
            <button
              onClick={() => setCollapseCalls(!collapseCalls)}
              className="w-full flex justify-between items-center px-5 py-4 bg-slate-900/30 border-b border-white/5 hover:bg-slate-900/40 transition text-left"
            >
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
                  Calls
                </h3>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-bold">
                  {displayCalls.length}
                </span>
              </div>
              {collapseCalls ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
            </button>

            {!collapseCalls && (
              <div className="p-4 space-y-3">
                {displayCalls.map((call) => (
                  <div
                    key={call.id || call.callId}
                    className="p-4 bg-slate-900/50 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-100 text-sm">{call.subject}</h4>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                          call.callType === 'INCOMING'
                            ? 'bg-blue-500/10 text-blue-400'
                            : call.callType === 'OUTGOING'
                            ? 'bg-purple-500/10 text-purple-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {call.callType}
                        </span>
                      </div>
                      {call.notes && <p className="text-xs text-slate-400 leading-relaxed italic">{call.notes}</p>}
                    </div>

                    <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-xl">
                      Result: {call.callResult.replace('_', ' ')}
                    </span>
                  </div>
                ))}

                {displayCalls.length === 0 && (
                  <div className="p-6 border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center gap-3 text-center bg-slate-950/20">
                    <p className="text-xs text-slate-500 font-medium">No calls logged for this day</p>
                    <div className="flex gap-2">
                      {/* Logging direct call trigger */}
                      <button
                        onClick={() => setShowDialerDirectory(true)}
                        className="px-4 py-2 bg-purple-600/10 hover:bg-purple-600 border border-purple-500/20 hover:border-purple-500 text-purple-400 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Dial Call
                      </button>
                      <button
                        onClick={() => setShowCallModal(true)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Log Call Result
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL 1: LOG MEETING */}
      {showMeetingModal && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl animate-fade relative max-h-[90vh] overflow-y-auto hide-scrollbar">
            
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
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">End Time</label>
                  <input
                    type="datetime-local"
                    value={meetingForm.endTime}
                    onChange={(e) => setMeetingForm({ ...meetingForm, endTime: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
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
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-fade">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-slate-100">Create Task Log</h3>
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
                SAVE TASK LOG
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DIALER DIRECTORY (Direct Phone placement select) */}
      {showDialerDirectory && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-fade">
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
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-fade relative max-h-[90vh] overflow-y-auto hide-scrollbar">
            
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
              
              {/* Customer Select dropdown */}
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Contact Profile</label>
                <select
                  value={callForm.customerId}
                  onChange={(e) => {
                    const selected = customers.find(c => String(c.id) === e.target.value);
                    setCallForm({
                      ...callForm,
                      customerId: e.target.value,
                      customerName: selected?.contactPerson || selected?.name || '',
                      customerPhone: selected?.phone || '',
                      subject: `Call with ${selected?.contactPerson || selected?.name || 'client'}`
                    });
                  }}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                  required
                >
                  <option value="">Select Customer profile...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.contactPerson || c.name} ({c.companyName || 'Individual'})
                    </option>
                  ))}
                </select>
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
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl animate-fade max-h-[90vh] overflow-y-auto hide-scrollbar">
            
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
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1 border-b border-white/5 pb-2">
                <FileText className="h-3.5 w-3.5 text-indigo-400" />
                3. Fill Minutes of Meeting (MOM)
              </span>

              <form onSubmit={handleMOMSubmit} className="space-y-3">
                <textarea
                  rows="3"
                  placeholder="Type meeting discussion summary, decisions, next steps..."
                  value={momNotes}
                  onChange={(e) => setMomNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
                  required
                ></textarea>
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold shadow-md transition"
                >
                  SUBMIT MOM SUMMARIES
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
