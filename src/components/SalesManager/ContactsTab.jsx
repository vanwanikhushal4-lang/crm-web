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
  Clock
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

export default function ContactsTab() {
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [moms, setMoms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Group contacts by company
  const getGroupedContacts = () => {
    const grouped = {};
    
    // Filter contacts locally
    const filtered = contacts.filter((c) => {
      const query = searchQuery.toLowerCase();
      const fullName = `${c.firstName || ''} ${c.lastName || ''} ${c.contactPerson || c.name || ''}`.toLowerCase();
      return (
        searchQuery === '' ||
        fullName.includes(query) ||
        (c.companyName && c.companyName.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.phoneNo && c.phoneNo.toLowerCase().includes(query)) ||
        (c.phone && c.phone.toLowerCase().includes(query)) ||
        (c.designation && c.designation.toLowerCase().includes(query)) ||
        (c.city && c.city.toLowerCase().includes(query))
      );
    });

    filtered.forEach((c) => {
      const companyKey = c.companyName || 'Unassigned corporate';
      if (!grouped[companyKey]) {
        grouped[companyKey] = [];
      }
      grouped[companyKey].push(c);
    });

    return Object.entries(grouped);
  };

  const groupedContacts = getGroupedContacts();

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
      address: c.address || c.locationName || ''
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
      
      {/* HEADER SEARCH BAR & CREATE SHORTCUTS */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-[#0b1628]/60 border border-white/5 p-5 rounded-2xl shadow-lg animate-fade">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search representatives, companies, cities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/60 border border-white/5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Action */}
          <button
            onClick={fetchContactsData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 hover:border-blue-500/20 text-slate-400 hover:text-white transition shadow"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              setContactForm({ firstName: '', lastName: '', designation: '', companyName: '', customerType: 'Customer', email: '', phoneNo: '', address: '' });
              setShowAddModal(true);
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg transition flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE COMPANY ACCORDIONS */}
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

              {/* Nested representive list */}
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
                            <span className="truncate">{contact.address || contact.locationName || 'Mumbai Office'}</span>
                          </p>
                        </div>

                        {/* Action buttons panel */}
                        <div className="grid grid-cols-3 gap-1.5 border-t border-white/5 pt-3 mt-1">
                          <button
                            onClick={() => {
                              setSelectedContact(contact);
                              setMeetingForm({ locationName: contact.address || contact.locationName || '', startTime: '', endTime: '' });
                              setShowMeetingModal(true);
                            }}
                            className="py-1.5 bg-blue-600/10 hover:bg-blue-600 border border-blue-500/15 hover:border-blue-500 text-blue-400 hover:text-white rounded-lg text-[10px] font-bold transition text-center uppercase"
                          >
                            + Meeting
                          </button>
                          <button
                            onClick={() => {
                              setSelectedContact(contact);
                              setShowCallModal(true);
                            }}
                            className="py-1.5 bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/15 hover:border-emerald-500 text-emerald-400 hover:text-white rounded-lg text-[10px] font-bold transition text-center uppercase"
                          >
                            + Call
                          </button>
                          <button
                            onClick={() => openMOMHistory(contact)}
                            className="py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold transition text-center uppercase"
                          >
                            History
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
            No contacts or company accounts match your filter query "{searchQuery}"
          </div>
        )}
      </div>

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
                  placeholder="Acme Corporation"
                  value={contactForm.companyName}
                  onChange={(e) => setContactForm({ ...contactForm, companyName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                  required
                />
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
                  value={contactForm.companyName}
                  onChange={(e) => setContactForm({ ...contactForm, companyName: e.target.value })}
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
                    <span>Value: {mom.dealValue ? `${mom.dealValue} Cr` : 'TBD'}</span>
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
