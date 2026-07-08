import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  Search,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowRight,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import { saveOrUpdateDssr, getDssrById } from '../../api/apiFunctions/Login/Login_api_function';

export default function DssrTab() {
  const [dssrId, setDssrId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Active loaded report tracking
  const [loadedReport, setLoadedReport] = useState(null);

  // Form State
  const [form, setForm] = useState({
    id: null,
    date: new Date().toISOString().split('T')[0],
    keyActivitiesUndertaken: '',
    customer: '',
    meetingMode: 'Virtual',
    purpose: '',
    outcome: '',
    accountName: '',
    opportunity: '',
    dealStage: 'Lead',
    challenges: '',
    remarks: '',
    estimatedDealValueInCr: '',
    totalPipeline: ''
  });

  // Lookup record by ID
  const handleLookup = async (e) => {
    e.preventDefault();
    if (!dssrId.trim()) return;

    setIsLoading(true);
    try {
      const res = await getDssrById(dssrId.trim());
      if (res?.data) {
        const dssr = res.data;
        setLoadedReport(dssr);
        
        // Populate form
        setForm({
          id: dssr.id || null,
          date: dssr.date || new Date().toISOString().split('T')[0],
          keyActivitiesUndertaken: dssr.keyActivitiesUndertaken || '',
          customer: dssr.customer || '',
          meetingMode: dssr.meetingMode || 'Virtual',
          purpose: dssr.purpose || '',
          outcome: dssr.outcome || '',
          accountName: dssr.accountName || '',
          opportunity: dssr.opportunity || '',
          dealStage: dssr.dealStage || 'Lead',
          challenges: dssr.challenges || '',
          remarks: dssr.remarks || '',
          estimatedDealValueInCr: dssr.estimatedDealValueInCr ?? '',
          totalPipeline: dssr.totalPipeline ?? ''
        });
        alert(`DSSR ID #${dssr.id} successfully loaded into form.`);
      } else {
        alert('DSSR report not found with the provided ID.');
      }
    } catch (err) {
      console.error('Error fetching DSSR:', err);
      alert('Failed to fetch DSSR record: ' + (err?.response?.data?.message || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Submit form data
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date) {
      alert('Date is required.');
      return;
    }
    if (!form.customer.trim()) {
      alert('Customer is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        id: form.id ? Number(form.id) : null,
        estimatedDealValueInCr: form.estimatedDealValueInCr !== '' ? Number(form.estimatedDealValueInCr) : null,
        totalPipeline: form.totalPipeline !== '' ? Number(form.totalPipeline) : null
      };

      const res = await saveOrUpdateDssr(payload);
      alert('Daily Sales Status Report (DSSR) submitted successfully!');
      
      // If it returned a saved object with ID, show it
      const savedDssr = res?.data;
      if (savedDssr?.id) {
        setDssrId(String(savedDssr.id));
        setLoadedReport(savedDssr);
        setForm(prev => ({ ...prev, id: savedDssr.id }));
      } else {
        resetForm();
      }
    } catch (err) {
      console.error('Error saving DSSR:', err);
      alert('Failed to save DSSR: ' + (err?.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      id: null,
      date: new Date().toISOString().split('T')[0],
      keyActivitiesUndertaken: '',
      customer: '',
      meetingMode: 'Virtual',
      purpose: '',
      outcome: '',
      accountName: '',
      opportunity: '',
      dealStage: 'Lead',
      challenges: '',
      remarks: '',
      estimatedDealValueInCr: '',
      totalPipeline: ''
    });
    setLoadedReport(null);
  };

  return (
    <div className="space-y-6 text-slate-100 relative z-20 pb-20">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0b1628]/60 border border-white/5 p-5 rounded-2xl shadow-lg animate-fade">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            Daily Sales Status Report (DSSR)
          </h1>
          <p className="text-xs text-slate-400 mt-1">Submit activity summary logs, target opportunities, and pipeline trackers</p>
        </div>

        {form.id && (
          <button
            onClick={resetForm}
            className="px-4 py-2 border border-white/10 hover:border-white/25 rounded-xl text-xs font-bold transition flex items-center gap-1.5 bg-slate-900"
          >
            <Plus className="h-4 w-4 text-blue-400" />
            Switch to New Report
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* FORM CONTAINER (LEFT 2 COLS) */}
        <div className="lg:col-span-2 bg-[#0c1220]/40 border border-white/5 rounded-2xl p-6 shadow-lg space-y-6 animate-fade">
          
          {form.id && (
            <div className="bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl p-4 flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <FileCheck className="h-4.5 w-4.5" />
                Active Mode: Editing report log ID #{form.id} (Update Mode)
              </span>
              <button
                onClick={resetForm}
                className="underline text-blue-300 hover:text-white"
              >
                Clear / New
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* ROW 1: BASIC INFORMATION */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Report Date (Required)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-0 text-left"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Customer Name (Required)</label>
                <input
                  type="text"
                  placeholder="e.g. GlobalTech Solutions Inc"
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-0"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Meeting Mode</label>
                <select
                  value={form.meetingMode}
                  onChange={(e) => setForm({ ...form, meetingMode: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="Virtual">Virtual Meeting</option>
                  <option value="Physical">Physical Visit</option>
                  <option value="Call">Telephone Call</option>
                  <option value="Email">Email Communication</option>
                </select>
              </div>
            </div>

            {/* ROW 2: ACCOUNT & OPPORTUNITY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Account Name</label>
                <input
                  type="text"
                  placeholder="e.g. GlobalTech Solutions - Enterprise Account"
                  value={form.accountName}
                  onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Opportunity Description</label>
                <input
                  type="text"
                  placeholder="e.g. Global Expansion Deal - 2000+ Users"
                  value={form.opportunity}
                  onChange={(e) => setForm({ ...form, opportunity: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* ROW 3: METRICS AND DEALS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Deal Stage</label>
                <select
                  value={form.dealStage}
                  onChange={(e) => setForm({ ...form, dealStage: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="Lead">Lead</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Proposal">Proposal Sent</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Closed Won">Closed Won</option>
                  <option value="Closed Lost">Closed Lost</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Estimated Deal Value (Cr)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 25.5"
                  value={form.estimatedDealValueInCr}
                  onChange={(e) => setForm({ ...form, estimatedDealValueInCr: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Total Pipeline Value (Cr)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 45.8"
                  value={form.totalPipeline}
                  onChange={(e) => setForm({ ...form, totalPipeline: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* ROW 4: TEXT AREAS FOR ACTIONS */}
            <div className="space-y-4 pt-3 border-t border-white/5">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Purpose of Meeting</label>
                <input
                  type="text"
                  placeholder="e.g. Quarterly Business Review and Roadmap Planning"
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Key Activities Undertaken</label>
                <textarea
                  rows="3"
                  placeholder="Describe your primary activities..."
                  value={form.keyActivitiesUndertaken}
                  onChange={(e) => setForm({ ...form, keyActivitiesUndertaken: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Outcomes Achieved</label>
                  <textarea
                    rows="3"
                    placeholder="Record meeting outcomes..."
                    value={form.outcome}
                    onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                  ></textarea>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Challenges Faced</label>
                  <textarea
                    rows="3"
                    placeholder="Integration complexities, blockages..."
                    value={form.challenges}
                    onChange={(e) => setForm({ ...form, challenges: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                  ></textarea>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Remarks</label>
                <textarea
                  rows="2"
                  placeholder="Additional context or remarks..."
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                ></textarea>
              </div>
            </div>

            {/* ACTION BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold tracking-wider transition-all shadow-lg flex items-center justify-center gap-1.5 uppercase"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving status report...
                </>
              ) : (
                <>
                  <FileCheck className="h-4.5 w-4.5" />
                  {form.id ? 'UPDATE STATUS REPORT' : 'SUBMIT DAILY STATUS REPORT'}
                </>
              )}
            </button>

          </form>
        </div>

        {/* ARCHIVE LOOKUP PANEL (RIGHT 1 COL) */}
        <div className="space-y-6">
          
          {/* LOOKUP SEARCH CARD */}
          <div className="bg-[#0c1220]/40 border border-white/5 rounded-2xl p-5 shadow-lg space-y-4 animate-fade">
            <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-1.5">
              <Search className="h-4.5 w-4.5 text-blue-400" />
              Report Archive Lookup
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Retrieve any historical Daily Sales Status Report by its database ID to view details or modify them.
            </p>

            <form onSubmit={handleLookup} className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="number"
                  placeholder="Enter DSSR ID..."
                  value={dssrId}
                  onChange={(e) => setDssrId(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-white/5"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    Retrieve Record
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ACTIVE RECORD DETAILS DISPLAY */}
          {loadedReport && (
            <div className="bg-[#0c1220]/40 border border-white/5 rounded-2xl p-5 shadow-lg space-y-4 animate-fade">
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono font-bold">
                  RECORD ID #{loadedReport.id}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{loadedReport.date}</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Client / Account</h4>
                  <p className="font-bold text-slate-200 mt-0.5">{loadedReport.customer || 'No customer name'}</p>
                  {loadedReport.accountName && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{loadedReport.accountName}</p>
                  )}
                </div>

                <div>
                  <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Opportunity</h4>
                  <p className="text-slate-300 mt-0.5">{loadedReport.opportunity || 'None listed'}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-2.5">
                  <div>
                    <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Value (Cr)</h4>
                    <p className="font-bold text-slate-200 mt-0.5">
                      {loadedReport.estimatedDealValueInCr != null ? `${loadedReport.estimatedDealValueInCr} Cr` : 'TBD'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Deal Stage</h4>
                    <p className="font-bold text-blue-400 mt-0.5">{loadedReport.dealStage || 'Lead'}</p>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-2.5 space-y-2">
                  <div>
                    <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Activities Undertaken</h4>
                    <p className="text-slate-300 mt-0.5 leading-relaxed bg-slate-900/30 p-2 rounded border border-white/5">
                      {loadedReport.keyActivitiesUndertaken || 'No activities logged.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
