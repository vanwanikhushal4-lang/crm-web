import { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Search, 
  TrendingUp, 
  Briefcase, 
  User, 
  Flame, 
  Sun, 
  FileText, 
  AlertCircle,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getAllLeads, getAllUsers } from '../../api/apiFunctions/Login/Login_api_function';

// Safe list extraction helper to match nested database schemas
const extractList = (response) => {
  const candidates = [
    response?.data?.data,
    response?.data?.content,
    response?.data?.leads,
    response?.data?.users,
    response?.data?.result,
    response?.data,
    response,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') {
      const nested = Object.values(candidate).find(Array.isArray);
      if (nested) return nested;
    }
  }
  return [];
};

// Replaces non-numeric characters and parses the deal value as a float
export const parseDealValue = (val) => {
  if (val == null || val === '') return 0;
  const num = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
  return isNaN(num) ? 0 : num;
};

// Formats monetary values into Crores (Cr) or Lacs (L) for Indian currency display
export const formatValue = (val) => {
  if (val == null || val === '') return '₹0';
  const num = parseFloat(val);
  if (isNaN(num)) return '₹0';
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  } else if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
};

// Check priorities
export const isHotLead = (lead) => {
  const p = String(lead?.priority || lead?.leadType || lead?.lead_type || '').trim().toUpperCase();
  return p === 'HOT' || p === 'HIGH';
};

export const isWarmLead = (lead) => {
  const p = String(lead?.priority || lead?.leadType || lead?.lead_type || '').trim().toUpperCase();
  return p === 'WARM' || p === 'MEDIUM';
};

// Maps backend User objects to an ID -> Name map for fast O(1) lookups
export const buildUserNameMap = (users) => {
  const map = {};
  users.forEach((u) => {
    const id = String(u.id || u.userId || u.user_id || '').trim();
    const first = String(u.firstName || u.firstname || u.first_name || '').trim();
    const last = String(u.lastName || u.lastname || u.last_name || '').trim();
    const fullName = `${first} ${last}`.trim() || String(u.fullName || u.username || '');
    if (id && fullName) map[id] = fullName;
  });
  return map;
};

export default function ChiefAdminLeadsDashboard() {
  // Tab and Filters State
  const [activeTab, setActiveTab] = useState('DASHBOARD'); // 'DASHBOARD' | 'HOT' | 'WARM'
  const [selectedRep, setSelectedRep] = useState('All Team Members');
  const [listRepFilter, setListRepFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date()); // Holds Date object for current Month/Year
  
  // Data State
  const [allLeads, setAllLeads] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Card Expand States
  const [expandedLeads, setExpandedLeads] = useState({});

  // Initial Data Fetching
  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [leadsRes, usersRes] = await Promise.all([
        getAllLeads().catch((err) => {
          console.error("Failed to load leads:", err);
          return [];
        }),
        getAllUsers().catch((err) => {
          console.error("Failed to load users:", err);
          return [];
        })
      ]);

      const rawLeads = extractList(leadsRes);
      const rawUsers = extractList(usersRes);

      // User ID Filtering: Filters out userId === '2' (system/test user)
      const cleanUsers = rawUsers.filter(user => {
        const uId = String(user.id || user.userId);
        if (uId === '2') {
          const username = (user.username || '').toLowerCase();
          const email = (user.email || '').toLowerCase();
          const firstName = (user.firstName || user.firstname || '').toLowerCase();
          if (username.includes('test') || username.includes('system') || 
              email.includes('test') || email.includes('system') ||
              firstName.includes('test') || firstName.includes('system')) {
            return false;
          }
        }
        return true;
      });

      const cleanLeads = rawLeads
        .map(lead => ({
          ...lead,
          userId: lead.userId || lead.createdBy
        }))
        .filter(lead => {
          const uId = String(lead.userId);
          // Only filter out lead if its owner was filtered out of cleanUsers
          return cleanUsers.some(u => String(u.id || u.userId) === uId);
        });

      setAllLeads(cleanLeads);
      setAllUsers(cleanUsers);
    } catch (err) {
      console.error("Error loading dashboard master data:", err);
      setError("Unable to retrieve dashboard metrics. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboardData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Helper to map and resolve User IDs to human-readable names
  const getUserName = (userId) => {
    const user = allUsers.find(u => String(u.id || u.userId) === String(userId));
    if (user) {
      const fName = user.firstName || user.firstname || '';
      const lName = user.lastName || user.lastname || '';
      return `${fName} ${lName}`.trim() || user.username || user.email || `Rep ${userId}`;
    }
    return `Rep ${userId}`;
  };

  // Month navigation handlers
  const handlePrevMonth = () => {
    const prev = new Date(selectedDate);
    prev.setMonth(prev.getMonth() - 1);
    setSelectedDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(selectedDate);
    next.setMonth(next.getMonth() + 1);
    setSelectedDate(next);
  };

  const getYearMonthString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const getMonthYearDisplayName = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getFormattedMonthLabel = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // 1. Build fast User ID -> Name lookup map
  const userNameMap = useMemo(() => {
    return buildUserNameMap(allUsers);
  }, [allUsers]);

  // 2. Map raw API leads to normalized UI records and filter by the selected month
  const mappedLeads = useMemo(() => {
    return allLeads
      .map(lead => {
        const ownerId = String(lead.assignedTo || lead.userId || lead.user_id || '');
        return {
          ...lead,
          ownerId,
          owner: userNameMap[ownerId] || lead.ownerName || lead.owner || 'Unassigned',
          company: lead.companyName || lead.company || lead.customerName || 'Unnamed Company',
          value: parseDealValue(lead.dealValue || lead.value || lead.budget),
          priority: isHotLead(lead) ? 'Hot' : (isWarmLead(lead) ? 'Warm' : 'Other'),
          date: lead.expectedCloseDate || lead.expected_close_date || lead.createdAt || '',
        };
      })
      .filter(item => {
        if (!item.date) return false;
        const d = new Date(item.date);
        return !isNaN(d.getTime()) && 
               d.getFullYear() === selectedDate.getFullYear() && 
               d.getMonth() === selectedDate.getMonth();
      });
  }, [allLeads, userNameMap, selectedDate]);

  // Subset filters
  const hotLeads = useMemo(() => mappedLeads.filter(l => l.priority === 'Hot'), [mappedLeads]);
  const warmLeads = useMemo(() => mappedLeads.filter(l => l.priority === 'Warm'), [mappedLeads]);

  // 3. Top-Level Summary Metrics (Global values for the selected month)
  const summary = useMemo(() => {
    const grandTotal = mappedLeads.reduce((sum, l) => sum + l.value, 0);
    const hotTotal = hotLeads.reduce((sum, l) => sum + l.value, 0);
    const warmTotal = warmLeads.reduce((sum, l) => sum + l.value, 0);
    return {
      grandTotal,
      hotTotal,
      warmTotal,
      count: mappedLeads.length
    };
  }, [mappedLeads, hotLeads, warmLeads]);

  // 4. Extract unique sales representatives for select buttons/dropdown
  const SALES_REPS = useMemo(() => {
    const names = new Set(mappedLeads.map(l => l.owner).filter(Boolean));
    return ['All Team Members', ...Array.from(names).sort()];
  }, [mappedLeads]);

  // 5. Ownership breakdown (Group by owner to show individual summaries)
  const ownershipSummary = useMemo(() => {
    const byOwner = {};
    
    mappedLeads.forEach(lead => {
      const owner = lead.owner;
      if (!byOwner[owner]) {
        byOwner[owner] = { 
          hotDeals: 0, 
          hotValue: 0, 
          warmDeals: 0, 
          warmValue: 0, 
          totalDeals: 0, 
          totalValue: 0, 
          largestCompany: '', 
          largestValue: 0,
          largestOpportunity: null
        };
      }
      
      const entry = byOwner[owner];
      entry.totalDeals += 1;
      entry.totalValue += lead.value;
      
      if (lead.priority === 'Hot') {
        entry.hotDeals += 1;
        entry.hotValue += lead.value;
      } else if (lead.priority === 'Warm') {
        entry.warmDeals += 1;
        entry.warmValue += lead.value;
      }
      
      // Check if this is the owner's largest account opportunity
      if (lead.value > entry.largestValue) {
        entry.largestValue = lead.value;
        entry.largestCompany = lead.company;
        entry.largestOpportunity = lead;
      }
    });

    return Object.entries(byOwner).map(([owner, d]) => ({
      owner,
      totalDeals: d.totalDeals,
      totalValue: d.totalValue,
      hotDeals: d.hotDeals,
      hotValue: d.hotValue,
      warmDeals: d.warmDeals,
      warmValue: d.warmValue,
      largestCompany: d.largestCompany,
      largestValue: d.largestValue,
      largestOpportunity: d.largestOpportunity
    })).sort((a, b) => b.totalValue - a.totalValue);
  }, [mappedLeads]);

  // 6. Selected Representative Context
  const currentOwnerData = useMemo(() => {
    if (selectedRep === 'All Team Members') {
      // When combined, calculate the largest single opportunity across all sales reps
      const bestDeal = ownershipSummary.reduce((best, r) => (r.largestValue > (best.largestValue || 0) ? r : best), {});
      return {
        owner: 'All Team Members',
        totalDeals: mappedLeads.length,
        totalValue: summary.grandTotal,
        hotDeals: hotLeads.length,
        hotValue: summary.hotTotal,
        warmDeals: warmLeads.length,
        warmValue: summary.warmTotal,
        largestCompany: bestDeal.largestCompany || '',
        largestValue: bestDeal.largestValue || 0,
        largestOpportunity: bestDeal.largestOpportunity || null
      };
    }
    return ownershipSummary.find(x => x.owner.toLowerCase() === selectedRep.toLowerCase()) || null;
  }, [selectedRep, ownershipSummary, mappedLeads, summary, hotLeads, warmLeads]);

  // Toggle single lead card expanded details
  const toggleLeadExpand = (leadId) => {
    setExpandedLeads(prev => ({
      ...prev,
      [leadId]: !prev[leadId]
    }));
  };

  // Filtered lists for Hot / Warm Leads tabs
  const getFilteredList = (temperature) => {
    let filtered = mappedLeads.filter(lead => {
      if (temperature === 'HOT') return lead.priority === 'Hot';
      if (temperature === 'WARM') return lead.priority === 'Warm';
      return false;
    });

    // Apply Rep Chip Filter
    if (listRepFilter !== 'ALL') {
      filtered = filtered.filter(l => String(l.userId) === listRepFilter);
    }

    // Apply Text Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(l => {
        const company = (l.company || '').toLowerCase();
        const contactName = (l.contactName || '').toLowerCase();
        const product = (l.product || '').toLowerCase();
        const notes = (l.notes || '').toLowerCase();
        const stage = (l.stage || '').toLowerCase();
        const repName = l.owner.toLowerCase();

        return company.includes(query) || 
               contactName.includes(query) || 
               product.includes(query) || 
               notes.includes(query) || 
               stage.includes(query) || 
               repName.includes(query);
      });
    }

    return filtered;
  };

  const filteredHotLeads = getFilteredList('HOT');
  const filteredWarmLeads = getFilteredList('WARM');

  return (
    <div className="animate-fade flex flex-col gap-6" style={{ width: '100%' }}>
      
      {/* Top Header Row with Month selection */}
      <div className="flex justify-between items-center header-actions flex-wrap gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em' }}>Leads Pipeline Dashboard</h1>
          <p className="text-muted" style={{ marginTop: '2px', fontSize: '14px' }}>Analyze sales team metrics, individual performance, and pipelines.</p>
        </div>

        {/* Action and Date pickers */}
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary" style={{ padding: '10px' }} onClick={loadDashboardData} title="Refresh metrics">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          
          <div className="date-picker-group" style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <button className="btn btn-secondary" style={{ padding: '10px 14px', border: 'none', background: 'transparent' }} onClick={handlePrevMonth}>
              <ChevronLeft size={16} />
            </button>
            
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Calendar size={15} style={{ position: 'absolute', left: '12px', color: '#94a3b8', pointerEvents: 'none' }} />
              <input 
                type="month" 
                className="input-field"
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  paddingLeft: '34px', 
                  color: '#fff', 
                  width: '180px',
                  fontSize: '14px',
                  fontWeight: '600',
                  height: '38px',
                  cursor: 'pointer'
                }}
                value={getYearMonthString(selectedDate)}
                onChange={(e) => {
                  const [y, m] = e.target.value.split('-');
                  if (y && m) {
                    setSelectedDate(new Date(parseInt(y), parseInt(m) - 1, 1));
                  }
                }}
              />
            </div>

            <button className="btn btn-secondary" style={{ padding: '10px 14px', border: 'none', background: 'transparent' }} onClick={handleNextMonth}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center flex-col gap-4" style={{ height: '400px' }}>
          <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
          <p className="text-muted">Loading metrics and pipeline data...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', borderColor: 'var(--danger)' }}>
          <AlertCircle size={48} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Failed to retrieve pipeline data</h3>
          <p className="text-muted" style={{ marginBottom: '16px' }}>{error}</p>
          <button className="btn" onClick={loadDashboardData}>Retry Fetch</button>
        </div>
      ) : (
        <>
          {/* Metrics Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Grand Total Pipeline Card */}
            <div className="glass-panel flex justify-between items-center" style={{ 
              padding: '24px', 
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(29, 78, 216, 0.15) 100%)',
              borderColor: 'rgba(59, 130, 246, 0.25)',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.05)'
            }}>
              <div>
                <p className="text-muted" style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grand Total Pipeline</p>
                <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: '#60a5fa' }}>{formatValue(summary.grandTotal)}</h2>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Value of all active leads</p>
              </div>
              <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '12px' }}>
                <TrendingUp size={24} color="#60a5fa" />
              </div>
            </div>

            {/* Hot Pipeline Value Card */}
            <div className="glass-panel flex justify-between items-center" style={{ 
              padding: '24px', 
              background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(190, 24, 74, 0.15) 100%)',
              borderColor: 'rgba(244, 63, 94, 0.25)',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(244, 63, 94, 0.05)'
            }}>
              <div>
                <p className="text-muted" style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hot Pipeline</p>
                <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: '#f43f5e' }}>{formatValue(summary.hotTotal)}</h2>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>High temperature pipeline</p>
              </div>
              <div style={{ background: 'rgba(244, 63, 94, 0.2)', padding: '12px', borderRadius: '12px' }}>
                <Flame size={24} color="#f43f5e" />
              </div>
            </div>

            {/* Warm Pipeline Value Card */}
            <div className="glass-panel flex justify-between items-center" style={{ 
              padding: '24px', 
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(180, 83, 9, 0.15) 100%)',
              borderColor: 'rgba(245, 158, 11, 0.25)',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(245, 158, 11, 0.05)'
            }}>
              <div>
                <p className="text-muted" style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Warm Pipeline</p>
                <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: '#fbbf24' }}>{formatValue(summary.warmTotal)}</h2>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Medium priority deals</p>
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: '12px' }}>
                <Sun size={24} color="#fbbf24" />
              </div>
            </div>

            {/* Total Deals Card */}
            <div className="glass-panel flex justify-between items-center" style={{ 
              padding: '24px', 
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.6) 100%)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}>
              <div>
                <p className="text-muted" style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Deals Count</p>
                <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: '#e2e8f0' }}>{summary.count}</h2>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Active deals count</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
                <Briefcase size={24} color="#94a3b8" />
              </div>
            </div>

          </div>

          {/* Tab Menu Header */}
          <div className="flex gap-6 mb-2 border-b border-white/10 pb-px" style={{ position: 'relative' }}>
            {['DASHBOARD', 'HOT', 'WARM'].map((tab) => (
              <button
                key={tab}
                className="pb-3 font-semibold text-[15px] transition-all relative"
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  color: activeTab === tab ? '#60a5fa' : '#94a3b8',
                  paddingLeft: 0,
                  paddingRight: 0
                }}
                onClick={() => setActiveTab(tab)}
              >
                <span className="flex items-center gap-2">
                  {tab === 'DASHBOARD' && <TrendingUp size={16} />}
                  {tab === 'HOT' && <Flame size={16} />}
                  {tab === 'WARM' && <Sun size={16} />}
                  {tab === 'DASHBOARD' ? 'Dashboard Summary' : (tab === 'HOT' ? 'Hot Leads' : 'Warm Leads')}
                </span>
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Render Area */}

          {activeTab === 'DASHBOARD' && (
            <div className="flex flex-col gap-6">
              
              {/* Representative Horizontal Chip Strip */}
              <div className="flex-col gap-2">
                <p className="text-muted" style={{ fontSize: '13px', fontWeight: '600' }}>Filter Overview By Representative:</p>
                <div className="timeline-strip hide-scrollbar" style={{ padding: '4px 0 10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  
                  {SALES_REPS.map((repName) => {
                    const isActive = selectedRep === repName;
                    const hasActiveDeals = repName === 'All Team Members' 
                      ? mappedLeads.length > 0 
                      : ownershipSummary.some(o => o.owner === repName && o.totalDeals > 0);

                    return (
                      <button
                        key={repName}
                        onClick={() => setSelectedRep(repName)}
                        style={{
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          borderRadius: '30px',
                          border: '1px solid',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          transition: 'all 0.2s',
                          background: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                          borderColor: isActive ? 'var(--primary-hover)' : 'rgba(255,255,255,0.08)',
                          color: '#fff',
                          opacity: hasActiveDeals ? 1 : 0.6,
                          boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                        }}
                      >
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: hasActiveDeals ? '#10b981' : '#64748b'
                        }} />
                        <span>{repName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Representative Performance Context Section */}
              {currentOwnerData ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', marginBottom: '4px' }}>
                    <User size={18} className="text-blue-400" />
                    <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
                      {selectedRep === 'All Team Members' ? 'Team Performance Overview' : `${selectedRep}'s Performance`}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Sub-card 1: Total Value */}
                    <div className="glass-panel flex justify-between items-center" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <div>
                        <p className="text-muted" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contribution Value</p>
                        <h3 style={{ fontSize: '22px', fontWeight: '800', marginTop: '6px', color: '#60a5fa' }}>
                          {formatValue(currentOwnerData.totalValue)}
                        </h3>
                      </div>
                    </div>

                    {/* Sub-card 2: Total Deals */}
                    <div className="glass-panel flex justify-between items-center" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <div>
                        <p className="text-muted" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Pipelines</p>
                        <h3 style={{ fontSize: '22px', fontWeight: '800', marginTop: '6px', color: '#e2e8f0' }}>
                          {currentOwnerData.totalDeals} {currentOwnerData.totalDeals === 1 ? 'Deal' : 'Deals'}
                        </h3>
                      </div>
                    </div>

                    {/* Sub-card 3: Hot Value + Count Badge */}
                    <div className="glass-panel flex justify-between items-center" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <div>
                        <p className="text-muted" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hot Pipeline</p>
                        <h3 style={{ fontSize: '22px', fontWeight: '800', marginTop: '6px', color: '#f43f5e' }}>
                          {formatValue(currentOwnerData.hotValue)}
                        </h3>
                      </div>
                      <span style={{
                        background: 'rgba(244, 63, 94, 0.15)',
                        color: '#f43f5e',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}>
                        {currentOwnerData.hotDeals} Hot
                      </span>
                    </div>

                    {/* Sub-card 4: Warm Value + Count Badge */}
                    <div className="glass-panel flex justify-between items-center" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <div>
                        <p className="text-muted" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Warm Pipeline</p>
                        <h3 style={{ fontSize: '22px', fontWeight: '800', marginTop: '6px', color: '#fbbf24' }}>
                          {formatValue(currentOwnerData.warmValue)}
                        </h3>
                      </div>
                      <span style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#fbbf24',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}>
                        {currentOwnerData.warmDeals} Warm
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                selectedRep !== 'All Team Members' && (
                  <div className="glass-panel flex-col items-center justify-center text-center py-12" style={{ padding: '24px', height: '100%', minHeight: '180px', display: 'flex' }}>
                    <User size={36} color="var(--primary)" style={{ marginBottom: '12px', opacity: 0.6 }} />
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No Active Performance Records</h4>
                    <p className="text-muted" style={{ fontSize: '14px', maxWidth: '380px' }}>
                      <strong>{selectedRep}</strong> does not have any active leads expected to close in the selected month.
                    </p>
                    <button className="btn btn-secondary mt-4" onClick={() => setSelectedRep('All Team Members')}>
                      Return to Team View
                    </button>
                  </div>
                )
              )}

              {/* Highlight Dashboard Metrics Content (Largest Account + Team Table) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start" style={{ marginTop: '8px' }}>
                
                {/* Largest Account Opportunity Highlight Card */}
                <div className="lg:col-span-1">
                  {currentOwnerData && currentOwnerData.largestCompany ? (
                    <div className="glass-panel" style={{ 
                      padding: '24px', 
                      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '280px'
                    }}>
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles size={16} color="#fbbf24" />
                          <span className="text-muted" style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Largest Account Opportunity</span>
                        </div>
                        
                        <div className="flex-col gap-4">
                          <div>
                            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {currentOwnerData.largestCompany}
                            </h3>
                            {currentOwnerData.largestOpportunity?.product && (
                              <p style={{ fontSize: '13px', color: '#60a5fa', fontWeight: '600' }}>Product: {currentOwnerData.largestOpportunity.product}</p>
                            )}
                          </div>

                          <div style={{ marginTop: '16px' }}>
                            <p className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Opportunity Valuation</p>
                            <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#fbbf24', marginTop: '2px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                              {formatValue(currentOwnerData.largestValue)}
                              <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'rgba(255,255,255,0.4)' }}>value</span>
                            </h2>
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', marginTop: '16px' }}>
                        <div className="flex justify-between items-center text-[12px] text-muted">
                          <span>Owner: <strong style={{ color: '#fff' }}>{selectedRep === 'All Team Members' && currentOwnerData.largestOpportunity ? currentOwnerData.largestOpportunity.owner : selectedRep}</strong></span>
                          <span>Stage: <strong style={{ color: '#10b981' }}>{currentOwnerData.largestOpportunity?.stage || 'NEW'}</strong></span>
                        </div>
                        {currentOwnerData.largestOpportunity?.contactName && (
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '6px' }}>Client: {currentOwnerData.largestOpportunity.contactName}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="glass-panel flex-col items-center justify-center text-center py-12" style={{ padding: '24px', minHeight: '280px', display: 'flex' }}>
                      <Briefcase size={32} className="text-muted" style={{ opacity: 0.3, marginBottom: '12px' }} />
                      <p className="text-muted" style={{ fontSize: '14px' }}>No active opportunities listed for this month.</p>
                    </div>
                  )}
                </div>

                {/* Team Comparison Matrix - visible when selectedRep is All Team Members */}
                <div className="lg:col-span-2">
                  {selectedRep === 'All Team Members' ? (
                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Sales Representatives Leaderboard</h3>
                        <span className="text-muted" style={{ fontSize: '12px' }}>Total team value comparison</span>
                      </div>
                      
                      <div className="responsive-table-wrapper">
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <th style={{ padding: '14px 24px', fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>Sales Representative</th>
                              <th style={{ padding: '14px 24px', fontSize: '13px', fontWeight: '600', color: '#94a3b8', textAlign: 'center' }}>Deals Owned</th>
                              <th style={{ padding: '14px 24px', fontSize: '13px', fontWeight: '600', color: '#94a3b8', textAlign: 'right' }}>Total Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ownershipSummary.length === 0 ? (
                              <tr>
                                <td colSpan="3" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                                  No team member has active leads this month.
                                </td>
                              </tr>
                            ) : (
                              ownershipSummary.map((rep, idx) => (
                                <tr 
                                  key={rep.owner} 
                                  style={{ 
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    background: idx === 0 ? 'rgba(59, 130, 246, 0.02)' : 'transparent',
                                    transition: 'background 0.2s ease'
                                  }}
                                  className="hover:bg-white/[0.02] cursor-pointer"
                                  onClick={() => setSelectedRep(rep.owner)}
                                >
                                  <td style={{ padding: '14px 24px', fontSize: '14px', fontWeight: '600' }}>
                                    <div className="flex items-center gap-2">
                                      {idx === 0 && <Sparkles size={12} color="#fbbf24" />}
                                      <span>{rep.owner}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '14px 24px', fontSize: '14px', textAlign: 'center' }}>{rep.totalDeals}</td>
                                  <td style={{ padding: '14px 24px', fontSize: '14px', fontWeight: '700', color: '#60a5fa', textAlign: 'right' }}>{formatValue(rep.totalValue)}</td>
                                </tr>
                              ))
                            )}

                            {/* Combined Row */}
                            {ownershipSummary.length > 0 && (
                              <tr style={{ background: 'rgba(0,0,0,0.3)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                                <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '700' }}>Total Combined Summary</td>
                                <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '700', textAlign: 'center' }}>
                                  {summary.count}
                                </td>
                                <td style={{ padding: '16px 24px', fontSize: '15px', fontWeight: '800', color: '#fbbf24', textAlign: 'right' }}>
                                  {formatValue(summary.grandTotal)}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    currentOwnerData && (
                      <div className="glass-panel flex-col items-center justify-center text-center py-12" style={{ padding: '24px', height: '100%', minHeight: '280px', display: 'flex' }}>
                        <User size={36} color="var(--primary)" style={{ marginBottom: '12px', opacity: 0.6 }} />
                        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Individual Performance Mode</h4>
                        <p className="text-muted" style={{ fontSize: '14px', maxWidth: '380px' }}>
                          You have selected <strong>{selectedRep}</strong>. The upper summary cards demonstrate this representative's direct contribution.
                        </p>
                        <button className="btn btn-secondary mt-4" onClick={() => setSelectedRep('All Team Members')}>
                          Return to Team Matrix
                        </button>
                      </div>
                    )
                  )}
                </div>

              </div>

            </div>
          )}

          {(activeTab === 'HOT' || activeTab === 'WARM') && (
            <div className="flex flex-col gap-6">
              
              {/* Search & Chip Sub-Filter */}
              <div className="glass-panel" style={{ padding: '20px 24px' }}>
                <div className="flex justify-between items-center gap-4 flex-wrap">
                  
                  {/* Search input */}
                  <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94a3b8' }} />
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Search company, client, product, rep, status or notes..." 
                      style={{ paddingLeft: '42px', fontSize: '14px', height: '42px' }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Active Month Indicator */}
                  <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} />
                    <span>Selected Period: <strong style={{ color: '#fff' }}>{getMonthYearDisplayName(selectedDate)}</strong></span>
                  </div>

                </div>

                {/* Sub-Filters Chips (Rep filtering inside lists) */}
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-muted" style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>Filter List by Sales Person:</p>
                  <div className="timeline-strip hide-scrollbar" style={{ paddingBottom: '4px' }}>
                    
                    <button 
                      onClick={() => setListRepFilter('ALL')}
                      style={{ 
                        flexShrink: 0,
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        background: listRepFilter === 'ALL' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.02)',
                        borderColor: listRepFilter === 'ALL' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.05)',
                        color: listRepFilter === 'ALL' ? '#60a5fa' : '#94a3b8'
                      }}
                    >
                      All Sales People
                    </button>

                    {allUsers.map((user) => {
                      const uId = String(user.id || user.userId);
                      const hasMatches = (activeTab === 'HOT' ? filteredHotLeads : filteredWarmLeads).some(l => String(l.userId) === uId) || listRepFilter === uId;
                      
                      return (
                        <button
                          key={uId}
                          onClick={() => setListRepFilter(uId)}
                          style={{
                            flexShrink: 0,
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: '1px solid',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            background: listRepFilter === uId ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.02)',
                            borderColor: listRepFilter === uId ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.05)',
                            color: listRepFilter === uId ? '#60a5fa' : '#94a3b8',
                            opacity: hasMatches ? 1 : 0.5
                          }}
                        >
                          {getUserName(uId)}
                        </button>
                      );
                    })}

                  </div>
                </div>

              </div>

              {/* Leads flat list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(activeTab === 'HOT' ? filteredHotLeads : filteredWarmLeads).length === 0 ? (
                  <div className="glass-panel col-span-2 flex-col items-center justify-center text-center py-16" style={{ padding: '24px' }}>
                    <AlertCircle size={40} className="text-muted" style={{ opacity: 0.4, marginBottom: '12px' }} />
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>No matching leads found</h4>
                    <p className="text-muted" style={{ fontSize: '13px' }}>
                      Try expanding your search query, selecting another sales representative, or switching months.
                    </p>
                  </div>
                ) : (
                  (activeTab === 'HOT' ? filteredHotLeads : filteredWarmLeads).map((lead, idx) => {
                    const leadId = lead.id || `lead-${idx}`;
                    const isExpanded = !!expandedLeads[leadId];

                    return (
                      <div 
                        key={leadId}
                        className="glass-panel flex-col transition-all duration-300"
                        style={{
                          padding: '20px',
                          borderLeft: `4px solid ${activeTab === 'HOT' ? '#f43f5e' : '#fbbf24'}`,
                          background: 'rgba(30, 41, 59, 0.4)',
                          borderColor: isExpanded ? (activeTab === 'HOT' ? 'rgba(244, 63, 94, 0.6)' : 'rgba(245, 158, 11, 0.6)') : 'rgba(255, 255, 255, 0.08)',
                          boxShadow: isExpanded ? `0 8px 30px rgba(${activeTab === 'HOT' ? '244, 63, 94' : '245, 158, 11'}, 0.08)` : 'none'
                        }}
                      >
                        {/* Lead Card Header */}
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span 
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                padding: '2px 8px', 
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                marginBottom: '8px',
                                background: activeTab === 'HOT' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: activeTab === 'HOT' ? '#f43f5e' : '#fbbf24'
                              }}
                            >
                              {activeTab === 'HOT' ? <Flame size={10} /> : <Sun size={10} />}
                              {activeTab === 'HOT' ? 'HOT DEALT' : 'WARM DEALT'}
                            </span>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>{lead.company || 'Unknown Company'}</h3>
                          </div>
                          
                          <div style={{ textAlign: 'right' }}>
                            <p className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Valuation</p>
                            <span style={{ fontSize: '18px', fontWeight: '800', color: '#60a5fa' }}>{formatValue(lead.dealValue)}</span>
                          </div>
                        </div>

                        {/* Basic Info Body */}
                        <div className="grid grid-cols-2 gap-4" style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                          <div>
                            <p className="text-muted" style={{ fontSize: '11px' }}>Product</p>
                            <p style={{ fontSize: '13px', fontWeight: '600' }}>{lead.product || 'Unspecified'}</p>
                          </div>
                          <div>
                            <p className="text-muted" style={{ fontSize: '11px' }}>Client Contact</p>
                            <p style={{ fontSize: '13px', fontWeight: '600' }}>{lead.contactName || 'Unassigned'}</p>
                          </div>
                          <div>
                            <p className="text-muted" style={{ fontSize: '11px' }}>Sales Owner</p>
                            <span style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <User size={12} color="#94a3b8" />
                              {getUserName(lead.userId)}
                            </span>
                          </div>
                          <div>
                            <p className="text-muted" style={{ fontSize: '11px' }}>Expected Close</p>
                            <p style={{ fontSize: '13px', fontWeight: '600' }}>
                              {lead.expectedCloseDate ? new Date(lead.expectedCloseDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'}
                            </p>
                          </div>
                        </div>

                        {/* Expanded Area toggler */}
                        <button
                          onClick={() => toggleLeadExpand(leadId)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '16px',
                            padding: '4px 0',
                            alignSelf: 'flex-start',
                            fontWeight: '600'
                          }}
                          className="hover:text-white"
                        >
                          {isExpanded ? (
                            <>
                              <span>Collapse details</span>
                              <ChevronUp size={14} />
                            </>
                          ) : (
                            <>
                              <span>View logs & details</span>
                              <ChevronDown size={14} />
                            </>
                          )}
                        </button>

                        {/* Expandable Notes Drawer */}
                        {isExpanded && (
                          <div className="animate-fade" style={{ 
                            marginTop: '12px', 
                            paddingTop: '12px', 
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}>
                            <div>
                              <p className="text-muted" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FileText size={12} />
                                <span>Status Log & Deal Stage:</span>
                              </p>
                              <div className="flex gap-2 items-center" style={{ marginTop: '4px' }}>
                                <span style={{ 
                                  padding: '2px 8px', 
                                  borderRadius: '4px', 
                                  fontSize: '11px', 
                                  fontWeight: '600', 
                                  background: 'rgba(16, 185, 129, 0.15)', 
                                  color: '#10b981'
                                }}>
                                  {lead.stage || 'STAGE_UNASSIGNED'}
                                </span>
                                {lead.leadSource && (
                                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                                    Source: {lead.leadSource}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div>
                              <p className="text-muted" style={{ fontSize: '11px' }}>Notes & Meeting Transcripts:</p>
                              <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5', whiteSpace: 'pre-line', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', marginTop: '4px' }}>
                                {lead.notes || 'No notes compiled for this lead yet.'}
                              </p>
                            </div>
                            
                            {(lead.email || lead.phone) && (
                              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                                {lead.email && <span>Email: <strong style={{ color: '#fff' }}>{lead.email}</strong></span>}
                                {lead.phone && <span>Phone: <strong style={{ color: '#fff' }}>{lead.phone}</strong></span>}
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}
        </>
      )}

    </div>
  );
}
