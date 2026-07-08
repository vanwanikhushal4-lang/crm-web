import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Share2,
  Users,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Building,
  RefreshCw,
  Folder,
  FolderOpen
} from 'lucide-react';
import {
  getSalesManagers,
  getAllCustomersByUserId,
  getCompanies,
  transferCustomers
} from '../../api/apiFunctions/Login/Login_api_function';

// Extraction helpers
const extractList = (res) => {
  const candidates = [
    res?.data?.data,
    res?.data?.content,
    res?.data?.salesManagers,
    res?.data?.users,
    res?.data,
    res?.content,
    res,
  ];
  return candidates.find(Array.isArray) || [];
};

const cleanText = (value) => String(value ?? '').trim();

const getManagerId = (manager) =>
  manager?.id ?? manager?.userId ?? manager?.user_id ?? manager?.salesman_id ?? manager?.salesmanId;

const getManagerName = (manager) => {
  const firstName = cleanText(manager?.firstName || manager?.firstname || manager?.first_name);
  const lastName = cleanText(manager?.lastName || manager?.lastname || manager?.last_name);
  return (
    `${firstName} ${lastName}`.trim() ||
    cleanText(manager?.fullName || manager?.fullname || manager?.name || manager?.username || manager?.email) ||
    'Unnamed User'
  );
};

const getManagerEmail = (manager) => cleanText(manager?.email || manager?.mail || manager?.emailId);
const getManagerPhone = (manager) =>
  cleanText(manager?.mobileNumber || manager?.mobile || manager?.phoneNo || manager?.phone || manager?.contactNo);
const getManagerRole = (manager) =>
  cleanText(manager?.designation || manager?.role || manager?.organizationDetails?.role || 'Sales Manager');

const getCustomerId = (customer) => customer?.id ?? customer?.customerId ?? customer?.customer_id;
const getCustomerName = (customer) => {
  const firstName = cleanText(customer?.firstName || customer?.firstname || customer?.first_name);
  const lastName = cleanText(customer?.lastName || customer?.lastname || customer?.last_name);
  return `${firstName} ${lastName}`.trim() || cleanText(customer?.customerName || customer?.name) || 'Unknown Contact';
};

const getCustomerCompanyName = (customer, companyNameById) => {
  const companyId = customer?.companyId ?? customer?.company_id ?? customer?.company?.id;
  return (
    cleanText(customer?.companyName || customer?.company_name || customer?.company?.name) ||
    cleanText(companyNameById[String(companyId)]) ||
    'Unassigned Corporate'
  );
};

export default function ShareContactTab() {
  const [managers, setManagers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [companyNameById, setCompanyNameById] = useState({});
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState(new Set());
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // Accordion expanded state inside transfer modal
  const [expandedCompanies, setExpandedCompanies] = useState({});

  useEffect(() => {
    const id = localStorage.getItem('userId');
    if (id) {
      setCurrentUserId(id);
    }
    fetchManagersData();
  }, []);

  const fetchManagersData = async () => {
    setIsLoading(true);
    try {
      const res = await getSalesManagers();
      setManagers(extractList(res));
    } catch (error) {
      console.error('Error loading sales managers:', error);
      setManagers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyCustomersForTransfer = async () => {
    setIsLoadingCustomers(true);
    try {
      const userId = localStorage.getItem('userId') || '';
      const [customersRes, companiesRes] = await Promise.all([
        getAllCustomersByUserId(userId).catch(() => []),
        getCompanies().catch(() => [])
      ]);

      // Process companies catalog
      const companyList = extractList(companiesRes);
      const nextCompanyNameById = {};
      companyList.forEach((company) => {
        const id = company?.id ?? company?.companyId ?? company?.company_id;
        const name = company?.name ?? company?.companyName ?? company?.company_name;
        if (id != null && name) nextCompanyNameById[String(id)] = String(name);
      });
      setCompanyNameById(nextCompanyNameById);

      setCustomers(extractList(customersRes));
      setSelectedCustomerIds(new Set());
      setExpandedCompanies({});
    } catch (error) {
      console.error('Error fetching customers for transfer:', error);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const openTransferModal = (manager) => {
    setSelectedManager(manager);
    setShowTransferModal(true);
    setCustomerSearchQuery('');
    loadMyCustomersForTransfer();
  };

  const closeTransferModal = () => {
    setShowTransferModal(false);
    setSelectedManager(null);
    setCustomers([]);
    setSelectedCustomerIds(new Set());
  };

  const filteredManagers = useMemo(() => {
    let list = managers;
    // Exclude logged in salesperson
    if (currentUserId) {
      list = list.filter((manager) => String(getManagerId(manager)) !== String(currentUserId));
    }
    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase();
    return list.filter((manager) => {
      const name = getManagerName(manager).toLowerCase();
      const email = getManagerEmail(manager).toLowerCase();
      const phone = getManagerPhone(manager).toLowerCase();
      return name.includes(query) || email.includes(query) || phone.includes(query);
    });
  }, [managers, searchQuery, currentUserId]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers;
    const query = customerSearchQuery.toLowerCase();
    return customers.filter((cust) => {
      const name = getCustomerName(cust).toLowerCase();
      const company = getCustomerCompanyName(cust, companyNameById).toLowerCase();
      const designation = cleanText(cust?.designation).toLowerCase();
      return name.includes(query) || company.includes(query) || designation.includes(query);
    });
  }, [customers, customerSearchQuery, companyNameById]);

  const groupedCustomers = useMemo(() => {
    const groups = {};
    filteredCustomers.forEach((customer) => {
      const companyName = getCustomerCompanyName(customer, companyNameById);
      if (!groups[companyName]) groups[companyName] = [];
      groups[companyName].push(customer);
    });
    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b))
      .map((companyName) => ({
        companyName,
        contacts: groups[companyName].sort((a, b) => getCustomerName(a).localeCompare(getCustomerName(b))),
      }));
  }, [filteredCustomers, companyNameById]);

  // Autocomplete color palette for avatar
  const getAvatarColor = (name) => {
    const colors = [
      'bg-blue-600/30 text-blue-400 border-blue-500/20',
      'bg-emerald-600/30 text-emerald-400 border-emerald-500/20',
      'bg-indigo-600/30 text-indigo-400 border-indigo-500/20',
      'bg-purple-600/30 text-purple-400 border-purple-500/20',
      'bg-rose-600/30 text-rose-400 border-rose-500/20',
      'bg-amber-600/30 text-amber-400 border-amber-500/20'
    ];
    const code = (name || 'A').charCodeAt(0);
    return colors[code % colors.length];
  };

  const toggleSelectCustomer = (id) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectCompany = (companyReps) => {
    setSelectedCustomerIds((prev) => {
      const ids = companyReps.map(getCustomerId).filter((id) => id != null);
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      const next = new Set(prev);
      ids.forEach((id) => {
        if (allSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      });
      return next;
    });
  };

  const isAllCustomersSelected = useMemo(() => {
    if (filteredCustomers.length === 0) return false;
    return filteredCustomers.every((c) => selectedCustomerIds.has(getCustomerId(c)));
  }, [filteredCustomers, selectedCustomerIds]);

  const toggleSelectAll = () => {
    if (isAllCustomersSelected) {
      setSelectedCustomerIds((prev) => {
        const next = new Set(prev);
        filteredCustomers.forEach((c) => next.delete(getCustomerId(c)));
        return next;
      });
    } else {
      setSelectedCustomerIds((prev) => {
        const next = new Set(prev);
        filteredCustomers.forEach((c) => {
          const id = getCustomerId(c);
          if (id != null) next.add(id);
        });
        return next;
      });
    }
  };

  const handleShareSubmit = async () => {
    if (selectedCustomerIds.size === 0) {
      alert('Please select at least one customer to share.');
      return;
    }
    const targetManagerId = getManagerId(selectedManager);
    if (!targetManagerId) {
      alert('Invalid target teammate selected.');
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      const payload = {
        targetUserIds: [Number(targetManagerId)],
        customerIds: Array.from(selectedCustomerIds).map(Number)
      };
      await transferCustomers(payload);
      alert('Contacts shared successfully!');
      closeTransferModal();
    } catch (error) {
      console.error('Error sharing contacts:', error);
      alert('Failed to share contacts: ' + (error?.response?.data?.message || error.message));
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const toggleCompanyAccordion = (companyName) => {
    setExpandedCompanies((prev) => ({
      ...prev,
      [companyName]: !prev[companyName]
    }));
  };

  return (
    <div className="space-y-6 text-slate-100 relative z-20 pb-20">
      
      {/* SEARCH AND REFRESH HEADER */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-[#0b1628]/60 border border-white/5 p-5 rounded-2xl shadow-lg animate-fade">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search teammates by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <button
          onClick={fetchManagersData}
          disabled={isLoading}
          className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 hover:border-blue-500/20 text-slate-400 hover:text-white transition shadow self-start sm:self-auto shrink-0"
          title="Refresh list"
        >
          <RefreshCw className={`h-4.5 w-4.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
        </button>
      </div>

      {/* TEAMMATES DIRECTORY GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade">
        {filteredManagers.map((mgr) => {
          const name = getManagerName(mgr);
          const email = getManagerEmail(mgr);
          const phone = getManagerPhone(mgr);
          const role = getManagerRole(mgr);
          const avatarColor = getAvatarColor(name);

          return (
            <div
              key={getManagerId(mgr)}
              className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 hover:border-blue-500/25 hover:bg-slate-900/90 transition-all duration-300 flex flex-col justify-between shadow"
            >
              <div className="space-y-4">
                {/* Upper profile section */}
                <div className="flex items-center gap-3.5">
                  <div className={`h-12 w-12 rounded-2xl border flex items-center justify-center font-extrabold text-base shrink-0 uppercase tracking-wider ${avatarColor}`}>
                    {name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-slate-100 text-sm truncate">{name}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">{role}</p>
                  </div>
                </div>

                {/* Details layout */}
                <div className="space-y-2 border-t border-white/5 pt-4 text-xs text-slate-300">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className="truncate" title={email}>{email || 'No email address'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className="truncate">{phone || 'No mobile number'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => openTransferModal(mgr)}
                className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share Contacts
              </button>
            </div>
          );
        })}

        {filteredManagers.length === 0 && !isLoading && (
          <div className="col-span-full py-16 text-center text-slate-500 text-sm border border-dashed border-white/5 rounded-2xl bg-slate-950/10">
            No active sales teammates found.
          </div>
        )}
      </div>

      {/* SELECTION TRANSFER MODAL */}
      {showTransferModal && selectedManager && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeTransferModal();
            }
          }}
          className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-fade relative max-h-[85vh] flex flex-col cursor-default"
          >
            
            {/* Header info */}
            <div className="flex justify-between items-start border-b border-white/5 pb-4 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-blue-400" />
                  Share Contacts with {getManagerName(selectedManager)}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Recipient: {getManagerEmail(selectedManager)}</p>
              </div>
              <button onClick={closeTransferModal} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Local Search */}
            <div className="my-4 shrink-0 flex items-center gap-4 bg-slate-900/40 p-3 rounded-xl border border-white/5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search your owned contact list..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-950 border border-white/5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              {/* Select All Toggle */}
              {filteredCustomers.length > 0 && (
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAllCustomersSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-white/10 bg-slate-950 text-blue-600 focus:ring-0 focus:ring-offset-0 focus:outline-none"
                  />
                  Select All ({filteredCustomers.length})
                </label>
              )}
            </div>

            {/* List scroll panel */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 hide-scrollbar">
              {isLoadingCustomers ? (
                <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                  Loading your client registry...
                </div>
              ) : groupedCustomers.length > 0 ? (
                groupedCustomers.map(({ companyName, contacts }) => {
                  const isExpanded = expandedCompanies[companyName];
                  const companyContactIds = contacts.map(getCustomerId).filter(id => id != null);
                  const isCompanyAllSelected = companyContactIds.length > 0 && companyContactIds.every(id => selectedCustomerIds.has(id));
                  const isSomeSelected = companyContactIds.some(id => selectedCustomerIds.has(id)) && !isCompanyAllSelected;

                  return (
                    <div
                      key={companyName}
                      className="bg-slate-950/20 border border-white/5 rounded-xl overflow-hidden"
                    >
                      {/* Accordion company row */}
                      <div className="p-3 bg-slate-900/30 flex justify-between items-center hover:bg-slate-900/50 transition">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isCompanyAllSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isSomeSelected;
                            }}
                            onChange={() => toggleSelectCompany(contacts)}
                            className="h-4 w-4 rounded border-white/10 bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0 focus:outline-none"
                          />
                          <span className="text-xs font-extrabold text-slate-200 tracking-wide flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-blue-500" />
                            {companyName}
                          </span>
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-bold">
                            {contacts.length}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleCompanyAccordion(companyName)}
                          className="text-slate-400 hover:text-white p-1"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Reps checklist */}
                      {isExpanded && (
                        <div className="p-3 border-t border-white/5 bg-[#0a0f1b]/10 divide-y divide-white/5 space-y-2">
                          {contacts.map((contact) => {
                            const cId = getCustomerId(contact);
                            const cName = getCustomerName(contact);
                            const isChecked = selectedCustomerIds.has(cId);

                            return (
                              <div
                                key={cId}
                                onClick={() => toggleSelectCustomer(cId)}
                                className="flex items-center justify-between py-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}} // Handle on parent div click
                                    className="h-4 w-4 rounded border-white/10 bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0 focus:outline-none shrink-0"
                                  />
                                  <div>
                                    <p className="font-bold text-slate-200">{cName}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{contact.designation || 'Representative'}</p>
                                  </div>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono italic pr-2">{contact.city || 'Mumbai'}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center text-xs text-slate-500 italic">
                  No matching contact records found to share.
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="border-t border-white/5 pt-4 mt-4 shrink-0 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold font-mono">
                {selectedCustomerIds.size} Selected {selectedCustomerIds.size === 1 ? 'Contact' : 'Contacts'}
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={closeTransferModal}
                  disabled={isSubmittingTransfer}
                  className="px-4 py-2 border border-white/5 hover:border-white/15 text-slate-300 hover:text-white rounded-xl font-bold uppercase transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShareSubmit}
                  disabled={isSubmittingTransfer || selectedCustomerIds.size === 0}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold uppercase transition flex items-center gap-1.5 shadow"
                >
                  {isSubmittingTransfer ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5" />
                      Confirm Share
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
