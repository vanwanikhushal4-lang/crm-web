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
import RunningNumber from '../../components/common/RunningNumber';

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
export const parseDealValue = (value) => {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return value;
  const str = String(value).toLowerCase().replace(/,/g, '');
  const numbers = str.match(/\d+(\.\d+)?/g)?.map(Number) || [];
  if (!numbers.length) return 0;
  const avg = numbers.length > 1 ? (numbers[0] + numbers[1]) / 2 : numbers[0];
  if (str.includes('cr')) return avg * 10000000;
  if (str.includes('lakh') || str.includes('lac') || str.includes(' l')) return avg * 100000;
  if (avg < 1000) return avg * 10000000; // Assume Crores for small numbers
  return avg;
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

  // Leads filtered for dashboard graphs based on representative selection
  const filteredLeadsForCharts = useMemo(() => {
    if (selectedRep === 'All Team Members') {
      return mappedLeads;
    }
    return mappedLeads.filter(l => l.owner.toLowerCase() === selectedRep.toLowerCase());
  }, [mappedLeads, selectedRep]);

  // Dynamic Weekly Partitions for Dashboard Charts
  const weeklyMetrics = useMemo(() => {
    const weeks = [
      { name: 'W1', hot: 0, warm: 0 },
      { name: 'W2', hot: 0, warm: 0 },
      { name: 'W3', hot: 0, warm: 0 },
      { name: 'W4', hot: 0, warm: 0 },
    ];

    filteredLeadsForCharts.forEach(l => {
      if (!l.date) return;
      const d = new Date(l.date);
      if (isNaN(d.getTime())) return;
      const day = d.getDate();
      
      let wIdx = 0;
      if (day > 21) wIdx = 3;
      else if (day > 14) wIdx = 2;
      else if (day > 7) wIdx = 1;

      if (l.priority === 'Hot') {
        weeks[wIdx].hot += l.value;
      } else if (l.priority === 'Warm') {
        weeks[wIdx].warm += l.value;
      }
    });

    return weeks;
  }, [filteredLeadsForCharts]);

  // Dynamic 6-Month Cumulative Pipeline Data (Last 6 Months)
  const lastSixMonthsCumulative = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - i, 1);
      months.push({
        date: d,
        name: d.toLocaleString('en-US', { month: 'short' }),
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        value: 0,
        cumulativeValue: 0
      });
    }

    const list = extractList(allLeads);
    const filteredLeads = list.filter(lead => {
      const assigned = lead.assignedTo || lead.userId || lead.user_id || lead.salesmanId;
      const ownerId = String(assigned || '');
      const ownerName = userNameMap[ownerId] || 'Unknown Owner';

      if (selectedRep !== 'All Team Members') {
        return ownerName.toLowerCase() === selectedRep.toLowerCase();
      }
      return true;
    });

    filteredLeads.forEach(lead => {
      const dateStr = lead.expectedCloseDate || lead.expected_close_date || lead.createdAt;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      const leadYear = d.getFullYear();
      const leadMonth = d.getMonth();

      const match = months.find(m => m.year === leadYear && m.monthIndex === leadMonth);
      if (match) {
        const valStr = lead.dealValue || lead.deal_value || lead.value || lead.budget;
        match.value += parseDealValue(valStr);
      }
    });

    let runningSum = 0;
    months.forEach(m => {
      runningSum += m.value;
      m.cumulativeValue = runningSum;
    });

    return months;
  }, [allLeads, selectedDate, selectedRep, userNameMap]);

  // Targets Metrics progress calculations
  const targetMetrics = useMemo(() => {
    const actualValue = filteredLeadsForCharts.reduce((sum, l) => sum + l.value, 0);
    const actualDeals = filteredLeadsForCharts.length;

    const targetValue = Math.max(actualValue * 1.25, 20000000); 
    const targetDeals = Math.max(Math.round(actualDeals * 1.3), 10); 

    const valuePct = Math.min(Math.round((actualValue / targetValue) * 100), 100) || 0;
    const dealsPct = Math.min(Math.round((actualDeals / targetDeals) * 100), 100) || 0;

    return {
      targetValue,
      targetDeals,
      valuePct,
      dealsPct,
      actualValue,
      actualDeals
    };
  }, [filteredLeadsForCharts]);

  // Renderers for dynamic SVG-based analytics graphics
  const renderPipelineActivityTrends = () => {
    const maxVal = Math.max(...weeklyMetrics.map(w => Math.max(w.hot, w.warm)), 1000000);
    const getX = (i) => 50 + i * 100;
    const getY = (val) => 150 - (val / maxVal * 100);

    const hotPath = weeklyMetrics.length > 0 
      ? `M ${getX(0)} ${getY(weeklyMetrics[0].hot)} ` +
        `C ${getX(0) + 50} ${getY(weeklyMetrics[0].hot)}, ${getX(1) - 50} ${getY(weeklyMetrics[1].hot)}, ${getX(1)} ${getY(weeklyMetrics[1].hot)} ` +
        `C ${getX(1) + 50} ${getY(weeklyMetrics[1].hot)}, ${getX(2) - 50} ${getY(weeklyMetrics[2].hot)}, ${getX(2)} ${getY(weeklyMetrics[2].hot)} ` +
        `C ${getX(2) + 50} ${getY(weeklyMetrics[2].hot)}, ${getX(3) - 50} ${getY(weeklyMetrics[3].hot)}, ${getX(3)} ${getY(weeklyMetrics[3].hot)}`
      : '';

    const warmPath = weeklyMetrics.length > 0 
      ? `M ${getX(0)} ${getY(weeklyMetrics[0].warm)} ` +
        `C ${getX(0) + 50} ${getY(weeklyMetrics[0].warm)}, ${getX(1) - 50} ${getY(weeklyMetrics[1].warm)}, ${getX(1)} ${getY(weeklyMetrics[1].warm)} ` +
        `C ${getX(1) + 50} ${getY(weeklyMetrics[1].warm)}, ${getX(2) - 50} ${getY(weeklyMetrics[2].warm)}, ${getX(2)} ${getY(weeklyMetrics[2].warm)} ` +
        `C ${getX(2) + 50} ${getY(weeklyMetrics[2].warm)}, ${getX(3) - 50} ${getY(weeklyMetrics[3].warm)}, ${getX(3)} ${getY(weeklyMetrics[3].warm)}`
      : '';

    return (
      <div className="glass-panel" style={{ padding: '20px', background: 'rgba(30, 41, 59, 0.4)' }}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 style={{ fontSize: '15px', color: '#f8fafc', fontWeight: '700' }}>Pipeline Activity Trends</h4>
            <p className="text-muted" style={{ fontSize: '11px' }}>Weekly Hot vs Warm lead volumes</p>
          </div>
          <div className="flex gap-3 text-[11px]">
            <span className="flex items-center gap-1.5"><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }} />Hot</span>
            <span className="flex items-center gap-1.5"><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }} />Warm</span>
          </div>
        </div>

        <svg width="100%" height="160" viewBox="0 0 400 180" preserveAspectRatio="xMidYMid meet">
          <line x1="40" y1="50" x2="360" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
          <line x1="40" y1="100" x2="360" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
          <line x1="40" y1="150" x2="360" y2="150" stroke="rgba(255,255,255,0.1)" />

          <path d={hotPath} fill="none" stroke="#f43f5e" strokeWidth="3.5" strokeLinecap="round" />
          <path d={warmPath} fill="none" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />

          {weeklyMetrics.map((w, idx) => (
            <g key={idx}>
              <circle cx={getX(idx)} cy={getY(w.hot)} r="5" fill="#f43f5e" stroke="#0f172a" strokeWidth="1.5" />
              <circle cx={getX(idx)} cy={getY(w.warm)} r="5" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.5" />
              <text x={getX(idx)} y="170" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="600">{w.name}</text>
            </g>
          ))}

          <text x="35" y="54" fill="#64748b" fontSize="9" textAnchor="end">{formatValue(maxVal)}</text>
          <text x="35" y="104" fill="#64748b" fontSize="9" textAnchor="end">{formatValue(maxVal / 2)}</text>
          <text x="35" y="154" fill="#64748b" fontSize="9" textAnchor="end">0</text>
        </svg>
      </div>
    );
  };

  const renderWeeklyValueDistribution = () => {
    const maxVal = Math.max(...weeklyMetrics.map(w => Math.max(w.hot, w.warm)), 1000000);
    const getBarHeight = (val) => (val / maxVal) * 100;

    return (
      <div className="glass-panel" style={{ padding: '20px', background: 'rgba(30, 41, 59, 0.4)' }}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 style={{ fontSize: '15px', color: '#f8fafc', fontWeight: '700' }}>Weekly Value Distribution</h4>
            <p className="text-muted" style={{ fontSize: '11px' }}>Pipeline valuations group by temperature</p>
          </div>
          <div className="flex gap-3 text-[11px]">
            <span className="flex items-center gap-1.5"><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f43f5e' }} />Hot</span>
            <span className="flex items-center gap-1.5"><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#fbbf24' }} />Warm</span>
          </div>
        </div>

        <svg width="100%" height="160" viewBox="0 0 400 180" preserveAspectRatio="xMidYMid meet">
          <line x1="40" y1="50" x2="360" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
          <line x1="40" y1="100" x2="360" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
          <line x1="40" y1="150" x2="360" y2="150" stroke="rgba(255,255,255,0.1)" />

          {weeklyMetrics.map((w, idx) => {
            const groupX = 40 + idx * 80;
            const hotH = getBarHeight(w.hot);
            const warmH = getBarHeight(w.warm);
            return (
              <g key={idx}>
                <rect 
                  x={groupX + 15} 
                  y={150 - hotH} 
                  width="16" 
                  height={Math.max(hotH, 2)} 
                  rx="3" 
                  fill="url(#hotBarGrad)" 
                  style={{ transition: 'all 0.3s' }}
                />
                <rect 
                  x={groupX + 35} 
                  y={150 - warmH} 
                  width="16" 
                  height={Math.max(warmH, 2)} 
                  rx="3" 
                  fill="url(#warmBarGrad)" 
                  style={{ transition: 'all 0.3s' }}
                />
                <text x={groupX + 33} y="170" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="600">{w.name}</text>
              </g>
            );
          })}

          <text x="35" y="54" fill="#64748b" fontSize="9" textAnchor="end">{formatValue(maxVal)}</text>
          <text x="35" y="104" fill="#64748b" fontSize="9" textAnchor="end">{formatValue(maxVal / 2)}</text>
          <text x="35" y="154" fill="#64748b" fontSize="9" textAnchor="end">0</text>

          <defs>
            <linearGradient id="hotBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#be185d" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="warmBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  };

  const renderCumulativePipelineGrowth = () => {
    const maxCum = Math.max(...lastSixMonthsCumulative.map(m => m.cumulativeValue), 1000000);
    const getX = (i) => 45 + i * 64;
    const getY = (val) => 150 - (val / maxCum * 100);

    let growthPath = '';
    if (lastSixMonthsCumulative.length > 0) {
      growthPath = `M ${getX(0)} ${getY(lastSixMonthsCumulative[0].cumulativeValue)}`;
      for (let i = 1; i < lastSixMonthsCumulative.length; i++) {
        const xPrev = getX(i - 1);
        const yPrev = getY(lastSixMonthsCumulative[i - 1].cumulativeValue);
        const xCurr = getX(i);
        const yCurr = getY(lastSixMonthsCumulative[i].cumulativeValue);
        const cpX1 = xPrev + 32;
        const cpY1 = yPrev;
        const cpX2 = xCurr - 32;
        const cpY2 = yCurr;
        growthPath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${xCurr} ${yCurr}`;
      }
    }

    const areaPath = growthPath 
      ? `${growthPath} L ${getX(5)} 150 L ${getX(0)} 150 Z`
      : '';

    return (
      <div className="glass-panel" style={{ padding: '20px', background: 'rgba(30, 41, 59, 0.4)' }}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 style={{ fontSize: '15px', color: '#f8fafc', fontWeight: '700' }}>Cumulative Pipeline Growth</h4>
            <p className="text-muted" style={{ fontSize: '11px' }}>Last 6 months cumulative pipeline value</p>
          </div>
          <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: '600' }}>
            Period Total: <RunningNumber value={lastSixMonthsCumulative[5]?.cumulativeValue || 0} formatter={formatValue} />
          </div>
        </div>

        <svg width="100%" height="160" viewBox="0 0 400 180" preserveAspectRatio="xMidYMid meet">
          <line x1="30" y1="50" x2="380" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
          <line x1="30" y1="100" x2="380" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
          <line x1="30" y1="150" x2="380" y2="150" stroke="rgba(255,255,255,0.1)" />

          <path d={growthPath} fill="none" stroke="#60a5fa" strokeWidth="5" strokeLinecap="round" opacity="0.15" />
          <path d={areaPath} fill="url(#areaBlueGrad)" opacity="0.3" />
          <path d={growthPath} fill="none" stroke="#3b82f6" strokeWidth="3.5" strokeLinecap="round" />

          {lastSixMonthsCumulative.map((m, idx) => (
            <g key={idx}>
              <circle cx={getX(idx)} cy={getY(m.cumulativeValue)} r="6" fill="#3b82f6" stroke="#0f172a" strokeWidth="2" />
              <text x={getX(idx)} y="170" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="600">{m.name}</text>
            </g>
          ))}

          <text x="35" y="54" fill="#64748b" fontSize="9" textAnchor="end">{formatValue(maxCum)}</text>
          <text x="35" y="104" fill="#64748b" fontSize="9" textAnchor="end">{formatValue(maxCum / 2)}</text>
          <text x="35" y="154" fill="#64748b" fontSize="9" textAnchor="end">0</text>

          <defs>
            <linearGradient id="areaBlueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  };

  const renderRealityVsTarget = () => {
    const r = 30;
    const circ = 2 * Math.PI * r; 

    const valueOffset = circ - (targetMetrics.valuePct / 100 * circ);
    const dealsOffset = circ - (targetMetrics.dealsPct / 100 * circ);

    return (
      <div className="glass-panel" style={{ padding: '20px', background: 'rgba(30, 41, 59, 0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h4 style={{ fontSize: '15px', color: '#f8fafc', fontWeight: '700' }}>Reality vs Target</h4>
          <p className="text-muted" style={{ fontSize: '11px', marginBottom: '16px' }}>Current performance vs target benchmarks</p>
        </div>

        <div className="grid grid-cols-2 gap-4 items-center justify-items-center" style={{ flex: 1, padding: '10px 0' }}>
          <div className="flex flex-col items-center gap-2">
            <div style={{ position: 'relative', width: '80px', height: '80px' }}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                <circle 
                  cx="40" 
                  cy="40" 
                  r={r} 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="6" 
                  strokeDasharray={circ}
                  strokeDashoffset={dealsOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}><RunningNumber value={targetMetrics.dealsPct} />%</span>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>Deals Target</span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>(<RunningNumber value={targetMetrics.actualDeals} /> / <RunningNumber value={targetMetrics.targetDeals} />)</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div style={{ position: 'relative', width: '80px', height: '80px' }}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                <circle 
                  cx="40" 
                  cy="40" 
                  r={r} 
                  fill="none" 
                  stroke="#60a5fa" 
                  strokeWidth="6" 
                  strokeDasharray={circ}
                  strokeDashoffset={valueOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}><RunningNumber value={targetMetrics.valuePct} />%</span>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>Valuation Target</span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>(<RunningNumber value={targetMetrics.actualValue} formatter={formatValue} /> / <RunningNumber value={targetMetrics.targetValue} formatter={formatValue} />)</span>
          </div>
        </div>
      </div>
    );
  };

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
                <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: '#60a5fa' }}>
                  <RunningNumber value={summary.grandTotal} formatter={formatValue} />
                </h2>
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
                <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: '#f43f5e' }}>
                  <RunningNumber value={summary.hotTotal} formatter={formatValue} />
                </h2>
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
                <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: '#fbbf24' }}>
                  <RunningNumber value={summary.warmTotal} formatter={formatValue} />
                </h2>
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
                <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: '#e2e8f0' }}>
                  <RunningNumber value={summary.count} />
                </h2>
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
                          <RunningNumber value={currentOwnerData.totalValue} formatter={formatValue} />
                        </h3>
                      </div>
                    </div>

                    {/* Sub-card 2: Total Deals */}
                    <div className="glass-panel flex justify-between items-center" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <div>
                        <p className="text-muted" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Pipelines</p>
                        <h3 style={{ fontSize: '22px', fontWeight: '800', marginTop: '6px', color: '#e2e8f0' }}>
                          <RunningNumber value={currentOwnerData.totalDeals} /> {currentOwnerData.totalDeals === 1 ? 'Deal' : 'Deals'}
                        </h3>
                      </div>
                    </div>

                    {/* Sub-card 3: Hot Value + Count Badge */}
                    <div className="glass-panel flex justify-between items-center" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <div>
                        <p className="text-muted" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hot Pipeline</p>
                        <h3 style={{ fontSize: '22px', fontWeight: '800', marginTop: '6px', color: '#f43f5e' }}>
                          <RunningNumber value={currentOwnerData.hotValue} formatter={formatValue} />
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
                        <RunningNumber value={currentOwnerData.hotDeals} /> Hot
                      </span>
                    </div>

                    {/* Sub-card 4: Warm Value + Count Badge */}
                    <div className="glass-panel flex justify-between items-center" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <div>
                        <p className="text-muted" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Warm Pipeline</p>
                        <h3 style={{ fontSize: '22px', fontWeight: '800', marginTop: '6px', color: '#fbbf24' }}>
                          <RunningNumber value={currentOwnerData.warmValue} formatter={formatValue} />
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
                        <RunningNumber value={currentOwnerData.warmDeals} /> Warm
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

              {/* Sales Analytics & Insights Graphs Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ marginTop: '16px', marginBottom: '16px' }}>
                {renderPipelineActivityTrends()}
                {renderWeeklyValueDistribution()}
                {renderCumulativePipelineGrowth()}
                {renderRealityVsTarget()}
              </div>

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
                              <RunningNumber value={currentOwnerData.largestValue} formatter={formatValue} />
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
                                  <td style={{ padding: '14px 24px', fontSize: '14px', textAlign: 'center' }}><RunningNumber value={rep.totalDeals} /></td>
                                  <td style={{ padding: '14px 24px', fontSize: '14px', fontWeight: '700', color: '#60a5fa', textAlign: 'right' }}><RunningNumber value={rep.totalValue} formatter={formatValue} /></td>
                                </tr>
                              ))
                            )}

                            {/* Combined Row */}
                            {ownershipSummary.length > 0 && (
                              <tr style={{ background: 'rgba(0,0,0,0.3)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                                <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '700' }}>Total Combined Summary</td>
                                <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '700', textAlign: 'center' }}>
                                  <RunningNumber value={summary.count} />
                                </td>
                                <td style={{ padding: '16px 24px', fontSize: '15px', fontWeight: '800', color: '#fbbf24', textAlign: 'right' }}>
                                  <RunningNumber value={summary.grandTotal} formatter={formatValue} />
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

                {/* Sub-Filters Dropdown (Rep filtering inside lists) */}
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="salesperson-select" className="text-muted" style={{ fontSize: '12px', fontWeight: '600' }}>Filter List by Sales Person:</label>
                  <div style={{ position: 'relative', height: '34px', maxWidth: '320px', width: '100%' }}>
                    <select
                      id="salesperson-select"
                      value={listRepFilter}
                      onChange={(e) => setListRepFilter(e.target.value)}
                      className="input-field"
                      style={{
                        appearance: 'none',
                        cursor: 'pointer',
                        paddingRight: '40px',
                        paddingLeft: '12px',
                        paddingTop: '4px',
                        paddingBottom: '4px',
                        fontSize: '13px',
                        height: '34px',
                        fontWeight: '600',
                        color: '#fff',
                        background: 'rgba(30, 41, 59, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        width: '100%'
                      }}
                    >
                      <option value="ALL" style={{ background: '#0f172a', color: '#fff' }}>All Sales People</option>
                      {allUsers.map((user) => {
                        const uId = String(user.id || user.userId);
                        return (
                          <option 
                            key={uId} 
                            value={uId}
                            style={{ background: '#0f172a', color: '#fff' }}
                          >
                            {getUserName(uId)}
                          </option>
                        );
                      })}
                    </select>
                    <div style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <ChevronDown size={16} />
                    </div>
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
                            <span style={{ fontSize: '18px', fontWeight: '800', color: '#60a5fa' }}><RunningNumber value={lead.value} formatter={formatValue} /></span>
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
