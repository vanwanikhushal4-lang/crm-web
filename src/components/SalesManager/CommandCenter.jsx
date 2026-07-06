import React, { useState } from 'react';
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
  Plus
} from 'lucide-react';

export default function CommandCenter({
  deals,
  itinerary,
  setItinerary,
  setActiveTab,
  setShowAddLeadModal
}) {
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [punchTime, setPunchTime] = useState(null);
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [selfieCaptured, setSelfieCaptured] = useState(false);

  // Minutes of Meeting (MOM) form states
  const [showMomModal, setShowMomModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [momNotes, setMomNotes] = useState('');

  const handlePunchToggle = () => {
    if (!isPunchedIn) {
      setShowPunchModal(true);
    } else {
      setIsPunchedIn(false);
      setPunchTime(null);
      setSelfieCaptured(false);
    }
  };

  const confirmPunchIn = () => {
    setIsPunchedIn(true);
    setPunchTime(new Date());
    setShowPunchModal(false);
  };

  const handleSaveMom = (e) => {
    e.preventDefault();
    if (selectedCustomer) {
      setItinerary(itinerary.map(item =>
        item.id === selectedCustomer.id ? { ...item, status: 'MOM FILLED', momNotes } : item
      ));
      setMomNotes('');
      setShowMomModal(false);
      setSelectedCustomer(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade">
      
      {/* METRICS WIDGET CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Engagements Today Card */}
        <div className="bg-[#0c1220]/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-500/20 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Engagements</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="my-4">
            <h3 className="text-4xl font-extrabold text-white font-mono group-hover:scale-105 transition-transform duration-300 inline-block">0</h3>
          </div>
          <div className="text-xs text-emerald-400 font-medium">Today</div>
        </div>

        {/* Deals Closed Card */}
        <div className="bg-[#0c1220]/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-500/20 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Deals Closed</span>
            <span className="text-xs text-slate-500 font-mono">Target: 10</span>
          </div>
          <div className="my-4">
            <h3 className="text-4xl font-extrabold text-white font-mono group-hover:scale-105 transition-transform duration-300 inline-block">0</h3>
          </div>
          <div className="text-xs text-emerald-400 font-medium">Total</div>
        </div>

        {/* View Calendar Card */}
        <button
          onClick={() => setActiveTab('calendar')}
          className="bg-gradient-to-tr from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg shadow-blue-600/10 border border-blue-400/20 text-left hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden group"
        >
          <div className="absolute right-[-20px] top-[-20px] w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:scale-150 transition-all duration-500"></div>
          
          <div className="flex justify-between items-start">
            <Activity className="h-6 w-6 text-blue-200 animate-pulse" />
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full font-medium">Schedule</span>
          </div>
          <div className="my-3">
            <h3 className="text-lg font-bold">View Calendar</h3>
            <p className="text-xs text-blue-100/75 mt-0.5">Check scheduled meetings</p>
          </div>
          <div className="text-xs font-semibold tracking-wider uppercase text-blue-100 flex items-center gap-1">
            Manage Slots <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* START YOUR SHIFT / ATTENDANCE SECTION */}
      <div className="bg-[#0c1220]/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 hover:border-blue-500/10 transition-all duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePunchToggle}
              className={`h-14 w-14 rounded-full shrink-0 flex items-center justify-center transition-all duration-300 shadow-md ${
                isPunchedIn
                  ? 'bg-red-500/15 border border-red-500/30 text-red-500 hover:bg-red-500/25'
                  : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
              }`}
            >
              {isPunchedIn ? <Square className="h-5 w-5 fill-current" /> : <Play className="h-6 w-6 fill-current pl-0.5" />}
            </button>
            <div>
              <h4 className="font-bold text-slate-100">
                {isPunchedIn ? 'Shift Active' : 'Start Your Shift'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {isPunchedIn
                  ? `Punched in at ${punchTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Tap to punch in with selfie'}
              </p>
            </div>
          </div>
          
          {isPunchedIn && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold font-mono self-start sm:self-auto">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
              ACTIVE ON DUTY
            </div>
          )}
        </div>
      </div>

      {/* HOT PIPELINE SECTION */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Hot Pipeline</h3>
          <button onClick={() => setActiveTab('pipeline')} className="text-xs text-blue-400 hover:text-blue-300 font-medium">View All</button>
        </div>

        <div className="timeline-strip hide-scrollbar">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="shrink-0 w-60 h-28 bg-[#0c1220]/40 hover:bg-[#0c1220]/75 border border-white/5 hover:border-blue-500/30 rounded-xl p-4 flex flex-col justify-between transition-all duration-300 group shadow-md"
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/15 uppercase truncate max-w-[122px]">
                  {deal.stage.replace('_', ' ')}
                </span>
                <span className="text-xs font-bold text-emerald-400 font-mono">{deal.value}</span>
              </div>
              <div className="mt-2">
                <h4 className="text-sm font-bold text-slate-100 truncate">{deal.customerName}</h4>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{deal.companyName}</p>
              </div>
            </div>
          ))}
          
          <button
            onClick={() => setShowAddLeadModal(true)}
            className="shrink-0 w-28 h-28 border-dashed border border-white/10 hover:border-blue-500/40 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-900/40 transition-all text-slate-400 hover:text-white"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs font-medium">New Deal</span>
          </button>
        </div>
      </div>

      {/* TODAY'S ITINERARY SECTION */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Today's Itinerary</h3>
          <span className="text-xs text-slate-500">Scheduled visits</span>
        </div>

        <div className="space-y-3">
          {itinerary.map((item) => (
            <div
              key={item.id}
              className="bg-[#0c1220]/60 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-blue-500/15 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-1 text-blue-400 text-xs font-bold font-mono py-1">
                  <Clock className="h-3.5 w-3.5" />
                  {item.time}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-100">{item.customerName}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      item.status === 'ACTIVE' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                        : item.status === 'MOM FILLED'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/15'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Contact: {item.contactPerson}</p>
                  {item.momNotes && (
                    <p className="text-xs text-slate-500 italic mt-1 bg-slate-950/40 p-2 rounded-lg border border-white/5">
                      MOM Notes: {item.momNotes}
                    </p>
                  )}
                </div>
              </div>

              {item.status !== 'MOM FILLED' ? (
                <button
                  onClick={() => {
                    setSelectedCustomer(item);
                    setShowMomModal(true);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl text-xs font-semibold border border-blue-500/20 hover:border-blue-500 transition-all flex items-center justify-center gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  FILL MOM FORM
                </button>
              ) : (
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold py-2 px-3">
                  <CheckCircle className="h-4 w-4" />
                  MOM Form Saved
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* PUNCH ATTENDANCE MODAL */}
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
                  setShowPunchModal(false);
                  setSelfieCaptured(false);
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="h-52 bg-slate-950 rounded-xl border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
                {!selfieCaptured ? (
                  <>
                    <Camera className="h-10 w-10 text-slate-500 mb-2" />
                    <p className="text-xs text-slate-400 text-center px-6">Camera preview simulates selfie capture for verification.</p>
                    <button
                      onClick={() => setSelfieCaptured(true)}
                      className="absolute bottom-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
                    >
                      Capture Photo
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                    <div className="text-center p-6 space-y-2">
                      <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
                      <p className="text-xs text-slate-200 font-semibold">Selfie Captured Successfully</p>
                      <button
                        onClick={() => setSelfieCaptured(false)}
                        className="text-[11px] text-slate-400 hover:underline"
                      >
                        Retake
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  Location Verified
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed pl-6">
                  Latitude: 19.0760° N, Longitude: 72.8777° E (Mumbai Head Office)
                </p>
              </div>
            </div>

            <button
              onClick={confirmPunchIn}
              disabled={!selfieCaptured}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/10 transition-all"
            >
              CONFIRM AND PUNCH IN
            </button>
          </div>
        </div>
      )}

      {/* MINUTES OF MEETING (MOM) MODAL */}
      {showMomModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-fade">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                Minutes of Meeting (MOM)
              </h3>
              <button onClick={() => {
                setShowMomModal(false);
                setSelectedCustomer(null);
              }} className="text-xs text-slate-400 hover:text-white">Close</button>
            </div>

            <form onSubmit={handleSaveMom} className="space-y-4">
              <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 text-xs text-slate-400 space-y-1">
                <p><span className="font-bold text-slate-200">Customer:</span> {selectedCustomer.customerName}</p>
                <p><span className="font-bold text-slate-200">Contact:</span> {selectedCustomer.contactPerson}</p>
                <p><span className="font-bold text-slate-200">Scheduled Time:</span> {selectedCustomer.time}</p>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Discussion Notes</label>
                <textarea
                  rows="4"
                  placeholder="Record summary of discussion, requirements, next steps..."
                  value={momNotes}
                  onChange={(e) => setMomNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-sm focus:outline-none focus:border-blue-500 resize-none"
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/10 transition-all mt-2"
              >
                SUBMIT MOM FORM
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
