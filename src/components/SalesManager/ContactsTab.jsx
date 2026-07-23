import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  History as HistoryIcon,
  Edit2,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Upload,
  RefreshCw,
  Clock,
  Table,
  LayoutGrid,
  Filter,
  RotateCcw,
  ArrowUpDown,
  Building2,
  UserCheck
} from 'lucide-react';

import {
  getAllCustomersByUserId,
  getCompanies,
  getAllMomDetails,
  createCustomerMaster,
  saveCustomerWithCompany,
  updateCustomer,
  deleteCustomerById,
  uploadCustomersExcel,
  saveMeetingLog,
  saveOrUpdateCall
} from '../../api/apiFunctions/Login/Login_api_function';

import { parseBudgetToCr, formatCr } from './PipelineTab';

export default function ContactsTab() {
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [moms, setMoms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // View mode and filters state
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grouped'
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [designationFilter, setDesignationFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortField, setSortField] = useState('name'); // 'name' | 'company' | 'designation'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // Accordion open/close state
  const [expandedCompanies, setExpandedCompanies] = useState({});

  // Modals controls
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMomHistoryModal, setShowMomHistoryModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);

  // Focus states
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedContactMoms, setSelectedContactMoms] = useState([]);

  // Form states
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    designation: '',
    companyName: '',
    customerType: 'Customer',
    email: '',
    phoneNo: '',
    address: ''
  });

  const [meetingForm, setMeetingForm] = useState({
    locationName: '',
    startTime: '',
    endTime: ''
  });

  const [callForm, setCallForm] = useState({
    relatedTo: 'ACCOUNTS',
    callType: 'OUTGOING',
    callResult: 'INTERESTED',
    subject: '',
    description: '',
    notes: ''
  });

  // Fetch all accounts and contacts data
  const fetchContactsData = async () => {
    setIsLoading(true);
    try {
      const userId = localStorage.getItem('userId') || '';
      
      const [
        contactsRes,
        companiesRes,
        momsRes
      ] = await Promise.all([
        getAllCustomersByUserId(userId).catch(() => []),
        getCompanies().catch(() => []),
        getAllMomDetails().catch(() => [])
      ]);

      const contactsArr = Array.isArray(contactsRes?.data) ? contactsRes.data : Array.isArray(contactsRes) ? contactsRes : [];
      const companiesArr = Array.isArray(companiesRes?.data) ? companiesRes.data : Array.isArray(companiesRes) ? companiesRes : [];
      const momsArr = Array.isArray(momsRes?.data) ? momsRes.data : Array.isArray(momsRes) ? momsRes : [];

      setContacts(contactsArr);
      setCompanies(companiesArr);
      setMoms(momsArr);

      // Collapse all by default on initial load
      setExpandedCompanies({});

    } catch (error) {
      console.error('Error fetching contacts databases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContactsData();
  }, []);

  // Expand matching companies automatically when filtering with a search query
  useEffect(() => {
    if (searchQuery.trim() !== '') {
      const expandState = {};
      contacts.forEach(c => {
        const query = searchQuery.toLowerCase();
        const fullName = `${c.firstName || ''} ${c.lastName || ''} ${c.contactPerson || c.name || ''}`.toLowerCase();
        const isMatch =
          fullName.includes(query) ||
          (c.companyName && c.companyName.toLowerCase().includes(query)) ||
          (c.email && c.email.toLowerCase().includes(query)) ||
          (c.phoneNo && c.phoneNo.toLowerCase().includes(query)) ||
          (c.phone && c.phone.toLowerCase().includes(query)) ||
          (c.designation && c.designation.toLowerCase().includes(query)) ||
          (c.companyAddress && c.companyAddress.toLowerCase().includes(query)) ||
          (c.address && c.address.toLowerCase().includes(query)) ||
          (c.locationName && c.locationName.toLowerCase().includes(query)) ||
          (c.city && c.city.toLowerCase().includes(query));

        if (isMatch) {
          const companyKey = c.companyName || 'Unassigned corporate';
          expandState[companyKey] = true;
        }
      });
      setExpandedCompanies(expandState);
    }
  }, [searchQuery, contacts]);

  const toggleCompanyAccordion = (companyName) => {
    setExpandedCompanies((prev) => ({
      ...prev,
      [companyName]: !prev[companyName]
    }));
  };

  // Autocomplete color palette for avatar
  const getAvatarColor = (name) => {
    const colors = [
      'bg-blue-600 text-blue-100',
      'bg-emerald-600 text-emerald-100',
      'bg-indigo-600 text-indigo-100',
      'bg-rose-600 text-rose-100',
      'bg-amber-600 text-amber-100',
      'bg-purple-600 text-purple-100'
    ];
    const code = (name || 'A').charCodeAt(0);
    return colors[code % colors.length];
  };

  // Extract unique options for filter dropdowns & autocomplete suggestions
  const uniqueCompanies = Array.from(
    new Set([
      ...companies.map((c) => (typeof c === 'string' ? c : c?.name || c?.companyName || c?.label || '').trim()),
      ...contacts.map((c) => (c.companyName || '').trim())
    ].filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  // Handle company selection/change and auto-fetch existing company address
  const handleCompanyNameChange = (val) => {
    const trimmed = val.trim().toLowerCase();

    // Look up address in existing contact records first
    const matchedContact = contacts.find((c) => {
      const cName = (c.companyName || '').trim().toLowerCase();
      return cName === trimmed;
    });

    // Look up in companies database array if not found in contacts
    const matchedCompany = companies.find((comp) => {
      const name = (typeof comp === 'string' ? comp : comp?.name || comp?.companyName || comp?.label || '').trim().toLowerCase();
      return name === trimmed;
    });

    const autoAddress =
      matchedContact?.companyAddress ||
      matchedContact?.address ||
      matchedContact?.locationName ||
      matchedContact?.company_address ||
      matchedContact?.city ||
      (typeof matchedCompany === 'object'
        ? matchedCompany?.companyAddress || matchedCompany?.address || matchedCompany?.locationName || matchedCompany?.city
        : '');

    setContactForm((prev) => ({
      ...prev,
      companyName: val,
      ...(autoAddress ? { address: autoAddress } : {})
    }));
  };

  const uniqueDesignations = Array.from(
    new Set(contacts.map((c) => (c.designation || 'Representative').trim()).filter(Boolean))
  ).sort();

  const uniqueCustomerTypes = Array.from(
    new Set(contacts.map((c) => (c.customerType || 'Customer').trim()).filter(Boolean))
  ).sort();

  // Filter & sort flat list of contacts
  const getFilteredContactsList = () => {
    return contacts.filter((c) => {
      const query = searchQuery.toLowerCase();
      const fullName = `${c.firstName || ''} ${c.lastName || ''} ${c.contactPerson || c.name || ''}`.toLowerCase();
      const compName = (c.companyName || 'Unassigned corporate').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phoneNo || c.phone || '').toLowerCase();
      const designation = (c.designation || 'Representative').toLowerCase();
      const city = (c.companyAddress || c.address || c.locationName || c.company_address || c.city || '').toLowerCase();

      // Text query match
      const matchesSearch =
        searchQuery === '' ||
        fullName.includes(query) ||
        compName.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        designation.includes(query) ||
        city.includes(query);

      // Company match
      const matchesCompany =
        companyFilter === 'ALL' ||
        (c.companyName || 'Unassigned corporate') === companyFilter;

      // Designation match
      const matchesDesignation =
        designationFilter === 'ALL' ||
        (c.designation || 'Representative') === designationFilter;

      // Customer type match
      const matchesType =
        typeFilter === 'ALL' ||
        (c.customerType || 'Customer') === typeFilter;

      return matchesSearch && matchesCompany && matchesDesignation && matchesType;
    }).sort((a, b) => {
      let fieldA = '';
      let fieldB = '';

      if (sortField === 'name') {
        fieldA = `${a.firstName || ''} ${a.lastName || ''} ${a.contactPerson || a.name || ''}`.toLowerCase();
        fieldB = `${b.firstName || ''} ${b.lastName || ''} ${b.contactPerson || b.name || ''}`.toLowerCase();
      } else if (sortField === 'company') {
        fieldA = (a.companyName || 'Unassigned corporate').toLowerCase();
        fieldB = (b.companyName || 'Unassigned corporate').toLowerCase();
      } else if (sortField === 'designation') {
        fieldA = (a.designation || 'Representative').toLowerCase();
        fieldB = (b.designation || 'Representative').toLowerCase();
      }

      if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
      if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filteredFlatContacts = getFilteredContactsList();

  // Group contacts by company for Accordion view
  const getGroupedContacts = () => {
    const grouped = {};
    filteredFlatContacts.forEach((c) => {
      const companyKey = c.companyName || 'Unassigned corporate';
      if (!grouped[companyKey]) {
        grouped[companyKey] = [];
      }
      grouped[companyKey].push(c);
    });

    return Object.entries(grouped);
  };

  const groupedContacts = getGroupedContacts();

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    companyFilter !== 'ALL' ||
    designationFilter !== 'ALL' ||
    typeFilter !== 'ALL';

  const handleResetFilters = () => {
    setSearchQuery('');
    setCompanyFilter('ALL');
    setDesignationFilter('ALL');
    setTypeFilter('ALL');
    setSortField('name');
    setSortOrder('asc');
  };

  // Create new contact submission
  const handleCreateContact = async (e) => {
    e.preventDefault();
    
    // Strict mobile-equivalent validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneNoClean = String(contactForm.phoneNo || '').replace(/\D/g, '');

    if (!contactForm.firstName.trim()) {
      alert('First name is required.');
      return;
    }
    if (!contactForm.lastName.trim()) {
      alert('Last name is required.');
      return;
    }
    if (!contactForm.designation.trim()) {
      alert('Designation is required.');
      return;
    }
    if (!contactForm.companyName.trim()) {
      alert('Company name is required.');
      return;
    }
    if (!contactForm.customerType.trim()) {
      alert('Customer Type is required.');
      return;
    }
    if (!contactForm.email.trim() || !emailRegex.test(contactForm.email.trim())) {
      alert('Please enter a valid email address.');
      return;
    }
    if (phoneNoClean.length !== 10) {
      alert('Phone number must be exactly 10 digits.');
      return;
    }
    if (!contactForm.address.trim()) {
      alert('Address is required.');
      return;
    }

    try {
      const payload = {
        firstName: contactForm.firstName.trim(),
        lastName: contactForm.lastName.trim(),
        designation: contactForm.designation.trim(),
        customerType: contactForm.customerType.trim(),
        companyName: contactForm.companyName.trim(),
        address: contactForm.address.trim(),
        companyAddress: contactForm.address.trim(), // Support backend key mismatch
        email: contactForm.email.trim(),
        phoneNo: phoneNoClean,
        name: `${contactForm.firstName} ${contactForm.lastName}`.trim(),
        contactPerson: `${contactForm.firstName} ${contactForm.lastName}`.trim()
      };
      
      await saveCustomerWithCompany(payload);
      alert('Customer contact created successfully!');
      setShowAddModal(false);
      // Reset form
      setContactForm({ firstName: '', lastName: '', designation: '', companyName: '', customerType: 'Customer', email: '', phoneNo: '', address: '' });
      fetchContactsData();
    } catch (err) {
      alert('Failed to save contact: ' + (err?.response?.data?.message || err?.response?.data?.error || err.message));
    }
  };

  // Update existing contact submission
  const handleUpdateContact = async (e) => {
    e.preventDefault();
    
    // Strict mobile-equivalent validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneNoClean = String(contactForm.phoneNo || '').replace(/\D/g, '');

    if (!contactForm.firstName.trim()) {
      alert('First name is required.');
      return;
    }
    if (!contactForm.lastName.trim()) {
      alert('Last name is required.');
      return;
    }
    if (!contactForm.designation.trim()) {
      alert('Designation is required.');
      return;
    }
    if (!contactForm.companyName.trim()) {
      alert('Company name is required.');
      return;
    }
    if (!contactForm.customerType.trim()) {
      alert('Customer Type is required.');
      return;
    }
    if (!contactForm.email.trim() || !emailRegex.test(contactForm.email.trim())) {
      alert('Please enter a valid email address.');
      return;
    }
    if (phoneNoClean.length !== 10) {
      alert('Phone number must be exactly 10 digits.');
      return;
    }
    if (!contactForm.address.trim()) {
      alert('Address is required.');
      return;
    }

    try {
      const payload = {
        id: selectedContact.id,
        userId: selectedContact.userId || localStorage.getItem('userId') || '',
        companyId: selectedContact.companyId,
        firstName: contactForm.firstName.trim(),
        lastName: contactForm.lastName.trim(),
        designation: contactForm.designation.trim(),
        customerType: contactForm.customerType.trim(),
        companyName: contactForm.companyName.trim(),
        company_name: contactForm.companyName.trim(),
        address: contactForm.address.trim(),
        companyAddress: contactForm.address.trim(),
        company_address: contactForm.address.trim(),
        locationName: contactForm.address.trim(),
        city: contactForm.address.trim(),
        email: contactForm.email.trim(),
        phoneNo: phoneNoClean,
        name: `${contactForm.firstName} ${contactForm.lastName}`.trim(),
        contactPerson: `${contactForm.firstName} ${contactForm.lastName}`.trim()
      };
      
      // Save/Update company details & address mapping via saveCustomerWithCompany
      try {
        await saveCustomerWithCompany(payload);
      } catch (saveErr) {
        console.warn('saveCustomerWithCompany update fallback warning:', saveErr);
      }

      await updateCustomer(payload);
      alert('Customer contact updated successfully!');
      setShowEditModal(false);
      setSelectedContact(null);
      fetchContactsData();
    } catch (err) {
      alert('Failed to update contact: ' + (err?.response?.data?.message || err?.response?.data?.error || err.message));
    }
  };

  // Delete customer by ID
  const handleDeleteContact = async (c) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${c.firstName || c.name || 'this contact'}?`);
    if (!confirmDelete) return;

    try {
      await deleteCustomerById(c.id);
      alert('Customer contact deleted.');
      fetchContactsData();
    } catch (err) {
      alert('Failed to delete contact: ' + (err?.response?.data?.message || err.message));
    }
  };

  // Open Edit Contact sheet
  const openEditSheet = (c) => {
    setSelectedContact(c);
    setContactForm({
      firstName: c.firstName || c.name?.split(' ')[0] || c.contactPerson?.split(' ')[0] || '',
      lastName: c.lastName || c.name?.split(' ').slice(1).join(' ') || c.contactPerson?.split(' ').slice(1).join(' ') || '',
      designation: c.designation || '',
      companyName: c.companyName || '',
      customerType: c.customerType || 'Customer',
      email: c.email || '',
      phoneNo: c.phoneNo || c.phone || '',
      address: c.companyAddress || c.address || c.locationName || c.company_address || c.city || ''
    });
    setShowEditModal(true);
  };

  // Open Meeting History (MOM) timeline
  const openMOMHistory = (c) => {
    setSelectedContact(c);
    const matchedMoms = moms.filter((mom) => {
      return (
        mom.meetingLogId === c.id ||
        (mom.companyName && c.companyName && mom.companyName.toLowerCase() === c.companyName.toLowerCase())
      );
    });
    setSelectedContactMoms(matchedMoms);
    setShowMomHistoryModal(true);
  };

  // Submit quick meeting scheduler
  const handleQuickMeeting = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        companyName: selectedContact.companyName || '',
        contactPersonName: `${selectedContact.firstName || ''} ${selectedContact.lastName || ''}`.trim() || selectedContact.contactPerson || selectedContact.name || '',
        locationName: meetingForm.locationName,
        startTime: meetingForm.startTime + ':00',
        endTime: meetingForm.endTime + ':00'
      };
      await saveMeetingLog(payload);
      alert('Quick meeting logged successfully!');
      setShowMeetingModal(false);
      setMeetingForm({ locationName: '', startTime: '', endTime: '' });
      fetchContactsData();
    } catch (err) {
      alert('Failed to log meeting: ' + (err?.response?.data?.message || err.message));
    }
  };

  // Submit quick call logger
  const handleQuickCall = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        customerId: selectedContact.id || null,
        ...callForm
      };
      await saveOrUpdateCall(payload);
      alert('Quick call logged successfully!');
      setShowCallModal(false);
      setCallForm({ relatedTo: 'ACCOUNTS', callType: 'OUTGOING', callResult: 'INTERESTED', subject: '', description: '', notes: '' });
      fetchContactsData();
    } catch (err) {
      alert('Failed to log call: ' + (err?.response?.data?.message || err.message));
    }
  };

  // Excel batch spreadsheet upload helper
  const handleExcelImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsLoading(true);
    try {
      await uploadCustomersExcel(formData);
      alert('Batch customer spreadsheet imported successfully!');
      fetchContactsData();
    } catch (error) {
      alert('Failed to import Excel: ' + (error?.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100 relative z-20 pb-20">
      
      {/* HEADER CONTROLS & FILTER BAR */}
      <div className="flex flex-col gap-4 bg-[#0b1628]/60 border border-white/5 p-5 rounded-2xl shadow-lg animate-fade">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search contacts, companies, email, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 shadow-inner"
            />
          </div>

          {/* View Toggles & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* View Mode Toggle Buttons */}
            <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Table View"
              >
                <Table className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'grouped'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Company Grouped View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Grouped</span>
              </button>
            </div>

            {/* Refresh Action */}
            <button
              onClick={fetchContactsData}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 hover:border-blue-500/20 text-slate-400 hover:text-white transition shadow"
              title="Refresh list"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            {/* Add Contact Button */}
            <button
              onClick={() => {
                setContactForm({ firstName: '', lastName: '', designation: '', companyName: '', customerType: 'Customer', email: '', phoneNo: '', address: '' });
                setShowAddModal(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg transition flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Contact
            </button>
          </div>
        </div>

        {/* FILTERS PANEL STRIP */}
        <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <Filter className="h-3.5 w-3.5 text-blue-400" />
              Filters:
            </span>

            {/* Company Dropdown Filter */}
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-200 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
            >
              <option value="ALL">All Companies ({uniqueCompanies.length})</option>
              {uniqueCompanies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Designation Dropdown Filter */}
            <select
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-200 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
            >
              <option value="ALL">All Designations ({uniqueDesignations.length})</option>
              {uniqueDesignations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Customer Type Dropdown Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-200 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
            >
              <option value="ALL">All Customer Types</option>
              {uniqueCustomerTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 font-semibold transition"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Filters
              </button>
            )}
          </div>

          <div className="text-slate-400 font-medium text-[11px] font-mono">
            Showing <strong className="text-white">{filteredFlatContacts.length}</strong> of {contacts.length} Contacts
          </div>
        </div>
      </div>

      {/* DATA VIEW CONTAINER */}
      {viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-[#0c1220]/60 border border-white/5 rounded-2xl overflow-hidden shadow-xl animate-fade">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-white/10 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th
                    className="py-3.5 px-5 cursor-pointer hover:text-white transition select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Representative</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-500" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-5 cursor-pointer hover:text-white transition select-none"
                    onClick={() => handleSort('company')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Company / Corporate</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-500" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-5 cursor-pointer hover:text-white transition select-none"
                    onClick={() => handleSort('designation')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Designation</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-5">Contact Details</th>
                  <th className="py-3.5 px-5">Address / Location</th>
                  <th className="py-3.5 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-200">
                {filteredFlatContacts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <UserCheck className="h-8 w-8 text-slate-600 opacity-40" />
                        <p className="text-sm">No contacts match the selected search & filter criteria.</p>
                        {hasActiveFilters && (
                          <button
                            onClick={handleResetFilters}
                            className="mt-2 text-blue-400 hover:underline font-semibold text-xs"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredFlatContacts.map((contact) => {
                    const displayName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.contactPerson || contact.name || 'Unassigned';

                    return (
                      <tr
                        key={contact.id}
                        className="hover:bg-slate-900/60 transition-colors duration-150 group"
                      >
                        {/* Representative Name & Avatar */}
                        <td className="py-3.5 px-5 font-semibold text-slate-100">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-9 w-9 rounded-full flex items-center justify-center font-bold border border-white/5 text-xs shrink-0 uppercase ${getAvatarColor(
                                displayName
                              )}`}
                            >
                              {displayName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-100 text-sm">{displayName}</div>
                              <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-mono font-medium inline-block mt-0.5">
                                {contact.customerType || 'Customer'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Company */}
                        <td className="py-3.5 px-5 font-medium text-slate-200">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span>{contact.companyName || 'Unassigned corporate'}</span>
                          </div>
                        </td>

                        {/* Designation */}
                        <td className="py-3.5 px-5 text-slate-300 font-medium">
                          <span 
                            className="bg-slate-800/80 px-2.5 py-1 rounded-md text-slate-300 border border-white/5 inline-block max-w-[150px] truncate align-middle"
                            title={contact.designation || 'Representative'}
                          >
                            {contact.designation || 'Representative'}
                          </span>
                        </td>

                        {/* Contact Phone & Email */}
                        <td className="py-3.5 px-5 space-y-1">
                          <div className="flex items-center gap-2 text-slate-300 font-mono">
                            <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span>{contact.phoneNo || contact.phone || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 truncate max-w-[200px]">
                            <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{contact.email || 'N/A'}</span>
                          </div>
                        </td>

                        {/* Address / Location */}
                        <td className="py-3.5 px-5 text-slate-300">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[160px]">
                              {contact.companyAddress || contact.address || contact.locationName || contact.company_address || contact.city || 'N/A'}
                            </span>
                          </div>
                        </td>

                        {/* Quick Action Buttons */}
                        <td className="py-3.5 px-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedContact(contact);
                                setMeetingForm({
                                  locationName: contact.companyAddress || contact.address || contact.locationName || contact.company_address || contact.city || '',
                                  startTime: '',
                                  endTime: ''
                                });
                                setShowMeetingModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold shadow-sm"
                              title="Schedule / Log Meeting"
                            >
                              <Calendar className="h-3.5 w-3.5 text-blue-400" />
                              <span>Meeting</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedContact(contact);
                                setShowCallModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-sm"
                              title="Log Call Outcome"
                            >
                              <Phone className="h-3.5 w-3.5 text-emerald-400" />
                              <span>Call</span>
                            </button>

                            <button
                              onClick={() => openMOMHistory(contact)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600/25 to-orange-600/25 border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-sm"
                              title="View MOM History Log"
                            >
                              <HistoryIcon className="h-3.5 w-3.5 text-amber-400" />
                              <span>History</span>
                            </button>

                            <button
                              onClick={() => openEditSheet(contact)}
                              className="p-2 rounded-xl bg-slate-800/80 text-slate-400 border border-white/10 shadow-sm hover:text-blue-300 transition-colors"
                              title="Edit Representative"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteContact(contact)}
                              className="p-2 rounded-xl bg-slate-800/80 text-slate-400 border border-white/10 shadow-sm hover:text-rose-400 transition-colors"
                              title="Delete Contact"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ACCORDION GROUPED VIEW */
        <div className="space-y-4 animate-fade">
          {groupedContacts.map(([companyName, reps]) => {
            const isOpen = expandedCompanies[companyName];
            return (
              <div
                key={companyName}
                className="bg-[#0c1220]/40 border border-white/5 rounded-2xl overflow-hidden shadow-sm"
              >
                {/* Accordion header card */}
                <div
                  onClick={() => toggleCompanyAccordion(companyName)}
                  className="p-4 bg-slate-900/40 hover:bg-slate-900/60 transition cursor-pointer flex justify-between items-center select-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    <h3 className="font-extrabold text-slate-200 text-sm tracking-wide">{companyName}</h3>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-bold">
                      {reps.length} {reps.length === 1 ? 'Contact' : 'Contacts'}
                    </span>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>

                {/* Nested representative list */}
                {isOpen && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-white/5 animate-fade bg-[#0a0f1b]/20">
                    {reps.map((contact) => {
                      const displayName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.contactPerson || contact.name || 'Unassigned';
                      
                      return (
                        <div
                          key={contact.id}
                          className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-blue-500/25 hover:bg-slate-900/90 transition-all duration-300 relative group shadow-sm"
                        >
                          {/* Upper row header */}
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold border border-white/5 text-sm shrink-0 uppercase ${getAvatarColor(displayName)}`}>
                                {displayName.charAt(0)}
                              </div>
                              <div className="pr-4 truncate">
                                <h4 className="font-bold text-slate-100 text-sm truncate">{displayName}</h4>
                                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold truncate">
                                  {contact.designation || 'Representative'}
                                </p>
                              </div>
                            </div>

                            {/* Quick Edit/Delete drawer shortcuts */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => openEditSheet(contact)}
                                className="p-1 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded transition"
                                title="Edit Representative"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteContact(contact)}
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                                title="Delete Contact"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Contact details middle section */}
                          <div className="my-4 pt-3 border-t border-white/5 space-y-2 text-xs text-slate-300">
                            <p className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                              <span>{contact.phoneNo || contact.phone || 'No phone number'}</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                              <span className="truncate">{contact.email || 'No email address'}</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              <span className="truncate">{contact.companyAddress || contact.address || contact.locationName || contact.company_address || contact.city || 'N/A'}</span>
                            </p>
                          </div>

                          {/* Action buttons panel */}
                          <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3.5 mt-2">
                            <button
                              onClick={() => {
                                setSelectedContact(contact);
                                setMeetingForm({ locationName: contact.companyAddress || contact.address || contact.locationName || contact.company_address || contact.city || '', startTime: '', endTime: '' });
                                setShowMeetingModal(true);
                              }}
                              className="py-2 px-2.5 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <Calendar className="h-3.5 w-3.5 text-blue-400" />
                              <span>Meeting</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedContact(contact);
                                setShowCallModal(true);
                              }}
                              className="py-2 px-2.5 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <Phone className="h-3.5 w-3.5 text-emerald-400" />
                              <span>Call</span>
                            </button>
                            <button
                              onClick={() => openMOMHistory(contact)}
                              className="py-2 px-2.5 bg-gradient-to-r from-amber-600/25 to-orange-600/25 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <HistoryIcon className="h-3.5 w-3.5 text-amber-400" />
                              <span>History</span>
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {groupedContacts.length === 0 && (
            <div className="py-16 text-center text-slate-500 text-sm border border-dashed border-white/5 rounded-2xl bg-slate-950/10">
              No contacts or company accounts match your filter query.
            </div>
          )}
        </div>
      )}

      {/* FLOATING ACTION BUTTON: IMPORT EXCEL */}
      <div className="fixed bottom-6 right-6 z-40">
        <label className="flex items-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-bold shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer">
          <Upload className="h-4.5 w-4.5" />
          Import Excel
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleExcelImport}
            className="hidden"
          />
        </label>
      </div>

      {/* MODAL 1: ADD CONTACT MODAL */}
      {showAddModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
            }
          }}
          className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-fade relative max-h-[90vh] overflow-y-auto hide-scrollbar cursor-default"
          >
            
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-slate-100">Add Account Representative</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">First Name (Required)</label>
                  <input
                    type="text"
                    placeholder="Rajesh"
                    value={contactForm.firstName}
                    onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Last Name</label>
                  <input
                    type="text"
                    placeholder="Kumar"
                    value={contactForm.lastName}
                    onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Company Account Name (Required)</label>
                <input
                  type="text"
                  list="company-suggestions-list"
                  placeholder="Acme Corporation"
                  value={contactForm.companyName}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  required
                />
                <datalist id="company-suggestions-list">
                  {uniqueCompanies.map((comp) => (
                    <option key={comp} value={comp} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Designation Role</label>
                  <input
                    type="text"
                    placeholder="Purchasing Officer"
                    value={contactForm.designation}
                    onChange={(e) => setContactForm({ ...contactForm, designation: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Customer Type</label>
                  <select
                    value={contactForm.customerType}
                    onChange={(e) => setContactForm({ ...contactForm, customerType: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                  >
                    <option value="Customer">Customer</option>
                    <option value="Partner">Partner</option>
                    <option value="Lead">Lead</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Email Address</label>
                  <input
                    type="email"
                    placeholder="rajesh@acme.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Phone Number (min 10 digits)</label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    value={contactForm.phoneNo}
                    onChange={(e) => setContactForm({ ...contactForm, phoneNo: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Physical Location Address</label>
                <input
                  type="text"
                  placeholder="Street and office building"
                  value={contactForm.address}
                  onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
              >
                CREATE CUSTOMER CONTACT
              </button>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT CONTACT MODAL */}
      {showEditModal && selectedContact && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false);
              setSelectedContact(null);
            }
          }}
          className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-fade relative max-h-[90vh] overflow-y-auto hide-scrollbar cursor-default"
          >
            
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-slate-100">Edit Representative Profile</h3>
              <button onClick={() => { setShowEditModal(false); setSelectedContact(null); }} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateContact} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">First Name (Required)</label>
                  <input
                    type="text"
                    value={contactForm.firstName}
                    onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Last Name</label>
                  <input
                    type="text"
                    value={contactForm.lastName}
                    onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Company Account Name (Required)</label>
                <input
                  type="text"
                  list="company-suggestions-list"
                  value={contactForm.companyName}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Designation Role</label>
                  <input
                    type="text"
                    value={contactForm.designation}
                    onChange={(e) => setContactForm({ ...contactForm, designation: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Customer Type</label>
                  <select
                    value={contactForm.customerType}
                    onChange={(e) => setContactForm({ ...contactForm, customerType: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                  >
                    <option value="Customer">Customer</option>
                    <option value="Partner">Partner</option>
                    <option value="Lead">Lead</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Email Address</label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Phone Number</label>
                  <input
                    type="text"
                    value={contactForm.phoneNo}
                    onChange={(e) => setContactForm({ ...contactForm, phoneNo: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Physical Location Address</label>
                <input
                  type="text"
                  value={contactForm.address}
                  onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
              >
                APPLY PROFILE CHANGES
              </button>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: MOM HISTORY TIMELINE OVERLAY */}
      {showMomHistoryModal && selectedContact && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMomHistoryModal(false);
              setSelectedContact(null);
            }
          }}
          className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl animate-fade relative max-h-[85vh] flex flex-col cursor-default"
          >
            
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                  <HistoryIcon className="h-5 w-5 text-indigo-400" />
                  MOM History log
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Account: {selectedContact.companyName} • Contact: {selectedContact.firstName || selectedContact.name}</p>
              </div>
              <button
                onClick={() => { setShowMomHistoryModal(false); setSelectedContact(null); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Timeline scroll container */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {selectedContactMoms.map((mom, idx) => (
                <div
                  key={mom.id || idx}
                  className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-2 text-xs relative pl-6"
                >
                  {/* Timeline bullet indicator */}
                  <span className="absolute left-2.5 top-5 h-2 w-2 rounded-full bg-indigo-500"></span>
                  <span className="absolute left-[13px] top-[26px] bottom-0 w-[1px] bg-slate-800"></span>
                  
                  <div className="flex justify-between items-center flex-wrap gap-2 text-slate-500 font-semibold font-mono">
                    <span>Logged Engagement #{selectedContactMoms.length - idx}</span>
                    <span>{mom.createdAt ? new Date(mom.createdAt).toLocaleDateString() : 'Historical'}</span>
                  </div>

                  <p className="text-slate-200 leading-relaxed font-medium">{mom.momDescription}</p>

                  <div className="border-t border-white/5 pt-2 mt-2 flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Products: {mom.productSuitPitched || 'None'}</span>
                    <span>Value: {formatCr(parseBudgetToCr(mom.dealValue))}</span>
                  </div>
                </div>
              ))}

              {selectedContactMoms.length === 0 && (
                <div className="py-16 text-center text-slate-500 text-xs font-semibold italic">
                  No historical touchpoint Minutes of Meetings logged for this contact.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: QUICK MEETING LOG MODAL */}
      {showMeetingModal && selectedContact && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMeetingModal(false);
              setSelectedContact(null);
            }
          }}
          className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-fade cursor-default"
          >
            
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <Calendar className="h-5 w-5 text-blue-400" />
                Schedule Quick Meeting
              </h3>
              <button onClick={() => { setShowMeetingModal(false); setSelectedContact(null); }} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickMeeting} className="space-y-4">
              <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 text-xs text-slate-400">
                <p><span className="font-bold text-slate-200">Company:</span> {selectedContact.companyName}</p>
                <p><span className="font-bold text-slate-200">Contact:</span> {selectedContact.firstName || selectedContact.name}</p>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Meeting Location / Address</label>
                <input
                  type="text"
                  placeholder="e.g. Head Office, Mumbai"
                  value={meetingForm.locationName}
                  onChange={(e) => setMeetingForm({ ...meetingForm, locationName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Start Time</label>
                  <input
                    type="datetime-local"
                    value={meetingForm.startTime}
                    onChange={(e) => setMeetingForm({ ...meetingForm, startTime: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">End Time</label>
                  <input
                    type="datetime-local"
                    value={meetingForm.endTime}
                    onChange={(e) => setMeetingForm({ ...meetingForm, endTime: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
              >
                LOG MEETING SCHEDULER
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: QUICK CALL LOG MODAL */}
      {showCallModal && selectedContact && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCallModal(false);
              setSelectedContact(null);
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
                <Phone className="h-5 w-5 text-emerald-400" />
                Log Quick Phone Call
              </h3>
              <button onClick={() => { setShowCallModal(false); setSelectedContact(null); }} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCall} className="space-y-4">
              <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 text-xs text-slate-400">
                <p><span className="font-bold text-slate-200">Company:</span> {selectedContact.companyName}</p>
                <p><span className="font-bold text-slate-200">Contact:</span> {selectedContact.firstName || selectedContact.name}</p>
                <p><span className="font-bold text-slate-200">Call Dialer:</span> <a href={`tel:${selectedContact.phoneNo || selectedContact.phone}`} className="text-emerald-400 underline font-mono">{selectedContact.phoneNo || selectedContact.phone || 'No phone'}</a></p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Call Type</label>
                  <select
                    value={callForm.callType}
                    onChange={(e) => setCallForm({ ...callForm, callType: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                  >
                    <option value="OUTGOING">Outgoing</option>
                    <option value="INCOMING">Incoming</option>
                    <option value="MISSED">Missed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Call Result</label>
                  <select
                    value={callForm.callResult}
                    onChange={(e) => setCallForm({ ...callForm, callResult: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-300"
                  >
                    <option value="INTERESTED">Interested</option>
                    <option value="NOT_INTERESTED">Not Interested</option>
                    <option value="NO_RESPONSE">No Response</option>
                    <option value="BUSY">Busy</option>
                    <option value="CONVERTED">Converted</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Proposal Discussion follow-up"
                  value={callForm.subject}
                  onChange={(e) => setCallForm({ ...callForm, subject: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Summary Details</label>
                <textarea
                  rows="3"
                  placeholder="Record summary details..."
                  value={callForm.notes}
                  onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-sm focus:outline-none focus:border-blue-500 resize-none text-slate-100"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
              >
                LOG TELEPHONE CALL
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
