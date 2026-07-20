import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Activity,
  ChevronRight,
  Clock,
  Camera,
  MapPin,
  CheckCircle,
  FileText,
  Plus,
  Search,
  X,
  User,
  Phone,
  Mail,
  UserPlus,
  AlertTriangle
} from 'lucide-react';

import {
  getPlannedMeetingsByUserId,
  getAllCustomerDetails,
  getAllMomDetails,
  getAllMeetingCheckInByUserId,
  getLeads,
  submitPunchIn,
  submitPunchOut,
  meetingCheckIn,
  saveMoMDetailsOfCustomer
} from '../../api/apiFunctions/Login/Login_api_function';

import { parseBudgetToCr, formatCr } from './PipelineTab';

export default function CommandCenter({
  setActiveTab,
  setShowAddLeadModal
}) {
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [punchTime, setPunchTime] = useState(null);
  
  // Dashboard lists
  const [rawLeads, setRawLeads] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [allMoms, setAllMoms] = useState([]);
  const [itinerary, setItinerary] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals visibility
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [showMomModal, setShowMomModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Punch process states
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  const [selfieBlob, setSelfieBlob] = useState(null);
  const [punchCoords, setPunchCoords] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [punchError, setPunchError] = useState(null);

  // Search query states
  const [searchQuery, setSearchQuery] = useState('');

  // Selected contexts
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [momNotes, setMomNotes] = useState('');

  // Refs for browser camera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Fetch dashboard stats and data lists
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const userId = localStorage.getItem('userId') || '';
      
      const [
        meetingsRes,
        allCustomersRes,
        momsRes,
        leadsRes
      ] = await Promise.all([
        getPlannedMeetingsByUserId(userId).catch(() => []),
        getAllCustomerDetails().catch(() => []),
        getAllMomDetails().catch(() => []),
        getLeads().catch(() => [])
      ]);

      const meetingsArr = Array.isArray(meetingsRes?.data) ? meetingsRes.data : Array.isArray(meetingsRes) ? meetingsRes : [];
      const allCustArr = Array.isArray(allCustomersRes?.data) ? allCustomersRes.data : Array.isArray(allCustomersRes) ? allCustomersRes : [];
      const momsArr = Array.isArray(momsRes?.data) ? momsRes.data : Array.isArray(momsRes) ? momsRes : [];
      const leadsArr = Array.isArray(leadsRes?.data) ? leadsRes.data : Array.isArray(leadsRes) ? leadsRes : [];

      setAllCustomers(allCustArr);
      setAllMoms(momsArr);
      setRawLeads(leadsArr);

      // Reconcile and build Today's Itinerary (filter for today only, resolve customer lookup)
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const todaysMeetings = meetingsArr.filter((m) => {
        const mDate = m.scheduledDate || m.date || m.startTime || '';
        return mDate && mDate.slice(0, 10) === todayKey;
      });

      const reconciledItinerary = todaysMeetings.map((m) => {
        const checkinRecord = m.checkedInTime || m.checkedInLatitude ? 'ACTIVE' : 'PLANNED';
        const momRecord = momsArr.find(mom => mom.meetingLogId === m.id || mom.meetingLogId === m.meetingLogId);
        
        // Fetch customer info from master customers list (checking all ID variants)
        const customerId = 
          m.customerId || 
          m.customer_id || 
          m.customerID || 
          m.customer?.id || 
          m.customer?.customerId || 
          m.accountId || 
          m.account_id || 
          m.account?.id || 
          m.customerMasterId || 
          m.customer_master_id || 
          '';

        const customerRef = allCustArr.find(c => {
          const cId = 
            c.id || 
            c.customerId || 
            c.customer_id || 
            c.customerID || 
            c.customerMasterId || 
            c.customer_master_id || 
            c.accountId || 
            c.account_id || 
            '';
          return cId && String(cId) === String(customerId);
        });

        const companyNameFromMaster = customerRef?.companyName || customerRef?.company || customerRef?.accountName || '';
        const personNameFromMaster = customerRef?.contactPerson || customerRef?.contactPersonName || customerRef?.name || `${customerRef?.firstName || ''} ${customerRef?.lastName || ''}`.trim() || '';

        const finalCompanyName = 
          companyNameFromMaster || 
          m.companyName || 
          m.company || 
          m.customerName || 
          m.name || 
          m.accountName ||
          m.clientName ||
          'Unknown Client';

        const finalContactPerson = 
          personNameFromMaster || 
          m.contactPersonName || 
          m.contactPerson || 
          m.contactName || 
          'Unassigned';

        return {
          id: m.id || m.meetingLogId,
          customerName: finalCompanyName,
          contactPerson: finalContactPerson,
          time: m.startTime ? new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Flexible',
          status: momRecord ? 'MOM FILLED' : checkinRecord,
          momNotes: momRecord ? momRecord.momDescription : '',
          raw: m
        };
      });

      setItinerary(reconciledItinerary);
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Recover session status from local storage
    const checkinState = localStorage.getItem('IS_DAILY_CHECKIN');
    if (checkinState === 'true') {
      setIsPunchedIn(true);
      const savedTime = localStorage.getItem('PUNCH_IN_TIME');
      setPunchTime(savedTime ? new Date(savedTime) : new Date());
    }
  }, []);

  // Web location tracker interval simulation
  useEffect(() => {
    let watchId = null;
    if (isPunchedIn) {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            console.log('[LocationTrackerService] live position ping:', pos.coords.latitude, pos.coords.longitude);
          },
          (err) => console.warn('[LocationTrackerService] location watch restricted:', err),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      }
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isPunchedIn]);

  // Launch camera for selfie capture
  const startCamera = async () => {
    setCameraActive(true);
    setSelfieCaptured(false);
    setSelfieBlob(null);
    setPunchError(null);

    // Fetch GPS coordinates in parallel
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPunchCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        (err) => {
          console.warn('Geolocation access failed, falling back to corporate office coords:', err);
          setPunchCoords({ latitude: 19.0760, longitude: 72.8777 });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setPunchCoords({ latitude: 19.0760, longitude: 72.8777 });
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera stream access failed:', err);
      setPunchError('Unable to open camera. Please grant browser camera permissions.');
    }
  };

  // Close camera and clear video streams
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  // Snap selfie picture from video stream
  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        setSelfieBlob(blob);
        setSelfieCaptured(true);
        stopCamera();
      }, 'image/jpeg');
    }
  };

  // Auto-healing checkin/checkout retry loop
  const executePunchInFlow = async (lat, lng, blob) => {
    try {
      await submitPunchIn(lat, lng, blob);
    } catch (error) {
      // Auto-heal leftover stale session (400 Bad Request indicating active check-in)
      if (error?.response?.status === 400 || String(error?.response?.data?.message || '').toLowerCase().includes('already')) {
        console.warn('[Auto-Healing] Active session conflict. Retrying punch session reset...');
        try {
          await submitPunchOut(lat, lng);
        } catch (checkoutErr) {
          console.warn('[Auto-Healing] Session checkout cleanup failed or was unnecessary:', checkoutErr);
        }
        // Retry initial punch-in with original payload
        await submitPunchIn(lat, lng, blob);
      } else {
        throw error;
      }
    }
  };

  // Confirm shift Punch In
  const confirmPunchInAction = async () => {
    if (!punchCoords || !selfieBlob) {
      alert('Unable to confirm. Missing GPS coordinates or Selfie image.');
      return;
    }
    try {
      await executePunchInFlow(punchCoords.latitude, punchCoords.longitude, selfieBlob);
      
      localStorage.setItem('IS_DAILY_CHECKIN', 'true');
      const now = new Date();
      localStorage.setItem('PUNCH_IN_TIME', now.toISOString());
      
      setIsPunchedIn(true);
      setPunchTime(now);
      setShowPunchModal(false);
      setSelfieCaptured(false);
      setSelfieBlob(null);
    } catch (err) {
      alert('Punch In failed: ' + (err?.response?.data?.message || err.message));
    }
  };

  // Confirm shift Punch Out
  const handlePunchOutAction = async () => {
    const confirmEnd = window.confirm('Are you sure you want to end your active shift?');
    if (!confirmEnd) return;

    // Resolve checkout coordinates
    let lat = 19.0760;
    let lng = 72.8777;

    if (navigator.geolocation) {
      const getCoordsPromise = new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: 19.0760, lng: 72.8777 }),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });
      const coords = await getCoordsPromise;
      lat = coords.lat;
      lng = coords.lng;
    }

    try {
      await submitPunchOut(lat, lng);
      localStorage.setItem('IS_DAILY_CHECKIN', 'false');
      localStorage.removeItem('PUNCH_IN_TIME');
      
      setIsPunchedIn(false);
      setPunchTime(null);
    } catch (err) {
      alert('Punch Out failed: ' + (err?.response?.data?.message || err.message));
    }
  };

  // Shift Status Toggle trigger
  const handleShiftToggle = () => {
    if (!isPunchedIn) {
      setShowPunchModal(true);
      setTimeout(() => startCamera(), 100);
    } else {
      handlePunchOutAction();
    }
  };

  // Today's Itinerary check-in
  const handleMeetingCheckIn = async (item) => {
    if (!isPunchedIn) {
      alert('You must punch in to start your shift before checking in to meetings!');
      return;
    }

    let lat = 19.0760;
    let lng = 72.8777;

    if (navigator.geolocation) {
      const getCoordsPromise = new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: 19.0760, lng: 72.8777 }),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });
      const coords = await getCoordsPromise;
      lat = coords.lat;
      lng = coords.lng;
    }

    try {
      const payload = {
        meetingId: item.raw?.id || null,
        meetingLogId: item.id || null,
        latitude: lat,
        longitude: lng
      };
      await meetingCheckIn(payload);
      alert('Meeting check-in registered successfully!');
      fetchDashboardData();
    } catch (error) {
      alert('Meeting check-in failed: ' + (error?.response?.data?.message || error.message));
    }
  };

  // Save MOM Notes
  const handleSaveMom = async (e) => {
    e.preventDefault();
    if (selectedMeeting) {
      try {
        const payload = {
          companyName: selectedMeeting.customerName || '',
          contactPersonName: selectedMeeting.contactPerson || '',
          momDescription: momNotes,
          meetingLogId: selectedMeeting.id || null
        };
        await saveMoMDetailsOfCustomer(payload);
        alert('MOM details saved successfully!');
        setMomNotes('');
        setShowMomModal(false);
        setSelectedMeeting(null);
        fetchDashboardData();
      } catch (err) {
        alert('MOM notes save failed: ' + err.message);
      }
    }
  };

  // Get filtered hot pipeline deals
  const getHotPipelineDeals = () => {
    return rawLeads
      .filter((l) => {
        const valNum = parseBudgetToCr(l.dealValue || l.value || l.budget);
        const isAdvanced = ['PROPOSAL_SENT', 'NEGOTIATION', 'WON'].includes(l.stage);
        const isHot = l.priority === 'HIGH' || isAdvanced || valNum > 1.0;
        return isHot;
      })
      .map((lead) => ({
        id: lead.id,
        customerName: lead.contactName || 'Unassigned',
        companyName: lead.company || 'Unknown Company',
        stage: lead.stage || 'NEW_LEAD',
        value: formatCr(parseBudgetToCr(lead.dealValue || lead.value || lead.budget)),
        raw: lead
      }));
  };

  const hotDeals = getHotPipelineDeals();

  // Metrics tallies
  const todayMomsCount = allMoms.filter((mom) => {
    const d = new Date(mom.createdAt || mom.updatedAt || new Date());
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  }).length;

  const dealsWonCount = rawLeads.filter((l) => l.stage === 'WON').length;

  // Global Search Autocomplete matches
  const getSearchMatches = () => {
    if (!searchQuery.trim()) return [];
    
    // 1. Match Navigation features
    const features = [
      { type: 'Feature', label: 'Command Center', action: () => { setActiveTab('home'); setShowSearchModal(false); } },
      { type: 'Feature', label: 'Calendar Grid', action: () => { setActiveTab('calendar'); setShowSearchModal(false); } },
      { type: 'Feature', label: 'Meetings Agenda', action: () => { setActiveTab('calendar'); setShowSearchModal(false); } },
      { type: 'Feature', label: 'Deals Pipeline', action: () => { setActiveTab('pipeline'); setShowSearchModal(false); } },
      { type: 'Feature', label: 'Add Lead Opportunity', action: () => { setActiveTab('pipeline'); setShowSearchModal(false); setShowAddLeadModal(true); } },
      { type: 'Feature', label: 'Contacts Database', action: () => { setActiveTab('contacts'); setShowSearchModal(false); } }
    ].filter(f => f.label.toLowerCase().includes(searchQuery.toLowerCase()));

    // 2. Match Customer contacts
    const query = searchQuery.toLowerCase();
    const customers = allCustomers
      .filter((c) => {
        return (
          (c.companyName && c.companyName.toLowerCase().includes(query)) ||
          (c.contactPerson && c.contactPerson.toLowerCase().includes(query)) ||
          (c.name && c.name.toLowerCase().includes(query)) ||
          (c.email && c.email.toLowerCase().includes(query)) ||
          (c.phone && c.phone.toLowerCase().includes(query)) ||
          (c.city && c.city.toLowerCase().includes(query))
        );
      })
      .map(c => ({
        type: 'Customer',
        label: `${c.companyName || c.name} - ${c.contactPerson || c.name || 'Unassigned'}`,
        sub: `${c.phone || ''} • ${c.city || ''}`,
        action: () => {
          // Construct simulated lead context
          setSelectedLead({
            company: c.companyName || c.name || '',
            contactName: c.contactPerson || c.name || '',
            email: c.email || '',
            phone: c.phone || '',
            stage: c.stage || 'NEW_LEAD',
            dealValue: c.dealValue || '0',
            address: c.locationName || '',
            city: c.city || 'Mumbai',
            designation: c.designation || '',
            notes: '',
            product: c.pitchedProducts || '',
            expectedCloseDate: '',
            leadSource: 'DIRECT',
            priority: 'MEDIUM',
            partner: '',
            blockers: c.blockers || ''
          });
          setShowSearchModal(false);
          setShowDetailsModal(true);
        }
      }));

    return [...features, ...customers];
  };

  const searchResults = getSearchMatches();

  return (
    <div className="space-y-6 relative z-20 animate-fade">
      
      {/* CUSTOM HEADER & GLOBAL SEARCH BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0c1220]/60 border border-white/5 p-5 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Control live trackers, schedule routes, and pipeline targets</p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {/* Global search launcher */}
          <button
            onClick={() => { setSearchQuery(''); setShowSearchModal(true); }}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-900/60 hover:bg-slate-900 border border-white/5 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Search className="h-4 w-4" />
            Global Search
          </button>
          
          <button
            onClick={() => setActiveTab('contacts')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-lg"
          >
            <UserPlus className="h-4 w-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* SHIFT STATUS CARD (PUNCH IN / PUNCH OUT) */}
      {/* <div className="bg-gradient-to-r from-[#0c1220] to-[#0e1628] border border-white/10 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleShiftToggle}
              className={`h-14 w-14 rounded-full shrink-0 flex items-center justify-center transition-all duration-300 shadow-md ${
                isPunchedIn
                  ? 'bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20'
                  : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {isPunchedIn ? (
                <Square className="h-5 w-5 fill-current animate-pulse text-red-500" />
              ) : (
                <Play className="h-6 w-6 fill-current text-emerald-400 pl-0.5" />
              )}
            </button>
            <div>
              <h4 className="font-extrabold text-slate-100 text-sm">
                {isPunchedIn ? 'On Active Shift' : 'Start Your Shift'}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {isPunchedIn
                  ? `Punched in • Tap to check out (Start: ${punchTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                  : 'Selfie Punch In • Tap to check in location'}
              </p>
            </div>
          </div>
          
          {isPunchedIn && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold font-mono tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              ACTIVE ON DUTY
            </div>
          )}
        </div>
      </div> */}

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Engagements */}
        <div className="bg-[#0c1220]/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-500/20 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Engagements Today</span>
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
          </div>
          <div className="my-3">
            <h3 className="text-3xl font-extrabold text-white font-mono group-hover:scale-105 transition-transform duration-300 inline-block">
              {todayMomsCount}
            </h3>
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Logged client MOM touchpoints today</div>
        </div>

        {/* KPI 2: Deals Won */}
        <div className="bg-[#0c1220]/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-500/20 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Deals Closed</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="my-3">
            <h3 className="text-3xl font-extrabold text-white font-mono group-hover:scale-105 transition-transform duration-300 inline-block">
              {dealsWonCount}
            </h3>
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Total pipeline items in WON stage</div>
        </div>

        {/* KPI 3: Calendar shortcut */}
        <button
          onClick={() => setActiveTab('calendar')}
          className="bg-gradient-to-tr from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg shadow-blue-600/10 border border-blue-400/20 text-left hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden group"
        >
          <div className="absolute right-[-20px] top-[-20px] w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:scale-150 transition-all duration-500"></div>
          
          <div className="flex justify-between items-start">
            <Activity className="h-6 w-6 text-blue-200" />
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full font-medium uppercase text-[9px] tracking-widest">Shortcut</span>
          </div>
          <div className="my-2">
            <h3 className="text-base font-bold">View Calendar</h3>
            <p className="text-[11px] text-blue-100/75 mt-0.5">Route planners and meetings grid</p>
          </div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-blue-100 flex items-center gap-1">
            OPEN CALENDAR <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* HOT PIPELINE */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hot Pipeline</h3>
          <button onClick={() => setActiveTab('pipeline')} className="text-xs text-blue-400 hover:text-blue-300 font-medium">View All</button>
        </div>

        <div className="flex overflow-x-auto gap-4 py-2 hide-scrollbar scroll-smooth">
          {hotDeals.map((deal) => (
            <div
              key={deal.id}
              onClick={() => {
                setSelectedLead(deal.raw);
                setShowDetailsModal(true);
              }}
              className="shrink-0 w-60 h-28 bg-[#0c1220]/60 hover:bg-[#0c1220]/90 border border-white/5 hover:border-blue-500/20 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 cursor-pointer shadow"
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-[9px] font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/15 uppercase truncate max-w-[122px]">
                  {deal.stage.replace('_', ' ')}
                </span>
                <span className="text-xs font-bold text-emerald-400 font-mono">{deal.value}</span>
              </div>
              <div className="mt-2 pr-4 truncate">
                <h4 className="text-xs font-bold text-slate-200 truncate">{deal.companyName}</h4>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">Contact: {deal.customerName}</p>
              </div>
            </div>
          ))}
          
          <button
            onClick={() => { setActiveTab('pipeline'); setShowAddLeadModal(true); }}
            className="shrink-0 w-28 h-28 border-dashed border border-white/10 hover:border-blue-500/20 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-900/40 transition text-slate-400 hover:text-white"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs font-semibold">New Deal</span>
          </button>
        </div>
      </div>

      {/* TODAY'S ITINERARY */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today's Itinerary</h3>
          <span className="text-xs text-slate-500">Scheduled visits list</span>
        </div>

        <div className="space-y-3">
          {itinerary.map((item) => (
            <div
              key={item.id}
              className="bg-[#0c1220]/60 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-blue-500/15 transition-all shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-1 text-blue-400 text-xs font-bold font-mono py-1">
                  <Clock className="h-3.5 w-3.5" />
                  {item.time}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-100 text-sm">{item.customerName}</h4>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                      item.status === 'ACTIVE' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                        : item.status === 'MOM FILLED'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/15'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Representative: {item.contactPerson}</p>
                  
                  {item.momNotes && (
                    <div className="bg-slate-950/40 p-2.5 rounded-lg border border-white/5 text-xs text-slate-400 mt-2 italic max-w-lg leading-relaxed">
                      MOM Notes: {item.momNotes}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions panel */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                {item.status === 'PLANNED' && (
                  <button
                    onClick={() => handleMeetingCheckIn(item)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow"
                  >
                    Check-in
                  </button>
                )}

                {item.status !== 'MOM FILLED' ? (
                  <button
                    onClick={() => {
                      setSelectedMeeting(item);
                      setMomNotes(item.momNotes || '');
                      setShowMomModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 hover:border-blue-500 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Fill MOM Form
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold py-2 px-3">
                    <CheckCircle className="h-4 w-4" />
                    MOM Form Saved
                  </div>
                )}
              </div>
            </div>
          ))}

          {itinerary.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm border border-dashed border-white/5 rounded-2xl bg-slate-950/10">
              No planned itineraries scheduled for today
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: PUNCH ATTENDANCE DIALOG (BROWSER CAMERA) */}
      {showPunchModal && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-fade">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Camera className="h-5 w-5 text-blue-400" />
                Selfie Punch In
              </h3>
              <button
                onClick={() => {
                  stopCamera();
                  setShowPunchModal(false);
                  setSelfieCaptured(false);
                  setSelfieBlob(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {punchError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium">
                {punchError}
              </div>
            )}

            <div className="space-y-4">
              {/* Media capture box */}
              <div className="h-56 bg-slate-950 rounded-xl border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
                {cameraActive && !selfieCaptured && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                
                <canvas ref={canvasRef} className="hidden" />

                {!selfieCaptured ? (
                  <div className="absolute inset-x-0 bottom-4 flex justify-center">
                    <button
                      type="button"
                      onClick={captureSelfie}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
                    >
                      Capture Photo
                    </button>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                    <div className="text-center p-6 space-y-2">
                      <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
                      <p className="text-xs text-slate-200 font-semibold">Selfie Frame Snapped</p>
                      <button
                        type="button"
                        onClick={() => { setSelfieCaptured(false); startCamera(); }}
                        className="text-[10px] text-slate-400 hover:underline"
                      >
                        Retake Selfie
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Coordinates info card */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  GPS Location Resolver
                </div>
                {punchCoords ? (
                  <p className="text-[11px] text-slate-400 leading-relaxed pl-6">
                    Latitude: <span className="font-mono text-slate-200">{punchCoords.latitude.toFixed(6)}°</span>, 
                    Longitude: <span className="font-mono text-slate-200">{punchCoords.longitude.toFixed(6)}°</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 pl-6 animate-pulse">Resolving location coords...</p>
                )}
              </div>
            </div>

            <button
              onClick={confirmPunchInAction}
              disabled={!selfieCaptured || !punchCoords}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
            >
              CONFIRM AND PUNCH IN
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: MINUTES OF MEETING (MOM) MODAL */}
      {showMomModal && selectedMeeting && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-fade">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                Minutes of Meeting (MOM)
              </h3>
              <button
                onClick={() => {
                  setShowMomModal(false);
                  setSelectedMeeting(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMom} className="space-y-4">
              <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 text-xs text-slate-400 space-y-1">
                <p><span className="font-bold text-slate-200">Customer:</span> {selectedMeeting.customerName}</p>
                <p><span className="font-bold text-slate-200">Contact:</span> {selectedMeeting.contactPerson}</p>
                <p><span className="font-bold text-slate-200">Scheduled Time:</span> {selectedMeeting.time}</p>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Discussion Notes</label>
                <textarea
                  rows="4"
                  placeholder="Record summary of discussion, requirements, next steps..."
                  value={momNotes}
                  onChange={(e) => setMomNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-sm focus:outline-none focus:border-blue-500 resize-none text-slate-100"
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
              >
                SUBMIT MOM FORM
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: GLOBAL SEARCH OVERLAY MODAL */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl animate-fade relative max-h-[85vh] flex flex-col">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-slate-100">Global System Search</h3>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search modules (e.g. Pipeline, Calendar) or customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>

            {/* Results scroll lists */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5 pr-1 space-y-1">
              {searchResults.map((res, idx) => (
                <div
                  key={idx}
                  onClick={res.action}
                  className="py-3 px-4 rounded-xl hover:bg-slate-900/60 transition cursor-pointer flex justify-between items-center group"
                >
                  <div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-wide ${
                      res.type === 'Feature' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10' : 'bg-blue-500/10 text-blue-400 border border-blue-500/10'
                    }`}>
                      {res.type}
                    </span>
                    <h5 className="text-sm text-slate-200 mt-1.5 font-semibold group-hover:text-blue-400 transition">{res.label}</h5>
                    {res.sub && <p className="text-[11px] text-slate-500 mt-0.5">{res.sub}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                </div>
              ))}

              {searchQuery && searchResults.length === 0 && (
                <div className="py-12 text-center text-slate-500 text-xs font-semibold">
                  No matching module routes or customer contacts found
                </div>
              )}

              {!searchQuery && (
                <div className="py-12 text-center text-slate-500 text-xs font-semibold">
                  Type a few characters to filter pipeline contacts...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PIPELINE LEAD DETAILS SHEET */}
      {showDetailsModal && selectedLead && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-fade relative max-h-[90vh] overflow-y-auto hide-scrollbar">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">{selectedLead.company || selectedLead.companyName}</h3>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5 block">
                  Category: {selectedLead.stage ? selectedLead.stage.replace('_', ' ') : 'NEW_LEAD'}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedLead(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Customer Contact</span>
                <div className="space-y-1.5 text-slate-300">
                  <p className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-400 shrink-0" />
                    <span className="font-semibold">{selectedLead.contactName || selectedLead.customerName}</span>
                    {selectedLead.designation && <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">({selectedLead.designation})</span>}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>{selectedLead.phone || 'No phone'}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className="truncate">{selectedLead.email || 'No email'}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{selectedLead.address || 'No address'} - {selectedLead.city || 'Mumbai'}</span>
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Deal Specs</span>
                <div className="grid grid-cols-2 gap-y-2">
                  <div>
                    <span className="text-slate-500">Value (Cr):</span>
                    <p className="font-bold text-emerald-400 mt-0.5">{selectedLead.dealValue || selectedLead.value || 'TBD'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Source:</span>
                    <p className="font-semibold text-slate-200 mt-0.5">{selectedLead.leadSource ? selectedLead.leadSource.replace('_', ' ') : 'DIRECT'}</p>
                  </div>
                </div>
              </div>

              {selectedLead.blockers && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl space-y-1">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                    Blockers Flagged
                  </span>
                  <p className="text-xs text-rose-300">{selectedLead.blockers}</p>
                </div>
              )}

              {selectedLead.notes && (
                <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pipeline Notes</span>
                  <p className="text-slate-300 leading-relaxed italic">{selectedLead.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
